import crypto from "crypto";
import { prisma } from "@/infrastructure/database/prisma";
import { DevicePlatform } from "@prisma/client";

const ACCESS_TOKEN_SECRET = process.env.NEXTAUTH_SECRET || "fallback-mobile-jwt-secret-key-123456";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface MobileJwtPayload {
  sub: string; // userId
  roles: string[];
  deviceId?: string;
  iat: number;
  exp: number;
}

export class MobileAuthService {
  /**
   * Generates a signed HMAC SHA256 JWT access token without external heavy dependencies
   */
  static generateAccessToken(userId: string, roles: string[], deviceId?: string): string {
    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
    const payload: MobileJwtPayload = {
      sub: userId,
      roles,
      deviceId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + ACCESS_TOKEN_TTL_MS) / 1000),
    };
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", ACCESS_TOKEN_SECRET)
      .update(`${header}.${body}`)
      .digest("base64url");
    return `${header}.${body}.${signature}`;
  }

  /**
   * Validates and extracts a mobile JWT access token
   */
  static verifyAccessToken(token: string): MobileJwtPayload | null {
    try {
      const [header, body, signature] = token.split(".");
      if (!header || !body || !signature) return null;

      const expectedSignature = crypto
        .createHmac("sha256", ACCESS_TOKEN_SECRET)
        .update(`${header}.${body}`)
        .digest("base64url");

      if (signature !== expectedSignature) return null;

      const payload: MobileJwtPayload = JSON.parse(Buffer.from(body, "base64url").toString());
      if (Date.now() / 1000 > payload.exp) return null; // Expired
      return payload;
    } catch {
      return null;
    }
  }

  /**
   * Issues a short-lived access token + securely hashes a long-lived refresh token in DB
   */
  static async issueTokenPair({
    userId,
    roles,
    deviceInfo,
    ipAddress,
    userAgent,
  }: {
    userId: string;
    roles: string[];
    deviceInfo?: {
      deviceId: string;
      platform: DevicePlatform;
      pushToken?: string;
      appVersion?: string;
      osVersion?: string;
      deviceModel?: string;
    };
    ipAddress?: string;
    userAgent?: string;
  }) {
    // 1. Register or update the Device record
    let deviceRecordId: string | undefined = undefined;
    if (deviceInfo) {
      const device = await prisma.device.upsert({
        where: {
          userId_deviceId: {
            userId,
            deviceId: deviceInfo.deviceId,
          },
        },
        create: {
          userId,
          deviceId: deviceInfo.deviceId,
          platform: deviceInfo.platform,
          pushToken: deviceInfo.pushToken,
          appVersion: deviceInfo.appVersion,
          osVersion: deviceInfo.osVersion,
          deviceModel: deviceInfo.deviceModel,
          lastActiveAt: new Date(),
        },
        update: {
          pushToken: deviceInfo.pushToken ?? undefined,
          appVersion: deviceInfo.appVersion ?? undefined,
          osVersion: deviceInfo.osVersion ?? undefined,
          status: "ACTIVE",
          lastActiveAt: new Date(),
        },
      });
      deviceRecordId = device.id;
    }

    // 2. Generate Access Token
    const accessToken = this.generateAccessToken(userId, roles, deviceInfo?.deviceId);

    // 3. Generate high-entropy Refresh Token
    const rawRefreshToken = crypto.randomBytes(40).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        deviceId: deviceRecordId,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_MS / 1000, // in seconds
    };
  }

  /**
   * Rotates a refresh token: revokes the previous token and issues a fresh pair
   */
  static async rotateRefreshToken(rawRefreshToken: string, ipAddress?: string, userAgent?: string) {
    const tokenHash = crypto.createHash("sha256").update(rawRefreshToken).digest("hex");

    const existingToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true, device: true },
    });

    if (!existingToken || existingToken.revokedAt || existingToken.expiresAt < new Date()) {
      throw new Error("INVALID_OR_EXPIRED_REFRESH_TOKEN");
    }

    // Revoke old token immediately (Token Rotation to prevent reuse attacks)
    await prisma.refreshToken.update({
      where: { id: existingToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new pair
    return this.issueTokenPair({
      userId: existingToken.userId,
      roles: existingToken.user.roles,
      deviceInfo: existingToken.device
        ? {
            deviceId: existingToken.device.deviceId,
            platform: existingToken.device.platform,
            pushToken: existingToken.device.pushToken ?? undefined,
          }
        : undefined,
      ipAddress,
      userAgent,
    });
  }
}
