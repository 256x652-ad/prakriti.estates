import { prisma } from "@/infrastructure/database/prisma";
import { MaintenanceTicketStatus } from "@prisma/client";

export class MaintenanceService {
  /**
   * Creates a new maintenance ticket for an active tenancy.
   */
  async createTicket(tenancyId: string, title: string, description: string) {
    return await prisma.maintenanceTicket.create({
      data: {
        tenancyId,
        title,
        description,
        status: "OPEN"
      }
    });
  }

  /**
   * State Machine logic for Landlord Approvals.
   * Only the Landlord associated with the Tenancy can approve the cost,
   * transitioning the state and locking the financial liability.
   */
  async approveCost(ticketId: string, landlordId: string, approvedCost: number) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch ticket and eagerly load tenancy details
      const ticket = await tx.maintenanceTicket.findUnique({
        where: { id: ticketId },
        include: { tenancy: true }
      });

      if (!ticket) throw new Error("Ticket not found.");
      
      // 2. Strict RBAC validation
      if (ticket.tenancy.landlordId !== landlordId) {
        throw new Error("UNAUTHORIZED: Only the landlord can approve maintenance costs.");
      }

      // 3. State transition rule check
      if (ticket.status !== "AWAITING_APPROVAL" && ticket.status !== "IN_PROGRESS" && ticket.status !== "OPEN") {
        throw new Error(`Invalid state transition. Cannot approve cost from state ${ticket.status}.`);
      }

      // 4. Execute transition
      const updatedTicket = await tx.maintenanceTicket.update({
        where: { id: ticket.id },
        data: {
          approvedCost,
          status: "APPROVED"
        }
      });

      // (Optional) We could auto-generate an InvoiceLineItem right here as a Debit 
      // against the Landlord's account or future rent payouts.

      return updatedTicket;
    });
  }
}
