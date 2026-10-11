export interface INotificationPayload {
  to: string;
  subject?: string;
  body: string;
}

export interface IEmailProvider {
  sendEmail(payload: INotificationPayload): Promise<boolean>;
}

export interface ISmsProvider {
  sendSms(to: string, message: string): Promise<boolean>;
}

export interface IPushProvider {
  sendPushNotification(deviceToken: string, title: string, body: string, data?: Record<string, any>): Promise<boolean>;
}

export interface IWhatsAppProvider {
  sendWhatsAppMessage(to: string, templateId: string, templateParams: Record<string, string>): Promise<boolean>;
}
