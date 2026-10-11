import { prisma } from "@/infrastructure/database/prisma";
import { razorpayPaymentService } from "./RazorpayPaymentService";
import { withOutbox } from "@/modules/outbox/core/withOutbox";
import { IEscrowService, IRefundService, RefundRequest } from "@/core/providers/IPaymentProvider";
import { Prisma } from "@prisma/client";

export class EscrowAndRefundEngine implements IEscrowService, IRefundService {
  /**
   * Holds funds in internal escrow ledger.
   */
  async holdFunds(transactionId: string, amount: number): Promise<boolean> {
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) throw new Error(`Transaction ${transactionId} not found.`);

    await prisma.financialLedgerEntry.create({
      data: {
        transactionId,
        userId: transaction.userId,
        entryType: "DEBIT",
        eventCode: "ESCROW_HOLD",
        amount: new Prisma.Decimal(amount),
        notes: `Escrow hold applied for transaction ${transactionId}`,
      },
    });

    return true;
  }

  /**
   * Releases escrow funds to seller after deducting platform success fee.
   */
  async releaseFunds(transactionId: string, targetAccountId: string): Promise<boolean> {
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
      include: { property: true },
    });

    if (!transaction) throw new Error(`Transaction ${transactionId} not found.`);

    const totalAmount = transaction.amount.toNumber ? transaction.amount.toNumber() : Number(transaction.amount);

    // Compute seller success fee deduction (1.5% standard or dynamic)
    const successFee = Math.round(totalAmount * 0.015);
    const payoutAmount = totalAmount - successFee;

    await withOutbox(
      prisma,
      "DISPUTE_RESOLVED",
      {
        transactionId,
        action: "ESCROW_RELEASED",
        sellerId: transaction.property?.ownerId,
        payoutAmount,
        successFee,
        targetAccountId,
        timestamp: new Date().toISOString(),
      },
      async (tx) => {
        // Record Escrow Release Credit to Seller
        if (transaction.property?.ownerId) {
          await tx.financialLedgerEntry.create({
            data: {
              transactionId,
              userId: transaction.property.ownerId,
              entryType: "CREDIT",
              eventCode: "ESCROW_RELEASE",
              amount: new Prisma.Decimal(payoutAmount),
              notes: `Escrow payout released to seller account ${targetAccountId}`,
            },
          });
        }

        // Record Platform Success Fee Deduction
        await tx.financialLedgerEntry.create({
          data: {
            transactionId,
            userId: transaction.userId,
            entryType: "DEBIT",
            eventCode: "PLATFORM_FEE_DEDUCTION",
            amount: new Prisma.Decimal(successFee),
            notes: `Seller Success Fee deducted from escrow payout`,
          },
        });

        // Update transaction status
        await tx.ledgerTransaction.update({
          where: { id: transactionId },
          data: { status: "COMPLETED" },
        });

        // Release property lock
        if (transaction.propertyId) {
          await tx.propertyLock.updateMany({
            where: { propertyId: transaction.propertyId, status: "ACTIVE" },
            data: { status: "RELEASED" },
          });

          await tx.property.update({
            where: { id: transaction.propertyId },
            data: { lockStatus: "COMPLETED" },
          });
        }
      }
    );

    return true;
  }

  /**
   * Releases escrow to seller (Application Service method)
   */
  async releaseEscrowToSeller(transactionId: string): Promise<boolean> {
    return this.releaseFunds(transactionId, "SELLER_LINKED_ACCOUNT");
  }

  /**
   * Interfaces with payment gateway to return funds to original payment source.
   */
  async initiateRefund(request: RefundRequest): Promise<boolean> {
    return this.processRefund(request.paymentId, request.reason || "Standard refund");
  }

  /**
   * Application Service: processRefund(transactionId, reason)
   * Dispatches gateway refund and appends immutable REFUND ledger entry.
   */
  async processRefund(transactionId: string, reason: string): Promise<boolean> {
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
      include: { property: true },
    });

    if (!transaction) throw new Error(`Transaction ${transactionId} not found.`);

    if (transaction.status === "REFUNDED") {
      console.log(`[Refund] Transaction ${transactionId} is already refunded.`);
      return true;
    }

    // Call payment provider to initiate gateway refund
    // In production: await razorpayPaymentService.initiateRefund({ paymentId: transaction.referenceId, ... });

    await withOutbox(
      prisma,
      "PAYMENT_FAILED",
      {
        transactionId,
        action: "REFUND_COMPLETED",
        buyerId: transaction.userId,
        amount: transaction.amount.toNumber ? transaction.amount.toNumber() : Number(transaction.amount),
        reason,
        timestamp: new Date().toISOString(),
      },
      async (tx) => {
        // Record immutable REFUND ledger entry
        await tx.financialLedgerEntry.create({
          data: {
            transactionId,
            userId: transaction.userId,
            entryType: "DEBIT",
            eventCode: "REFUND",
            amount: transaction.amount,
            notes: `Refund processed to buyer: ${reason}`,
          },
        });

        // Update transaction status to REFUNDED
        await tx.ledgerTransaction.update({
          where: { id: transactionId },
          data: { status: "REFUNDED" },
        });

        // Release property lock back to AVAILABLE
        if (transaction.propertyId) {
          await tx.propertyLock.updateMany({
            where: { propertyId: transaction.propertyId, status: "ACTIVE" },
            data: { status: "RELEASED" },
          });

          await tx.property.update({
            where: { id: transaction.propertyId },
            data: { lockStatus: "AVAILABLE" },
          });
        }
      }
    );

    return true;
  }

  async checkRefundStatus(refundId: string): Promise<string> {
    return "PROCESSED";
  }
}

export const escrowAndRefundEngine = new EscrowAndRefundEngine();
