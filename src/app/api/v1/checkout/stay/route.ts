import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { enforceKycGate, KycRequiredError } from "@/modules/kyc/guards/enforceKycGate";
import { stayBookingService } from "@/modules/stays/services/StayBookingService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const StayCheckoutSchema = z.object({
  propertyId: z.string().uuid("Invalid property UUID"),
  checkInDate: z.string().datetime(),
  checkOutDate: z.string().datetime(),
  guestsCount: z.number().int().min(1).max(20).default(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to book stay", 401);
    }

    const userId = (session.user as any).id;

    // Strict KYC Compliance Gate
    await enforceKycGate(userId);

    const body = await req.json();
    const validation = StayCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid stay checkout parameters",
        422,
        validation.error.flatten()
      );
    }

    const { propertyId, checkInDate, checkOutDate, guestsCount } = validation.data;

    const result = await stayBookingService.initiateStayBooking({
      userId,
      propertyId,
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      guestsCount,
    });

    return ApiResponseHelper.success(result, undefined, 201);
  } catch (error: any) {
    if (error instanceof KycRequiredError || error.code === "KYC_REQUIRED") {
      return ApiResponseHelper.error("KYC_REQUIRED", error.message, 403);
    }

    if (error.message?.includes("DATES_NOT_AVAILABLE")) {
      return ApiResponseHelper.error(
        "CONFLICT_PROPERTY_LOCKED",
        "The selected dates are already booked for this property.",
        409
      );
    }

    console.error("[Stay Checkout Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to initiate stay booking",
      500
    );
  }
}
