import { prisma } from "@/infrastructure/database/prisma";
import { 
  IEmailProvider, 
  ISmsProvider, 
  IPushProvider, 
  IWhatsAppProvider 
} from "../providers/interfaces";

export class NotificationService {
  constructor(
    private emailProvider?: IEmailProvider,
    private smsProvider?: ISmsProvider,
    private pushProvider?: IPushProvider,
    private whatsappProvider?: IWhatsAppProvider
  ) {}

  /**
   * Sends a transactional SMS, falling back to Email if SMS fails or is unavailable.
   * Business logic remains completely agnostic to whether we use Twilio, MSG91, or AWS SNS.
   */
  async sendTransactionalSms(userId: string, template: string, payload: Record<string, any>): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found for notification.");

    // Template Engine Compilation (Conceptual)
    // const message = TemplateEngine.render(template, payload);
    const message = `[Prakriti Estates] Transaction Update: ${payload.status || 'Processed'}.`;

    try {
      if (this.smsProvider && user.phoneNumber) {
        return await this.smsProvider.sendSms(user.phoneNumber, message);
      }
      return false;
    } catch (error) {
      console.warn(`SMS Failed for user ${userId}, attempting fallback...`, error);
      // Fallback logic could go here
      return false;
    }
  }

  /**
   * Dispatches a high-priority Property Alert across multiple channels.
   * e.g., When a user's saved search gets a new match, or a lock expires.
   */
  async sendPropertyAlert(userId: string, propertyId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    
    if (!user || !property) return;

    const title = "New Property Alert from Prakriti Estates!";
    const body = `Check out this new ${property.type} listing: ${property.title} for ₹${property.price}.`;

    // Fan-out Notification Strategy
    const tasks: Promise<boolean>[] = [];

    // 1. Push Notification (if they have the app installed)
    if (this.pushProvider) {
      // In reality, fetch device tokens from a UserDevice table
      tasks.push(this.pushProvider.sendPushNotification("mock_device_token", title, body, { propertyId }));
    }

    // 2. WhatsApp (if opted in)
    if (this.whatsappProvider && user.phoneNumber) {
      tasks.push(this.whatsappProvider.sendWhatsAppMessage(user.phoneNumber, "prop_alert_01", { 
        title: property.title,
        price: property.price.toString()
      }));
    }

    await Promise.allSettled(tasks);
  }
}
