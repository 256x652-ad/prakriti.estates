import { NextRequest } from "next/server";
import { ApiResponseHelper } from "@/lib/api/response";
import { MobileAuthService } from "@/lib/auth/mobileTokens";
import { z } from "zod";

const RefreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RefreshSchema.safeParse(body);

    if (!parsed.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Missing or invalid refreshToken in body",
        422,
        parsed.error.flatten()
      );
    }

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const newTokens = await MobileAuthService.rotateRefreshToken(
      parsed.data.refreshToken,
      ipAddress,
      userAgent
    );

    return ApiResponseHelper.success({
      tokenType: "Bearer",
      ...newTokens,
    });
  } catch (error: any) {
    if (error.message === "INVALID_OR_EXPIRED_REFRESH_TOKEN") {
      return ApiResponseHelper.error("UNAUTHORIZED", "Refresh token is invalid, revoked, or expired", 401);
    }
    console.error("[API v1 Auth Refresh Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", "Failed to refresh session", 500);
  }
}
