import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { consultantAuditWorkflowService } from "@/modules/consultancy/services/ConsultantAuditWorkflowService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const ClaimRequestSchema = z.object({
  serviceRequestId: z.string().uuid("Invalid service request UUID"),
});

const SubmitReportSchema = z.object({
  serviceRequestId: z.string().uuid("Invalid service request UUID"),
  auditType: z.enum(["STRUCTURAL", "VASTU", "LEGAL"]),
  score: z.number().min(0).max(100),
  findings: z.string().min(10, "Detailed findings are required"),
  recommendations: z.string().optional(),
  reportPdfUrl: z.string().url().optional(),
  isPublic: z.boolean().default(false),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const userId = (session.user as any).id;
    const data = await consultantAuditWorkflowService.getConsultantRequests(userId);

    return ApiResponseHelper.success(data);
  } catch (error: any) {
    console.error("[Consultant Requests GET Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to fetch consultant requests",
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const userId = (session.user as any).id;
    const body = await req.json();

    // Check if this is a claim request or a report submission
    if (body.action === "claim") {
      const validation = ClaimRequestSchema.safeParse(body);
      if (!validation.success) {
        return ApiResponseHelper.error("VALIDATION_ERROR", "Invalid claim request", 422, validation.error.flatten());
      }
      const claimed = await consultantAuditWorkflowService.claimServiceRequest(
        validation.data.serviceRequestId,
        userId
      );
      return ApiResponseHelper.success(claimed);
    }

    if (body.action === "start") {
      const started = await consultantAuditWorkflowService.startAudit(body.serviceRequestId, userId);
      return ApiResponseHelper.success(started);
    }

    // Default: Submit finalized audit report
    const validation = SubmitReportSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error("VALIDATION_ERROR", "Invalid report submission details", 422, validation.error.flatten());
    }

    const report = await consultantAuditWorkflowService.submitAuditReport({
      ...validation.data,
      consultantId: userId,
    });

    return ApiResponseHelper.success(report, undefined, 201);
  } catch (error: any) {
    console.error("[Consultant Workflow POST Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to process consultant action",
      500
    );
  }
}
