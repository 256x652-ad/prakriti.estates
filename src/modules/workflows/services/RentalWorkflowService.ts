import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";
import { FeeEngineService } from "../../transactions/services/FeeEngineService";

export class RentalWorkflowService {
  private feeEngine = new FeeEngineService();

  /**
   * Orchestrates the complex Long-Term Rental flow.
   * Enforces strict sequencing: Availability -> KYC -> Fees -> Locking.
   */
  async initiateRentalWorkflow(userId: string, propertyId: string) {
    // 1. Transactional isolation to prevent race conditions during booking
    return await prisma.$transaction(async (tx) => {
      
      // 2. Strict Availability Check
      const property = await tx.property.findUnique({
        where: { id: propertyId },
        include: { rentDetails: true }
      });

      if (!property || property.type !== "RENT") {
        throw new Error("Property not found or is not listed for rent.");
      }
      if (property.lockStatus !== "AVAILABLE") {
        throw new Error("This property is currently locked by another user.");
      }

      // 3. Mandatory KYC Check (Indian Market Compliance)
      const kyc = await tx.kycVerification.findFirst({
        where: { userId: userId, status: "VERIFIED" }
      });
      if (!kyc) {
        throw new Error("Verified KYC (Aadhaar/PAN) is mandatory before booking a rental.");
      }

      // 4. Fee & Token Calculation
      // Rent token is usually equivalent to 1 month's rent.
      const baseRent = property.price.toNumber();
      const feeResult = await this.feeEngine.calculateTransactionFees("RENTAL_TOKEN", baseRent);

      // 5. Create Financial Transaction Record
      const transaction = await tx.ledgerTransaction.create({
        data: {
          userId,
          type: "TOKEN",
          status: "PENDING",
          amount: feeResult.totalPayable,
          currency: "INR"
        }
      });

      // 6. Create the Property Lock (48-Hour Default)
      // Placed in REQUESTED state; only moves to ACTIVE when payment succeeds.
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 Hours
      const lock = await tx.propertyLock.create({
        data: {
          propertyId,
          userId: userId,
          expiresAt,
          status: "REQUESTED",
          amount: feeResult.escrowHold
        }
      });

      // 7. Initialize Payment Intent
      // In production, this calls Razorpay API: razorpay.orders.create(...)
      const paymentIntent = {
        orderId: `order_${transaction.id}`,
        amount: feeResult.totalPayable,
        currency: "INR",
        transactionId: transaction.id,
        lockId: lock.id
      };

      return {
        success: true,
        paymentIntent,
        fees: feeResult
      };

    }, {
      // Serializable guarantees no two users can book simultaneously
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable
    });
  }
}
