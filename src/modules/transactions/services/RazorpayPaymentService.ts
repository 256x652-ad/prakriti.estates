import { IPaymentService, PaymentOrderRequest, PaymentOrderResponse } from "@/core/providers/IPaymentProvider";
import crypto from "crypto";

export interface RazorpayOrderOptions {
  amountInPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export class RazorpayPaymentService implements IPaymentService {
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || "rzp_test_prakriti_mock_key";
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_mock_secret";
  }

  /**
   * Application service method to create a payment order with Razorpay.
   * Isolated adapter: NO Razorpay SDK types or dependencies bleed into caller logic.
   */
  async createPaymentOrder(
    amountInPaise: number,
    receiptId: string,
    notes?: Record<string, string>
  ): Promise<PaymentOrderResponse> {
    return this.createOrder({
      amount: amountInPaise,
      currency: "INR",
      receiptId,
      notes,
    });
  }

  async createOrder(request: PaymentOrderRequest): Promise<PaymentOrderResponse> {
    // Generate simulated orderId or interact with external gateway
    const orderId = `order_${crypto.randomBytes(8).toString("hex")}`;

    return {
      orderId,
      provider: "RAZORPAY",
      amount: request.amount,
      currency: request.currency || "INR",
      status: "created",
    };
  }

  /**
   * Cryptographically verifies HMAC-SHA256 signature from Razorpay Webhook header.
   */
  verifySignature(payload: string, signature: string, secret?: string): boolean {
    const webhookSecret = secret || process.env.RAZORPAY_WEBHOOK_SECRET || this.keySecret;
    if (!signature || !webhookSecret) {
      return false;
    }

    try {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(payload)
        .digest("hex");

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, "utf8"),
        Buffer.from(signature, "utf8")
      );
    } catch {
      return false;
    }
  }

  async fetchPayment(paymentId: string): Promise<any> {
    return {
      id: paymentId,
      status: "captured",
      amount: 100000,
      currency: "INR",
    };
  }
}

export const razorpayPaymentService = new RazorpayPaymentService();
