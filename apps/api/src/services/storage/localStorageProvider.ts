import fs from 'fs';
import path from 'path';
import { IStorageProvider, StorageUploadResult } from './types';

export class LocalStorageProvider implements IStorageProvider {
  private baseDir: string;
  private publicBaseUrl: string;

  constructor(baseDir?: string, publicBaseUrl?: string) {
    this.baseDir = baseDir || path.resolve(__dirname, '../../../uploads/rpc');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }

    // Determine the base public URL
    const envUrl = (
      process.env.PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.INTERNAL_API_URL ||
      ''
    ).replace(/\/+$/, '');

    if (publicBaseUrl) {
      this.publicBaseUrl = publicBaseUrl.replace(/\/+$/, '');
    } else if (envUrl) {
      this.publicBaseUrl = envUrl;
    } else {
      this.publicBaseUrl = 'https://pixelgg-api.onrender.com';
    }
  }

  public async upload(storageKey: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult> {
    const cleanKey = storageKey.replace(/^\/+/, '');
    const filename = path.basename(cleanKey);
    const destPath = path.join(this.baseDir, filename);

    await fs.promises.writeFile(destPath, buffer);

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
      const filename = path.basename(cleanKey);
      const filePath = path.join(this.baseDir, filename);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err: any) {
      console.warn(`[LocalStorageProvider] Could not delete local file for "${storageKey}":`, err.message);
    }
  }

  public getPublicUrl(storageKey: string): string {
    const cleanKey = storageKey.replace(/^\/+/, '');
    const filename = path.basename(cleanKey);
    return `${this.publicBaseUrl}/uploads/rpc/${filename}`;
  }

  public isPersistent(): boolean {
    return false;
  }
}
