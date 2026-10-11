import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import UserManagementTable from "@/components/Admin/UserManagementTable";

export const metadata = {
  title: "User Operations & Impersonation | Prakriti Admin",
};

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/users");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          properties: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedUsers = users.map((u) => ({
    id: u.id,
    name: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Anonymous",
    phone: u.phoneNumber,
    email: u.email,
    roles: u.roles,
    kycStatus: u.kycStatus,
    propertiesCount: u._count.properties,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          User Directory & Support Impersonation
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Inspect user accounts, manage operational roles, and initiate strictly audited session impersonation.
        </p>
      </div>

      <UserManagementTable users={formattedUsers} />
    </div>
  );
}
