import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { s3Storage } from "@/infrastructure/storage/S3StorageProvider";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const PresignUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    const validation = PresignUploadSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid file upload metadata",
        422,
        validation.error.flatten()
      );
    }

    const { fileName, contentType } = validation.data;

    const result = await s3Storage.generatePresignedUploadUrl({
      fileName,
      contentType,
      folder: `kyc-documents/${userId}`,
      expiresIn: 900, // 15 mins
    });

    return ApiResponseHelper.success(result);
  } catch (error: any) {
    console.error("[KYC Presign Upload Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to generate presigned upload URL",
      500
    );
  }
}
