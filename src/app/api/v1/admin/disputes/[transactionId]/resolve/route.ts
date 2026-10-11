import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { escrowAndRefundEngine } from "@/modules/transactions/services/EscrowAndRefundEngine";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const DisputeResolutionSchema = z.object({
  action: z.enum(["REFUND_BUYER", "RELEASE_TO_SELLER"]),
  reason: z.string().min(5, "Mandatory justification required for dispute resolution"),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ transactionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const adminUser = session.user as any;
    const adminRoles = (adminUser.roles as string[]) || [];

    // Strictly enforce SUPER_ADMIN or ADMIN role
    if (!adminRoles.includes("ADMIN") && !adminRoles.includes("SUPER_ADMIN")) {
      return ApiResponseHelper.error("FORBIDDEN", "Administrative privilege required to resolve disputes", 403);
    }

    const { transactionId } = await context.params;
    const body = await req.json();

    const validation = DisputeResolutionSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid dispute resolution parameters",
        422,
        validation.error.flatten()
      );
    }

    const { action, reason } = validation.data;

    // Fetch Target Transaction
    const transaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
      include: { property: true, entries: true },
    });

    if (!transaction) {
      return ApiResponseHelper.error("NOT_FOUND", "Ledger transaction not found", 404);
    }

    // Idempotency Check: if already terminal
    if (transaction.status === "REFUNDED" || (transaction.status === "COMPLETED" && action === "RELEASE_TO_SELLER")) {
      return ApiResponseHelper.success({
        message: `Dispute already resolved with status ${transaction.status}. Idempotent acknowledgement.`,
        transactionId,
        status: transaction.status,
      });
    }

    const oldSnapshot = {
      status: transaction.status,
      amount: transaction.amount,
      updatedAt: transaction.updatedAt,
    };

    // Execute Escrow Release or Refund
    if (action === "REFUND_BUYER") {
      await escrowAndRefundEngine.processRefund(transactionId, reason);
    } else {
      await escrowAndRefundEngine.releaseEscrowToSeller(transactionId);
    }

    const updatedTransaction = await prisma.ledgerTransaction.findUnique({
      where: { id: transactionId },
    });

    // Record Bulletproof Immutable Audit Log via AuditLogService.logSystemAction
    await AuditLogService.logSystemAction({
      actorId: adminUser.id,
      actorRole: adminRoles[0] || "ADMIN",
      actionType: "DISPUTE_RESOLUTION",
      targetEntity: `LedgerTransaction:${transactionId}`,
      targetId: transactionId,
      oldState: oldSnapshot,
      newState: {
        status: updatedTransaction?.status,
        action,
        reason,
        resolvedAt: new Date().toISOString(),
      },
      reasonCode: action,
      metadata: {
        adminEmail: adminUser.email,
        reason,
        propertyId: transaction.propertyId,
      },
    });

    return ApiResponseHelper.success({
      message: `Dispute successfully resolved with action: ${action}`,
      transactionId,
      newStatus: updatedTransaction?.status,
    });
  } catch (error: any) {
    console.error("[Dispute Resolution Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to resolve dispute",
      500
    );
  }
}
