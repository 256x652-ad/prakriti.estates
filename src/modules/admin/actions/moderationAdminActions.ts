"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { PropertyLifecycleService } from "@/modules/properties/services/PropertyLifecycleService";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { revalidatePropertyListing } from "@/lib/seo/revalidateProperty";
import { revalidatePath } from "next/cache";
import { KycStatus } from "@prisma/client";

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

export async function bulkApprovePropertiesAction(ids: string[]) {
  const session = await getServerSession(authOptions);
  const { adminUser, roles } = assertAdminRole(session);

  const results: { id: string; success: boolean; error?: string }[] = [];

  for (const id of ids) {
    try {
      const updated = await PropertyLifecycleService.transitionStatus(id, "PUBLISHED", roles);
      if (updated.slug) {
        await revalidatePropertyListing(updated.slug);
      }
      await AuditLogService.logSystemAction({
        actorId: adminUser.id,
        actorRole: roles[0] || "ADMIN",
        actionType: "ADMIN_OVERRIDE",
        targetEntity: `Property:${id}`,
        targetId: id,
        newState: { lifecycleStatus: "PUBLISHED" },
        reasonCode: "BULK_APPROVAL",
        metadata: { adminEmail: adminUser.email },
      });
      results.push({ id, success: true });
    } catch (err: any) {
      results.push({ id, success: false, error: err.message });
    }
  }

  revalidatePath("/admin/properties");
  revalidatePath("/admin/properties/pending");
  revalidatePath("/search");

  return { success: true, results };
}

export async function suspendPropertyAction(id: string, reason: string) {
  const session = await getServerSession(authOptions);
  const { adminUser, roles } = assertAdminRole(session);

  const existing = await prisma.property.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Property not found");
  }

  const updated = await PropertyLifecycleService.transitionStatus(id, "REJECTED", roles);

  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: roles[0] || "ADMIN",
    actionType: "ADMIN_OVERRIDE",
    targetEntity: `Property:${id}`,
    targetId: id,
    oldState: { lifecycleStatus: existing.lifecycleStatus },
    newState: { lifecycleStatus: "REJECTED", suspendedReason: reason },
    reasonCode: "ADMIN_TAKEDOWN",
    metadata: { reason, adminEmail: adminUser.email },
  });

  if (updated.slug) {
    await revalidatePropertyListing(updated.slug);
  }

  revalidatePath("/admin/properties");
  revalidatePath("/search");

  return { success: true, property: updated };
}

export async function overrideKycAction(
  userId: string,
  status: "VERIFIED" | "REJECTED",
  reason: string
) {
  const session = await getServerSession(authOptions);
  const { adminUser, roles } = assertAdminRole(session);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { kycVerifications: { orderBy: { createdAt: "desc" }, take: 1 } },
  });

  if (!user) {
    throw new Error(`User ${userId} not found`);
  }

  const oldStatus = user.kycStatus;
  const targetKycStatus = status === "VERIFIED" ? KycStatus.VERIFIED : KycStatus.REJECTED;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { kycStatus: targetKycStatus },
    });

    const latestVerification = user.kycVerifications[0];
    if (latestVerification) {
      await tx.kycVerification.update({
        where: { id: latestVerification.id },
        data: {
          status: targetKycStatus,
          failureReason: status === "REJECTED" ? reason : null,
        },
      });
    } else {
      await tx.kycVerification.create({
        data: {
          userId,
          provider: "MANUAL_ADMIN_OVERRIDE",
          status: targetKycStatus,
          failureReason: status === "REJECTED" ? reason : null,
          documentType: "ADMIN_OVERRIDE",
        },
      });
    }
  });

  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: roles[0] || "ADMIN",
    actionType: status === "VERIFIED" ? "KYC_MANUAL_VERIFY" : "KYC_MANUAL_REJECT",
    targetEntity: `User:${userId}`,
    targetId: userId,
    oldState: { kycStatus: oldStatus },
    newState: { kycStatus: targetKycStatus, reason },
    reasonCode: "KYC_MANUAL_OVERRIDE",
    metadata: { reason, adminEmail: adminUser.email },
  });

  revalidatePath("/admin/kyc");
  revalidatePath("/admin/users");

  return { success: true };
}

export async function overrideGoldPinAction(
  propertyId: string,
  isCertified: boolean,
  reason: string
) {
  const session = await getServerSession(authOptions);
  const { adminUser, roles } = assertAdminRole(session);

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) {
    throw new Error(`Property ${propertyId} not found`);
  }

  const updated = await prisma.property.update({
    where: { id: propertyId },
    data: { isPrakritiCertified: isCertified },
  });

  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: roles[0] || "ADMIN",
    actionType: "ADMIN_OVERRIDE",
    targetEntity: `Property:${propertyId}`,
    targetId: propertyId,
    oldState: { isPrakritiCertified: property.isPrakritiCertified },
    newState: { isPrakritiCertified: isCertified, reason },
    reasonCode: "GOLD_PIN_OVERRIDE",
    metadata: { reason, adminEmail: adminUser.email },
  });

  if (updated.slug) {
    await revalidatePropertyListing(updated.slug);
  }

  revalidatePath("/admin/consultants");
  revalidatePath("/admin/properties");
  revalidatePath(`/property/${updated.slug || updated.id}`);

  return { success: true, property: updated };
}
