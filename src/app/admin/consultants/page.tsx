import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { redirect } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import ConsultantGovernanceConsole from "@/components/Admin/ConsultantGovernanceConsole";

export const metadata = {
  title: "Consultant & Audit Governance | Prakriti Admin",
};

export default async function AdminConsultantsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect("/login?callbackUrl=/admin/consultants");
  }

  const userRoles = (session.user as any).roles || [];
  if (!userRoles.includes("ADMIN") && !userRoles.includes("SUPER_ADMIN")) {
    redirect("/");
  }

  // 1. Fetch all onboarded consultants
  const consultants = await prisma.user.findMany({
    where: {
      roles: {
        has: "CONSULTANT",
      },
    },
    include: {
      _count: {
        select: {
          consultantAuditReports: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // 2. Fetch service requests and linked reports
  const serviceRequests = await prisma.serviceRequest.findMany({
    include: {
      property: { select: { title: true } },
      user: { select: { firstName: true, lastName: true } },
      assignedConsultant: { select: { firstName: true, lastName: true } },
      auditReport: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const formattedConsultants = consultants.map((c) => ({
    id: c.id,
    name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Consultant " + c.phoneNumber,
    phone: c.phoneNumber,
    email: c.email,
    reportsCount: c._count.consultantAuditReports,
  }));

  const formattedRequests = serviceRequests.map((r) => ({
    id: r.id,
    type: r.type,
    status: r.status,
    propertyId: r.propertyId,
    propertyTitle: r.property.title,
    assignedConsultantId: r.assignedConsultantId,
    assignedConsultantName: r.assignedConsultant
      ? `${r.assignedConsultant.firstName || ""} ${r.assignedConsultant.lastName || ""}`.trim()
      : null,
    userName: `${r.user.firstName || ""} ${r.user.lastName || ""}`.trim() || "Anonymous",
    createdAt: r.createdAt.toISOString(),
    report: r.auditReport
      ? {
          id: r.auditReport.id,
          score: r.auditReport.score,
          passed: r.auditReport.passed,
          findings: r.auditReport.findings,
          reportPdfUrl: r.auditReport.reportPdfUrl,
        }
      : null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Consultant Directory & Engineering Audits
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Supervise structural and Vastu engineering audits, assign requests, and manage Prakriti Gold Pin certifications.
        </p>
      </div>

      <ConsultantGovernanceConsole
        consultants={formattedConsultants}
        serviceRequests={formattedRequests}
      />
    </div>
  );
}
