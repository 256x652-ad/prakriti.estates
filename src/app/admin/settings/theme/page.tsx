import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import ThemeConfigurator from "@/components/Admin/ThemeConfigurator";

export const metadata = {
  title: "Theme & Design System Tokens | Prakriti Admin",
};

export default async function AdminThemeSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/settings/theme");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  const currentTheme = await prisma.themeConfiguration.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  const initialTheme = {
    primaryColor: currentTheme?.primaryColor || "#22c55e",
    secondaryColor: currentTheme?.secondaryColor || "#0f172a",
    backgroundLight: currentTheme?.backgroundLight || "#f8fafc",
    backgroundDark: currentTheme?.backgroundDark || "#020617",
    enableDarkMode: currentTheme?.enableDarkMode || false,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Theme & Design System Tokens
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Adjust global CSS variables, color palettes, and dark mode toggles with immediate database persistence.
        </p>
      </div>

      <ThemeConfigurator initialTheme={initialTheme} />
    </div>
  );
}
