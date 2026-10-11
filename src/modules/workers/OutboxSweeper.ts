import { prisma } from "@/infrastructure/database/prisma";
import { Queues } from "./QueueManager";
import { DomainEventType } from "../outbox/core/EventRegistry";

export class OutboxSweeper {
  /**
   * Reads PENDING events from the PostgreSQL Outbox table
   * and routes them to the correct highly-optimized BullMQ queues.
   * 
   * This is typically run via a fast Cron (e.g. every 5 seconds) or triggered 
   * actively immediately after `withOutbox` finishes.
   */
  async sweepAndRouteEvents() {
    // 1. Fetch batch of pending events, locking them for update (preventing double-processing)
    const events = await prisma.$transaction(async (tx) => {
      // Find up to 100 pending events
      const pendingEvents = await tx.outboxEvent.findMany({
        where: { status: "PENDING" },
        take: 100,
        orderBy: { createdAt: "asc" }
      });

      if (pendingEvents.length === 0) return [];

      // Mark them as IN_QUEUE immediately (or PROCESSED if we consider routing = done)
      // We'll mark them as PROCESSED in the outbox, meaning "Successfully handed off to BullMQ".
      // BullMQ now takes full responsibility.
      await tx.outboxEvent.updateMany({
        where: { id: { in: pendingEvents.map(e => e.id) } },
        data: { status: "PROCESSED", processedAt: new Date() }
      });

      return pendingEvents;
    });

    // 2. ROUTING LOGIC
    for (const event of events) {
      const payload = { ...event.payload as object, outboxEventId: event.id };

      try {
        switch (event.eventType as DomainEventType) {
          
          // FAST NOTIFICATIONS
          case "USER_REGISTERED":
          case "PROPERTY_LOCKED":
          case "PAYMENT_SUCCESS":
          case "LAND_PLOT_RELATED_EVENT":
            await Queues.Notifications.add(event.eventType, payload);
            break;

          // HEAVY CPU (PDF Generation)
          case "RENTAL_BOOKED":
          case "DISPUTE_RESOLVED":
            await Queues.DocumentGeneration.add(event.eventType, payload);
            break;

          // FINANCIAL RECONCILIATION
          case "DISPUTE_RAISED":
          case "PAYMENT_FAILED":
            await Queues.FinancialReconciliation.add(event.eventType, payload);
            break;

          // DEFAULT FALLBACK
          default:
            console.warn(`[OutboxSweeper] No route defined for event: ${event.eventType}. Sending to ScheduledTasks.`);
            await Queues.ScheduledTasks.add(event.eventType, payload);
        }
      } catch (error) {
        // If Redis is down, we must revert the outbox state so they are swept again later!
        console.error(`[OutboxSweeper] Failed to enqueue event ${event.id}. Reverting state.`);
        await prisma.outboxEvent.update({
          where: { id: event.id },
          data: { status: "PENDING", processedAt: null }
        });
      }
    }

    if (events.length > 0) {
      console.log(`[OutboxSweeper] Swept and routed ${events.length} events to BullMQ.`);
    }
  }
}
