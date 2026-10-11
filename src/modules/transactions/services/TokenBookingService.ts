import { prisma } from "@/infrastructure/database/prisma";
import { withLock } from "@/infrastructure/redis/redisClient";
import { transactionQueue } from "@/infrastructure/background-jobs/queue";
import { Decimal } from "@prisma/client/runtime/library";

export class TokenBookingService {
  /**
   * Books a property by paying a token amount to place it in Escrow.
   * Utilizes Redis Locks to prevent concurrent bookings on the same property,
   * and Prisma Interactive Transactions for atomic DB updates.
   */
  async bookPropertyToken(userId: string, propertyId: string, tokenAmount: number) {
    const lockKey = `property:book:${propertyId}`;

    return await withLock(lockKey, 10, async () => {
      // 1. Execute DB Transaction
      const result = await prisma.$transaction(async (tx) => {
        // A. Verify property is available (Not already booked)
        // Note: Depending on schema, we might check an 'availabilityStatus' or if existing escrow transactions exist.
        const activeEscrow = await tx.ledgerTransaction.findFirst({
          where: {
            propertyId,
            type: "ESCROW",
            status: { in: ["PENDING", "COMPLETED"] }
          }
        });

        if (activeEscrow) {
          throw new Error("Property is already locked or under an active transaction.");
        }

        // B. Create the Ledger Transaction (Escrow)
        const transaction = await tx.ledgerTransaction.create({
          data: {
            type: "ESCROW",
            status: "COMPLETED", // Assuming payment gateway confirmed synchronously before this step
            amount: new Decimal(tokenAmount),
            userId,
            propertyId,
          }
        });

        // C. Update Property Status (e.g., mark as reserved/pending verification)
        // If we had a specific status field for availability, we'd update it here.
        
        return transaction;
      });

      // 2. Dispatch Background Jobs (Post-Transaction)
      await transactionQueue.add("send-invoice", {
        transactionId: result.id,
        userId: userId,
        propertyId: propertyId,
        amount: tokenAmount
      });

      // Optionally, trigger an audit if required for token booking
      await transactionQueue.add("notify-consultants", {
        propertyId: propertyId,
        serviceType: "AUDIT",
        notes: "Automated audit request triggered via Token Booking."
      });

      return result;
    });
  }
}
