import { Job } from "bullmq";
import { createWorker } from "@/modules/workers/QueueManager";
import { notificationService } from "../services/NotificationService";
import { DomainEventType } from "@/modules/outbox/core/EventRegistry";

export class DomainEventConsumer {
  private worker;

  constructor() {
    this.worker = createWorker(
      "domain-events",
      async (job: Job) => {
        const eventType = job.name as DomainEventType;
        const payload = job.data;

        console.log(`[DomainEventConsumer] Processing event: ${eventType} (JobID: ${job.id})`);

        switch (eventType) {
          case "PAYMENT_SUCCESS":
            await this.handlePaymentSuccess(payload);
            break;

          case "STAY_BOOKED":
            await this.handleStayBooked(payload);
            break;

          case "MAINTENANCE_APPROVED":
            await this.handleMaintenanceApproved(payload);
            break;

          case "LOCK_EXPIRED":
          case "PROPERTY_UNLOCKED":
            await this.handleLockExpired(payload);
            break;

          case "INVOICE_GENERATED":
            await this.handleInvoiceGenerated(payload);
            break;

          case "KYC_VERIFIED":
            await this.handleKycVerified(payload);
            break;

          case "PROPERTY_PUBLISHED":
            // Deferred dynamic import to prevent circular dependency
            const { propertyPublishedConsumer } = await import(
              "@/modules/search/workers/PropertyPublishedConsumer"
            );
            await propertyPublishedConsumer.handlePropertyPublished(payload);
            break;

          default:
            console.log(`[DomainEventConsumer] No notification route for event ${eventType}.`);
        }
      },
      5 // Concurrency of 5 parallel event consumer workers
    );
  }

  private async handlePaymentSuccess(payload: any) {
    const targetUserId = payload.tenantId || payload.buyerId || payload.userId;
    if (targetUserId) {
      await notificationService.notifyUser(targetUserId, "PAYMENT_SUCCESS", {
        amount: payload.amount,
        paymentId: payload.paymentId || payload.referenceId,
      });
    }

    // Also notify seller/landlord if provided
    const recipientOwnerId = payload.sellerId || payload.landlordId;
    if (recipientOwnerId) {
      await notificationService.notifyUser(recipientOwnerId, "PAYMENT_SUCCESS", {
        amount: payload.amount,
        paymentId: payload.paymentId || payload.referenceId,
        message: "Payment received into escrow for your listing.",
      });
    }
  }

  private async handleStayBooked(payload: any) {
    const userId = payload.userId || payload.guestId;
    if (userId) {
      await notificationService.notifyUser(userId, "STAY_BOOKED", {
        propertyTitle: payload.propertyTitle,
        checkInDate: payload.checkInDate,
        totalAmount: payload.totalAmount,
      });
    }
  }

  private async handleMaintenanceApproved(payload: any) {
    const userId = payload.tenantId || payload.userId;
    if (userId) {
      await notificationService.notifyUser(userId, "MAINTENANCE_APPROVED", {
        ticketId: payload.ticketId,
        approvedCost: payload.approvedCost,
      });
    }
  }

  private async handleLockExpired(payload: any) {
    const userId = payload.userId || payload.buyerId;
    if (userId) {
      await notificationService.notifyUser(userId, "LOCK_EXPIRED", {
        propertyId: payload.propertyId,
        propertyTitle: payload.propertyTitle,
      });
    }
  }

  private async handleInvoiceGenerated(payload: any) {
    const tenantId = payload.tenantId || payload.userId;
    if (tenantId) {
      await notificationService.notifyUser(tenantId, "INVOICE_GENERATED", {
        invoiceId: payload.invoiceId,
        totalAmount: payload.totalAmount,
        dueDate: payload.dueDate,
      });
    }
  }

  private async handleKycVerified(payload: any) {
    if (payload.userId) {
      await notificationService.notifyUser(payload.userId, "KYC_STATUS_UPDATE", {
        status: "VERIFIED",
      });
    }
  }

  public getWorker() {
    return this.worker;
  }
}

export const domainEventConsumer = new DomainEventConsumer();
