import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { enforceKycGate, KycRequiredError } from "@/modules/kyc/guards/enforceKycGate";
import { feeEngineService } from "@/modules/transactions/services/FeeEngineService";
import { razorpayPaymentService } from "@/modules/transactions/services/RazorpayPaymentService";
import { ApiResponseHelper } from "@/lib/api/response";
import { ServiceRequestType, Prisma } from "@prisma/client";
import { z } from "zod";

const PurchaseCheckoutSchema = z.object({
  propertyId: z.string().uuid("Invalid property UUID"),
  lockDurationHours: z.number().int().min(24).max(168).default(72), // up to 7 days for purchase
  valueAddedServices: z
    .array(z.enum(["LEGAL", "LOAN", "VASTU", "STRUCTURAL", "PRAKRITI_CERTIFIED"]))
    .default([]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to checkout", 401);
    }

    const userId = (session.user as any).id;

    // 1. Strict KYC Gate Enforcement
    await enforceKycGate(userId);

    const body = await req.json();
    const validation = PurchaseCheckoutSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid purchase checkout parameters",
        422,
        validation.error.flatten()
      );
    }

    const { propertyId, lockDurationHours, valueAddedServices } = validation.data;

    // 2. Verify Property Availability
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
      return ApiResponseHelper.error("NOT_FOUND", "Property not found", 404);
    }

    if (property.lifecycleStatus !== "PUBLISHED") {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Property is not published or available for purchase",
        400
      );
    }

    if (property.lockStatus === "LOCKED" || property.locks.length > 0) {
      return ApiResponseHelper.error(
        "CONFLICT_PROPERTY_LOCKED",
        "Property is already locked under an active purchase agreement or deposit",
        409
      );
    }

    // 3. Dynamic Fee Calculation (Redis-cached FeeConfiguration)
    const feeBreakdown = await feeEngineService.calculatePurchaseFees(propertyId, userId);

    // Dynamic fee for requested VAS (e.g. ₹2,999 each)
    const vasFeePerItem = 2999;
    const totalVasFee = valueAddedServices.length * vasFeePerItem;
    const grandTotalPayable = feeBreakdown.totalInitialPayable + totalVasFee;
    const amountInPaise = Math.round(grandTotalPayable * 100);

    // 4. Initiate Razorpay Order
    const receiptId = `PURCH_${Date.now()}_${userId.slice(0, 6)}`;
    const orderResponse = await razorpayPaymentService.createPaymentOrder(
      amountInPaise,
      receiptId,
      {
        propertyId,
        buyerId: userId,
        purpose: "PURCHASE_ESCROW_LOCK",
        vasCount: valueAddedServices.length.toString(),
      }
    );

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + lockDurationHours);

    // 5. Create PropertyLock, LedgerTransaction, and ServiceRequest records in atomic transaction
    const transactionResult = await prisma.$transaction(async (tx) => {
      // Create initial PropertyLock
      const lock = await tx.propertyLock.create({
        data: {
          propertyId,
          userId,
          status: "REQUESTED",
          amount: new Prisma.Decimal(feeBreakdown.tokenAmount),
          paymentRef: orderResponse.orderId,
          expiresAt,
        },
      });

      // Create LedgerTransaction in ESCROW type
      const ledgerTxn = await tx.ledgerTransaction.create({
        data: {
          type: "ESCROW",
          status: "PENDING",
          amount: new Prisma.Decimal(grandTotalPayable),
          currency: "INR",
          userId,
          propertyId,
          referenceId: orderResponse.orderId,
        },
      });

      // Create associated ServiceRequest records for each requested VAS
      const serviceRequests = await Promise.all(
        valueAddedServices.map((serviceType) =>
          tx.serviceRequest.create({
            data: {
              type: serviceType as ServiceRequestType,
              status: "REQUESTED",
              propertyId,
              userId,
              notes: `VAS requested during purchase checkout: ${serviceType}. Bundled with order ${orderResponse.orderId}`,
            },
          })
        )
      );

      return {
        lock,
        ledgerTxn,
        serviceRequests,
      };
    });

    return ApiResponseHelper.success(
      {
        orderId: orderResponse.orderId,
        amountInPaise,
        currency: "INR",
        feeBreakdown,
        vasRequested: valueAddedServices,
        vasTotalAmount: totalVasFee,
        grandTotalPayable,
        propertyLockId: transactionResult.lock.id,
        transactionId: transactionResult.ledgerTxn.id,
        serviceRequestIds: transactionResult.serviceRequests.map((s) => s.id),
      },
      undefined,
      201
    );
  } catch (error: any) {
    if (error instanceof KycRequiredError || error.code === "KYC_REQUIRED") {
      return ApiResponseHelper.error("KYC_REQUIRED", error.message, 403);
    }

    console.error("[Purchase Checkout Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to initiate purchase checkout",
      500
    );
  }
}
