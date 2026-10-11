import { prisma } from "@/infrastructure/database/prisma";
import { MaintenanceTicketStatus } from "@prisma/client";

const AllowedTransitions: Record<MaintenanceTicketStatus, MaintenanceTicketStatus[]> = {
  OPEN: ["ACKNOWLEDGED", "IN_PROGRESS", "AWAITING_APPROVAL", "REJECTED"],
  ACKNOWLEDGED: ["IN_PROGRESS", "AWAITING_APPROVAL", "REJECTED"],
  IN_PROGRESS: ["AWAITING_APPROVAL", "RESOLVED", "REJECTED"],
  AWAITING_APPROVAL: ["APPROVED", "REJECTED", "IN_PROGRESS"],
  APPROVED: ["RESOLVED"], // Once approved, queued for next monthly invoice credit
  REJECTED: ["OPEN"], // Can be reopened with more info
  RESOLVED: [], // Terminal state
};

export class MaintenanceTicketService {
  /**
   * Enforces valid state machine transition for Maintenance Tickets.
   */
  validateTransition(
    current: MaintenanceTicketStatus,
    target: MaintenanceTicketStatus
  ): boolean {
    const validNext = AllowedTransitions[current];
    return Boolean(validNext && validNext.includes(target));
  }

  /**
   * Creates a new Maintenance Ticket for a tenancy.
   */
  async createTicket(params: {
    tenancyId: string;
    title: string;
    description: string;
    estimatedCost?: number;
  }) {
    const { tenancyId, title, description, estimatedCost } = params;

    const tenancy = await prisma.tenancy.findUnique({
      where: { id: tenancyId },
    });

    if (!tenancy) throw new Error("TENANCY_NOT_FOUND");

    return await prisma.maintenanceTicket.create({
      data: {
        tenancyId,
        title,
        description,
        estimatedCost,
        status: "OPEN",
      },
    });
  }

  /**
   * Transitions ticket status.
   * Crucial Financial Hook: If Landlord transitions to APPROVED with approvedCost,
   * it queues the deduction to be applied as a CREDIT on the Tenant's next MonthlyInvoice.
   */
  async updateTicketStatus(params: {
    ticketId: string;
    targetStatus: MaintenanceTicketStatus;
    approvedCost?: number;
  }) {
    const { ticketId, targetStatus, approvedCost } = params;

    const ticket = await prisma.maintenanceTicket.findUnique({
      where: { id: ticketId },
      include: { tenancy: true },
    });

    if (!ticket) throw new Error("TICKET_NOT_FOUND");

    if (!this.validateTransition(ticket.status, targetStatus)) {
      throw new Error(
        `Invalid maintenance ticket transition from '${ticket.status}' to '${targetStatus}'.`
      );
    }

    const updated = await prisma.maintenanceTicket.update({
      where: { id: ticketId },
      data: {
        status: targetStatus,
        ...(approvedCost !== undefined && { approvedCost }),
      },
    });

    // If Landlord approves with cost, log financial hook confirmation
    if (targetStatus === "APPROVED" && (approvedCost || ticket.approvedCost)) {
      const finalCost = approvedCost !== undefined ? approvedCost : ticket.approvedCost;
      console.log(
        `[Maintenance Financial Hook] Ticket #${ticketId} APPROVED for ₹${finalCost}. Scheduled as credit reduction on next monthly rent invoice.`
      );
    }

    return updated;
  }

  /**
   * Lists maintenance tickets for a user (either as tenant or landlord).
   */
  async getTickets(userId: string) {
    return await prisma.maintenanceTicket.findMany({
      where: {
        tenancy: {
          OR: [{ tenantId: userId }, { landlordId: userId }],
        },
      },
      include: {
        tenancy: {
          include: {
            property: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const maintenanceTicketService = new MaintenanceTicketService();
