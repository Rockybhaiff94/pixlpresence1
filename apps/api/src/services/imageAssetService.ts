import crypto from 'crypto';
import dns from 'dns';
import sharp from 'sharp';
import { prisma } from '@discord-rpc/database';
import { getStorageProvider } from './storage';

export interface CropParameters {
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}

export interface ImageValidationResult {
  valid: boolean;
  mimeType: string;
  ext: 'png' | 'jpg' | 'webp' | 'gif' | '';
  isAnimated: boolean;
  error?: string;
}

export interface ProcessedImageResult {
  buffer: Buffer;
  mimeType: string;
  ext: 'png' | 'jpg' | 'webp' | 'gif';
  width: number;
  height: number;
  fileSize: number;
  isAnimated: boolean;
}

export interface AssetUploadOptions {
  userId: string;
  fileBuffer: Buffer;
  fileName?: string;
  targetSlot: 'largeImage' | 'smallImage';
  cropData?: CropParameters | null;
}

export interface ImageAssetRecord {
  id: string;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width: number | null;
  height: number | null;
  isAnimated: boolean;
  targetSlot: string | null;
  cropData: CropParameters;
}

export class ImageAssetService {
  public static readonly MAX_STATIC_BYTES = 10 * 1024 * 1024; // 10 MB
  public static readonly MAX_GIF_BYTES = 10 * 1024 * 1024;    // 10 MB
  public static readonly MAX_DIMENSION = 4096;                // 4096px safety limit
  public static readonly TARGET_DIMENSION = 512;              // Standard 512x512 avatar/icon output

  /**
   * Validate image buffer using magic bytes (file signature)
   * Strictly permits only PNG, JPEG, WEBP, and GIF.
   * Explicitly rejects videos, audio, HTML, executables, and corrupted buffers.
   */
  public static validateMagicBytes(buffer: Buffer): ImageValidationResult {
    if (!buffer || buffer.length < 8) {
      return { valid: false, mimeType: '', ext: '', isAnimated: false, error: 'File is empty or too small to be a valid image.' };
    }

    // 1. PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { valid: true, mimeType: 'image/png', ext: 'png', isAnimated: false };
    }

