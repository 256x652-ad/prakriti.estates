import { PrismaClient } from "@prisma/client";

// Prevent multiple instances of Prisma Client in development
// due to Next.js hot-reloading (HMR).
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
