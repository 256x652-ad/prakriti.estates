import { prisma } from "@/infrastructure/database/prisma";
import {
  IEmailProvider,
  ISmsProvider,
  IPushProvider,
  IWhatsAppProvider,
  INotificationPayload,
} from "../providers/interfaces";

export class MockEmailProvider implements IEmailProvider {
  async sendEmail(payload: INotificationPayload): Promise<boolean> {
    console.log(`[MockEmailProvider] To: ${payload.to} | Subject: "${payload.subject}"`);
    console.log(`   Content: ${payload.body.substring(0, 100)}...`);
    return true;
  }
}

export class MockSmsProvider implements ISmsProvider {
  async sendSms(to: string, message: string): Promise<boolean> {
    console.log(`[MockSmsProvider] To: ${to} | Message: "${message}"`);
    return true;
  }
}

export class MockPushProvider implements IPushProvider {
  async sendPushNotification(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    console.log(`[MockPushProvider] Token: ${deviceToken.substring(0, 12)}... | Title: "${title}"`);
    console.log(`   Body: "${body}" | Data:`, data || {});
    return true;
  }
}

export type NotificationTemplateType =
  | "PAYMENT_SUCCESS"
  | "STAY_BOOKED"
  | "MAINTENANCE_APPROVED"
  | "LOCK_EXPIRED"
  | "INVOICE_GENERATED"
  | "PROPERTY_ALERT"
  | "KYC_STATUS_UPDATE";

export interface RenderedTemplate {
  title: string;
  smsMessage: string;
  emailSubject: string;
  emailHtml: string;
}

export class NotificationService {
  constructor(
    private emailProvider: IEmailProvider = new MockEmailProvider(),
    private smsProvider: ISmsProvider = new MockSmsProvider(),
    private pushProvider: IPushProvider = new MockPushProvider(),
    private whatsappProvider?: IWhatsAppProvider
  ) {}

  /**
   * Compiles template into omnichannel formats
   */
  renderTemplate(type: NotificationTemplateType, data: Record<string, any>): RenderedTemplate {
    switch (type) {
      case "PAYMENT_SUCCESS":
        return {
          title: "Payment Received 🌿",
          smsMessage: `[Prakriti Estates] Payment of ₹${Number(data.amount).toLocaleString("en-IN")} confirmed. Ref: ${data.paymentId || data.referenceId}.`,
          emailSubject: `Payment Receipt: ₹${Number(data.amount).toLocaleString("en-IN")}`,
          emailHtml: `<h2>Payment Confirmation</h2><p>Your payment of <strong>₹${Number(data.amount).toLocaleString("en-IN")}</strong> has been processed into escrow.</p><p>Transaction ID: ${data.paymentId || data.referenceId}</p>`,
        };

      case "STAY_BOOKED":
        return {
          title: "Stay Reservation Confirmed! 🏡",
          smsMessage: `[Prakriti Estates] Your stay at ${data.propertyTitle || "Eco Retreat"} is confirmed for ${data.checkInDate || "your trip"}.`,
          emailSubject: `Booking Confirmed: ${data.propertyTitle || "Prakriti Stay"}`,
          emailHtml: `<h2>Reservation Confirmed</h2><p>You're all set! Check-in: ${data.checkInDate}. Total paid: ₹${data.totalAmount}.</p>`,
        };

      case "MAINTENANCE_APPROVED":
        return {
          title: "Maintenance Credit Approved 🛠️",
          smsMessage: `[Prakriti Estates] Your maintenance ticket #${String(data.ticketId).slice(0, 8)} of ₹${data.approvedCost} was approved by landlord.`,
          emailSubject: `Maintenance Expense Approved - Rent Credit Applied`,
          emailHtml: `<h2>Maintenance Approved</h2><p>Your expense of ₹${data.approvedCost} has been credited toward your upcoming monthly rental invoice.</p>`,
        };

      case "LOCK_EXPIRED":
        return {
          title: "Property Lock Expired ⏳",
          smsMessage: `[Prakriti Estates] The reservation lock for ${data.propertyTitle || "Property"} has expired. Inventory released.`,
          emailSubject: `Property Lock Expired: ${data.propertyTitle || "Listing"}`,
          emailHtml: `<h2>Lock Expired</h2><p>The lock on property #${data.propertyId} has expired. Any applicable refund or forfeiture has been recorded in the ledger.</p>`,
        };

      case "INVOICE_GENERATED":
        return {
          title: "Monthly Rent Invoice Due 📄",
          smsMessage: `[Prakriti Estates] Monthly rent invoice of ₹${Number(data.totalAmount).toLocaleString("en-IN")} is ready. Due by 5th.`,
          emailSubject: `Monthly Rent Invoice #${String(data.invoiceId).slice(0, 8)}`,
          emailHtml: `<h2>Monthly Rental Invoice</h2><p>Your monthly rent invoice for ₹${Number(data.totalAmount).toLocaleString("en-IN")} has been generated.</p>`,
        };

      case "PROPERTY_ALERT":
        return {
          title: "New Match for Your Saved Search! 🌿",
          smsMessage: `[Prakriti Estates] New listing matching your alert: ${data.title} for ₹${Number(data.price).toLocaleString("en-IN")}.`,
          emailSubject: `New Property Alert: ${data.title}`,
          emailHtml: `<h2>New Match Found!</h2><p>A new listing matches your search criteria: <strong>${data.title}</strong> at ₹${Number(data.price).toLocaleString("en-IN")}.</p>`,
        };

      case "KYC_STATUS_UPDATE":
        return {
          title: `KYC ${data.status} 🪪`,
          smsMessage: `[Prakriti Estates] Your KYC status has been updated to: ${data.status}.`,
          emailSubject: `KYC Compliance Update: ${data.status}`,
          emailHtml: `<h2>KYC Verification Update</h2><p>Your account KYC verification is now: <strong>${data.status}</strong>.</p>`,
        };

      default:
        return {
          title: "Prakriti Notification",
          smsMessage: `[Prakriti Estates] Update: ${data.message || "Notification received."}`,
          emailSubject: "Prakriti Estates Notification",
          emailHtml: `<p>${data.message || "You have a new notification."}</p>`,
        };
    }
  }

