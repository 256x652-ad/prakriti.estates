import { prisma } from "@/infrastructure/database/prisma";
import { razorpayPaymentService } from "@/modules/transactions/services/RazorpayPaymentService";
import { feeEngineService } from "@/modules/transactions/services/FeeEngineService";
import { withOutbox } from "@/modules/outbox/core/withOutbox";
import { Prisma } from "@prisma/client";

export interface InitiateRentalLockParams {
  userId: string;
  propertyId: string;
  lockDurationHours?: number; // default 48h
}

export class TenancyManagementService {
  /**
   * 1. Buyer initiates Rental Lock.
   * Calculates rental token from FeeConfiguration, initializes PropertyLock, and creates Razorpay Order.
   */
  async initiateRentalLock(params: InitiateRentalLockParams) {
    const { userId, propertyId, lockDurationHours = 48 } = params;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        rentDetails: true,
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

    if (property.lifecycleStatus !== "PUBLISHED" || property.type !== "RENT") {
      throw new Error("PROPERTY_NOT_AVAILABLE_FOR_RENT");
    }

    if (property.lockStatus === "LOCKED" || property.locks.length > 0) {
      throw new Error("CONFLICT_PROPERTY_LOCKED");
    }

    const rentPriceNum = property.price?.toNumber ? property.price.toNumber() : Number(property.price);

    // Calculate rental token via FeeConfiguration (default 1 month rent or token standard)
    const feeCalculation = await feeEngineService.calculateTransactionFees("RENTAL_TOKEN", rentPriceNum);
    const totalPayableNum = feeCalculation.totalPayable.toNumber();
    const amountInPaise = Math.round(totalPayableNum * 100);

    const receiptId = `RENT_TOK_${Date.now()}_${userId.slice(0, 6)}`;
    const orderResponse = await razorpayPaymentService.createPaymentOrder(
      amountInPaise,
      receiptId,
      {
        propertyId,
        tenantId: userId,
        purpose: "RENTAL_TOKEN_LOCK",
      }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + lockDurationHours);

    const { lock, txn } = await prisma.$transaction(async (tx) => {
      const lockRecord = await tx.propertyLock.create({
        data: {
          propertyId,
          userId,
          status: "REQUESTED",
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

      return { lock: lockRecord, txn: txnRecord };
    });

    return {
      orderId: orderResponse.orderId,
      amountInPaise,
      currency: "INR",
      propertyLockId: lock.id,
      transactionId: txn.id,
      tokenAmount: totalPayableNum,
    };
  }

  /**
   * 2. Landlord/Admin approves the tenancy for an ACTIVE or confirmed lock.
   * Transitions PropertyLock to COMPLETED and generates the official Tenancy record.
   */
  async approveTenancy(propertyLockId: string, customStartDate?: Date) {
    const lock = await prisma.propertyLock.findUnique({
      where: { id: propertyLockId },
      include: {
        property: {
          include: {
            owner: true,
            rentDetails: true,
          },
        },
      },
    });

    if (!lock) {
      throw new Error(`PropertyLock with ID ${propertyLockId} not found.`);
    }

    if (lock.status === "RELEASED") {
      const existing = await prisma.tenancy.findFirst({
        where: { propertyId: lock.propertyId, tenantId: lock.userId },
      });
      return existing;
    }

    const property = lock.property;
    const rentAmount = property.price?.toNumber ? property.price.toNumber() : Number(property.price);
    const depositAmount = property.rentDetails?.securityDeposit
      ? Number(property.rentDetails.securityDeposit)
      : rentAmount * 2;

    const startDate = customStartDate || new Date();
    const endDate = new Date(startDate);
    // Standard 11-month Indian rental agreement
    endDate.setMonth(endDate.getMonth() + 11);

    const createdTenancy = await withOutbox(
      prisma,
      "RENTAL_BOOKED",
      {
        propertyLockId,
        propertyId: property.id,
        tenantId: lock.userId,
        landlordId: property.ownerId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        rentAmount,
        depositAmount,
        timestamp: new Date().toISOString(),
      },
      async (tx) => {
        // A. Transition PropertyLock to RELEASED (converted to ongoing Tenancy)
        await tx.propertyLock.update({
          where: { id: propertyLockId },
          data: { status: "RELEASED" },
        });

        // B. Update Property lockStatus
        await tx.property.update({
          where: { id: property.id },
          data: { lockStatus: "LOCKED" },
        });

        // C. Create Tenancy Record
        const tenancy = await tx.tenancy.create({
          data: {
            propertyId: property.id,
            tenantId: lock.userId,
            landlordId: property.ownerId,
            startDate,
            endDate,
            rentAmount,
            depositAmount,
            status: "ACTIVE",
          },
        });

        return tenancy;
      }
    );

    return createdTenancy;
  }
}

export const tenancyManagementService = new TenancyManagementService();
