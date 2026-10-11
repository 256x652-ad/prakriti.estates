import { NextRequest } from "next/server";
import { ApiResponseHelper } from "@/lib/api/response";
import { AuditSyncService } from "@/modules/consultancy/services/AuditSyncService";
import { z } from "zod";

const SyncPayloadSchema = z.object({
  consultantId: z.string().min(1),
  clientVersion: z.number().int().nonnegative(),
  clientUpdatedAt: z.string().datetime(),
  status: z.enum(["DRAFT", "IN_REVIEW", "SUBMITTED", "SYNCHRONIZED"]),
  score: z.number().min(0).max(100).optional(),
  findings: z.string().optional(),
  checklist: z
    .array(
      z.object({
        itemId: z.string(),
        label: z.string(),
        passed: z.boolean(),
        notes: z.string().optional(),
        timestamp: z.string(),
      })
    )
    .optional(),
  measurements: z
    .array(
      z.object({
        area: z.string(),
        dimension: z.string(),
        deflectionMm: z.number().optional(),
        remarks: z.string().optional(),
        timestamp: z.string(),
      })
    )
    .optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: auditId } = await params;
    const body = await req.json();

    const parsed = SyncPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid audit sync payload",
        422,
        parsed.error.flatten()
      );
    }

    const syncService = new AuditSyncService();
    const result = await syncService.syncAudit({
      auditId,
      ...parsed.data,
    });

    if (result.status === "CONFLICT_DETECTED") {
      return ApiResponseHelper.error(
        "CONFLICT_PROPERTY_LOCKED", // Mapping to conflict error code
        "Version conflict detected. Server has newer changes.",
        409,
        result.conflictDetails
      );
    }

    return ApiResponseHelper.success(result.data);
  } catch (error: any) {
    if (error.message === "AUDIT_NOT_FOUND") {
      return ApiResponseHelper.error("NOT_FOUND", "Property audit not found", 404);
    }
    if (error.message === "UNAUTHORIZED_AUDIT_SYNC") {
      return ApiResponseHelper.error("FORBIDDEN", "You are not assigned to this audit", 403);
    }
    console.error("[Audit Sync Route Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", "Failed to sync audit data", 500);
  }
}
