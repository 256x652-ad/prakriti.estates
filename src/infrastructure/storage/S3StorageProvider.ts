import { IStorageProvider } from "@/core/providers/IStorageProvider";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3StorageProvider implements IStorageProvider {
  private client: S3Client;
  private publicBucket: string;
  private privateBucket: string;

  constructor() {
    this.client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    this.publicBucket = process.env.AWS_S3_PUBLIC_BUCKET!;
    this.privateBucket = process.env.AWS_S3_PRIVATE_BUCKET!;
  }

  private getBucketForPath(path: string): string {
    // Determine bucket based on prefix. 
    // e.g. "kyc/doc.pdf" -> private, "properties/img.jpg" -> public
    return path.startsWith("private/") ? this.privateBucket : this.publicBucket;
  }

  async uploadFile(file: Buffer, path: string, mimeType: string): Promise<string> {
    const bucket = this.getBucketForPath(path);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
      Body: file,
      ContentType: mimeType,
    });

    await this.client.send(command);
    return path;
  }

  async deleteFile(path: string): Promise<void> {
    const bucket = this.getBucketForPath(path);
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    await this.client.send(command);
  }

  async getFileUrl(path: string): Promise<string> {
    const bucket = this.getBucketForPath(path);
    
    // For public bucket, we can return the direct CDN/S3 URL
    if (bucket === this.publicBucket) {
      return `https://${this.publicBucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${path}`;
    }

    // For private files, generate a signed read URL with short expiry (e.g., 5 mins)
    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: path,
    });
    return getSignedUrl(this.client, command, { expiresIn: 300 });
  }

  async getSignedUploadUrl(path: string, expiresInSeconds: number = 600): Promise<string> {
    const bucket = this.getBucketForPath(path);
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: path,
    });

    // Returns a URL that the client can use to upload a file directly to S3
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
