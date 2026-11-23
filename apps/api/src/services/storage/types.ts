export interface StorageUploadResult {
  url: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
}

export interface IStorageProvider {
  /**
   * Upload an image buffer to storage
   */
  upload(storageKey: string, buffer: Buffer, mimeType: string): Promise<StorageUploadResult>;

  /**
   * Delete an image from storage
   */
  delete(storageKey: string): Promise<void>;

  /**
   * Derive the public canonical HTTPS URL for a given storage key
   */
  getPublicUrl(storageKey: string): string;

  /**
   * Returns whether this provider is persistent cloud object storage
   */
  isPersistent(): boolean;
}
