import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";
import { IRefundService, MockRefundService } from "../../transactions/services/DisputeService";
import { withOutbox } from "../../outbox/core/withOutbox";

export class LockExpirationWorker {
  constructor(private refundService: IRefundService = new MockRefundService()) {}

  /**
   * Identifies and forcefully expires any Property Locks that have surpassed their TTL.
   * Typically triggered by a Node Cron running every 5 minutes, or scheduled via BullMQ.
   */
  async processExpiredLocks() {
    console.log("[LockExpirationWorker] Scanning for expired property locks...");

    // 1. Fetch locks that are past due but still hanging in ACTIVE or REQUESTED states
    const expiredLocks = await prisma.propertyLock.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ["ACTIVE", "REQUESTED"] }
      },
      include: { property: true }
    });

    if (expiredLocks.length === 0) {
      return 0; // Nothing to process
    }

    console.log(`[LockExpirationWorker] Found ${expiredLocks.length} expired locks. Processing...`);

    let processedCount = 0;

    for (const lock of expiredLocks) {
      try {
        // 2. Wrap the expiration in our robust Outbox utility to ensure event emission
        await withOutbox(
          prisma, 
          "PROPERTY_UNLOCKED", 
          { propertyId: lock.propertyId, lockId: lock.id, reason: "TTL_EXPIRED" },
          async (tx) => {
            
            // A. Update the Lock Status
            await tx.propertyLock.update({
              where: { id: lock.id },
              data: { status: "EXPIRED" }
            });

            // B. Release the Property Inventory Globally
            await tx.property.update({
              where: { id: lock.propertyId },
              data: { lockStatus: "AVAILABLE" }
            });

            // C. FINANCIAL HOOK: Forfeiture vs Refund Rules
            if (lock.status === "ACTIVE") {
              // ACTIVE means the money is actually sitting in our Escrow
              const transaction = await tx.ledgerTransaction.findFirst({
                where: { userId: lock.userId, status: "COMPLETED" },
                orderBy: { createdAt: 'desc' }
              });

              if (transaction) {
                // Determine Forfeiture Rule (e.g. 50% penalty for expiring without completing purchase)
                const penaltyRate = 0.50; 
                const refundAmount = lock.amount.mul(1 - penaltyRate);
                const forfeitAmount = lock.amount.mul(penaltyRate);

                // Call external gateway to release partial hold / refund
                const refundSuccess = await this.refundService.processRefund(
                  transaction.id, 
                  refundAmount, 
                  "LOCK_EXPIRED_PARTIAL_FORFEITURE"
                );

                if (refundSuccess) {
                  // Debit Escrow, credit buyer
                  await tx.financialLedgerEntry.create({
                    data: {
                      transactionId: transaction.id,
                      userId: lock.userId,
                      entryType: "DEBIT",
                      eventCode: "REFUND",
                      amount: refundAmount,
                      notes: `Lock expired. Partial refund issued.`
                    }
                  });
                  // Debit Escrow, credit platform (forfeit)
                  await tx.financialLedgerEntry.create({
                    data: {
                      transactionId: transaction.id,
                      userId: "PLATFORM_TREASURY_ACCOUNT",
                      entryType: "CREDIT",
                      eventCode: "PLATFORM_FEE_DEDUCTION",
                      amount: forfeitAmount,
                      notes: `Lock expired. 50% token forfeited to platform.`
                    }
                  });
                } else {
                  throw new Error("Payment Gateway failed to process expiration refund.");
                }
              }
            }
            
            return true;
          }
        );

        processedCount++;
        console.log(`[LockExpirationWorker] Successfully expired lock ${lock.id}. Inventory freed.`);

      } catch (error: any) {
        // If one lock fails (e.g. Stripe API is down), we catch the error, log it, 
        // and continue processing the rest of the array. The failed lock will just be retried 
        // on the next cron execution!
        console.error(`[LockExpirationWorker] FAILED to expire lock ${lock.id}:`, error.message);
      }
    }

    return processedCount;
  }
}
