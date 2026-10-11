import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { ApiResponseHelper } from "@/lib/api/response";
import { enforceKycGate, KycRequiredError } from "@/modules/kyc/guards/enforceKycGate";
import { z } from "zod";

const CheckoutInitiateSchema = z.object({
  propertyId: z.string().uuid("Invalid property UUID"),
  lockDurationHours: z.number().int().min(24).max(72).default(48),
  tokenAmount: z.number().positive(),
  paymentMethod: z.enum(["UPI", "NET_BANKING", "ESCROW"]),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to initiate booking", 401);
    }

    const userId = (session.user as any).id;

    // Strict KYC Compliance Gate: Financial escrow and booking requires verified KYC
    await enforceKycGate(userId);

    const body = await req.json();
    const validation = CheckoutInitiateSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid booking parameters",
        422,
        validation.error.flatten()
      );
    }

    const { propertyId, lockDurationHours, tokenAmount, paymentMethod } = validation.data;

    // Verify property status and lock availability
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { locks: { where: { status: "ACTIVE" } } },
    });

    if (!property) {
      return ApiResponseHelper.error("NOT_FOUND", "Property not found", 404);
    }

    if (property.lifecycleStatus !== "PUBLISHED") {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Property is not currently available for reservation",
        400
      );
    }

    if (property.lockStatus === "LOCKED" || property.locks.length > 0) {
      return ApiResponseHelper.error(
        "CONFLICT_PROPERTY_LOCKED",
        "Property is already locked under an active booking deposit",
        409
      );
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + lockDurationHours);

    // Create property lock and transaction record
    const result = await prisma.$transaction(async (tx) => {
      const lock = await tx.propertyLock.create({
        data: {
          propertyId,
          userId,
          status: "ACTIVE",
          amount: tokenAmount,
          paymentRef: `TXN_ESCROW_${Date.now()}_${userId.slice(0, 8)}`,
          expiresAt,
        },
      });

      await tx.property.update({
        where: { id: propertyId },
        data: { lockStatus: "LOCKED" },
      });

      return lock;
    });

    return ApiResponseHelper.success(result, undefined, 201);
  } catch (error: any) {
    if (error instanceof KycRequiredError || error.name === "KycRequiredError" || error.code === "KYC_REQUIRED") {
      return ApiResponseHelper.error("KYC_REQUIRED", error.message, 403);
    }
    console.error("[Checkout Initiation Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to initiate property checkout",
      500
    );
  }
}
