import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import FinanceConsole from "@/components/Admin/FinanceConsole";

export const metadata = {
  title: "Financial Operations & Escrow | Prakriti Admin",
};

export default async function AdminFinancePage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/finance");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  // 1. Fetch current Fee Configurations
  const feeConfigs = await prisma.feeConfiguration.findMany({
    orderBy: { effectiveFrom: "desc" },
    distinct: ["type"],
  });

  // 2. Fetch Disputed or Pending transactions
  const disputes = await prisma.ledgerTransaction.findMany({
    where: {
      OR: [
        { status: "DISPUTED" },
        { status: "PENDING" },
      ],
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
      property: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  // 3. Fetch recent immutable ledger entries
  const recentLedgerEntries = await prisma.financialLedgerEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const formattedFeeConfigs = feeConfigs.map((f) => ({
    id: f.id,
    type: f.type,
    method: f.method,
    value: f.value.toString(),
    effectiveFrom: f.effectiveFrom.toISOString(),
  }));

  const formattedDisputes = disputes.map((d) => ({
    id: d.id,
    type: d.type,
    status: d.status,
    amount: d.amount.toString(),
    currency: d.currency,
    userName: `${d.user?.firstName || ""} ${d.user?.lastName || ""}`.trim() || "Anonymous",
    userPhone: d.user?.phoneNumber || "N/A",
    propertyTitle: d.property?.title || null,
    referenceId: d.referenceId,
    createdAt: d.createdAt.toISOString(),
  }));

  const formattedLedger = recentLedgerEntries.map((l) => ({
    id: l.id,
    transactionId: l.transactionId,
    entryType: l.entryType,
    eventCode: l.eventCode,
    amount: l.amount.toString(),
    notes: l.notes,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Financial Operations & Escrow Ledger
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Arbitrate transactions, adjust marketplace dynamic fee matrices, and audit double-entry ledger entries.
        </p>
      </div>

      <FinanceConsole
        feeConfigs={formattedFeeConfigs}
        disputes={formattedDisputes}
        recentLedgerEntries={formattedLedger}
      />
    </div>
  );
}
