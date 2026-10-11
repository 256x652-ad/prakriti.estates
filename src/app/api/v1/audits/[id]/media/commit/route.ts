import { NextRequest } from "next/server";
import { ApiResponseHelper } from "@/lib/api/response";
import { prisma } from "@/infrastructure/database/prisma";
import { z } from "zod";

const CommitRequestSchema = z.object({
  mediaUrl: z.string().url(),
  caption: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auditId } = await params;
    const body = await req.json();

    const parsed = CommitRequestSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid commit payload",
        422,
        parsed.error.flatten()
      );
    }

    const { mediaUrl } = parsed.data;

    // Atomically append mediaUrl to PropertyAudit.mediaUrls
    const updated = await prisma.propertyAudit.update({
      where: { id: auditId },
      data: {
        mediaUrls: {
          push: mediaUrl,
        },
      },
      select: {
        id: true,
        version: true,
        mediaUrls: true,
      },
    });

    return ApiResponseHelper.success({
      auditId: updated.id,
      mediaUrls: updated.mediaUrls,
      totalPhotos: updated.mediaUrls.length,
    });
  } catch (error: any) {
    console.error("[Commit Media Route Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", "Failed to commit media upload", 500);
  }
}
