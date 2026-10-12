"use server";

import { prisma } from "@/infrastructure/database/prisma";
import { ConfigurationService } from "../services/ConfigurationService";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { PlatformFeatureFlag } from "@/lib/flags/isFeatureEnabled";
import { revalidatePath } from "next/cache";

export interface UpdateFeatureFlagParams {
  adminId: string;
  name: PlatformFeatureFlag;
  isEnabled: boolean;
  rolloutPct?: number;
  rules?: any;
  reason: string;
}

export async function updateFeatureFlag(params: UpdateFeatureFlagParams) {
  const { adminId, name, isEnabled, rolloutPct = 100, rules, reason } = params;

  // 1. Verify Admin identity and role
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
  });

  if (!admin || !admin.roles.includes("ADMIN")) {
    throw new Error("FORBIDDEN: Only super administrators can modify platform feature flags.");
  }

  // 2. Fetch old state for audit snapshot
  const oldFlag = await prisma.featureFlag.findUnique({
    where: { name },
  });

  const oldState = oldFlag
    ? {
        isEnabled: oldFlag.isEnabled,
        rolloutPct: oldFlag.rolloutPct,
        rules: oldFlag.rules,
      }
    : null;

  // 3. Database Upsert
  const updatedFlag = await prisma.featureFlag.upsert({
    where: { name },
    create: {
      name,
      isEnabled,
      rolloutPct,
      rules: rules || undefined,
      updatedBy: adminId,
    },
    update: {
      isEnabled,
      rolloutPct,
      rules: rules || undefined,
      updatedBy: adminId,
    },
  });

  const newState = {
    isEnabled: updatedFlag.isEnabled,
    rolloutPct: updatedFlag.rolloutPct,
    rules: updatedFlag.rules,
  };

  // 4. Instantly Evict Redis Cache
  await ConfigurationService.invalidateFlag(name);

  // 5. Tamper-Evident Audit Logging
  await AuditLogService.logSystemAction({
    actorId: adminId,
    actorRole: "ADMIN",
    actionType: "FEATURE_FLAG_TOGGLE",
    targetEntity: `FeatureFlag:${name}`,
    targetId: updatedFlag.id,
    oldState,
    newState,
    reasonCode: reason,
    metadata: {
      timestamp: new Date().toISOString(),
    },
  });

  // 6. Purge Next.js Server Components Cache
  revalidatePath("/admin");
  revalidatePath("/admin/settings");

  return {
    success: true,
    flag: updatedFlag,
  };
}
