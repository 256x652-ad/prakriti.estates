import { prisma } from "@/infrastructure/database/prisma";
import { IRefundService, MockRefundService } from "../../transactions/services/DisputeService";
import { withOutbox } from "../../outbox/core/withOutbox";
import { Queues, createWorker } from "@/modules/workers/QueueManager";
import { Job } from "bullmq";

export class LockExpirationWorker {
  constructor(private refundService: IRefundService = new MockRefundService()) {}

  /**
   * Scans for ACTIVE or REQUESTED PropertyLocks past their TTL,
   * gracefully expires them, restores property inventory to AVAILABLE,
   * handles token forfeiture / partial refunds, and emits LOCK_EXPIRED event.
   */
  async processExpiredLocks(): Promise<{ expiredCount: number; errorsCount: number }> {
    console.log("[LockExpirationWorker] Scanning for expired property locks...");

    // 1. Fetch locks past their expiration time that are still ACTIVE or REQUESTED
    const expiredLocks = await prisma.propertyLock.findMany({
      where: {
        expiresAt: { lt: new Date() },
        status: { in: ["ACTIVE", "REQUESTED"] },
      },
      include: { property: true },
    });

    if (expiredLocks.length === 0) {
      return { expiredCount: 0, errorsCount: 0 };
    }

    console.log(`[LockExpirationWorker] Found ${expiredLocks.length} expired locks.`);

    let expiredCount = 0;
    let errorsCount = 0;

    for (const lock of expiredLocks) {
      try {
        await withOutbox(
          prisma,
          "LOCK_EXPIRED",
          {
            lockId: lock.id,
            propertyId: lock.propertyId,
            propertyTitle: lock.property.title,
            userId: lock.userId,
            reason: "TTL_EXPIRED",
            expiredAt: new Date().toISOString(),
          },
          async (tx) => {
            // A. Update Lock state
            await tx.propertyLock.update({
              where: { id: lock.id },
              data: { status: "EXPIRED" },
            });

            // B. Revert Property to AVAILABLE
            await tx.property.update({
              where: { id: lock.propertyId },
              data: { lockStatus: "AVAILABLE" },
            });

            // C. Financial Ledger: Forfeiture vs partial refund if money was collected (ACTIVE)
            if (lock.status === "ACTIVE") {
              const transaction = await tx.ledgerTransaction.findFirst({
                where: { userId: lock.userId, status: "COMPLETED", propertyId: lock.propertyId },
                orderBy: { createdAt: "desc" },
              });

              if (transaction) {
                const penaltyRate = 0.5; // 50% forfeiture policy
                const refundAmount = lock.amount.mul(1 - penaltyRate);
                const forfeitAmount = lock.amount.mul(penaltyRate);

                const refundSuccess = await this.refundService.processRefund(
                  transaction.id,
                  refundAmount,
                  "LOCK_EXPIRED_PARTIAL_FORFEITURE"
                );

                if (refundSuccess) {
                  await tx.financialLedgerEntry.create({
                    data: {
                      transactionId: transaction.id,
                      userId: lock.userId,
                      entryType: "DEBIT",
                      eventCode: "REFUND",
                      amount: refundAmount,
                      notes: `Lock expired. Partial refund credited back to buyer.`,
                    },
                  });

                  await tx.financialLedgerEntry.create({
                    data: {
                      transactionId: transaction.id,
                      userId: "PLATFORM_TREASURY_ACCOUNT",
                      entryType: "CREDIT",
                      eventCode: "PLATFORM_FEE_DEDUCTION",
                      amount: forfeitAmount,
                      notes: `Lock expired. 50% token forfeited to platform treasury.`,
                    },
                  });
                }
              }
            }

            return true;
          }
        );

        expiredCount++;
      } catch (err: any) {
        errorsCount++;
        console.error(`[LockExpirationWorker] Error expiring lock ${lock.id}:`, err.message);
      }
    }

    console.log(
      `[LockExpirationWorker] Completed: ${expiredCount} expired, ${errorsCount} errors.`
    );
    return { expiredCount, errorsCount };
  }

  /**
   * Registers BullMQ worker and schedules repeatable cron job every 5 minutes
   */
  startScheduledWorker() {
    createWorker(
      "scheduled-tasks",
      async (job: Job) => {
        if (job.name === "LOCK_EXPIRATION_CRON") {
          await this.processExpiredLocks();
        }
      },
      1
    );

    // Register repeatable job scheduler on queue (every 5 minutes)
    Queues.ScheduledTasks.upsertJobScheduler(
      "repeatable-lock-expiration-cron",
      { pattern: "*/5 * * * *" },
      { name: "LOCK_EXPIRATION_CRON", data: {} }
    ).catch((err) => {
      console.warn("[LockExpirationWorker] Schedule registration warning:", err.message);
    });
  }
}

export const lockExpirationWorker = new LockExpirationWorker();
