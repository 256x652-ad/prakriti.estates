import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { enforceKycGate, KycRequiredError } from "@/modules/kyc/guards/enforceKycGate";
import { tenancyManagementService } from "@/modules/rentals/services/TenancyManagementService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const RentCheckoutSchema = z.object({
  propertyId: z.string().uuid("Invalid property UUID"),
  lockDurationHours: z.number().int().min(24).max(72).default(48),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to book rental", 401);
    }

    const userId = (session.user as any).id;

    // Strict KYC Compliance Gate
    await enforceKycGate(userId);

    const body = await req.json();
    const validation = RentCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid rental checkout parameters",
        422,
        validation.error.flatten()
      );
    }

    const { propertyId, lockDurationHours } = validation.data;

    const result = await tenancyManagementService.initiateRentalLock({
      userId,
      propertyId,
      lockDurationHours,
    });

    return ApiResponseHelper.success(result, undefined, 201);
  } catch (error: any) {
    if (error instanceof KycRequiredError || error.code === "KYC_REQUIRED") {
      return ApiResponseHelper.error("KYC_REQUIRED", error.message, 403);
    }

    console.error("[Rental Checkout Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to initiate rental checkout",
      500
    );
  }
}
