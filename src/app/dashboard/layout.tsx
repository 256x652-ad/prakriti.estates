import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import Link from "next/link";
import React from "react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Enforce Server-Side Session Verification
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const user = session.user as any;
  const userRoles = (user.roles as string[]) || [];
  const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dashboard Global Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-2xl">🌿</span>
              <span className="font-extrabold text-slate-900 tracking-tight text-lg group-hover:text-emerald-700 transition">
                Prakriti Estates
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-1 text-sm font-semibold text-slate-600">
              <Link
                href="/dashboard"
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Overview
              </Link>
              <Link
                href="/search"
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Marketplace
              </Link>
              <Link
                href="/consultants"
                className="px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:text-slate-900 transition"
              >
                Engineering Audits
              </Link>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-lg text-purple-700 hover:bg-purple-50 transition"
                >
                  Admin Console
                </Link>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-800">
                {user.name || user.email || user.phoneNumber}
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {user.phoneNumber}
              </span>
            </div>

            <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              {userRoles[0] || "USER"}
            </span>

            <Link
              href="/api/auth/signout"
              className="text-xs font-semibold text-slate-500 hover:text-red-600 px-2 py-1 rounded hover:bg-slate-100 transition"
            >
              Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
