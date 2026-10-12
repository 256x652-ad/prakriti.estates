import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export interface PresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
  expiresInSeconds: number;
}

export class S3StorageProvider {
  private client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || "ap-south-1";
    this.bucket = process.env.AWS_S3_PUBLIC_BUCKET || "prakriti-estates-public";
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "MOCK_KEY",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "MOCK_SECRET",
      },
    });
  }

  /**
   * Generates a pre-signed S3 URL for secure direct uploads from browser/mobile clients
   */
  async generatePresignedUploadUrl(params: {
    fileName: string;
    contentType: string;
    folder?: string;
    expiresIn?: number;
  }): Promise<PresignedUploadResult> {
    const folder = params.folder || "properties";
    const extension = params.fileName.split(".").pop() || "jpg";
    const secureId = crypto.randomUUID();
    const fileKey = `${folder}/${secureId}.${extension}`;
    const expiresIn = params.expiresIn || 900; // 15 minutes

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: fileKey,
      ContentType: params.contentType,
    });

    const uploadUrl = await getSignedUrl(this.client, command, { expiresIn });
    const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${fileKey}`;

    return {
      uploadUrl,
      publicUrl,
      fileKey,
      expiresInSeconds: expiresIn,
    };
  }
}

export const s3Storage = new S3StorageProvider();
