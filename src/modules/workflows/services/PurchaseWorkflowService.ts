import { prisma } from "@/infrastructure/database/prisma";
import { Prisma, ServiceRequestType } from "@prisma/client";
import { FeeEngineService } from "../../transactions/services/FeeEngineService";

export class PurchaseWorkflowService {
  private feeEngine = new FeeEngineService();

  /**
   * Orchestrates the Property Purchase flow.
   * Integrates Value-Added Services (VAS) into the initial transaction.
   */
  async initiatePurchaseWorkflow(userId: string, propertyId: string, requestedVas: ServiceRequestType[] = []) {
    return await prisma.$transaction(async (tx) => {
      
      const property = await tx.property.findUnique({
        where: { id: propertyId }
      });

      if (!property || property.type !== "BUY") {
        throw new Error("Property not found or is not listed for sale.");
      }
      if (property.lockStatus !== "AVAILABLE") {
        throw new Error("Property is already under offer/locked.");
      }

      // Mandatory KYC
      const kyc = await tx.kycVerification.findFirst({
        where: { userId: userId, status: "VERIFIED" }
      });
      if (!kyc) {
        throw new Error("Verified KYC is mandatory for property purchases.");
      }

      // Calculate Buyer Platform Fee
      const tokenAmount = 500000; // Fixed 5 Lakh Booking Token for Purchases (example)
      const feeResult = await this.feeEngine.calculateTransactionFees("BUYER_PLATFORM_FEE", tokenAmount);

      // Create VAS Requests
      for (const vas of requestedVas) {
        await tx.serviceRequest.create({
          data: {
            userId,
            propertyId,
            type: vas,
            status: "REQUESTED",
            notes: "Requested during purchase workflow initialization"
          }
        });
      }

      // Create Financial Transaction
      const transaction = await tx.ledgerTransaction.create({
        data: {
          userId,
          type: "TOKEN",
          status: "PENDING",
          amount: feeResult.totalPayable,
          currency: "INR"
        }
      });

      // Create Property Lock (14 days for Due Diligence / VAS completion)
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); 
      const lock = await tx.propertyLock.create({
        data: {
          propertyId,
          userId: userId,
          expiresAt,
          status: "REQUESTED",
          amount: tokenAmount // The token held in escrow
        }
      });

      // Abstracted Payment Intent
      const paymentIntent = {
        orderId: `order_${transaction.id}`,
        amount: feeResult.totalPayable,
        transactionId: transaction.id,
        lockId: lock.id
      };

      return {
        success: true,
        paymentIntent,
        fees: feeResult,
        vasRequested: requestedVas
      };

    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }

  /**
   * STATE TRANSITION RULES (Executed via Webhook)
   * When the Payment Gateway (Razorpay) fires the success webhook,
   * this state machine executes to finalize the lock.
   */
  async handlePaymentSuccessWebhook(transactionId: string, lockId: string) {
    return await prisma.$transaction(async (tx) => {
      // 1. Mark transaction as COMPLETED
      await tx.ledgerTransaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" }
      });

      // 2. Activate the Property Lock, officially taking it off the market
      const activatedLock = await tx.propertyLock.update({
        where: { id: lockId },
        data: { status: "ACTIVE" }
      });

      // 3. Lock the Property entity globally (updates UI markers to grey)
      await tx.property.update({
        where: { id: activatedLock.propertyId },
        data: { lockStatus: "LOCKED" }
      });

      // 4. Create Ledger Entry for ESCROW_HOLD
      await tx.financialLedgerEntry.create({
        data: {
          transactionId: transactionId,
          userId: activatedLock.userId,
          entryType: "CREDIT", // Credited to the platform escrow account
          eventCode: "ESCROW_HOLD",
          amount: activatedLock.amount,
          notes: `Escrow hold for property ${activatedLock.propertyId}`
        }
      });

      return { success: true, message: "Property successfully locked and funds placed in escrow." };
    });
  }
}
