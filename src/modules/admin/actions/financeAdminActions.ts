"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { redisClient } from "@/infrastructure/redis/redisClient";
import { escrowAndRefundEngine } from "@/modules/transactions/services/EscrowAndRefundEngine";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { FeeType, FeeCalculationMethod, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function resolveDisputeAction(params: {
  transactionId: string;
  action: "REFUND_BUYER" | "RELEASE_TO_SELLER";
  reason: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const adminUser = session.user as any;
  const adminRoles = (adminUser.roles as string[]) || [];

  if (!adminRoles.includes("ADMIN") && !adminRoles.includes("SUPER_ADMIN")) {
    throw new Error("FORBIDDEN: Admin permissions required");
  }

  const { transactionId, action, reason } = params;

  const transaction = await prisma.ledgerTransaction.findUnique({
    where: { id: transactionId },
    include: { property: true },
  });

  if (!transaction) throw new Error("Transaction not found");

  const oldSnapshot = {
    status: transaction.status,
    amount: Number(transaction.amount),
  };

  if (action === "REFUND_BUYER") {
    await escrowAndRefundEngine.processRefund(transactionId, reason);
  } else {
    await escrowAndRefundEngine.releaseEscrowToSeller(transactionId);
  }

  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: adminRoles[0] || "ADMIN",
    actionType: "DISPUTE_RESOLUTION",
    targetEntity: `LedgerTransaction:${transactionId}`,
    targetId: transactionId,
    oldState: oldSnapshot,
    newState: { action, reason, resolvedAt: new Date().toISOString() },
    reasonCode: action,
    metadata: { reason, adminEmail: adminUser.email },
  });

  revalidatePath("/admin/finance");
  return { success: true };
}

export async function updateFeeConfigurationAction(params: {
  feeType: FeeType;
  method: FeeCalculationMethod;
  value: number;
  reason: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const adminUser = session.user as any;
  const adminRoles = (adminUser.roles as string[]) || [];

  if (!adminRoles.includes("SUPER_ADMIN") && !adminRoles.includes("ADMIN")) {
    throw new Error("FORBIDDEN: Super Admin permissions required");
  }

  const { feeType, method, value, reason } = params;

  // 1. Create new FeeConfiguration record
  const newConfig = await prisma.feeConfiguration.create({
    data: {
      type: feeType,
      method,
      value: new Prisma.Decimal(value),
      effectiveFrom: new Date(),
    },
  });

  // 2. Invalidate / update Redis cache
  const cacheKey = `fee_config:${feeType}`;
  try {
    await redisClient.set(
      cacheKey,
      JSON.stringify({
        id: newConfig.id,
        type: newConfig.type,
        method: newConfig.method,
        value: newConfig.value.toString(),
      }),
      "EX",
      300
    );
  } catch (err: any) {
    console.warn("[Admin Fee Update] Redis cache update warning:", err.message);
  }

  // 3. Record AuditLog
  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: adminRoles[0] || "ADMIN",
    actionType: "FEE_CONFIG_MUTATION",
    targetEntity: `FeeConfiguration:${feeType}`,
    targetId: newConfig.id,
    newState: { feeType, method, value, reason },
    reasonCode: "ADMIN_FEE_UPDATE",
    metadata: { reason },
  });

  revalidatePath("/admin/finance");
  return { success: true, config: newConfig };
}
