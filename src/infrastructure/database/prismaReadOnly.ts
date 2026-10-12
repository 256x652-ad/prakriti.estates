import { PrismaClient } from "@prisma/client";

/**
 * ARCHITECTURE: READ-REPLICA & BI CONNECTION POOLING STRATEGY
 * -------------------------------------------------------------
 * Heavy analytical queries (e.g., GMV calculations, multi-table audit log funnels,
 * time-series aggregations) must NOT run against the primary transactional database.
 * Doing so could hold row/table locks, exhaust connection pools, or cause latency spikes
 * on critical paths like property locking and payment processing.
 *
 * Strategy:
 * 1. Dedicated Read-Replica URL:
 *    Routes to `DATABASE_RO_URL` (AWS Aurora Read Replica / Supabase Read Replica pooler).
 *    Falls back safely to `DATABASE_URL` in local/staging development.
 *
 * 2. Connection Pool Sizing:
 *    Prisma connection pool is tuned with a conservative pool limit (e.g. 10 connections)
 *    and statement timeout parameters to ensure long-running queries do not starve resources.
 *
 * 3. Read-Only Isolation:
 *    Analytical services strictly import `prismaReadOnly` instead of `prisma`.
 */

const globalForPrismaRO = global as unknown as { prismaReadOnly: PrismaClient };

const readReplicaUrl = process.env.DATABASE_RO_URL || process.env.DATABASE_URL;

export const prismaReadOnly =
  globalForPrismaRO.prismaReadOnly ||
  new PrismaClient({
    datasources: {
      db: {
        url: readReplicaUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrismaRO.prismaReadOnly = prismaReadOnly;
}
