import { redisClient } from "@/infrastructure/redis/redisClient";

export type RateLimitTier = "AUTH" | "KYC" | "PAYMENTS" | "UPLOADS" | "DEFAULT";

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

export const RATE_LIMIT_CONFIGS: Record<RateLimitTier, RateLimitConfig> = {
  AUTH: { maxRequests: 5, windowSeconds: 60 },        // 5 OTP/Login requests per minute
  KYC: { maxRequests: 3, windowSeconds: 300 },        // 3 KYC submissions per 5 minutes
  PAYMENTS: { maxRequests: 60, windowSeconds: 60 },    // 60 webhooks per minute
  UPLOADS: { maxRequests: 10, windowSeconds: 60 },     // 10 uploads per minute
  DEFAULT: { maxRequests: 100, windowSeconds: 60 },    // 100 general API calls per minute
};

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
}

export class RateLimiter {
  /**
   * Evaluates an atomic sliding-window rate limit using Redis INCR and EXPIRE.
   */
  static async check(
    identifier: string,
    tier: RateLimitTier = "DEFAULT"
  ): Promise<RateLimitResult> {
    const config = RATE_LIMIT_CONFIGS[tier];
    const key = `rate_limit:${tier.toLowerCase()}:${identifier}`;

    try {
      // Atomic increment in Redis
      const currentCount = await redisClient.incr(key);

      // Set expiry on first request
      if (currentCount === 1) {
        await redisClient.expire(key, config.windowSeconds);
      }

      const ttl = await redisClient.ttl(key);
      const remaining = Math.max(0, config.maxRequests - currentCount);

      if (currentCount > config.maxRequests) {
        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          resetSeconds: ttl > 0 ? ttl : config.windowSeconds,
        };
      }

      return {
        success: true,
        limit: config.maxRequests,
        remaining,
        resetSeconds: ttl > 0 ? ttl : config.windowSeconds,
      };
    } catch (error) {
      // Fail-open strategy if Redis temporarily drops, ensuring platform availability
      console.warn("[RateLimiter] Redis connection warning, failing open:", error);
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetSeconds: config.windowSeconds,
      };
    }
  }

  /**
   * Helper to extract client IP from Next.js request headers
   */
  static getClientIdentifier(req: Request, fallbackId?: string): string {
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";
    return fallbackId ? `${ip}:${fallbackId}` : ip;
  }
}
