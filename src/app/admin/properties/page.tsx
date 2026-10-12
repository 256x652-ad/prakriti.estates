import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import PropertyModerationTable from "@/components/Admin/PropertyModerationTable";
import Link from "next/link";

export const metadata = {
  title: "Property Moderation | Prakriti Admin",
};

export default async function AdminPropertiesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/properties");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  const properties = await prisma.property.findMany({
    include: {
      owner: {
        select: {
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedProperties = properties.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    type: p.type,
    price: p.price.toString(),
    lifecycleStatus: p.lifecycleStatus,
    isPrakritiCertified: p.isPrakritiCertified,
    ownerName: `${p.owner?.firstName || ""} ${p.owner?.lastName || ""}`.trim() || "Anonymous",
    ownerPhone: p.owner?.phoneNumber || "N/A",
    createdAt: p.createdAt.toISOString(),
  }));

  const pendingCount = properties.filter((p) => p.lifecycleStatus === "PENDING_APPROVAL").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Listing Moderation & Governance
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit, approve, or suspend property listings across the ecosystem.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/properties/pending"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2"
          >
            <span>Review Pending Queue</span>
            {pendingCount > 0 && (
              <span className="bg-white text-amber-600 rounded-full px-2 py-0.5 text-[10px] font-extrabold">
                {pendingCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      <PropertyModerationTable properties={formattedProperties} />
    </div>
  );
}
