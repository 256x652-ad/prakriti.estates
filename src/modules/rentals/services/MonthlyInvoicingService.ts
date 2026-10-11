import { prisma } from "@/infrastructure/database/prisma";
import { razorpayPaymentService } from "@/modules/transactions/services/RazorpayPaymentService";
import { withOutbox } from "@/modules/outbox/core/withOutbox";
import { Prisma } from "@prisma/client";

export class MonthlyInvoicingService {
  /**
   * Generates immutable monthly invoices for all active tenancies for a given billing month.
   */
  async generateMonthlyRentInvoices(billingDate: Date = new Date()): Promise<{
    generatedCount: number;
    invoiceIds: string[];
  }> {
    const startOfMonth = new Date(billingDate.getFullYear(), billingDate.getMonth(), 1);

    // Fetch active tenancies with end date in the future
    const activeTenancies = await prisma.tenancy.findMany({
      where: {
        status: "ACTIVE",
        startDate: { lte: billingDate },
        endDate: { gte: billingDate },
      },
      include: {
        property: true,
        invoices: {
          where: { invoiceMonth: startOfMonth },
        },
      },
    });

    const generatedInvoiceIds: string[] = [];

    for (const tenancy of activeTenancies) {
      // Strict Immutability & Idempotency: Skip if invoice for this month already exists
      if (tenancy.invoices.length > 0) {
        continue;
      }

      const rentAmount = tenancy.rentAmount;
      // Maintenance charge: 5% of rent or ₹1,500 standard society maintenance
      const maintenanceAmount = Math.round(rentAmount * 0.05);
      // GST on maintenance/services: 18% of maintenance
      const taxAmount = Math.round(maintenanceAmount * 0.18);

      // Check for pending maintenance approval credits for this tenancy
      const pendingApprovedTickets = await prisma.maintenanceTicket.findMany({
        where: {
          tenancyId: tenancy.id,
          status: "APPROVED",
        },
      });

      let totalMaintenanceCredit = 0;
      const creditLineItems: { amount: number; description: string }[] = [];

      for (const ticket of pendingApprovedTickets) {
        if (ticket.approvedCost && ticket.approvedCost > 0) {
          totalMaintenanceCredit += ticket.approvedCost;
          creditLineItems.push({
            amount: ticket.approvedCost,
            description: `Reimbursement Credit: Ticket #${ticket.id.slice(0, 8)} - ${ticket.title}`,
          });
        }
      }

      const grossAmount = rentAmount + maintenanceAmount + taxAmount;
      const netTotalAmount = Math.max(grossAmount - totalMaintenanceCredit, 0);

      const dueDate = new Date(startOfMonth);
      dueDate.setDate(dueDate.getDate() + 5); // 5th of the month

      const invoice = await prisma.$transaction(async (tx) => {
        const createdInvoice = await tx.monthlyInvoice.create({
          data: {
            tenancyId: tenancy.id,
            invoiceMonth: startOfMonth,
            status: "ISSUED",
            dueDate,
            totalAmount: netTotalAmount,
          },
        });

        // 1. Line Item: Base Rent
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: createdInvoice.id,
            type: "RENT",
            amount: rentAmount,
            description: `Monthly Rental for ${tenancy.property.title}`,
          },
        });

        // 2. Line Item: Society Maintenance
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: createdInvoice.id,
            type: "MAINTENANCE",
            amount: maintenanceAmount,
            description: "Building & Society Upkeep Charges",
          },
        });

        // 3. Line Item: Taxes
        await tx.invoiceLineItem.create({
          data: {
            invoiceId: createdInvoice.id,
            type: "TAXES",
            amount: taxAmount,
            description: "Goods and Services Tax (GST 18% on Services)",
          },
        });

        // 4. Line Items: Credit Adjustments for Landlord-Approved Maintenance
        for (const credit of creditLineItems) {
          await tx.invoiceLineItem.create({
            data: {
              invoiceId: createdInvoice.id,
              type: "CREDIT_ADJUSTMENT",
              amount: -credit.amount,
              description: credit.description,
            },
          });
        }

        // Transition processed maintenance tickets to RESOLVED so credit is never applied twice
        for (const ticket of pendingApprovedTickets) {
          await tx.maintenanceTicket.update({
            where: { id: ticket.id },
            data: { status: "RESOLVED" },
          });
        }

        return createdInvoice;
      });

      generatedInvoiceIds.push(invoice.id);
    }

    return {
      generatedCount: generatedInvoiceIds.length,
      invoiceIds: generatedInvoiceIds,
    };
  }

  /**
   * Pays a specific MonthlyInvoice using Razorpay, updating invoice and financial ledger atomically.
   */
  async payMonthlyInvoice(params: {
    invoiceId: string;
    userId: string;
    paymentId: string;
  }) {
    const { invoiceId, userId, paymentId } = params;

    const invoice = await prisma.monthlyInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        tenancy: {
          include: {
            landlord: true,
            property: true,
          },
        },
      },
    });

    if (!invoice) throw new Error("INVOICE_NOT_FOUND");
    if (invoice.status === "PAID") return { alreadyPaid: true, invoiceId };

    const result = await withOutbox(
      prisma,
      "PAYMENT_SUCCESS",
      {
        invoiceId,
        tenancyId: invoice.tenancyId,
        tenantId: userId,
        landlordId: invoice.tenancy.landlordId,
        amount: invoice.totalAmount,
        paymentId,
        timestamp: new Date().toISOString(),
      },
      async (tx) => {
        // Mark Invoice as PAID
        const updatedInvoice = await tx.monthlyInvoice.update({
          where: { id: invoiceId },
          data: {
            status: "PAID",
            paidAt: new Date(),
          },
        });

        // Create Ledger Transaction
        const ledgerTxn = await tx.ledgerTransaction.create({
          data: {
            type: "MAINTENANCE_LEDGER",
            status: "COMPLETED",
            amount: new Prisma.Decimal(invoice.totalAmount),
            currency: "INR",
            userId,
            propertyId: invoice.tenancy.propertyId,
            referenceId: paymentId,
          },
        });

        // Immutable Ledger Entry
        await tx.financialLedgerEntry.create({
          data: {
            transactionId: ledgerTxn.id,
            userId,
            entryType: "CREDIT",
            eventCode: "MAINTENANCE_DEDUCTION",
            amount: new Prisma.Decimal(invoice.totalAmount),
            notes: `Monthly Rent Invoice #${invoice.id.slice(0, 8)} paid via Razorpay: ${paymentId}`,
          },
        });

        return updatedInvoice;
      }
    );

    return {
      alreadyPaid: false,
      invoice: result,
    };
  }
}

export const monthlyInvoicingService = new MonthlyInvoicingService();
