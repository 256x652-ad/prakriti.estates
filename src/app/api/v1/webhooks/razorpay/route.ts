import { NextRequest, NextResponse } from "next/server";
import { razorpayPaymentService } from "@/modules/transactions/services/RazorpayPaymentService";
import { propertyLockTransactionService } from "@/modules/transactions/services/PropertyLockTransactionService";

export async function POST(req: NextRequest) {
  try {
    const rawPayload = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";

    // 1. Strict Server-Side Signature Verification
    const isValid = razorpayPaymentService.verifySignature(rawPayload, signature);
    if (!isValid) {
      console.warn("[Razorpay Webhook] Rejected unauthorized or invalid signature");
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
    }

    const event = JSON.parse(rawPayload);

    // 2. Handle Payment Captured Event
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const paymentEntity = event.payload?.payment?.entity;
      const paymentId = paymentEntity?.id;
      const orderId = paymentEntity?.order_id || event.payload?.order?.entity?.id;
      const amount = paymentEntity?.amount;

      if (!orderId || !paymentId) {
        console.warn("[Razorpay Webhook] Missing order_id or payment_id in payload");
        return NextResponse.json({ error: "Missing essential identifiers" }, { status: 400 });
      }

      // 3. Financial State Machine, Idempotency Check & Ledger Mutation
      const settlement = await propertyLockTransactionService.processSuccessfulPayment({
        orderId,
        paymentId,
        amountInPaise: amount,
        rawPayload: event,
      });

      console.log(
        `[Razorpay Webhook] Processed successfully. AlreadyProcessed: ${settlement.alreadyProcessed}, Ledger: ${settlement.ledgerEntryId}`
      );
    }

    // Always respond 200 OK to acknowledge receipt to gateway
    return NextResponse.json({ status: "acknowledged", received: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Razorpay Webhook Exception]", error);
    // Respond 500 so Razorpay retries webhook delivery on unexpected internal errors
    return NextResponse.json(
      { error: "Internal processing error", message: error.message },
      { status: 500 }
    );
  }
}
