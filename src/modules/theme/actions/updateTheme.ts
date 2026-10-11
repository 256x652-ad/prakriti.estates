"use server";

import { prisma } from "@/infrastructure/database/prisma";
import { ThemeConfigurationSchema, ThemeConfigurationDTO } from "../core/themeSchemas";
import { revalidatePath } from "next/cache";
// In a real app, you would import getServerSession here to get the active admin user.

export async function updateThemeConfiguration(data: ThemeConfigurationDTO, adminUserId: string) {
  try {
    // 1. Strict Server-Side Payload Validation
    const parsedData = ThemeConfigurationSchema.parse(data);

    // 2. RBAC Security Check (Mocked for demonstration, but critical in production)
    const adminUser = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!adminUser || !adminUser.roles.includes("ADMIN")) {
      throw new Error("UNAUTHORIZED: Only Admins can modify the global theme.");
    }

    // 3. Persist the configuration and link the audit trail
    const newTheme = await prisma.themeConfiguration.create({
      data: {
        ...parsedData,
        updatedById: adminUserId
      }
    });

    // 4. Invalidate the global layout cache so the ThemeProvider re-fetches the new CSS tokens
    revalidatePath("/", "layout");

    return { success: true, theme: newTheme };
  } catch (error: any) {
    console.error("[Theme Update Error]:", error);
    return { success: false, error: error.message || "Failed to update theme." };
  }
}
