import Redis from "ioredis";

// Global redis client instance
const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
export const redisClient = new Redis(redisUrl);

/**
 * Executes a function with a distributed Redis lock.
 * Prevents race conditions during concurrent operations (e.g., booking the same property).
 */
export async function withLock<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const lockKey = `lock:${key}`;
  const acquired = await redisClient.set(lockKey, "LOCKED", "EX", ttlSeconds, "NX");

  if (!acquired) {
    throw new Error("Resource is currently locked by another process. Please try again.");
  }

  try {
    return await fn();
  } finally {
    await redisClient.del(lockKey);
  }
}
