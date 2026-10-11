"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { z } from "zod";
import { revalidatePath } from "next/cache";

const HexColorRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const ThemeConfigSchema = z.object({
  primaryColor: z.string().regex(HexColorRegex, "Must be a valid hex color code (e.g. #22c55e)"),
  secondaryColor: z.string().regex(HexColorRegex, "Must be a valid hex color code"),
  backgroundLight: z.string().regex(HexColorRegex, "Must be a valid hex color code"),
  backgroundDark: z.string().regex(HexColorRegex, "Must be a valid hex color code"),
  enableDarkMode: z.boolean().default(false),
});

export async function updateThemeConfigurationAction(data: z.infer<typeof ThemeConfigSchema>) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    throw new Error("UNAUTHORIZED");
  }

  const adminUser = session.user as any;
  const roles = adminUser.roles || [];
  if (!roles.includes("ADMIN") && !roles.includes("SUPER_ADMIN")) {
    throw new Error("FORBIDDEN: Admin permissions required");
  }

  const validated = ThemeConfigSchema.parse(data);

  const existing = await prisma.themeConfiguration.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const updated = existing
    ? await prisma.themeConfiguration.update({
        where: { id: existing.id },
        data: {
          ...validated,
          updatedById: adminUser.id,
        },
      })
    : await prisma.themeConfiguration.create({
        data: {
          ...validated,
          updatedById: adminUser.id,
        },
      });

  await AuditLogService.logSystemAction({
    actorId: adminUser.id,
    actorRole: roles[0] || "ADMIN",
    actionType: "THEME_UPDATE",
    targetEntity: `ThemeConfiguration:${updated.id}`,
    targetId: updated.id,
    oldState: existing,
    newState: updated,
    reasonCode: "ADMIN_THEME_CUSTOMIZATION",
    metadata: { adminEmail: adminUser.email },
  });

  revalidatePath("/admin/settings/theme");
  revalidatePath("/");

  return { success: true, theme: updated };
}
