import { prisma } from "@/infrastructure/database/prisma";
import { redisClient } from "@/infrastructure/redis/redisClient";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { RateLimiter } from "@/lib/security/rateLimiter";
import { hash, compare } from "bcrypt";
import crypto from "crypto";
import { Role } from "@prisma/client";

export interface SendOtpResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  testOtp?: string; // Only provided in non-production environments
}

export interface VerifyOtpResult {
  success: boolean;
  userId?: string;
  phoneNumber?: string;
  roles?: Role[];
  kycStatus?: string;
  error?: string;
}

export class AuthService {
  private static OTP_EXPIRY_SECONDS = 300; // 5 minutes
  private static MAX_OTP_ATTEMPTS = 5;

  /**
   * Generates a secure numeric 6-digit OTP
   */
  private static generateNumericOtp(): string {
    const buffer = crypto.randomBytes(3);
    const num = (buffer.readUIntBE(0, 3) % 900000) + 100000;
    return num.toString();
  }

  /**
   * Step 1: Request SMS OTP with Redis Rate Limiting and Audit Trail
   */
  static async requestOtp(phoneNumber: string, ipAddress: string): Promise<SendOtpResult> {
    // 1. Rate Limiting Check (5 OTP requests per minute per IP/Phone)
    const rateCheck = await RateLimiter.check(`otp:${phoneNumber}`, "AUTH");
    if (!rateCheck.success) {
      throw new Error(`Too many OTP requests. Please try again in ${rateCheck.resetSeconds}s.`);
    }

    // 2. Generate OTP
    const rawOtp = this.generateNumericOtp();
    const otpHashValue = await hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_SECONDS * 1000);

    // 3. Persist OTP state in Redis with TTL for fast verification & attempts tracking
    const redisOtpKey = `auth:otp:${phoneNumber}`;
    await redisClient.set(
      redisOtpKey,
      JSON.stringify({
        otpHash: otpHashValue,
        attempts: 0,
        expiresAt: expiresAt.toISOString(),
      }),
      "EX",
      this.OTP_EXPIRY_SECONDS
    );

    // Also update User record if user exists
    const existingUser = await prisma.user.findUnique({ where: { phoneNumber } });
    if (existingUser) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          otpHash: otpHashValue,
          otpExpiresAt: expiresAt,
        },
      });
    }

    // 4. Log system action (Non-sensitive metadata)
    await AuditLogService.logSystemAction({
      actorId: existingUser?.id || "ANONYMOUS",
      actorRole: existingUser?.roles[0] || "USER",
      actionType: "ADMIN_OVERRIDE", // Generic audit trail entry
      targetEntity: "UserAuth",
      targetId: phoneNumber,
      ipAddress,
      metadata: { event: "SMS_OTP_DISPATCHED", phoneNumberMasked: phoneNumber.slice(-4) },
    });

    console.log(`[SMS Gateway Simulated] Sent OTP ${rawOtp} to ${phoneNumber}`);

    return {
      success: true,
      message: "Verification code sent via SMS",
      expiresInSeconds: this.OTP_EXPIRY_SECONDS,
      testOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
    };
  }

  /**
   * Step 2: Register user with phone, name, and chosen role
   */
  static async registerUser(params: {
    phoneNumber: string;
    firstName: string;
    lastName: string;
    email?: string;
    role: "BUYER" | "SELLER" | "USER" | "CONSULTANT";
    ipAddress: string;
  }) {
    // Check if phone already registered
    const existing = await prisma.user.findUnique({
      where: { phoneNumber: params.phoneNumber },
    });

    if (existing) {
      throw new Error("An account is already registered with this phone number. Please login.");
    }

    // Create user in PENDING KYC status
    const assignedRole: Role = (Role as any)[params.role] || Role.USER;
    const user = await prisma.user.create({
      data: {
        phoneNumber: params.phoneNumber,
        firstName: params.firstName,
        lastName: params.lastName,
        roles: [assignedRole],
        kycStatus: "PENDING",
      },
    });

    // Record audit creation
    await AuditLogService.logSystemAction({
      actorId: user.id,
      actorRole: user.roles[0],
      actionType: "ADMIN_OVERRIDE",
      targetEntity: "User",
      targetId: user.id,
      ipAddress: params.ipAddress,
      metadata: { event: "USER_REGISTERED", role: assignedRole },
    });

    // Automatically trigger OTP verification dispatch
    const otpResult = await this.requestOtp(params.phoneNumber, params.ipAddress);

    return {
      user,
      otpResult,
    };
  }

  /**
   * Step 3: Verify SMS OTP
   */
  static async verifyOtp(phoneNumber: string, inputOtp: string, ipAddress: string): Promise<VerifyOtpResult> {
    const redisOtpKey = `auth:otp:${phoneNumber}`;
    const rawStored = await redisClient.get(redisOtpKey);

    let otpHash: string | null = null;

    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      if (parsed.attempts >= this.MAX_OTP_ATTEMPTS) {
        await redisClient.del(redisOtpKey);
        throw new Error("Maximum OTP verification attempts exceeded. Please request a new code.");
      }

      parsed.attempts += 1;
      await redisClient.set(redisOtpKey, JSON.stringify(parsed), "KEEPTTL");
      otpHash = parsed.otpHash;
    } else {
      // Fallback check on User table
      const user = await prisma.user.findUnique({ where: { phoneNumber } });
      if (user && user.otpHash && user.otpExpiresAt && user.otpExpiresAt > new Date()) {
        otpHash = user.otpHash;
      }
    }

    if (!otpHash) {
      throw new Error("OTP has expired or was not requested. Please request a new code.");
    }

    const isValid = await compare(inputOtp, otpHash);
    if (!isValid) {
      throw new Error("Invalid verification code. Please check and try again.");
    }

    // Clear OTP after successful use
    await redisClient.del(redisOtpKey);

    // Fetch and activate user if pending activation
    let user = await prisma.user.findUnique({ where: { phoneNumber } });

    if (!user) {
      // Auto-provision user on verified phone if logging in first time
      user = await prisma.user.create({
        data: {
          phoneNumber,
          roles: [Role.BUYER],
          kycStatus: "PENDING",
        },
      });
    }

    // Clean up OTP hash on user record
    await prisma.user.update({
      where: { id: user.id },
      data: { otpHash: null, otpExpiresAt: null },
    });

    // Record audit verification
    await AuditLogService.logSystemAction({
      actorId: user.id,
      actorRole: user.roles[0],
      actionType: "ADMIN_OVERRIDE",
      targetEntity: "UserAuth",
      targetId: user.id,
      ipAddress,
      metadata: { event: "OTP_VERIFIED_SUCCESS", userId: user.id },
    });

    return {
      success: true,
      userId: user.id,
      phoneNumber: user.phoneNumber,
      roles: user.roles,
      kycStatus: user.kycStatus,
    };
  }
}
