import { prisma } from "@/infrastructure/database/prisma";
import { Worker, Job } from "bullmq";

// In a real app, this connection would be imported from a central Redis config.
const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD
};

export class OutboxWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      "OutboxEventsQueue",
      async (job: Job) => {
        const { eventId } = job.data;
        await this.processEvent(eventId);
      },
      { connection: redisConnection }
    );

    this.worker.on("completed", (job) => {
      console.log(`[OutboxWorker] Successfully processed job ${job.id}`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`[OutboxWorker] Failed job ${job?.id}: ${err.message}`);
    });
  }

  /**
   * Processes a specific OutboxEvent.
   * This guarantees that side-effects (like emails) only occur AFTER 
   * the main PostgreSQL transaction has successfully committed.
   */
  private async processEvent(eventId: string) {
    const event = await prisma.outboxEvent.findUnique({
      where: { id: eventId }
    });

    if (!event || event.status !== "PENDING") {
      return; // Already processed or doesn't exist
    }

    try {
      // Route the event to the correct domain handler
      switch (event.eventType) {
        case "LAND_PLOT_RELATED_EVENT":
          await this.handleLandPlotCrossSell(event.payload);
          break;
        case "PROPERTY_LOCKED":
        case "PAYMENT_SUCCESS":
          await this.handlePaymentAndLockNotifications(event.eventType, event.payload);
          break;
        default:
          console.log(`[OutboxWorker] No handler for event type: ${event.eventType}`);
      }

      // Mark as processed atomically
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "PROCESSED",
          processedAt: new Date()
        }
      });
    } catch (error: any) {
      // Mark as failed so it can be retried or sent to a Dead Letter Queue
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "FAILED",
          error: error.message
        }
      });
      throw error;
    }
  }

  /**
   * DOMAIN HANDLER: Land Plot Cross-Sell
   * Triggers the notification service to offer a discounted architectural consultation.
   */
  private async handleLandPlotCrossSell(payload: any) {
    const { userId, propertyId, propertyTitle } = payload as { userId: string; propertyId: string; propertyTitle: string };
    
    console.log(`[Notification Service] Sending Cross-Sell Email to User ${userId}...`);
    console.log(`   Subject: Special Architectural Consultation Offer for ${propertyTitle}!`);
    console.log(`   Body: Congratulations on your land plot transaction. Er. Aditya Jaiswal (M.Tech IIT Delhi) and the Prakriti Consultants team are offering a 15% discount on initial Structural and Vastu consultations. Claim your offer now!`);
    
    // Abstracted: e.g. await sendGrid.sendEmail(...)
    // If the email API goes down, this throws an error, the BullMQ job fails,
    // and the event remains PENDING/FAILED in the outbox table for a safe retry.
    
    return true;
  }

  /**
   * DOMAIN HANDLER: Token Payment & Property Lock Notifications
   * Sends Token Receipt (SMS/Email) to the Buyer and Property Locked alert to the Seller.
   */
  private async handlePaymentAndLockNotifications(eventType: string, payload: any) {
    const { buyerId, sellerId, propertyId, amount, paymentId, lockedUntil } = payload;

    // 1. Send Token Receipt to Buyer
    if (buyerId) {
      console.log(`[Notification Service] Dispatching Token Receipt to Buyer ${buyerId}...`);
      console.log(`   Receipt Ref: ${paymentId} | Amount: ₹${amount} | Locked Until: ${lockedUntil}`);
      // await notificationService.sendTransactionalSms(buyerId, "TOKEN_RECEIPT_SMS", { amount, paymentId });
    }

    // 2. Send Property Locked Alert to Seller
    if (sellerId) {
      console.log(`[Notification Service] Dispatching Token Lock Alert to Seller ${sellerId}...`);
      console.log(`   Property: ${propertyId} | Status: Temporarily Locked for Escrow Finalization.`);
      // await notificationService.sendPropertyAlert(sellerId, propertyId);
    }

    return true;
  }
}
