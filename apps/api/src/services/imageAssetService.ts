import crypto from 'crypto';
import dns from 'dns';
import sharp from 'sharp';
import { prisma } from '@discord-rpc/database';
import { getStorageProvider } from './storage';
import { isAssetReferencedByProfileOrHistory } from './profileHistoryService';

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
  frameCount?: number;
  loopCount?: number | null;
}

export interface GifBinaryInspection {
  isGif: boolean;
  frameCount: number;
  gceCount: number;
  delaysMs: number[];
  loopCount: number | null;
  hasTransparency: boolean;
}

export type UploadErrorCategory =
  | 'validation'
  | 'size_limit'
  | 'unsupported_format'
  | 'processing'
  | 'storage'
  | 'database';

export class UploadServiceError extends Error {
  public readonly statusCode: number;
  public readonly category: UploadErrorCategory;

  constructor(message: string, statusCode = 400, category: UploadErrorCategory = 'validation') {
    super(message);
    this.name = 'UploadServiceError';
    this.statusCode = statusCode;
    this.category = category;
  }
}

export interface MediaValidationResult {
  valid: boolean;
  kind: 'image' | 'video' | 'audio' | '';
  mimeType: string;
  ext: string;
  isAnimated: boolean;
  error?: string;
}

export interface AssetUploadOptions {
  userId: string;
  fileBuffer: Buffer;
  fileName?: string;
  targetSlot: string;
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
  frameCount?: number;
  loopCount?: number | null;
  targetSlot: string | null;
  cropData: CropParameters;
}

export class ImageAssetService {
  public static readonly MAX_STATIC_BYTES = 10 * 1024 * 1024;  // 10 MB
  public static readonly MAX_GIF_BYTES = 10 * 1024 * 1024;     // 10 MB
  public static readonly MAX_MEDIA_BYTES = 25 * 1024 * 1024;   // 25 MB (video/audio backgrounds)
  public static readonly MAX_DIMENSION = 4096;                 // 4096px safety limit
  public static readonly MAX_STUDIO_DIMENSION = 2560;          // Max aspect-preserving studio image dimension
  public static readonly TARGET_DIMENSION = 512;               // Standard 512x512 RPC icon output

  public static isRpcIconSlot(targetSlot?: string | null): boolean {
    return targetSlot === 'largeImage' || targetSlot === 'smallImage';
  }

  /**
   * Validate media buffer using magic bytes for image, video (MP4/WebM), and audio (MP3/WAV/OGG).
   */
  public static validateMediaMagicBytes(buffer: Buffer): MediaValidationResult {
    const img = this.validateMagicBytes(buffer);
    if (img.valid) {
      return {
        valid: true,
        kind: 'image',
        mimeType: img.mimeType,
        ext: img.ext,
        isAnimated: img.isAnimated,
      };
    }

    if (!buffer || buffer.length < 8) {
      return {
        valid: false,
        kind: '',
        mimeType: '',
        ext: '',
        isAnimated: false,
        error: 'File is empty or too small to be a valid media file.',
      };
    }

    // MP4: buffer[4..7] === 'ftyp'
    if (buffer.length >= 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') {
      return { valid: true, kind: 'video', mimeType: 'video/mp4', ext: 'mp4', isAnimated: true };
    }

    // WebM: 1A 45 DF A3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return { valid: true, kind: 'video', mimeType: 'video/webm', ext: 'webm', isAnimated: true };
    }

