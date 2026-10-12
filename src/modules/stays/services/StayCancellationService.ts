import { prisma } from "@/infrastructure/database/prisma";
import { escrowAndRefundEngine } from "@/modules/transactions/services/EscrowAndRefundEngine";
import { withOutbox } from "@/modules/outbox/core/withOutbox";

export interface CancelReservationResult {
  reservationId: string;
  refundAmount: number;
  refundPercentage: number;
  reason: string;
}

export class StayCancellationService {
  /**
   * Evaluates the property's cancellation policy, calculates the eligible refund,
   * triggers gateway refund processing, marks reservation CANCELLED, and releases dates.
   */
  async cancelReservation(
    reservationId: string,
    cancellingUserId: string,
    reason: string = "Guest initiated cancellation"
  ): Promise<CancelReservationResult> {
    const reservation = await prisma.stayReservation.findUnique({
      where: { id: reservationId },
      include: {
        property: {
          include: { stayDetails: true },
        },
      },
    });

    if (!reservation) {
      throw new Error(`Reservation ${reservationId} not found.`);
    }

    if (reservation.userId !== cancellingUserId) {
      throw new Error("FORBIDDEN: You do not have permission to cancel this reservation.");
    }

    if (reservation.status === "CANCELLED") {
      throw new Error("RESERVATION_ALREADY_CANCELLED: This booking has already been cancelled.");
    }

    const totalPaid = Number(reservation.totalAmount);
    const checkInTime = new Date(reservation.checkInDate).getTime();
    const now = Date.now();
    const hoursUntilCheckIn = (checkInTime - now) / (1000 * 60 * 60);

    const policy = reservation.property.stayDetails?.cancellationRule || "Flexible";

    let refundPercentage = 0;

    // Strict Indian Hospitality Cancellation Rules:
    if (policy.toLowerCase().includes("flexible")) {
      // Flexible: 100% refund up to 24 hours prior; 50% thereafter
      refundPercentage = hoursUntilCheckIn >= 24 ? 100 : 50;
    } else if (policy.toLowerCase().includes("moderate")) {
      // Moderate: 100% refund up to 5 days (120h) prior; 50% up to 24h; 0% thereafter
      if (hoursUntilCheckIn >= 120) {
        refundPercentage = 100;
      } else if (hoursUntilCheckIn >= 24) {
        refundPercentage = 50;
      } else {
        refundPercentage = 0;
      }
    } else {
      // Strict: 100% refund up to 48 hours prior; 50% otherwise
      refundPercentage = hoursUntilCheckIn >= 48 ? 100 : 50;
    }

    const refundAmount = Math.round((totalPaid * refundPercentage) / 100);

    // Atomically cancel and emit STAY_CANCELLED event
    await withOutbox(
      prisma,
      "STAY_CANCELLED",
      {
        reservationId,
        propertyId: reservation.propertyId,
        guestId: reservation.userId,
        refundAmount,
        refundPercentage,
        reason,
        timestamp: new Date().toISOString(),
      },
      async (tx) => {
        // 1. Transition StayReservation to CANCELLED
        await tx.stayReservation.update({
          where: { id: reservationId },
          data: { status: "CANCELLED" },
        });

        // 2. Trigger Refund if amount > 0
        if (refundAmount > 0) {
          await tx.financialLedgerEntry.create({
            data: {
              transactionId: reservation.id,
              userId: reservation.userId,
              entryType: "DEBIT",
              eventCode: "REFUND",
              amount: refundAmount,
              notes: `Stay Booking Cancelled (${refundPercentage}% refund under ${policy} policy): ${reason}`,
            },
          });
        }
      }
    );

    return {
      reservationId,
      refundAmount,
      refundPercentage,
      reason,
    };
  }
}

export const stayCancellationService = new StayCancellationService();
