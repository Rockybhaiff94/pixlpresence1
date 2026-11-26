import { IStorageProvider } from './types';
import { S3StorageProvider, S3Config } from './s3StorageProvider';
import { LocalStorageProvider } from './localStorageProvider';

export * from './types';
export * from './s3StorageProvider';
export * from './localStorageProvider';

let activeProvider: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (activeProvider) {
    return activeProvider;
  }

  // Check for Cloudflare R2 / S3 Configuration
  const endpoint = process.env.R2_ENDPOINT || process.env.S3_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME || process.env.AWS_BUCKET_NAME;
  const publicUrlBase =
    process.env.R2_PUBLIC_URL ||
    process.env.S3_PUBLIC_URL ||
    process.env.PUBLIC_STORAGE_URL ||
    (endpoint && bucket ? `${endpoint.replace(/\/+$/, '')}/${bucket}` : '');

  if (accessKeyId && secretAccessKey && bucket && publicUrlBase) {
    const s3Config: S3Config = {
      endpoint: endpoint || undefined,
      region: process.env.S3_REGION || process.env.AWS_REGION || 'auto',
      accessKeyId,
      secretAccessKey,
      bucket,
      publicUrlBase,
    };

    activeProvider = new S3StorageProvider(s3Config);
    console.log('[Storage] Initialized persistent S3/R2 Object Storage Provider (Bucket:', bucket, ')');
    return activeProvider;
  }

  // Development/Fallback Local Storage Provider (persisted in PostgreSQL UploadedAsset table)
  if (process.env.NODE_ENV === 'production') {
    console.info(
      '[Storage] Using local disk cache backed by PostgreSQL UploadedAsset persistence (R2/S3 not configured).'
    );
  }

  activeProvider = new LocalStorageProvider();
  return activeProvider;
}

export function isPersistentStorageConfigured(): boolean {
  return getStorageProvider().isPersistent();
}