    // MP3: ID3 header (49 44 33) or MPEG sync word (FF Ex / FF Fx)
    if (
      (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) ||
      (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
      return { valid: true, kind: 'audio', mimeType: 'audio/mpeg', ext: 'mp3', isAnimated: false };
    }

    // WAV: RIFF....WAVE
    if (
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x41 &&
      buffer[10] === 0x56 &&
      buffer[11] === 0x45
    ) {
      return { valid: true, kind: 'audio', mimeType: 'audio/wav', ext: 'wav', isAnimated: false };
    }

    // OGG: OggS
    if (buffer[0] === 0x4f && buffer[1] === 0x67 && buffer[2] === 0x67 && buffer[3] === 0x53) {
      return { valid: true, kind: 'audio', mimeType: 'audio/ogg', ext: 'ogg', isAnimated: false };
    }

    return {
      valid: false,
      kind: '',
      mimeType: '',
      ext: '',
      isAnimated: false,
      error: 'Unsupported media format. Accepted: PNG, JPG, WEBP, GIF, MP4, WebM, MP3, WAV, or OGG.',
    };
  }

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
      // Check for animated WEBP (ANIM chunk anywhere in header region)
      const bufferString = buffer.toString('binary', 12, Math.min(buffer.length, 4096));
      const isAnimated = bufferString.includes('ANIM');
      return { valid: true, mimeType: 'image/webp', ext: 'webp', isAnimated };
    }

    return {
      valid: false,
      mimeType: '',
      ext: '',
      isAnimated: false,
      error: 'Unsupported or corrupted image format. Only PNG, JPEG, WEBP, and GIF images are accepted.',
    };
  }

  /**
   * Process a static image with optional crop/zoom while preserving quality & transparency.
   * When preserveAspectRatio is true (Canvas Background, Banners, Studio Images), keeps natural aspect ratio.
   */
  public static async processStaticImage(
    buffer: Buffer,
    crop?: CropParameters | null,
    preserveAspectRatio = false
  ): Promise<ProcessedImageResult> {
    const pipeline = sharp(buffer, { failOnError: true });
    const metadata = await pipeline.metadata();

    const origWidth = metadata.width || this.TARGET_DIMENSION;
    const origHeight = metadata.height || this.TARGET_DIMENSION;

    if (origWidth > this.MAX_DIMENSION || origHeight > this.MAX_DIMENSION) {
      throw new UploadServiceError(
        `Image dimensions exceed maximum allowed limit of ${this.MAX_DIMENSION}x${this.MAX_DIMENSION} pixels.`,
        413,
        'size_limit'
      );
    }

    const zoom = Math.max(0.5, Math.min(3, crop?.zoom || 1));
    const offsetX = crop?.offsetX || 0;
    const offsetY = crop?.offsetY || 0;
    const hasCustomCrop = zoom !== 1 || offsetX !== 0 || offsetY !== 0;

    let processedBuffer: Buffer;
    const isWebp = metadata.format === 'webp';
    const isPng = metadata.format === 'png' || (metadata.hasAlpha && !isWebp);

    // Apply auto-orient for camera/mobile photos
    pipeline.rotate();

    if (preserveAspectRatio && !hasCustomCrop) {
      if (origWidth > this.MAX_STUDIO_DIMENSION || origHeight > this.MAX_STUDIO_DIMENSION) {
        pipeline.resize(this.MAX_STUDIO_DIMENSION, this.MAX_STUDIO_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
    } else if (!hasCustomCrop) {
      // Standard centered cover resize to standard RPC icon dimension
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

    if (isWebp && preserveAspectRatio) {
      processedBuffer = await pipeline.webp({ quality: 90 }).toBuffer();
    } else if (isPng) {
      processedBuffer = await pipeline.png({ quality: 90, compressionLevel: 8 }).toBuffer();
    } else {
      processedBuffer = await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    }

    const finalMeta = await sharp(processedBuffer).metadata();
    const outExt: 'png' | 'jpg' | 'webp' = isWebp && preserveAspectRatio ? 'webp' : isPng ? 'png' : 'jpg';
    const outMime = outExt === 'webp' ? 'image/webp' : outExt === 'png' ? 'image/png' : 'image/jpeg';

    return {
      buffer: processedBuffer,
      mimeType: outMime,
      ext: outExt,
      width: finalMeta.width || (preserveAspectRatio ? origWidth : this.TARGET_DIMENSION),
      height: finalMeta.height || (preserveAspectRatio ? origHeight : this.TARGET_DIMENSION),
      fileSize: processedBuffer.length,
      isAnimated: false,
    };
  }

  /**
   * Parses GIF87a/GIF89a binary block structure to count actual image frames (0x2C),
   * per-frame delays, transparency flags, and NETSCAPE2.0 loop settings.
   */
  public static inspectGifBinary(buffer: Buffer): GifBinaryInspection {
    const empty: GifBinaryInspection = {
      isGif: false,
      frameCount: 0,
      gceCount: 0,
      delaysMs: [],
      loopCount: null,
      hasTransparency: false,
    };
    if (!buffer || buffer.length < 14) return empty;

    const sig = buffer.slice(0, 6).toString('ascii');
    if (sig !== 'GIF87a' && sig !== 'GIF89a') return empty;

    let pos = 13; // 6-byte header + 7-byte Logical Screen Descriptor
    const packed = buffer[10];
    if ((packed & 0x80) !== 0) {
      const gctSize = 3 * (1 << ((packed & 0x07) + 1));
      pos += gctSize;
    }

    let frameCount = 0;
    let gceCount = 0;
    const delaysMs: number[] = [];
    let loopCount: number | null = null;
    let hasTransparency = false;

    const skipSubBlocks = () => {
      while (pos < buffer.length) {
        const blockSize = buffer[pos++];
        if (blockSize === 0) break;
        pos += blockSize;
      }
    };

    while (pos < buffer.length) {
      const introducer = buffer[pos++];
      if (introducer === 0x3b) {
        // GIF Trailer
        break;
      } else if (introducer === 0x21) {
        // Extension Block
        if (pos >= buffer.length) break;
        const label = buffer[pos++];
        if (label === 0xf9 && pos + 5 <= buffer.length) {
          // Graphic Control Extension
          const blockSize = buffer[pos];
          if (blockSize === 4) {
            const gcePacked = buffer[pos + 1];
            const delayCs = buffer.readUInt16LE(pos + 2);
            if ((gcePacked & 0x01) !== 0) hasTransparency = true;
            delaysMs.push(delayCs * 10);
            gceCount++;
          }
          skipSubBlocks();
        } else if (label === 0xff && pos + 12 <= buffer.length) {
          // Application Extension (check for NETSCAPE2.0 / ANIMEXTS1.0 loop block)
          const appBlockSize = buffer[pos];
          if (appBlockSize === 11) {
            const appId = buffer.slice(pos + 1, pos + 12).toString('ascii');
            pos += 12;
            if ((appId === 'NETSCAPE2.0' || appId === 'ANIMEXTS1.0') && pos + 4 <= buffer.length && buffer[pos] >= 3 && buffer[pos + 1] === 1) {
              loopCount = buffer.readUInt16LE(pos + 2);
            }
            skipSubBlocks();
          } else {
            skipSubBlocks();
          }
        } else {
          skipSubBlocks();
        }
      } else if (introducer === 0x2c) {
        // Image Descriptor (1 frame)
        frameCount++;
        if (pos + 9 > buffer.length) break;
        const imgPacked = buffer[pos + 8];
        pos += 9;
        if ((imgPacked & 0x80) !== 0) {
          const lctSize = 3 * (1 << ((imgPacked & 0x07) + 1));
          pos += lctSize;
        }
        if (pos >= buffer.length) break;
        pos++; // LZW minimum code size
        skipSubBlocks();
      } else {
        // Unknown byte; stop scanning safely
        break;
      }
    }

    return {
      isGif: true,
      frameCount: Math.max(frameCount, gceCount),
      gceCount,
      delaysMs,
      loopCount,
      hasTransparency,
    };
  }

  /**
   * Process an animated GIF: preserves all frames, animation delays, loops, and alpha transparency
   * Guarantees that the resulting animated file will remain strictly within Discord's 8MB external proxy threshold.
   */
  public static async processAnimatedGif(
    buffer: Buffer,
    crop?: CropParameters | null,
    preserveAspectRatio = false
  ): Promise<ProcessedImageResult> {
    const inputInspection = this.inspectGifBinary(buffer);
    const pipeline = sharp(buffer, { animated: true, failOnError: true });
    const metadata = await pipeline.metadata();

    const origWidth = metadata.width || this.TARGET_DIMENSION;
    const pageHeight = metadata.pageHeight || metadata.height || this.TARGET_DIMENSION;
    const origFrames = Math.max(metadata.pages || 1, inputInspection.frameCount || 1);
    const isActuallyAnimated = origFrames > 1;

    if (origWidth > this.MAX_DIMENSION || pageHeight > this.MAX_DIMENSION) {
      throw new UploadServiceError(
        `GIF dimensions exceed maximum allowed limit of ${this.MAX_DIMENSION}x${this.MAX_DIMENSION} pixels.`,
        413,
        'size_limit'
      );
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[PixelsRPC][GIF] Input asset received', {
        format: 'gif',
        width: origWidth,
        height: pageHeight,
        pages: origFrames,
        loop: metadata.loop ?? inputInspection.loopCount,
        bytes: buffer.length,
        preserveAspectRatio,
      });
    }

    const hasCustomCrop = Boolean(
      crop &&
      ((crop.zoom !== undefined && crop.zoom !== 1) ||
        (crop.offsetX && crop.offsetX !== 0) ||
        (crop.offsetY && crop.offsetY !== 0))
    );

    // For Studio / Profile backgrounds & image elements, preserve original aspect ratio & frames directly up to 10MB and MAX_DIMENSION.
    if (
      preserveAspectRatio &&
      !hasCustomCrop &&
      origWidth <= this.MAX_DIMENSION &&
      pageHeight <= this.MAX_DIMENSION &&
      buffer.length <= this.MAX_GIF_BYTES
    ) {
      return {
        buffer,
        mimeType: 'image/gif',
        ext: 'gif',
        width: origWidth,
        height: pageHeight,
        fileSize: buffer.length,
        isAnimated: isActuallyAnimated,
        frameCount: origFrames,
        loopCount: metadata.loop ?? inputInspection.loopCount ?? 0,
      };
    }

    // For RPC icon slots, preserve original buffer untouched when <= 512px and <= 8MB.
    if (!hasCustomCrop && origWidth <= 512 && pageHeight <= 512 && buffer.length <= 8 * 1024 * 1024) {
      return {
        buffer,
        mimeType: 'image/gif',
        ext: 'gif',
        width: origWidth,
        height: pageHeight,
        fileSize: buffer.length,
        isAnimated: isActuallyAnimated,
        frameCount: origFrames,
        loopCount: metadata.loop ?? inputInspection.loopCount ?? 0,
      };
    }

    const maxBytesLimit = preserveAspectRatio ? this.MAX_GIF_BYTES : 8 * 1024 * 1024;
    const targetSize = preserveAspectRatio
      ? Math.min(1280, Math.max(origWidth, pageHeight))
      : Math.min(320, Math.max(origWidth, pageHeight));

    const buildAnimatedPipeline = (size: number, colours: number) => {
      const p = sharp(buffer, { animated: true, failOnError: true });
      if (hasCustomCrop && crop) {
        const zoom = Math.max(0.5, Math.min(3, crop.zoom || 1));
        const offsetX = crop.offsetX || 0;
        const offsetY = crop.offsetY || 0;
        const viewSize = Math.min(origWidth, pageHeight);
        const scaledSize = Math.max(1, Math.round(viewSize / zoom));
        const centerX = origWidth / 2 - (offsetX * origWidth) / (this.TARGET_DIMENSION * zoom);
        const centerY = pageHeight / 2 - (offsetY * pageHeight) / (this.TARGET_DIMENSION * zoom);
        const left = Math.max(0, Math.min(origWidth - scaledSize, Math.round(centerX - scaledSize / 2)));
        const top = Math.max(0, Math.min(pageHeight - scaledSize, Math.round(centerY - scaledSize / 2)));
        const width = Math.min(scaledSize, origWidth - left);
        const height = Math.min(scaledSize, pageHeight - top);

        if (origFrames === 1) {
          p.extract({ left, top, width, height });
        }
      }
      if (preserveAspectRatio && !hasCustomCrop) {
        p.resize(size, size, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      } else {
        p.resize(size, size, {
          fit: 'cover',
          position: 'center',
        });
      }
      return p
        .gif({
          effort: 7,
          reuse: true,
          colours,
          loop: metadata.loop ?? inputInspection.loopCount ?? 0,
        })
        .toBuffer();
    };

    let processedBuffer: Buffer;
    try {
      processedBuffer = await buildAnimatedPipeline(targetSize, 128);
    } catch (err: any) {
      console.warn('[ImageAssetService] GIF resize fallback to original buffer:', err.message);
      processedBuffer = buffer;
    }

    if (processedBuffer.length > maxBytesLimit) {
      try {
        processedBuffer = await buildAnimatedPipeline(preserveAspectRatio ? 720 : 256, 96);
      } catch (_) {}
    }

    const finalInspection = this.inspectGifBinary(processedBuffer);
    const finalMeta = await sharp(processedBuffer, { animated: true }).metadata().catch(() => ({
      width: targetSize,
      height: targetSize,
      pageHeight: targetSize,
      pages: finalInspection.frameCount,
      loop: finalInspection.loopCount,
    }));

    const finalFrames = Math.max(finalMeta.pages || 0, finalInspection.frameCount || 0) || 1;
    // Never silently return a 1-frame flattened GIF when multi-frame input <= limit existed
    if (origFrames > 1 && finalFrames <= 1 && buffer.length <= maxBytesLimit) {
      processedBuffer = buffer;
    }

    const verifiedFrames = Math.max(
      origFrames > 1 && processedBuffer === buffer ? origFrames : finalFrames,
      1
    );

    if (process.env.NODE_ENV !== 'production') {
      console.log('[PixelsRPC][GIF] Frame count verified', {
        inputFrames: origFrames,
        outputFrames: verifiedFrames,
        bytes: processedBuffer.length,
        loop: finalMeta.loop ?? finalInspection.loopCount ?? 0,
      });
    }

    return {
      buffer: processedBuffer,
      mimeType: 'image/gif',
      ext: 'gif',
      width: finalMeta.width || (preserveAspectRatio ? origWidth : targetSize),
      height: finalMeta.pageHeight || finalMeta.height || (preserveAspectRatio ? pageHeight : targetSize),
      fileSize: processedBuffer.length,
      isAnimated: verifiedFrames > 1,
      frameCount: verifiedFrames,
      loopCount: finalMeta.loop ?? finalInspection.loopCount ?? 0,
    };
  }

  /**
   * Process an animated WebP: preserves animation frames and aspect ratio when requested.
   */
  public static async processAnimatedWebp(
    buffer: Buffer,
    crop?: CropParameters | null,
    preserveAspectRatio = false
  ): Promise<ProcessedImageResult> {
    const pipeline = sharp(buffer, { animated: true, failOnError: true });
    const metadata = await pipeline.metadata();

    const origWidth = metadata.width || this.TARGET_DIMENSION;
    const pageHeight = metadata.pageHeight || metadata.height || this.TARGET_DIMENSION;

    if (origWidth > this.MAX_DIMENSION || pageHeight > this.MAX_DIMENSION) {
      throw new UploadServiceError(
        `WebP dimensions exceed maximum allowed limit of ${this.MAX_DIMENSION}x${this.MAX_DIMENSION} pixels.`,
        413,
        'size_limit'
      );
    }

    const hasCustomCrop = Boolean(
      crop &&
      (crop.zoom !== 1 || (crop.offsetX && crop.offsetX !== 0) || (crop.offsetY && crop.offsetY !== 0))
    );

    if (preserveAspectRatio && !hasCustomCrop && origWidth <= 1920 && pageHeight <= 1920 && buffer.length <= this.MAX_STATIC_BYTES) {
      return {
        buffer,
        mimeType: 'image/webp',
        ext: 'webp',
        width: origWidth,
        height: pageHeight,
        fileSize: buffer.length,
        isAnimated: true,
      };
    }

    if (!hasCustomCrop && origWidth <= 512 && pageHeight <= 512 && buffer.length <= 8 * 1024 * 1024) {
      return {
        buffer,
        mimeType: 'image/webp',
        ext: 'webp',
        width: origWidth,
        height: pageHeight,
        fileSize: buffer.length,
        isAnimated: true,
      };
    }

    const targetSize = preserveAspectRatio
      ? Math.min(1280, Math.max(origWidth, pageHeight))
      : Math.min(320, Math.max(origWidth, pageHeight));
    const processedBuffer = await pipeline
      .resize(
        targetSize,
        targetSize,
        preserveAspectRatio && !hasCustomCrop
          ? { fit: 'inside', withoutEnlargement: true }
          : { fit: 'cover', position: 'center' }
      )
      .webp({ quality: 82, effort: 4 })
      .toBuffer();

    const finalMeta = await sharp(processedBuffer, { animated: true }).metadata().catch(() => ({
      width: targetSize,
      height: targetSize,
      pageHeight: targetSize,
    }));

    return {
      buffer: processedBuffer,
      mimeType: 'image/webp',
      ext: 'webp',
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
    const { userId, fileBuffer, fileName, cropData } = options;
    const rawSlot = (options.targetSlot || 'studio_asset').trim() || 'studio_asset';
    const isRpcSlot = this.isRpcIconSlot(rawSlot);
    const isVideoOrAudioSlot = rawSlot === 'background_video' || rawSlot === 'background_audio';

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new UploadServiceError('Uploaded file is empty.', 400, 'validation');
    }

    let outBuffer: Buffer;
    let outMimeType: string;
    let outExt: string;
    let outWidth: number | null = null;
    let outHeight: number | null = null;
    let outIsAnimated = false;
    let outFrameCount = 1;
    let outLoopCount: number | null = null;

    if (isVideoOrAudioSlot) {
      const mediaCheck = this.validateMediaMagicBytes(fileBuffer);
      if (!mediaCheck.valid) {
        throw new UploadServiceError(mediaCheck.error || 'Unsupported media file format.', 415, 'unsupported_format');
      }
      if (rawSlot === 'background_video' && mediaCheck.kind !== 'video') {
        throw new UploadServiceError('Invalid video format. Please upload an MP4 or WebM file.', 415, 'unsupported_format');
      }
      if (rawSlot === 'background_audio' && mediaCheck.kind !== 'audio') {
        throw new UploadServiceError('Invalid audio format. Please upload an MP3, WAV, or OGG file.', 415, 'unsupported_format');
      }
      const isFounder = userId === 'cmw4fbemh0000a1sa2h3h5zzk';
      const bypassVideoLimit = isFounder && rawSlot === 'background_video';
      if (!bypassVideoLimit && fileBuffer.length > this.MAX_MEDIA_BYTES) {
        const msg =
          rawSlot === 'background_video'
            ? 'Video file exceeds the maximum upload limit of 25 MB. Please select a smaller video.'
            : `Media file exceeds maximum limit of 25 MB (size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB).`;
        throw new UploadServiceError(msg, 413, 'size_limit');
      }
      outBuffer = fileBuffer;
      outMimeType = mediaCheck.mimeType;
      outExt = mediaCheck.ext;
      outIsAnimated = mediaCheck.kind === 'video';
    } else {
      // 1. Content validation via magic bytes
      const validation = this.validateMagicBytes(fileBuffer);
      if (!validation.valid) {
        throw new UploadServiceError(validation.error || 'Unsupported image file format.', 415, 'unsupported_format');
      }

      // 2. Size limit checks
      if (validation.ext === 'gif' && fileBuffer.length > this.MAX_GIF_BYTES) {
        throw new UploadServiceError(
          `Animated GIF exceeds maximum limit of 10 MB (size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB).`,
          413,
          'size_limit'
        );
      }
      if (validation.ext !== 'gif' && fileBuffer.length > this.MAX_STATIC_BYTES) {
        throw new UploadServiceError(
          `Image file exceeds maximum limit of 10 MB (size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB).`,
          413,
          'size_limit'
        );
      }

      // 3. Image processing (RPC icons normalize to 512x512; Studio/Profile images preserve aspect ratio)
      const preserveAspectRatio = !isRpcSlot;
      let processed: ProcessedImageResult;
      try {
        if (validation.ext === 'gif') {
          processed = await this.processAnimatedGif(fileBuffer, cropData, preserveAspectRatio);
        } else if (validation.ext === 'webp' && validation.isAnimated) {
          processed = await this.processAnimatedWebp(fileBuffer, cropData, preserveAspectRatio);
        } else {
          processed = await this.processStaticImage(fileBuffer, cropData, preserveAspectRatio);
        }
      } catch (err: any) {
        if (err instanceof UploadServiceError) throw err;
        console.error('[ImageAssetService] Image processing error:', err);
        throw new UploadServiceError(`Failed to process image: ${err.message}`, 400, 'processing');
      }

      outBuffer = processed.buffer;
      outMimeType = processed.mimeType;
      outExt = processed.ext;
      outWidth = processed.width;
      outHeight = processed.height;
      outIsAnimated = processed.isAnimated;
      outFrameCount = processed.frameCount ?? 1;
      outLoopCount = processed.loopCount ?? null;
    }

    // 4. Generate persistent canonical storage key
    const safeSlotSlug = rawSlot.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) || 'asset';
    const uniqueId = crypto.randomBytes(8).toString('hex');
    const storageKey = `rpc/${userId}/${safeSlotSlug}_${Date.now()}_${uniqueId}.${outExt}`;

    // 5. Upload to storage provider (Cloudflare R2, S3, or Local + DB backup)
    const storage = getStorageProvider();
    let uploadResult;
    try {
      uploadResult = await storage.upload(storageKey, outBuffer, outMimeType);
    } catch (err: any) {
      console.error('[ImageAssetService] Storage upload error:', err);
      throw new UploadServiceError(
        `Storage service unavailable while saving asset: ${err.message}`,
        503,
        'storage'
      );
    }

    const canonicalUrl = uploadResult.url;

    // 6. Record asset in database with transaction safety
    const cropX = cropData?.cropX || 0;
    const cropY = cropData?.cropY || 0;
    const cropWidth = cropData?.cropWidth || outWidth || 0;
    const cropHeight = cropData?.cropHeight || outHeight || 0;
    const zoom = cropData?.zoom || 1;
    const offsetX = cropData?.offsetX || 0;
    const offsetY = cropData?.offsetY || 0;

    let asset;
    try {
      // Only RPC singleton slots (largeImage / smallImage) auto-clean previous slot assets;
      // Studio / Profile / Image Host uploads stay in the reusable asset library.
      const previousAsset = isRpcSlot
        ? await prisma.uploadedAsset.findFirst({
            where: { userId, targetSlot: rawSlot },
            orderBy: { createdAt: 'desc' },
          })
        : null;

      asset = await prisma.uploadedAsset.create({
        data: {
          userId,
          originalUrl: canonicalUrl,
          processedUrl: canonicalUrl,
          fileName: (fileName || `${safeSlotSlug}.${outExt}`).slice(0, 120),
          fileSize: outBuffer.length,
          mimeType: outMimeType,
          width: outWidth,
          height: outHeight,
          isAnimated: outIsAnimated,
          cropX,
          cropY,
          cropWidth,
          cropHeight,
          zoom,
          offsetX,
          offsetY,
          targetSlot: rawSlot,
          storageKey,
          data: outBuffer,
        },
      });

      if (previousAsset && (previousAsset as any).storageKey && (previousAsset as any).storageKey !== storageKey) {
        storage.delete((previousAsset as any).storageKey).catch((delErr) => {
          console.warn('[ImageAssetService] Previous asset cleanup notice:', delErr.message);
        });
      }
    } catch (dbErr: any) {
      // Rollback storage upload if database persistence fails
      console.error('[ImageAssetService] Database write failed. Rolling back storage object:', dbErr);
      await storage.delete(storageKey).catch(() => {});
      throw new UploadServiceError(
        `Database service unavailable while saving asset metadata.`,
        503,
        'database'
      );
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
      frameCount: outFrameCount,
      loopCount: outLoopCount,
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
   * Delete an asset and clean up both storage and database records.
   * Refuses deletion if still referenced by active profile or retained history snapshots.
   */
  public static async deleteAsset(
    assetId: string,
    userId: string
  ): Promise<{ deleted: boolean; reason?: string; code?: 'not_found' | 'in_use' }> {
    const asset = await prisma.uploadedAsset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.userId !== userId) {
      return { deleted: false, code: 'not_found' };
    }

    const candidates = [asset.originalUrl, asset.processedUrl].filter(
      (u): u is string => typeof u === 'string' && u.length > 0
    );
    const refCheck = await isAssetReferencedByProfileOrHistory(userId, candidates);
    if (refCheck.referenced) {
      return {
        deleted: false,
        code: 'in_use',
        reason:
          refCheck.source === 'active_profile'
            ? 'Asset is referenced by your active profile and cannot be deleted.'
            : 'Asset is referenced by a retained 7-day history snapshot and cannot be deleted.',
      };
    }

    const storage = getStorageProvider();
    if ((asset as any).storageKey) {
      await storage.delete((asset as any).storageKey);
    }

    await prisma.uploadedAsset.delete({
      where: { id: assetId },
    });

    return { deleted: true };
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
