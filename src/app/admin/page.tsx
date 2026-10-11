import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import Link from "next/link";

export const metadata = {
  title: "Admin Command Center | Prakriti Estates",
};

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  const [
    totalProperties,
    pendingProperties,
    pendingKyc,
    disputesCount,
    consultantsCount,
    auditLogsCount,
  ] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { lifecycleStatus: "PENDING_APPROVAL" } }),
    prisma.user.count({ where: { kycStatus: "MANUAL_REVIEW" } }),
    prisma.ledgerTransaction.count({ where: { status: "DISPUTED" } }),
    prisma.user.count({ where: { roles: { has: "CONSULTANT" } } }),
    prisma.auditLog.count(),
  ]);

  const cards = [
    {
      title: "Listing Moderation",
      count: totalProperties,
      subtext: `${pendingProperties} awaiting approval`,
      badge: pendingProperties > 0 ? `${pendingProperties} Pending` : null,
      href: "/admin/properties",
      icon: "🏡",
    },
    {
      title: "KYC Compliance Queue",
      count: pendingKyc,
      subtext: "Manual reviews required",
      badge: pendingKyc > 0 ? "Urgent Action" : null,
      href: "/admin/kyc",
      icon: "🪪",
    },
    {
      title: "Escrow & Disputes",
      count: disputesCount,
      subtext: "Transactions in dispute arbitration",
      badge: disputesCount > 0 ? `${disputesCount} Disputed` : null,
      href: "/admin/finance",
      icon: "⚖️",
    },
    {
      title: "Prakriti Consultants",
      count: consultantsCount,
      subtext: "Architectural & Vastu experts",
      href: "/admin/consultants",
      icon: "📐",
    },
    {
      title: "Theme & Design System",
      count: "CSS",
      subtext: "Live color token engine",
      href: "/admin/settings/theme",
      icon: "🎨",
    },
    {
      title: "Compliance Audit Trail",
      count: auditLogsCount,
      subtext: "Immutable operations logged",
      href: "/admin/audit-logs",
      icon: "🔒",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Super Admin Command Center
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Governance, content moderation, dispute resolution, and security oversight for Prakriti Estates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="group block bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <span className="text-3xl">{c.icon}</span>
              {c.badge && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-200">
                  {c.badge}
                </span>
              )}
            </div>

            <div className="mt-4">
              <h3 className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                {c.title}
              </h3>
              <p className="text-2xl font-black text-slate-900 mt-1">{c.count}</p>
              <p className="text-xs text-slate-400 mt-1">{c.subtext}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