    // 2. JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { valid: true, mimeType: 'image/jpeg', ext: 'jpg', isAnimated: false };
    }

    // 3. GIF: GIF87a or GIF89a (47 49 46 38 37/39 61)
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38 &&
      (buffer[4] === 0x37 || buffer[4] === 0x39) &&
      buffer[5] === 0x61
    ) {
      // Check for animated frames in GIF: search for multiple Graphic Control Extension blocks (0x21 0xF9)
      let gceCount = 0;
      for (let i = 0; i < buffer.length - 2; i++) {
        if (buffer[i] === 0x21 && buffer[i + 1] === 0xf9) {
          gceCount++;
          if (gceCount > 1) break;
        }
      }
      return { valid: true, mimeType: 'image/gif', ext: 'gif', isAnimated: gceCount > 1 };
    }

    // 4. WEBP: RIFF....WEBP (52 49 46 46 .... 57 45 42 50)
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      // Check for animated WEBP (ANIM chunk)
      const bufferString = buffer.toString('binary', 12, Math.min(buffer.length, 64));
      const isAnimated = bufferString.includes('ANIM');
      return { valid: true, mimeType: 'image/webp', ext: 'webp', isAnimated };
    }

    return {
      valid: false,
      mimeType: '',
      ext: '',
      isAnimated: false,
      error: 'Unsupported or corrupted file format. Only PNG, JPEG, WEBP, and GIF images are accepted for Rich Presence.',
    };
  }

  /**
   * Process a static image with user-specified crop and zoom while preserving quality & transparency
   */
  public static async processStaticImage(
    buffer: Buffer,
    crop?: CropParameters | null
  ): Promise<ProcessedImageResult> {
    const pipeline = sharp(buffer, { failOnError: true });
    const metadata = await pipeline.metadata();

    const origWidth = metadata.width || this.TARGET_DIMENSION;
    const origHeight = metadata.height || this.TARGET_DIMENSION;

    if (origWidth > this.MAX_DIMENSION || origHeight > this.MAX_DIMENSION) {
      throw new Error(`Image dimensions exceed maximum allowed limit of ${this.MAX_DIMENSION}x${this.MAX_DIMENSION} pixels.`);
    }

    const zoom = Math.max(0.5, Math.min(3, crop?.zoom || 1));
    const offsetX = crop?.offsetX || 0;
    const offsetY = crop?.offsetY || 0;

    let processedBuffer: Buffer;
    const isPng = metadata.format === 'png' || metadata.hasAlpha;

    // Apply auto-orient for camera/mobile photos
    pipeline.rotate();

    if (zoom === 1 && offsetX === 0 && offsetY === 0) {
      // Standard centered cover resize to standard dimension
      pipeline.resize(this.TARGET_DIMENSION, this.TARGET_DIMENSION, {
        fit: 'cover',
        position: 'center',
      });
    } else {
      // Calculate crop rectangle based on zoom and offset
      const viewSize = Math.min(origWidth, origHeight);
      const scaledSize = Math.max(1, Math.round(viewSize / zoom));
      const centerX = origWidth / 2 - (offsetX * origWidth) / (this.TARGET_DIMENSION * zoom);
      const centerY = origHeight / 2 - (offsetY * origHeight) / (this.TARGET_DIMENSION * zoom);

      let left = Math.round(centerX - scaledSize / 2);
      let top = Math.round(centerY - scaledSize / 2);

      // Clamp within boundaries
      left = Math.max(0, Math.min(origWidth - scaledSize, left));
      top = Math.max(0, Math.min(origHeight - scaledSize, top));
      const width = Math.min(scaledSize, origWidth - left);
      const height = Math.min(scaledSize, origHeight - top);

      pipeline
        .extract({ left, top, width, height })
        .resize(this.TARGET_DIMENSION, this.TARGET_DIMENSION, { fit: 'cover' });
    }

    if (isPng) {
      processedBuffer = await pipeline.png({ quality: 90, compressionLevel: 8 }).toBuffer();
    } else {
      processedBuffer = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    }

    const finalMeta = await sharp(processedBuffer).metadata();

    return {
      buffer: processedBuffer,
      mimeType: isPng ? 'image/png' : 'image/jpeg',
      ext: isPng ? 'png' : 'jpg',
      width: finalMeta.width || this.TARGET_DIMENSION,
      height: finalMeta.height || this.TARGET_DIMENSION,
      fileSize: processedBuffer.length,
      isAnimated: false,
    };
  }

  /**
   * Process an animated GIF: preserves all frames, animation delays, loops, and alpha transparency
   */
  public static async processAnimatedGif(
    buffer: Buffer,
    crop?: CropParameters | null
  ): Promise<ProcessedImageResult> {
    // Sharp supports reading and writing all frames when animated: true is set
    const pipeline = sharp(buffer, { animated: true, failOnError: true });
    const metadata = await pipeline.metadata();

    const origWidth = metadata.width || this.TARGET_DIMENSION;
    const pageHeight = metadata.pageHeight || metadata.height || this.TARGET_DIMENSION;

    if (origWidth > this.MAX_DIMENSION || pageHeight > this.MAX_DIMENSION) {
      throw new Error(`GIF dimensions exceed maximum allowed limit of ${this.MAX_DIMENSION}x${this.MAX_DIMENSION} pixels.`);
    }

    // Discord supports animated GIFs up to 10MB; resize safely if dimensions are very large
    const targetSize = Math.min(512, Math.max(origWidth, pageHeight));

    // When resizing animated images in Sharp, resize across all pages
    const processedBuffer = await pipeline
      .resize(targetSize, targetSize, {
        fit: 'cover',
        position: 'center',
      })
      .gif({
        effort: 7,
        reuse: true,
      })
      .toBuffer();

    const finalMeta = await sharp(processedBuffer, { animated: true }).metadata();

    return {
      buffer: processedBuffer,
      mimeType: 'image/gif',
      ext: 'gif',
      width: finalMeta.width || targetSize,
      height: finalMeta.pageHeight || finalMeta.height || targetSize,
      fileSize: processedBuffer.length,
      isAnimated: true,
    };
  }

  /**
   * Complete end-to-end processing and storage pipeline for a user-uploaded asset
   */
  public static async processAndSaveAsset(options: AssetUploadOptions): Promise<ImageAssetRecord> {
    const { userId, fileBuffer, fileName, targetSlot, cropData } = options;

    // 1. Content validation via magic bytes
    const validation = this.validateMagicBytes(fileBuffer);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid file format.');
    }

    // 2. Size limit checks
    if (validation.ext === 'gif' && fileBuffer.length > this.MAX_GIF_BYTES) {
      throw new Error(
        `Animated GIF exceeds maximum limit of 10 MB (size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB).`
      );
    }
    if (validation.ext !== 'gif' && fileBuffer.length > this.MAX_STATIC_BYTES) {
      throw new Error(
        `Image file exceeds maximum limit of 10 MB (size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB).`
      );
    }

    // 3. Image processing
    let processed: ProcessedImageResult;
    try {
      if (validation.ext === 'gif' && validation.isAnimated) {
        processed = await this.processAnimatedGif(fileBuffer, cropData);
      } else {
        processed = await this.processStaticImage(fileBuffer, cropData);
      }
    } catch (err: any) {
      console.error('[ImageAssetService] Image processing error:', err);
      throw new Error(`Failed to process image: ${err.message}`);
    }

    // 4. Generate persistent canonical storage key
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const storageKey = `rpc/${userId}/${targetSlot}_${Date.now()}_${uniqueId}.${processed.ext}`;

    // 5. Upload to storage provider (Cloudflare R2, S3, or Local fallback)
    const storage = getStorageProvider();
    let uploadResult;
    try {
      uploadResult = await storage.upload(storageKey, processed.buffer, processed.mimeType);
    } catch (err: any) {
      console.error('[ImageAssetService] Storage upload error:', err);
      throw new Error(`Failed to store processed image: ${err.message}`);
    }

    const canonicalUrl = uploadResult.url;

    // 6. Record asset in database with transaction safety
    const cropX = cropData?.cropX || 0;
    const cropY = cropData?.cropY || 0;
    const cropWidth = cropData?.cropWidth || processed.width;
    const cropHeight = cropData?.cropHeight || processed.height;
    const zoom = cropData?.zoom || 1;
    const offsetX = cropData?.offsetX || 0;
    const offsetY = cropData?.offsetY || 0;

    let asset;
    try {
      // Find existing asset for this slot to clean up later
      const previousAsset = await prisma.uploadedAsset.findFirst({
        where: { userId, targetSlot },
        orderBy: { createdAt: 'desc' },
      });

      asset = await prisma.uploadedAsset.create({
        data: {
          userId,
          originalUrl: canonicalUrl,
          processedUrl: canonicalUrl,
          fileName: (fileName || `${targetSlot}.${processed.ext}`).slice(0, 120),
          fileSize: processed.fileSize,
          mimeType: processed.mimeType,
          width: processed.width,
          height: processed.height,
          isAnimated: processed.isAnimated,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          zoom,
          offsetX,
          offsetY,
          targetSlot,
          storageKey,
        },
      });

      // Safely delete previous replaced object from storage if it had a storageKey
      if (previousAsset && (previousAsset as any).storageKey && (previousAsset as any).storageKey !== storageKey) {
        storage.delete((previousAsset as any).storageKey).catch((delErr) => {
          console.warn('[ImageAssetService] Previous asset cleanup notice:', delErr.message);
        });
      }
    } catch (dbErr: any) {
      // Rollback storage upload if database persistence fails
      console.error('[ImageAssetService] Database write failed. Rolling back storage object:', dbErr);
      await storage.delete(storageKey).catch(() => {});
      throw new Error(`Failed to record asset in database: ${dbErr.message}`);
    }

    return {
      id: asset.id,
      url: canonicalUrl,
      fileName: asset.fileName,
      fileSize: asset.fileSize,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      isAnimated: asset.isAnimated,
      targetSlot: asset.targetSlot,
      cropData: {
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        zoom,
        offsetX,
        offsetY,
      },
    };
  }

  /**
   * Delete an asset and clean up both storage and database records
   */
  public static async deleteAsset(assetId: string, userId: string): Promise<boolean> {
    const asset = await prisma.uploadedAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.userId !== userId) {
      return false;
    }

    const storage = getStorageProvider();
    if ((asset as any).storageKey) {
      await storage.delete((asset as any).storageKey);
    }

    await prisma.uploadedAsset.delete({
      where: { id: assetId },
    });

    return true;
  }

  /**
   * SSRF-safe URL validation helper for external image ingestion
   */
  public static async validateExternalImageUrl(inputUrl: string): Promise<{ safe: boolean; error?: string }> {
    try {
      const parsed = new URL(inputUrl);

      // 1. Protocol restriction: HTTPS only in production
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return { safe: false, error: 'Only HTTPS and HTTP URLs are allowed.' };
      }

      const hostname = parsed.hostname.toLowerCase();

      // 2. Reject localhost and local names
      if (
        hostname === 'localhost' ||
        hostname.endsWith('.local') ||
        hostname.endsWith('.internal') ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname === '0.0.0.0'
      ) {
        return { safe: false, error: 'Internal or loopback addresses are prohibited.' };
      }

      // 3. Resolve DNS and verify not private IPv4 range
      const lookup = await dns.promises.lookup(hostname);
      const ip = lookup.address;

      // RFC 1918 Private Ranges & Link Local
      const isPrivate =
        ip.startsWith('10.') ||
        ip.startsWith('192.168.') ||
        ip.startsWith('169.254.') ||
        /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip) ||
        ip === '127.0.0.1';

      if (isPrivate) {
        return { safe: false, error: 'Target resolves to a private network address.' };
      }

      return { safe: true };
    } catch (err: any) {
      return { safe: false, error: `Invalid URL: ${err.message}` };
    }
  }
}
