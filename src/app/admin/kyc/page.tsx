import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import KycReviewConsole from "@/components/Admin/KycReviewConsole";

export const metadata = {
  title: "KYC Compliance Console | Prakriti Admin",
};

export default async function AdminKycPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/kyc");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  // Load KYC submissions with their latest user state
  const usersWithKyc = await prisma.user.findMany({
    where: {
      OR: [
        { kycStatus: { in: ["MANUAL_REVIEW", "PENDING", "REJECTED"] } },
        { kycVerifications: { some: {} } },
      ],
    },
    include: {
      kycVerifications: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const records = usersWithKyc.map((u) => {
    const latestKyc = u.kycVerifications[0];
    return {
      userId: u.id,
      userName: `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unregistered Name",
      userPhone: u.phoneNumber,
      userEmail: u.email,
      kycStatus: u.kycStatus,
      documentType: latestKyc?.documentType || "AADHAAR_PAN",
      provider: latestKyc?.provider || "MANUAL_OR_EXTERNAL",
      failureReason: latestKyc?.failureReason || null,
      submittedAt: (latestKyc?.createdAt || u.createdAt).toISOString(),
    };
  });

  const pendingReviewCount = records.filter((r) => r.kycStatus === "MANUAL_REVIEW").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            KYC Compliance & Verification Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Audit edge-case identity verifications, handle provider failures, and enforce regulatory compliance.
          </p>
        </div>
        {pendingReviewCount > 0 && (
          <span className="px-3 py-1.5 bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-200">
            ⚠️ {pendingReviewCount} Cases Require Manual Review
          </span>
        )}
      </div>

      <KycReviewConsole records={records} />
    </div>
  );
}
