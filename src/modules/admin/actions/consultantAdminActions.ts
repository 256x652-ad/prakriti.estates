"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

function assertAdminRole(session: any) {
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }
  const roles = (session.user as any).roles || [];
  if (!roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
    throw new Error("FORBIDDEN: Admin permissions required");
  }
  return { adminUser: session.user, roles };
}

export async function onboardConsultantAction(userId: string) {
  const session = await getServerSession(authOptions);
  const { adminUser, roles } = assertAdminRole(session);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  if (!user.roles.includes(Role.CONSULTANT)) {
    const updatedRoles = [...user.roles, Role.CONSULTANT];
    await prisma.user.update({
      where: { id: userId },
      data: { roles: updatedRoles },
    });

    await AuditLogService.logSystemAction({
      actorId: adminUser.id,
      actorRole: roles[0] || "ADMIN",
      actionType: "ADMIN_OVERRIDE",
      targetEntity: `User:${userId}`,
      targetId: userId,
      newState: { roles: updatedRoles },
      reasonCode: "CONSULTANT_ONBOARDING",
      metadata: { adminEmail: adminUser.email },
    });
  }

  revalidatePath("/admin/consultants");
  revalidatePath("/admin/users");

  return { success: true };
}

export async function assignConsultantToServiceRequestAction(
  serviceRequestId: string,
  consultantId: string
) {
  const session = await getServerSession(authOptions);
  const { adminUser, roles } = assertAdminRole(session);

  const consultant = await prisma.user.findUnique({ where: { id: consultantId } });
  if (!consultant || !consultant.roles.includes(Role.CONSULTANT)) {
    throw new Error("Target user is not a qualified consultant.");
  }

  const updated = await prisma.serviceRequest.update({
    where: { id: serviceRequestId },
    data: {
      assignedConsultantId: consultantId,
      status: "ASSIGNED",
    },
  });

  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: roles[0] || "ADMIN",
    actionType: "ADMIN_OVERRIDE",
    targetEntity: `ServiceRequest:${serviceRequestId}`,
    targetId: serviceRequestId,
    newState: { assignedConsultantId: consultantId, status: "ASSIGNED" },
    reasonCode: "ADMIN_MANUAL_CONSULTANT_ASSIGNMENT",
    metadata: { adminEmail: adminUser.email },
  });

  revalidatePath("/admin/consultants");
  return { success: true, serviceRequest: updated };
}
