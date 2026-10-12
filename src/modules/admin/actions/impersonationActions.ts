"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { revalidatePath } from "next/cache";

export async function impersonateUserAction(targetUserId: string, reason: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const adminUser = session.user as any;
  const adminRoles = (adminUser.roles as string[]) || [];

  if (!adminRoles.includes("SUPER_ADMIN") && !adminRoles.includes("ADMIN")) {
    throw new Error("FORBIDDEN: Super Admin privileges required to initiate impersonation.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) {
    throw new Error(`User ${targetUserId} not found.`);
  }

  // 1. Record mandatory AuditLog for compliance
  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: adminRoles[0] || "SUPER_ADMIN",
    actionType: "ADMIN_IMPERSONATION_START",
    targetEntity: `User:${targetUserId}`,
    targetId: targetUserId,
    reasonCode: "SUPPORT_DEBUGGING",
    metadata: {
      adminEmail: adminUser.email,
      targetUserPhone: targetUser.phoneNumber,
      reason,
      startedAt: new Date().toISOString(),
    },
  });

  // 2. Also record in ImpersonationAuditLog relational table
  await prisma.impersonationAuditLog.create({
    data: {
      adminUserId: adminUser.id,
      targetUserId,
      reason,
    },
  });

  return {
    success: true,
    targetUser: {
      id: targetUser.id,
      phoneNumber: targetUser.phoneNumber,
      roles: targetUser.roles,
      kycStatus: targetUser.kycStatus,
    },
  };
}

export async function stopImpersonationAction(targetUserId: string) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const adminId = (session.user as any).impersonatorId || (session.user as any).id;

  await AuditLogService.logSystemAction({
    actorId: adminId,
    actorRole: "ADMIN",
    actionType: "ADMIN_IMPERSONATION_END",
    targetEntity: `User:${targetUserId}`,
    targetId: targetUserId,
    reasonCode: "SESSION_CONCLUDED",
  });

  revalidatePath("/");
  return { success: true };
}
