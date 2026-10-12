import { NextRequest } from "next/server";
import { prisma } from "@/infrastructure/database/prisma";
import { redisClient } from "@/infrastructure/redis/redisClient";
import { RateLimiter } from "@/lib/security/rateLimiter";
import { ApiResponseHelper } from "@/lib/api/response";
import { hash, compare } from "bcrypt";
import crypto from "crypto";
import { z } from "zod";

const RequestOtpSchema = z.object({
  emailOrPhone: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const ipAddress = RateLimiter.getClientIdentifier(req);

    // 1. Redis Rate Limiter: Max 3 OTP requests per 15 minutes
    const rateCheck = await RateLimiter.check(`auth_otp:${ipAddress}`, "AUTH");
    if (!rateCheck.success) {
      return ApiResponseHelper.error(
        "OTP_RATE_LIMITED",
        `Too many OTP requests. Please wait ${Math.ceil(rateCheck.resetSeconds / 60)} minutes before trying again.`,
        429,
        { retryAfterSeconds: rateCheck.resetSeconds }
      );
    }

    const body = await req.json();
    const validation = RequestOtpSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid login credentials format",
        422,
        validation.error.flatten()
      );
    }

    const { emailOrPhone, password } = validation.data;

    // 2. Validate email/phone and password first
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: emailOrPhone },
          { phoneNumber: emailOrPhone },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      return ApiResponseHelper.error(
        "INVALID_CREDENTIALS",
        "Invalid email/phone or password.",
        401
      );
    }

    const isPasswordValid = await compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return ApiResponseHelper.error(
        "INVALID_CREDENTIALS",
        "Invalid email/phone or password.",
        401
      );
    }

    // 3. Generate secure 6-digit numeric OTP
    const buffer = crypto.randomBytes(3);
    const rawOtp = ((buffer.readUIntBE(0, 3) % 900000) + 100000).toString();
    const otpHash = await hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // 4. Update user record with hashed OTP
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpHash,
        otpExpiresAt: expiresAt,
      },
    });

    // Also cache attempts in Redis
    await redisClient.set(
      `auth:otp_attempts:${user.id}`,
      JSON.stringify({ attempts: 0 }),
      "EX",
      300
    );

    console.log(`[SMS Gateway Simulated] Sent OTP ${rawOtp} to ${user.phoneNumber}`);

    return ApiResponseHelper.success({
      message: "Credentials verified. Verification code dispatched via SMS.",
      phoneNumberMasked: `${user.phoneNumber.slice(0, 3)}****${user.phoneNumber.slice(-4)}`,
      expiresInSeconds: 300,
      testOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
    });
  } catch (error: any) {
    console.error("[Send OTP Handler Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      "Unable to process authentication request at this time.",
      500
    );
  }
}
