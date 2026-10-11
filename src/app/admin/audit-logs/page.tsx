import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import AuditLogViewer from "@/components/Admin/AuditLogViewer";

export const metadata = {
  title: "Compliance & Audit Trail | Prakriti Admin",
};

export default async function AdminAuditLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/audit-logs");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedLogs = logs.map((l) => ({
    id: l.id,
    actorId: l.actorId,
    actorRole: l.actorRole,
    actionType: l.actionType,
    targetEntity: l.targetEntity,
    targetId: l.targetId,
    oldState: l.oldState,
    newState: l.newState,
    reasonCode: l.reasonCode,
    metadata: l.metadata,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          System Compliance Audit Stream
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Cryptographically immutable timeline of all administrative interventions, financial dispute resolutions, impersonations, and override actions.
        </p>
      </div>

      <AuditLogViewer logs={formattedLogs} />
    </div>
  );
}
