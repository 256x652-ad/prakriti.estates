import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { s3Storage } from "@/infrastructure/storage/S3StorageProvider";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const PresignRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().regex(/^image\/(jpeg|png|webp|avif)$/, "Only JPEG, PNG, WebP, and AVIF are supported"),
  folder: z.string().default("properties"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to upload media", 401);
    }

    const body = await req.json();
    const validation = PresignRequestSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error("VALIDATION_ERROR", "Invalid file parameters", 422, validation.error.flatten());
    }

    const result = await s3Storage.generatePresignedUploadUrl(validation.data);
    return ApiResponseHelper.success(result);
  } catch (error: any) {
    console.error("[Presign Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", "Failed to generate pre-signed upload URL", 500);
  }
}
