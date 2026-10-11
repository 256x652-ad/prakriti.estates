import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export type DocumentClassification = "KYC_DOCUMENT" | "LEGAL_AGREEMENT" | "PROPERTY_PHOTO" | "PUBLIC_ASSET";

export interface SecureUploadOptions {
  classification: DocumentClassification;
  buffer: Buffer;
  mimeType: string;
  originalFilename: string;
  userId: string;
}

export interface UploadResult {
  key: string;
  url: string;
  isPrivate: boolean;
  fileSizeBytes: number;
  mimeType: string;
}

// Approved MIME Types and extensions
const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export class SecureFilePipeline {
  private s3: S3Client;
  private publicBucket: string;
  private privateBucket: string;
  private region: string;

  constructor() {
    this.region = process.env.AWS_REGION || "ap-south-1";
    this.publicBucket = process.env.AWS_S3_PUBLIC_BUCKET || "prakriti-estates-public";
    this.privateBucket = process.env.AWS_S3_PRIVATE_BUCKET || "prakriti-estates-private-kyc";

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock-key",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock-secret",
      },
    });
  }

  /**
   * Securely uploads a document, enforcing strict MIME validation, UUID file keys,
   * and isolated public/private bucket storage.
   */
  async uploadSecureDocument(options: SecureUploadOptions): Promise<UploadResult> {
    const { classification, buffer, mimeType, userId } = options;

    // 1. Strict MIME Type Validation
    const extension = ALLOWED_MIME_TYPES[mimeType.toLowerCase()];
    if (!extension) {
      throw new Error(`DISALLOWED_MIME_TYPE: File type '${mimeType}' is not permitted.`);
    }

    // 2. Prevent Overwrites & Path Traversal (Generate cryptographically random UUID name)
    const randomHash = crypto.randomBytes(16).toString("hex");
    const timestamp = Date.now();
    const secureKey = `${classification.toLowerCase()}/${userId}/${timestamp}_${randomHash}${extension}`;

    // 3. Bucket Routing by Classification
    const isPrivate = classification === "KYC_DOCUMENT" || classification === "LEGAL_AGREEMENT";
    const targetBucket = isPrivate ? this.privateBucket : this.publicBucket;

    // 4. Dispatch PutObject to S3
    const command = new PutObjectCommand({
      Bucket: targetBucket,
      Key: secureKey,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        userId,
        classification,
        uploadedAt: new Date().toISOString(),
      },
      // Private documents have no public ACL
      ...(isPrivate ? {} : { ACL: "public-read" }),
    });

    await this.s3.send(command);

    // 5. Construct URL
    // Public files get permanent CDN/S3 URL; Private files return the S3 key
    const url = isPrivate
      ? `s3://${targetBucket}/${secureKey}`
      : `https://${targetBucket}.s3.${this.region}.amazonaws.com/${secureKey}`;

    return {
      key: secureKey,
      url,
      isPrivate,
      fileSizeBytes: buffer.length,
      mimeType,
    };
  }

  /**
   * Generates a short-lived (15 min) pre-signed URL to securely view private KYC/Legal documents
   */
  async getPrivateDocumentDownloadUrl(key: string, expiresInSeconds: number = 900): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: key,
    });

    return await getSignedUrl(this.s3, command, { expiresIn: expiresInSeconds });
  }
}
