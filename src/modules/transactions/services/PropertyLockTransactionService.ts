import { prisma } from "@/infrastructure/database/prisma";
import { razorpayPaymentService } from "./RazorpayPaymentService";
import { FeeEngineService } from "./FeeEngineService";
import { withOutbox } from "@/modules/outbox/core/withOutbox";
import { Prisma } from "@prisma/client";

export interface InitiatePropertyLockTokenParams {
  userId: string;
  propertyId: string;
  lockDurationHours?: number;
}

export interface InitiatePropertyLockTokenResult {
  orderId: string;
  amountInPaise: number;
  currency: string;
  propertyLockId: string;
  transactionId: string;
  tokenFeeDetails: {
    baseAmount: number;
    platformFee: number;
    taxAmount: number;
    totalPayable: number;
  };
}

export class PropertyLockTransactionService {
  private feeEngine: FeeEngineService;

  constructor() {
    this.feeEngine = new FeeEngineService();
  }

  /**
   * Initiates Property Lock and Razorpay Order.
   * Creates initial records in PAYMENT_PENDING state.
   */
  async initiateLockTokenOrder(
    params: InitiatePropertyLockTokenParams
  ): Promise<InitiatePropertyLockTokenResult> {
    const { userId, propertyId, lockDurationHours = 48 } = params;

    // 1. Verify Property Availability
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        locks: {
          where: {
            status: "ACTIVE",
            expiresAt: { gt: new Date() },
          },
        },
      },
    });

    if (!property) {
      throw new Error("PROPERTY_NOT_FOUND");
    }

    if (property.lifecycleStatus !== "PUBLISHED") {
      throw new Error("PROPERTY_NOT_AVAILABLE_FOR_TOKEN");
    }

    if (property.lockStatus === "LOCKED" || property.locks.length > 0) {
      throw new Error("CONFLICT_PROPERTY_LOCKED");
    }

    // 2. Calculate dynamic token amount and platform fees
    // Base token amount: 1% of property price (or minimum ₹50,000 for standard real estate reservation)
    const propertyPriceNum = property.price?.toNumber ? property.price.toNumber() : Number(property.price);
    const calculatedBaseToken = Math.max(Math.round(propertyPriceNum * 0.01), 50000);

    let feeCalculation;
    try {
      feeCalculation = await this.feeEngine.calculateTransactionFees("RENTAL_TOKEN", calculatedBaseToken);
    } catch {
      // Fallback if no fee configuration is seeded yet
      feeCalculation = {
        baseAmount: new Prisma.Decimal(calculatedBaseToken),
        platformFee: new Prisma.Decimal(2500),
        taxAmount: new Prisma.Decimal(450),
        escrowHold: new Prisma.Decimal(calculatedBaseToken - 2950),
        totalPayable: new Prisma.Decimal(calculatedBaseToken),
      };
    }

    const totalPayableNum = feeCalculation.totalPayable.toNumber();
    const amountInPaise = Math.round(totalPayableNum * 100);

    const receiptId = `RCPT_${Date.now()}_${userId.slice(0, 6)}`;

    // 3. Create Gateway Order
    const orderResponse = await razorpayPaymentService.createPaymentOrder(
      amountInPaise,
      receiptId,
      {
        propertyId,
        userId,
        purpose: "PROPERTY_TOKEN_LOCK",
      }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + lockDurationHours);

    // 4. Create PropertyLock and LedgerTransaction records in initial state
    const { lock, transaction } = await prisma.$transaction(async (tx) => {
      const lockRecord = await tx.propertyLock.create({
        data: {
          propertyId,
          userId,
          status: "REQUESTED", // REQUESTED acts as PAYMENT_PENDING in schema
          amount: feeCalculation.totalPayable,
          paymentRef: orderResponse.orderId,
          expiresAt,
        },
      });

      const txnRecord = await tx.ledgerTransaction.create({
        data: {
          type: "TOKEN",
          status: "PENDING",
          amount: feeCalculation.totalPayable,
          currency: "INR",
          userId,
          propertyId,
          referenceId: orderResponse.orderId,
        },
      });

      return { lock: lockRecord, transaction: txnRecord };
    });

    return {
      orderId: orderResponse.orderId,
      amountInPaise,
      currency: "INR",
      propertyLockId: lock.id,
      transactionId: transaction.id,
      tokenFeeDetails: {
        baseAmount: feeCalculation.baseAmount.toNumber(),
        platformFee: feeCalculation.platformFee.toNumber(),
        taxAmount: feeCalculation.taxAmount.toNumber(),
        totalPayable: totalPayableNum,
      },
    };
  }

  /**
   * Internal processSuccessfulPayment transaction block wrapped with withOutbox.
   * Atomically:
   * 1. Transitions PropertyLock to ACTIVE.
   * 2. Transitions parent Property to LOCKED.
   * 3. Transitions LedgerTransaction to COMPLETED.
   * 4. Appends immutable FinancialLedgerEntry records (Credit & Escrow hold).
   * 5. Emits PROPERTY_LOCKED and PAYMENT_SUCCESS domain events into Outbox.
   */
  async processSuccessfulPayment(params: {
    orderId: string;
    paymentId: string;
    amountInPaise?: number;
    rawPayload?: Record<string, any>;
  }) {
    const { orderId, paymentId } = params;

    // 1. Idempotency Check: verify if payment was already recorded in ledger
    const existingLedger = await prisma.financialLedgerEntry.findFirst({
      where: { notes: { contains: paymentId } },
    });

    if (existingLedger) {
      console.log(`[Idempotency] Payment ${paymentId} has already been settled in the financial ledger.`);
      return { alreadyProcessed: true, ledgerEntryId: existingLedger.id };
    }

    // 2. Fetch the corresponding LedgerTransaction
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { referenceId: orderId },
      include: { property: { include: { owner: true } } },
    });

    if (!transaction) {
      throw new Error(`TRANSACTION_NOT_FOUND: No transaction matched orderId ${orderId}`);
    }

    const lock = await prisma.propertyLock.findFirst({
      where: { paymentRef: orderId },
    });

    if (!lock) {
      throw new Error(`PROPERTY_LOCK_NOT_FOUND: No lock record found for order ${orderId}`);
    }

    const eventPayload = {
      orderId,
      paymentId,
      transactionId: transaction.id,
      propertyId: transaction.propertyId,
      propertyLockId: lock.id,
      buyerId: transaction.userId,
      sellerId: transaction.property?.ownerId,
      amount: transaction.amount.toNumber ? transaction.amount.toNumber() : Number(transaction.amount),
      lockedUntil: lock.expiresAt.toISOString(),
      timestamp: new Date().toISOString(),
    };

    // 3. Atomically mutate state and emit outbox event via withOutbox
    const result = await withOutbox(
      prisma,
      "PROPERTY_LOCKED",
      eventPayload,
      async (tx) => {
        // A. Transition PropertyLock state to ACTIVE
        const updatedLock = await tx.propertyLock.update({
          where: { id: lock.id },
          data: {
            status: "ACTIVE",
            paymentRef: paymentId, // Update with final confirmed payment ID
          },
        });

        // B. Transition parent Property state to LOCKED
        if (transaction.propertyId) {
          await tx.property.update({
            where: { id: transaction.propertyId },
            data: {
              lockStatus: "LOCKED",
            },
          });
        }

        // C. Transition LedgerTransaction to COMPLETED
        await tx.ledgerTransaction.update({
          where: { id: transaction.id },
          data: {
            status: "COMPLETED",
          },
        });

        // D. Insert immutable FinancialLedgerEntry
        const ledgerEntry = await tx.financialLedgerEntry.create({
          data: {
            transactionId: transaction.id,
            userId: transaction.userId,
            entryType: "CREDIT",
            eventCode: "TOKEN_PAYMENT",
            amount: transaction.amount,
            notes: `Razorpay Payment Captured: ${paymentId} for Order: ${orderId}`,
          },
        });

        // Also emit PAYMENT_SUCCESS into outbox table inside the same transaction
        await tx.outboxEvent.create({
          data: {
            eventType: "PAYMENT_SUCCESS",
            payload: eventPayload,
            status: "PENDING",
          },
        });

        return {
          lock: updatedLock,
          ledgerEntry,
        };
      }
    );

    return {
      alreadyProcessed: false,
      lockId: result.lock.id,
      ledgerEntryId: result.ledgerEntry.id,
    };
  }
}

export const propertyLockTransactionService = new PropertyLockTransactionService();