  /**
   * Dispatches notifications to a user across all configured channels: Push, SMS, and Email.
   */
  async notifyUser(
    userId: string,
    templateType: NotificationTemplateType,
    data: Record<string, any>
  ): Promise<{ pushSent: number; smsSent: boolean; emailSent: boolean }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.warn(`[NotificationService] User #${userId} not found.`);
      return { pushSent: 0, smsSent: false, emailSent: false };
    }

    const template = this.renderTemplate(templateType, data);

    let pushSent = 0;
    let smsSent = false;
    let emailSent = false;

    // 1. Omnichannel Push: Broadcast to all active user mobile/web devices
    try {
      const pushResult = await this.broadcastToUserDevices(
        userId,
        template.title,
        template.smsMessage,
        { templateType, ...data }
      );
      pushSent = pushResult.sentCount;
    } catch (err: any) {
      console.warn(`[NotificationService] Push delivery error:`, err.message);
    }

    // 2. Omnichannel SMS: Send to user's phone number
    if (user.phoneNumber) {
      try {
        smsSent = await this.smsProvider.sendSms(user.phoneNumber, template.smsMessage);
      } catch (err: any) {
        console.warn(`[NotificationService] SMS delivery error:`, err.message);
      }
    }

    // 3. Omnichannel Email: Send HTML summary to user's registered email
    if (user.email) {
      try {
        emailSent = await this.emailProvider.sendEmail({
          to: user.email,
          subject: template.emailSubject,
          body: template.emailHtml,
        });
      } catch (err: any) {
        console.warn(`[NotificationService] Email delivery error:`, err.message);
      }
    }

    return { pushSent, smsSent, emailSent };
  }

  /**
   * Broadcasts a push notification to all active devices registered for a user.
   */
  async broadcastToUserDevices(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<{ sentCount: number; failedCount: number }> {
    const devices = await prisma.device.findMany({
      where: {
        userId,
        status: "ACTIVE",
        pushToken: { not: null },
      },
    });

    if (devices.length === 0) {
      return { sentCount: 0, failedCount: 0 };
    }

    const results = await Promise.allSettled(
      devices.map((device) =>
        this.pushProvider.sendPushNotification(device.pushToken!, title, body, data)
      )
    );

    let sentCount = 0;
    let failedCount = 0;

    results.forEach((r) => {
      if (r.status === "fulfilled" && r.value) {
        sentCount++;
      } else {
        failedCount++;
      }
    });

    return { sentCount, failedCount };
  }

  /**
   * Specific Property Alert Dispatcher
   */
  async sendPropertyAlert(userId: string, property: { id: string; title: string; price: string | number; city?: string }) {
    return await this.notifyUser(userId, "PROPERTY_ALERT", {
      propertyId: property.id,
      title: property.title,
      price: property.price,
      city: property.city || "Delhi NCR",
    });
  }
}

export const notificationService = new NotificationService();
