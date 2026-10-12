import { prisma } from "@/infrastructure/database/prisma";
import { redisClient } from "@/infrastructure/redis/redisClient";

const SETTINGS_CACHE_PREFIX = "config:setting:";
const FLAGS_CACHE_PREFIX = "config:flag:";
const CACHE_TTL_SECONDS = 300; // 5 minutes cache

export interface FlagEvaluationContext {
  userId?: string;
  role?: string;
}

export class ConfigurationService {
  /**
   * Retrieves a dynamic GlobalSetting with Redis caching.
   */
  static async getSetting<T = any>(key: string, defaultValue?: T): Promise<T> {
    const cacheKey = `${SETTINGS_CACHE_PREFIX}${key}`;

    try {
      // 1. Try Redis Cache
      const cached = await redisClient.get(cacheKey);
      if (cached !== null) {
        return JSON.parse(cached) as T;
      }
    } catch (err) {
      console.warn(`[ConfigurationService] Redis read failed for ${key}:`, err);
    }

    // 2. Database Fallback
    const setting = await prisma.globalSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return defaultValue as T;
    }

    const value = setting.value as T;

    // 3. Write back to Redis
    try {
      await redisClient.set(cacheKey, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
    } catch (err) {
      console.warn(`[ConfigurationService] Redis set failed for ${key}:`, err);
    }

    return value;
  }

  /**
   * Evaluates if a Feature Flag is enabled with rollout & targeting support.
   */
  static async isFeatureEnabled(
    flagName: string,
    context?: FlagEvaluationContext
  ): Promise<boolean> {
    const cacheKey = `${FLAGS_CACHE_PREFIX}${flagName}`;

    let flagData: {
      isEnabled: boolean;
      rolloutPct: number;
      rules: any;
    } | null = null;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached !== null) {
        flagData = JSON.parse(cached);
      }
    } catch (err) {
      console.warn(`[ConfigurationService] Redis read failed for flag ${flagName}:`, err);
    }

    // Fetch from database if not cached
    if (!flagData) {
      const dbFlag = await prisma.featureFlag.findUnique({
        where: { name: flagName },
      });

      if (!dbFlag) {
        return false; // Default disabled if flag does not exist
      }

      flagData = {
        isEnabled: dbFlag.isEnabled,
        rolloutPct: dbFlag.rolloutPct,
        rules: dbFlag.rules,
      };

      try {
        await redisClient.set(cacheKey, JSON.stringify(flagData), "EX", CACHE_TTL_SECONDS);
      } catch (err) {
        console.warn(`[ConfigurationService] Redis set failed for flag ${flagName}:`, err);
      }
    }

    // Master kill switch
    if (!flagData.isEnabled) {
      return false;
    }

    // Role targeting check
    if (context?.role && flagData.rules?.allowedRoles) {
      const allowedRoles = flagData.rules.allowedRoles as string[];
      if (!allowedRoles.includes(context.role)) {
        return false;
      }
    }

    // Gradual percentage rollout evaluation
    if (flagData.rolloutPct < 100) {
      if (context?.userId) {
        // Deterministic hash of userId + flagName for sticky rollout percentage
        let hash = 0;
        const str = `${context.userId}:${flagName}`;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        const userPercentile = Math.abs(hash) % 100;
        return userPercentile < flagData.rolloutPct;
      } else {
        return false;
      }
    }

    return true;
  }

  /**
   * Instantly evicts cache keys across Redis cluster
   */
  static async invalidateSetting(key: string): Promise<void> {
    try {
      await redisClient.del(`${SETTINGS_CACHE_PREFIX}${key}`);
    } catch (err) {
      console.error(`[ConfigurationService] Invalidation failed for setting ${key}:`, err);
    }
  }

  static async invalidateFlag(flagName: string): Promise<void> {
    try {
      await redisClient.del(`${FLAGS_CACHE_PREFIX}${flagName}`);
    } catch (err) {
      console.error(`[ConfigurationService] Invalidation failed for flag ${flagName}:`, err);
    }
  }
}
