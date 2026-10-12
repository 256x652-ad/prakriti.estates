import { prisma } from "@/infrastructure/database/prisma";
import { Queues } from "@/modules/workers/QueueManager";
import { DomainEventType } from "../core/EventRegistry";

export class TransactionalOutboxRelay {
  private timer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Sweeps a batch of PENDING OutboxEvent records from PostgreSQL
   * and dispatches them to their corresponding Redis-backed BullMQ queues.
   */
  async sweepAndRelay(batchSize: number = 100): Promise<number> {
    if (this.isProcessing) {
      return 0; // Prevent overlapping runs
    }

    this.isProcessing = true;

    try {
      // 1. Fetch pending events in order of creation
      const pendingEvents = await prisma.outboxEvent.findMany({
        where: { status: "PENDING" },
        take: batchSize,
        orderBy: { createdAt: "asc" },
      });

      if (pendingEvents.length === 0) {
        return 0;
      }

      // 2. Mark them as PROCESSED in PostgreSQL to prevent duplicate sweeps
      await prisma.outboxEvent.updateMany({
        where: { id: { in: pendingEvents.map((e) => e.id) } },
        data: {
          status: "PROCESSED",
          processedAt: new Date(),
        },
      });

      let dispatchedCount = 0;

      // 3. Route each event to the appropriate BullMQ queue with idempotency
      for (const event of pendingEvents) {
        const payload = {
          ...(typeof event.payload === "object" && event.payload !== null ? event.payload : {}),
          outboxEventId: event.id,
          eventType: event.eventType,
        };

        const jobOptions = {
          jobId: event.id, // BullMQ deduplication key
        };

        try {
          switch (event.eventType as DomainEventType) {
            // Omnichannel notifications & domain event subscribers
            case "USER_REGISTERED":
            case "PROPERTY_LOCKED":
            case "PROPERTY_UNLOCKED":
            case "LOCK_EXPIRED":
            case "PAYMENT_SUCCESS":
            case "MAINTENANCE_APPROVED":
            case "STAY_BOOKED":
            case "STAY_CANCELLED":
            case "INVOICE_GENERATED":
            case "PROPERTY_PUBLISHED":
            case "KYC_VERIFIED":
            case "LAND_PLOT_RELATED_EVENT":
              await Queues.Notifications.add(event.eventType, payload, jobOptions);
              await Queues.DomainEvents.add(event.eventType, payload, jobOptions);
              break;

            // CPU-intensive asynchronous document generation
            case "RENTAL_BOOKED":
            case "DISPUTE_RESOLVED":
              await Queues.DocumentGeneration.add(event.eventType, payload, jobOptions);
              break;

            // Escrow reconciliation & failed payment arbitration
            case "DISPUTE_RAISED":
            case "PAYMENT_FAILED":
              await Queues.FinancialReconciliation.add(event.eventType, payload, jobOptions);
              break;

            default:
              await Queues.ScheduledTasks.add(event.eventType, payload, jobOptions);
          }

          dispatchedCount++;
        } catch (enqueueError: any) {
          console.error(
            `[OutboxRelay] Failed to publish event ${event.id} to BullMQ:`,
            enqueueError.message
          );

          // Revert to PENDING so next sweep retries
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              status: "PENDING",
              processedAt: null,
              error: `ENQUEUE_FAILED: ${enqueueError.message}`,
            },
          });
        }
      }

      console.log(`[OutboxRelay] Successfully relayed ${dispatchedCount} outbox events to BullMQ.`);
      return dispatchedCount;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Starts periodic polling in background process
   */
  startPolling(pollIntervalMs: number = 3000) {
    if (this.timer) return;

    console.log(`[OutboxRelay] Poller initialized (interval: ${pollIntervalMs}ms).`);
    this.timer = setInterval(async () => {
      try {
        await this.sweepAndRelay();
      } catch (err: any) {
        console.error("[OutboxRelay] Sweeper error:", err.message);
      }
    }, pollIntervalMs);
  }

  /**
   * Stops background polling
   */
  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log("[OutboxRelay] Poller stopped.");
    }
  }
}

export const transactionalOutboxRelay = new TransactionalOutboxRelay();
