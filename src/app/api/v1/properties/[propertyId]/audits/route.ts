import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { SecureFilePipeline } from "@/lib/storage/secureUpload";
import { ApiResponseHelper } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ propertyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user ? (session.user as any).id : null;
    const userRoles = session?.user ? (session.user as any).roles || [] : [];
    const isAdmin = userRoles.includes("ADMIN") || userRoles.includes("SUPER_ADMIN");

    const { propertyId } = await context.params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        owner: true,
        auditReports: {
          orderBy: { createdAt: "desc" },
          include: { consultant: { select: { firstName: true, lastName: true } } },
        },
        locks: {
          where: { userId: userId || "", status: "ACTIVE" },
        },
      },
    });

    if (!property) {
      return ApiResponseHelper.error("NOT_FOUND", "Property not found", 404);
    }

    // Authorization evaluation:
    // 1. Is report public? (Seller opted to make pre-listing audit public)
    // 2. Is user the owner/seller?
    // 3. Is user an admin?
    // 4. Did user purchase/lock the property with VAS?
    const isOwner = property.ownerId === userId;
    const hasActiveLock = property.locks.length > 0;

    const accessibleReports = property.auditReports.filter((report) => {
      if (report.isPublic) return true;
      if (isOwner || isAdmin || hasActiveLock) return true;
      return false;
    });

    // Generate secure pre-signed download URLs for accessible reports with PDF keys
    const pipeline = new SecureFilePipeline();
    const reportsWithUrls = await Promise.all(
      accessibleReports.map(async (r) => {
        let downloadUrl = r.reportPdfUrl;
        if (r.reportPdfUrl && r.reportPdfUrl.startsWith("s3://")) {
          const key = r.reportPdfUrl.split("/").slice(3).join("/");
          downloadUrl = await pipeline.getPrivateDocumentDownloadUrl(key, 900);
        }
        return {
          id: r.id,
          type: r.type,
          score: r.score,
          passed: r.passed,
          findings: r.findings,
          recommendations: r.recommendations,
          reportPdfUrl: downloadUrl,
          consultantName: `${r.consultant.firstName || "Chief"} ${r.consultant.lastName || "Consultant"}`.trim(),
          createdAt: r.createdAt,
        };
      })
    );

    return ApiResponseHelper.success({
      isCertified: property.isPrakritiCertified,
      reports: reportsWithUrls,
    });
  } catch (error: any) {
    console.error("[Property Audits GET Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to fetch property audits",
      500
    );
  }
}
