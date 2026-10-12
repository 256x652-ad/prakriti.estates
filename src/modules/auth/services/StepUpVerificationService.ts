import { prisma } from "@/infrastructure/database/prisma";
import { redisClient } from "@/infrastructure/redis/redisClient";
import { notificationService } from "@/modules/notifications/services/NotificationService";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { hash, compare } from "bcrypt";
import crypto from "crypto";

export type StepUpAction =
  | "PROPERTY_LOCK"
  | "ESCROW_RELEASE"
  | "DISPUTE_RESOLUTION"
  | "BANK_ACCOUNT_CHANGE"
  | "FEE_CONFIG_MUTATION"
  | "HIGH_VALUE_TRANSACTION";

export interface StepUpChallengeResponse {
  success: boolean;
  action: StepUpAction;
  phoneNumberMasked: string;
  expiresInSeconds: number;
  testOtp?: string; // Exposed only in development
}

export interface StepUpVerificationResult {
  verified: boolean;
  stepUpToken: string;
  action: StepUpAction;
  expiresAt: string;
}

export class StepUpVerificationService {
  private readonly OTP_TTL_SECONDS = 300; // 5 minutes
  private readonly TOKEN_TTL_SECONDS = 600; // 10 minutes verification window

  /**
   * Generates and dispatches an SMS OTP challenge for critical transactions
   */
  async requestChallenge(userId: string, action: StepUpAction): Promise<StepUpChallengeResponse> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, phoneNumber: true, email: true },
    });

    if (!user || !user.phoneNumber) {
      throw new Error("User phone number not found for step-up verification.");
    }

    // Generate secure 6-digit OTP
    const buffer = crypto.randomBytes(3);
    const rawOtp = ((buffer.readUIntBE(0, 3) % 900000) + 100000).toString();
    const otpHash = await hash(rawOtp, 10);

    const redisKey = `auth:step_up:${userId}:${action}`;
    await redisClient.set(redisKey, JSON.stringify({ otpHash, attempts: 0 }), "EX", this.OTP_TTL_SECONDS);

    // Send simulated / real SMS
    console.log(`[StepUp2FA] 🔐 Dispatched Step-Up OTP ${rawOtp} to ${user.phoneNumber} for action: ${action}`);

    const masked = `${user.phoneNumber.slice(0, 3)}****${user.phoneNumber.slice(-4)}`;

    return {
      success: true,
      action,
      phoneNumberMasked: masked,
      expiresInSeconds: this.OTP_TTL_SECONDS,
      testOtp: process.env.NODE_ENV !== "production" ? rawOtp : undefined,
    };
  }

  /**
   * Verifies the step-up SMS OTP and returns a signed short-lived execution token
   */
  async verifyChallenge(
    userId: string,
    action: StepUpAction,
    otp: string
  ): Promise<StepUpVerificationResult> {
    const redisKey = `auth:step_up:${userId}:${action}`;
    const rawData = await redisClient.get(redisKey);

    if (!rawData) {
      throw new Error("Verification code expired or not requested. Please request a new code.");
    }

    const { otpHash, attempts } = JSON.parse(rawData);

    if (attempts >= 3) {
      await redisClient.del(redisKey);
      throw new Error("Too many invalid attempts. Verification code revoked.");
    }

    const isValid = await compare(otp, otpHash);
    if (!isValid) {
      await redisClient.set(
        redisKey,
        JSON.stringify({ otpHash, attempts: attempts + 1 }),
        "EX",
        this.OTP_TTL_SECONDS
      );
      throw new Error("Invalid verification code. Please check and try again.");
    }

    // Delete used OTP
    await redisClient.del(redisKey);

    // Generate signed Step-Up Action Token
    const stepUpToken = crypto.randomBytes(24).toString("hex");
    const tokenKey = `auth:step_up_token:${stepUpToken}`;
    const expiresAt = new Date(Date.now() + this.TOKEN_TTL_SECONDS * 1000).toISOString();

    await redisClient.set(
      tokenKey,
      JSON.stringify({ userId, action, verifiedAt: new Date().toISOString() }),
      "EX",
      this.TOKEN_TTL_SECONDS
    );

    // Audit Log the high-value step-up verification
    await AuditLogService.logSystemAction({
      actorId: userId,
      actionType: "ADMIN_OVERRIDE",
      targetEntity: `StepUpAuth:${action}`,
      reasonCode: `STEP_UP_2FA_VERIFIED_${action}`,
    });

    console.log(`[StepUp2FA] ✅ Step-Up Verified for User #${userId} on action: ${action}`);

    return {
      verified: true,
      stepUpToken,
      action,
      expiresAt,
    };
  }

  /**
   * Validates if a high-impact operation has a valid verified step-up token
   */
  async validateToken(stepUpToken: string, expectedAction: StepUpAction, expectedUserId: string): Promise<boolean> {
    const tokenKey = `auth:step_up_token:${stepUpToken}`;
    const raw = await redisClient.get(tokenKey);
    if (!raw) return false;

    const data = JSON.parse(raw);
    return data.userId === expectedUserId && data.action === expectedAction;
  }
}

export const stepUpVerificationService = new StepUpVerificationService();
