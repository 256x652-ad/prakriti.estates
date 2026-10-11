import { IPushProvider } from "./interfaces";

export class ExpoPushProvider implements IPushProvider {
  private endpoint = "https://exp.host/--/api/v2/push/send";

  async sendPushNotification(
    deviceToken: string,
    title: string,
    body: string,
    data?: Record<string, any>
  ): Promise<boolean> {
    // Only dispatch to valid Expo push tokens
    if (!deviceToken.startsWith("ExponentPushToken[") && !deviceToken.startsWith("ExpoPushToken[")) {
      console.warn(`[ExpoPushProvider] Invalid token format: ${deviceToken}`);
      return false;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: deviceToken,
          sound: "default",
          title,
          body,
          data: data || {},
          priority: "high",
        }),
      });

      const result = await response.json();
      return response.ok && result.data?.status !== "error";
    } catch (error) {
      console.error("[ExpoPushProvider Error]", error);
      return false;
    }
  }

  /**
   * Batch push dispatch for multi-device broadcasts
   */
  async sendBatchPushNotifications(
    messages: { deviceToken: string; title: string; body: string; data?: Record<string, any> }[]
  ): Promise<boolean> {
    if (messages.length === 0) return true;

    try {
      const payload = messages.map((m) => ({
        to: m.deviceToken,
        sound: "default",
        title: m.title,
        body: m.body,
        data: m.data || {},
        priority: "high",
      }));

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      return response.ok;
    } catch (error) {
      console.error("[ExpoPushProvider Batch Error]", error);
      return false;
    }
  }
}
