import { NextRequest } from "next/server";
import { ApiResponseHelper } from "@/lib/api/response";
import { prisma } from "@/infrastructure/database/prisma";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-south-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "mock-key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "mock-secret",
  },
});

const PresignRequestSchema = z.object({
  filename: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|heic)$/),
  fileSizeBytes: z.number().max(25 * 1024 * 1024), // Max 25MB per site photo
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auditId } = await params;
    const body = await req.json();

    const parsed = PresignRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid file upload request",
        422,
        parsed.error.flatten()
      );
    }

    const audit = await prisma.propertyAudit.findUnique({
      where: { id: auditId },
    });

    if (!audit) {
      return ApiResponseHelper.error("NOT_FOUND", "Property audit not found", 404);
    }

    const { filename, contentType } = parsed.data;
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
    const s3Key = `audits/${auditId}/${Date.now()}_${sanitizedFilename}`;
    const bucket = process.env.AWS_S3_BUCKET || "prakriti-estates-receipts";

    // Generate Pre-Signed S3 Upload URL (valid for 15 minutes)
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 900 });
    const finalPublicUrl = `https://${bucket}.s3.${process.env.AWS_REGION || "ap-south-1"}.amazonaws.com/${s3Key}`;

    return ApiResponseHelper.success({
      uploadUrl,
      finalPublicUrl,
      s3Key,
      expiresInSeconds: 900,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error: any) {
    console.error("[Presign Route Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", "Failed to generate presigned upload URL", 500);
  }
}
