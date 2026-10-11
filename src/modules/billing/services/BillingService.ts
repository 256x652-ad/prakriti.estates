import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";

export class BillingService {
  /**
   * Generates a monthly invoice for an active tenancy.
   * Pulls meter readings and calculates usage, alongside fixed base rent.
   * Prevents mutation of past invoices by strictly appending new records.
   */
  async generateMonthlyInvoice(tenancyId: string, meterReadingId?: string) {
    // Start an ACID transaction to guarantee line items and invoice head match
    return await prisma.$transaction(async (tx) => {
      // 1. Validate Tenancy
      const tenancy = await tx.tenancy.findUnique({
        where: { id: tenancyId },
      });

      if (!tenancy || tenancy.status !== "ACTIVE") {
        throw new Error("Cannot generate invoice: Tenancy is not active.");
      }

      // 2. Initialize the Draft Invoice
      // The invoice head serves as the immutable ledger anchor
      const invoice = await tx.monthlyInvoice.create({
        data: {
          tenancyId: tenancy.id,
          invoiceMonth: new Date(), // e.g. start of current month
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Due in 7 days
          totalAmount: 0, // Will calculate below
          status: "DRAFT"
        }
      });

      let totalCalculatedAmount = 0;
      const lineItemsData: Prisma.InvoiceLineItemCreateManyInput[] = [];

      // 3. Add Base Rent
      lineItemsData.push({
        invoiceId: invoice.id,
        type: "RENT",
        amount: tenancy.rentAmount,
        description: `Base Monthly Rent for Tenancy ${tenancyId}`
      });
      totalCalculatedAmount += tenancy.rentAmount;

      // 4. Add Meter Usage (if a reading was provided)
      if (meterReadingId) {
        const meter = await tx.meterReading.findUnique({
          where: { id: meterReadingId }
        });

        if (meter && !meter.isBilled && meter.tenancyId === tenancy.id) {
          const unitsUsed = meter.currentUnits - meter.previousUnits;
          if (unitsUsed > 0) {
            const meterCharge = unitsUsed * meter.ratePerUnit;
            lineItemsData.push({
              invoiceId: invoice.id,
              type: "METER_USAGE",
              amount: meterCharge,
              description: `Utility Usage: ${unitsUsed} units @ ${meter.ratePerUnit}/unit`
            });
            totalCalculatedAmount += meterCharge;

            // Mark reading as billed so it can't be double-charged
            await tx.meterReading.update({
              where: { id: meter.id },
              data: { isBilled: true }
            });
          }
        }
      }

      // 5. Add standard maintenance & taxes (Mocked logic, would normally pull from fee engine)
      const maintenanceFee = 2500;
      lineItemsData.push({
        invoiceId: invoice.id,
        type: "MAINTENANCE",
        amount: maintenanceFee,
        description: "Monthly Society Maintenance"
      });
      totalCalculatedAmount += maintenanceFee;

      // 6. Commit all Line Items
      await tx.invoiceLineItem.createMany({
        data: lineItemsData
      });

      // 7. Finalize the Invoice Head with the locked total
      const finalizedInvoice = await tx.monthlyInvoice.update({
        where: { id: invoice.id },
        data: {
          totalAmount: totalCalculatedAmount,
          status: "ISSUED" // Lock it from further changes
        },
        include: { lineItems: true } // Return full tree for immediate UI consumption
      });

      return finalizedInvoice;
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }
}
