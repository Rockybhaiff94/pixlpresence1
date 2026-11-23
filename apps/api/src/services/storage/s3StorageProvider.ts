import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { IStorageProvider, StorageUploadResult } from './types';

export interface S3Config {
  endpoint?: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrlBase: string;
}

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrlBase: string;

  constructor(config: S3Config) {
    this.bucket = config.bucket;
    this.publicUrlBase = config.publicUrlBase.replace(/\/+$/, '');

    this.client = new S3Client({
      endpoint: config.endpoint,
      region: config.region || 'auto',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      // Force path style is recommended for Cloudflare R2 and MinIO
      forcePathStyle: Boolean(config.endpoint && !config.endpoint.includes('amazonaws.com')),
    });
  }

  public async upload(storageKey: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult> {
    const cleanKey = storageKey.replace(/^\/+/, '');
    const isAnimated = mimeType === 'image/gif';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: cleanKey,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: isAnimated
        ? 'public, max-age=31536000, immutable'
        : 'public, max-age=31536000, immutable',
    });

    await this.client.send(command);

    return {
      url: this.getPublicUrl(cleanKey),
      storageKey: cleanKey,
      fileSize: buffer.length,
      mimeType,
    };
  }

  public async delete(storageKey: string): Promise<void> {
    try {
      const cleanKey = storageKey.replace(/^\/+/, '');
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      });
      await this.client.send(command);
    } catch (err: any) {
      console.warn(`[S3StorageProvider] Failed to delete object "${storageKey}":`, err.message);
    }
  }

  public getPublicUrl(storageKey: string): string {
    const cleanKey = storageKey.replace(/^\/+/, '');
    return `${this.publicUrlBase}/${cleanKey}`;
  }

  public isPersistent(): boolean {
    return true;
  }
}
