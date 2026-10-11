import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/services/AuthService";
import { VerifyOtpSchema } from "@/modules/auth/schemas/authSchemas";
import { ApiResponseHelper } from "@/lib/api/response";
import { RateLimiter } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = RateLimiter.getClientIdentifier(req);

    const body = await req.json();
    const validation = VerifyOtpSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid OTP verification parameters",
        422,
        validation.error.flatten()
      );
    }

    const { phoneNumber, otp } = validation.data;
    const result = await AuthService.verifyOtp(phoneNumber, otp, ipAddress);

    return ApiResponseHelper.success(result, 200);
  } catch (error: any) {
    console.error("[Verify OTP Error]", error);
    return ApiResponseHelper.error(
      "OTP_VERIFY_FAILED",
      error.message || "Invalid or expired verification code",
      400
    );
  }
}
