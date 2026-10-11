import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type DisputeResolutionAction = "REFUND_BUYER" | "RELEASE_TO_SELLER" | "PARTIAL_REFUND";

export interface IRefundService {
  processRefund(transactionId: string, amount: Decimal, reason: string): Promise<boolean>;
}

export class MockRefundService implements IRefundService {
  async processRefund(transactionId: string, amount: Decimal, reason: string) {
    console.log(`[Payment Gateway] Processing refund of ${amount} for tx ${transactionId}. Reason: ${reason}`);
    // Simulate successful API call to Razorpay/Stripe
    return true;
  }
}

export class DisputeService {
  constructor(private refundService: IRefundService = new MockRefundService()) {}

  /**
   * Resolves a financial dispute involving escrowed funds.
   * Completely idempotent: Uses the ledger as the source of truth.
   */
  async resolveTransactionDispute(
    transactionId: string, 
    action: DisputeResolutionAction, 
    adminId: string, 
    reasonCode: string,
    partialRefundAmount?: number
  ) {
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch transaction and existing ledger entries to establish current state
      const transaction = await tx.ledgerTransaction.findUnique({
        where: { id: transactionId },
        include: { entries: true }
      });

      if (!transaction) throw new Error("Transaction not found.");

      // 2. IDEMPOTENCY CHECK
      // If we already have a DISPUTE_RESOLUTION entry for this transaction, abort!
      const existingResolution = transaction.entries.find(e => e.eventCode === "DISPUTE_RESOLUTION");
      if (existingResolution) {
        throw new Error("Idempotency violation: This dispute has already been resolved.");
      }

      // 3. Find the original Escrow Hold to know how much money we are dealing with
      const escrowHold = transaction.entries.find(e => e.eventCode === "ESCROW_HOLD");
      if (!escrowHold) {
        throw new Error("Cannot resolve dispute: No funds currently held in escrow for this transaction.");
      }

      const availableFunds = escrowHold.amount;

      // 4. State Machine & Ledger Mutations based on Action
      let targetStatus = transaction.status;

      if (action === "REFUND_BUYER") {
        // Must wait for external payment provider BEFORE committing the database!
        const refundSuccess = await this.refundService.processRefund(transaction.id, availableFunds, reasonCode);
        if (!refundSuccess) throw new Error("Payment Gateway rejected the refund request.");

        // Debit Escrow, Credit Buyer (Refund)
        await tx.financialLedgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: transaction.userId,
            entryType: "DEBIT", // Debiting from the platform escrow
            eventCode: "DISPUTE_RESOLUTION",
            amount: availableFunds,
            notes: `Full refund issued by Admin ${adminId}. Reason: ${reasonCode}`
          }
        });
        targetStatus = "REFUNDED";

      } else if (action === "RELEASE_TO_SELLER") {
        // We need the property to find the seller ID
        const lock = await tx.propertyLock.findFirst({ where: { userId: transaction.userId } });
        const property = await tx.property.findUnique({ where: { id: lock?.propertyId } });

        if (!property) throw new Error("Cannot release funds: Associated property/seller not found.");

        // Move money from Escrow to Seller's account
        await tx.financialLedgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: property.ownerId, // Crediting the Seller!
            entryType: "CREDIT",
            eventCode: "DISPUTE_RESOLUTION",
            amount: availableFunds,
            notes: `Funds forcibly released to seller by Admin ${adminId}. Reason: ${reasonCode}`
          }
        });
        targetStatus = "COMPLETED";

      } else if (action === "PARTIAL_REFUND") {
        if (!partialRefundAmount || new Decimal(partialRefundAmount).gt(availableFunds)) {
          throw new Error("Invalid partial refund amount.");
        }

        const refundSuccess = await this.refundService.processRefund(transaction.id, new Decimal(partialRefundAmount), reasonCode);
        if (!refundSuccess) throw new Error("Payment Gateway rejected the refund request.");

        await tx.financialLedgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: transaction.userId,
            entryType: "DEBIT",
            eventCode: "DISPUTE_RESOLUTION",
            amount: partialRefundAmount,
            notes: `Partial refund of ${partialRefundAmount} issued by Admin ${adminId}. Reason: ${reasonCode}`
          }
        });
        targetStatus = "PARTIALLY_REFUNDED";
      }

      // 5. Commit the final transaction state
      const updatedTx = await tx.ledgerTransaction.update({
        where: { id: transaction.id },
        data: { status: targetStatus }
      });

      return {
        success: true,
        action,
        newStatus: updatedTx.status,
        resolutionAmount: availableFunds
      };

    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable // Maximum safety against double-refunds
    });
  }
}
