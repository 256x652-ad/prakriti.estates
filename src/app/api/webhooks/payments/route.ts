import { NextResponse } from "next/server";
import { RazorpayPaymentProvider } from "@/infrastructure/payments/RazorpayPaymentProvider";
import { prisma } from "@/infrastructure/database/prisma";
import { TransactionStateMachine, FinancialState } from "@/modules/transactions/core/TransactionStateMachine";

export async function POST(req: Request) {
  try {
    const payloadString = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "";

    const provider = new RazorpayPaymentProvider();

    // 1. Signature Verification
    if (!provider.verifySignature(payloadString, signature, webhookSecret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(payloadString);
    const paymentId = event.payload.payment.entity.id;
    const orderId = event.payload.payment.entity.order_id;

    // 2. Idempotency Check
    // We check if this specific payment gateway reference has already been processed and logged
    const existingEntry = await prisma.financialLedgerEntry.findFirst({
      where: { notes: { contains: paymentId } }
    });

    if (existingEntry) {
      console.log(`[Webhook] Payment ${paymentId} already processed. Acknowledging.`);
      return NextResponse.json({ status: "acknowledged" }, { status: 200 });
    }

    // 3. Find parent transaction using orderId
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { referenceId: orderId }
    });

    if (!transaction) {
      console.error(`[Webhook] Parent transaction not found for order ${orderId}`);
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // 4. State Machine Transition & Ledger Append
    // We process the event through our strict state machine
    if (event.event === "payment.captured") {
      const stateMachine = new TransactionStateMachine();
      
      // Attempt transition (will throw if invalid, preventing corrupted DB state)
      const nextState = stateMachine.transition(transaction.status as FinancialState, "COMPLETED");

      await prisma.$transaction(async (tx) => {
        // Update Parent Status
        await tx.ledgerTransaction.update({
          where: { id: transaction.id },
          data: { status: "COMPLETED" }
        });

        // Append Immutable Ledger Entry
        await tx.financialLedgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: transaction.userId,
            entryType: "CREDIT",
            eventCode: "TOKEN_PAYMENT",
            amount: transaction.amount,
            notes: `Razorpay Payment Captured: ${paymentId}`
          }
        });
      });
    }

    return NextResponse.json({ status: "success" }, { status: 200 });
  } catch (error: any) {
    console.error("[Webhook Error]:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
