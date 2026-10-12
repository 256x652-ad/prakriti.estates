import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { enforceKycGate, KycRequiredError } from "@/modules/kyc/guards/enforceKycGate";
import { propertyLockTransactionService } from "@/modules/transactions/services/PropertyLockTransactionService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const TokenCreationSchema = z.object({
  propertyId: z.string().uuid("Invalid property UUID"),
  lockDurationHours: z.number().int().min(24).max(72).default(48),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to lock property", 401);
    }

    const userId = (session.user as any).id;

    // 1. Strict KYC Gate Enforcement
    await enforceKycGate(userId);

    const body = await req.json();
    const validation = TokenCreationSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid token lock parameters",
        422,
        validation.error.flatten()
      );
    }

    const { propertyId, lockDurationHours } = validation.data;

    // 2. Initiate Lock and Gateway Order
    const result = await propertyLockTransactionService.initiateLockTokenOrder({
      userId,
      propertyId,
      lockDurationHours,
    });

    return ApiResponseHelper.success(result, undefined, 201);
  } catch (error: any) {
    if (error instanceof KycRequiredError || error.code === "KYC_REQUIRED") {
      return ApiResponseHelper.error("KYC_REQUIRED", error.message, 403);
    }

    if (error.message === "PROPERTY_NOT_FOUND") {
      return ApiResponseHelper.error("NOT_FOUND", "Property not found", 404);
    }

    if (error.message === "CONFLICT_PROPERTY_LOCKED") {
      return ApiResponseHelper.error(
        "CONFLICT_PROPERTY_LOCKED",
        "Property is already locked under an active booking deposit",
        409
      );
    }

    if (error.message === "PROPERTY_NOT_AVAILABLE_FOR_TOKEN") {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Property is not published or available for token lock",
        400
      );
    }

    console.error("[Token Creation Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to initiate property lock token",
      500
    );
  }
}
