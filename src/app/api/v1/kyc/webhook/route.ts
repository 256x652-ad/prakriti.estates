import { NextRequest } from "next/server";
import { kycService } from "@/modules/kyc/services/KycService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const KycWebhookSchema = z.object({
  event: z.enum(["kyc.completed", "kyc.failed", "kyc.manual_review"]),
  referenceId: z.string(),
  status: z.enum(["VERIFIED", "FAILED", "MANUAL_REVIEW", "PENDING"]),
  failureReason: z.string().optional(),
  signature: z.string().optional(),
  timestamp: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = KycWebhookSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid webhook payload structure",
        422,
        validation.error.flatten()
      );
    }

    const webhookPayload = {
      ...validation.data,
      timestamp: validation.data.timestamp || new Date().toISOString(),
    };

    const updated = await kycService.processWebhook(webhookPayload);

    return ApiResponseHelper.success({
      received: true,
      referenceId: updated.providerRef,
      status: updated.status,
    });
  } catch (error: any) {
    console.error("[KYC Webhook Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to process KYC provider webhook",
      500
    );
  }
}
