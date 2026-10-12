import { prisma } from "@/infrastructure/database/prisma";
import { ServiceRequestStatus, AuditType } from "@prisma/client";
import { withOutbox } from "@/modules/outbox/core/withOutbox";

const AllowedServiceRequestTransitions: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  REQUESTED: ["ASSIGNED", "CANCELLED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "REQUESTED", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "REJECTED", "CANCELLED"],
  COMPLETED: [], // Terminal
  REJECTED: ["REQUESTED"], // Can reopen
  CANCELLED: [], // Terminal
};

export class ConsultantAuditWorkflowService {
  /**
   * Enforces valid state machine transition for consultant service requests.
   */
  validateTransition(current: ServiceRequestStatus, target: ServiceRequestStatus): boolean {
    const valid = AllowedServiceRequestTransitions[current];
    return Boolean(valid && valid.includes(target));
  }

  /**
   * 1. Consultant claims a pending ServiceRequest.
   * State transitions: REQUESTED -> ASSIGNED
   */
  async claimServiceRequest(serviceRequestId: string, consultantId: string) {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { property: true },
    });

    if (!request) {
      throw new Error(`ServiceRequest ${serviceRequestId} not found.`);
    }

    if (request.status !== "REQUESTED") {
      throw new Error(`Cannot claim service request in '${request.status}' status. Must be 'REQUESTED'.`);
    }

    return await prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: {
        status: "ASSIGNED",
        assignedConsultantId: consultantId,
      },
    });
  }

  /**
   * 2. Consultant marks service request in progress.
   * State transitions: ASSIGNED -> IN_PROGRESS
   */
  async startAudit(serviceRequestId: string, consultantId: string) {
    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
    });

    if (!request) throw new Error("ServiceRequest not found.");
    if (request.assignedConsultantId !== consultantId) {
      throw new Error("FORBIDDEN: You are not assigned to this service request.");
    }

    return await prisma.serviceRequest.update({
      where: { id: serviceRequestId },
      data: { status: "IN_PROGRESS" },
    });
  }

  /**
   * 3. Consultant submits findings and uploads finalized AuditReport (PDF).
   * Automatically executes the "certifyProperty" engine if the audit passes.
   * State transitions: IN_PROGRESS -> COMPLETED
   */
  async submitAuditReport(params: {
    serviceRequestId: string;
    consultantId: string;
    auditType: AuditType;
    score: number; // 0 to 100
    findings: string;
    recommendations?: string;
    reportPdfUrl?: string;
    isPublic?: boolean;
  }) {
    const {
      serviceRequestId,
      consultantId,
      auditType,
      score,
      findings,
      recommendations,
      reportPdfUrl,
      isPublic = false,
    } = params;

    const request = await prisma.serviceRequest.findUnique({
      where: { id: serviceRequestId },
      include: { property: true },
    });

    if (!request) throw new Error("ServiceRequest not found.");
    if (request.assignedConsultantId !== consultantId) {
      throw new Error("FORBIDDEN: You are not assigned to this service request.");
    }

    const passed = score >= 75; // Standard benchmark for Prakriti Engineering / Vastu certification

    const result = await prisma.$transaction(async (tx) => {
      // Create AuditReport
      const report = await tx.auditReport.create({
        data: {
          serviceRequestId,
          propertyId: request.propertyId,
          consultantId,
          type: auditType,
          score,
          passed,
          findings,
          recommendations,
          reportPdfUrl,
          isPublic,
        },
      });

      // Advance ServiceRequest to COMPLETED
      await tx.serviceRequest.update({
        where: { id: serviceRequestId },
        data: { status: "COMPLETED" },
      });

      return report;
    });

    // 4. Atomically Award "Prakriti Certified Gold Pin" if audit passes
    if (passed) {
      await this.certifyProperty(request.propertyId, result.id, auditType);
    }

    return result;
  }

  /**
   * Internal service: certifyProperty(propertyId, reportId, certificationType)
   * Atomically updates Property record with isPrakritiCertified = true and emits domain event.
   */
  async certifyProperty(propertyId: string, reportId: string, certificationType: AuditType) {
    return await withOutbox(
      prisma,
      "PROPERTY_PUBLISHED",
      {
        propertyId,
        reportId,
        certificationType,
        certifiedAt: new Date().toISOString(),
        action: "PRAKRITI_GOLD_PIN_AWARDED",
      },
      async (tx) => {
        const updatedProperty = await tx.property.update({
          where: { id: propertyId },
          data: {
            isPrakritiCertified: true,
          },
        });

        console.log(
          `[Prakriti Certification] Property #${propertyId} awarded PRAKRITI CERTIFIED GOLD PIN via Report #${reportId}`
        );

        return updatedProperty;
      }
    );
  }

  /**
   * Fetches service requests list for consultant dashboard.
   */
  async getConsultantRequests(consultantId: string) {
    const [availableToClaim, myAssignedRequests] = await Promise.all([
      prisma.serviceRequest.findMany({
        where: { status: "REQUESTED" },
        include: {
          property: true,
          user: { select: { firstName: true, lastName: true, phoneNumber: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.serviceRequest.findMany({
        where: { assignedConsultantId: consultantId },
        include: {
          property: true,
          user: { select: { firstName: true, lastName: true, phoneNumber: true } },
          auditReport: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return {
      availableToClaim,
      myAssignedRequests,
    };
  }
}

export const consultantAuditWorkflowService = new ConsultantAuditWorkflowService();
