export interface IStorageProvider {
  uploadFile(file: Buffer, path: string, mimeType: string): Promise<string>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  getSignedUploadUrl(path: string, expiresInSeconds: number): Promise<string>;
}
