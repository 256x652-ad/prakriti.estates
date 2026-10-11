import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/services/AuthService";
import { SendOtpSchema } from "@/modules/auth/schemas/authSchemas";
import { ApiResponseHelper } from "@/lib/api/response";
import { RateLimiter } from "@/lib/security/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const ipAddress = RateLimiter.getClientIdentifier(req);

    const body = await req.json();
    const validation = SendOtpSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid phone number supplied",
        422,
        validation.error.flatten()
      );
    }

    const result = await AuthService.requestOtp(validation.data.phoneNumber, ipAddress);

    return ApiResponseHelper.success(result, 200);
  } catch (error: any) {
    console.error("[Send OTP Error]", error);
    return ApiResponseHelper.error(
      "OTP_SEND_FAILED",
      error.message || "Failed to dispatch verification code",
      400
    );
  }
}
