import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/services/AuthService";
import { RegisterSchema } from "@/modules/auth/schemas/authSchemas";
import { ApiResponseHelper } from "@/lib/api/response";
import { RateLimiter } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = RateLimiter.getClientIdentifier(req);

    // Rate limit registration requests per IP
    const rateCheck = await RateLimiter.check(`reg:${ipAddress}`, "AUTH");
    if (!rateCheck.success) {
      return ApiResponseHelper.error(
        "RATE_LIMIT_EXCEEDED",
        `Too many registration attempts. Please wait ${rateCheck.resetSeconds}s.`,
        429
      );
    }

    const body = await req.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid registration details",
        422,
        validation.error.flatten()
      );
    }

    const result = await AuthService.registerUser({
      ...validation.data,
      ipAddress,
    });

    return ApiResponseHelper.success(
      {
        user: {
          id: result.user.id,
          phoneNumber: result.user.phoneNumber,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          roles: result.user.roles,
          kycStatus: result.user.kycStatus,
        },
        otp: result.otpResult,
      },
      undefined,
      201
    );
  } catch (error: any) {
    console.error("[Register Error]", error);
    return ApiResponseHelper.error(
      "REGISTRATION_FAILED",
      error.message || "Failed to complete registration",
      400
    );
  }
}
