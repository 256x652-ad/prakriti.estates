import { NextRequest } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { ApiResponseHelper } from "@/lib/api/response";
import { MobileAuthService } from "@/lib/auth/mobileTokens";
import { z } from "zod";

const TokenExchangeSchema = z.object({
  phoneNumber: z.string().min(10),
  otp: z.string().optional(), // For SMS OTP authentication
  device: z.object({
    deviceId: z.string().min(1),
    platform: z.enum(["IOS", "ANDROID", "WEB"]),
    pushToken: z.string().optional(),
    appVersion: z.string().optional(),
    osVersion: z.string().optional(),
    deviceModel: z.string().optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = TokenExchangeSchema.safeParse(body);

    if (!parsed.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid token exchange request",
        422,
        parsed.error.flatten()
      );
    }

    const { phoneNumber, device } = parsed.data;

    // Look up user
    const user = await prisma.user.findUnique({
      where: { phoneNumber },
    });

    if (!user) {
      return ApiResponseHelper.error("NOT_FOUND", "User not registered with this phone number", 404);
    }

    // Capture request telemetry
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Issue tokens and register device
    const tokens = await MobileAuthService.issueTokenPair({
      userId: user.id,
      roles: user.roles,
      deviceInfo: {
        deviceId: device.deviceId,
        platform: device.platform,
        pushToken: device.pushToken,
        appVersion: device.appVersion,
        osVersion: device.osVersion,
        deviceModel: device.deviceModel,
      },
      ipAddress,
      userAgent,
    });

    return ApiResponseHelper.success({
      tokenType: "Bearer",
      ...tokens,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
        kycStatus: user.kycStatus,
      },
    });
  } catch (error: any) {
    console.error("[API v1 Auth Token Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", "Failed to exchange token", 500);
  }
}
