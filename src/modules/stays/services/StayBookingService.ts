import { prisma } from "@/infrastructure/database/prisma";
import { razorpayPaymentService } from "@/modules/transactions/services/RazorpayPaymentService";
import { stayPricingEngineService } from "./StayPricingEngineService";
import { withOutbox } from "@/modules/outbox/core/withOutbox";
import { Prisma } from "@prisma/client";

export interface InitiateStayBookingParams {
  userId: string;
  propertyId: string;
  checkInDate: Date;
  checkOutDate: Date;
  guestsCount?: number;
}

export class StayBookingService {
  /**
   * 1. Initiates Short Stay Reservation & Gateway Order.
   * Checks availability against confirmed/pending reservations and creates records in PAYMENT_PENDING.
   */
  async initiateStayBooking(params: InitiateStayBookingParams) {
    const { userId, propertyId, checkInDate, checkOutDate, guestsCount = 1 } = params;

    // Check for overlapping reservations in CONFIRMED or PAYMENT_PENDING state
    const overlapping = await prisma.stayReservation.findFirst({
      where: {
        propertyId,
        status: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
        AND: [
          { checkInDate: { lt: checkOutDate } },
          { checkOutDate: { gt: checkInDate } },
        ],
      },
    });

    if (overlapping) {
      throw new Error("DATES_NOT_AVAILABLE: The selected dates are already booked for this property.");
    }

    // Dynamic Pricing Calculation
    const pricing = await stayPricingEngineService.calculateStayPricing(propertyId, checkInDate, checkOutDate);
    const amountInPaise = Math.round(pricing.netTotalPayable * 100);

    const receiptId = `STAY_${Date.now()}_${userId.slice(0, 6)}`;
    const orderResponse = await razorpayPaymentService.createPaymentOrder(
      amountInPaise,
      receiptId,
      {
        propertyId,
        buyerId: userId,
        purpose: "SHORT_STAY_HOSPITALITY_BOOKING",
        nights: pricing.totalNights.toString(),
      }
    );

    // Create StayReservation and LedgerTransaction in PAYMENT_PENDING state
    const { reservation, txn } = await prisma.$transaction(async (tx) => {
      const resRecord = await tx.stayReservation.create({
        data: {
          propertyId,
          userId,
          checkInDate,
          checkOutDate,
          guestsCount,
          totalAmount: new Prisma.Decimal(pricing.netTotalPayable),
          paymentRef: orderResponse.orderId,
          status: "PAYMENT_PENDING",
        },
      });

      const txnRecord = await tx.ledgerTransaction.create({
        data: {
          type: "ESCROW",
          status: "PENDING",
          amount: new Prisma.Decimal(pricing.netTotalPayable),
          currency: "INR",
          userId,
          propertyId,
          referenceId: orderResponse.orderId,
        },
      });

      return { reservation: resRecord, txn: txnRecord };
    });

    return {
      orderId: orderResponse.orderId,
      amountInPaise,
      currency: "INR",
      reservationId: reservation.id,
      transactionId: txn.id,
      pricingBreakdown: pricing,
    };
  }

  /**
   * 2. Confirms Stay Booking upon Razorpay payment capture.
   * Atomically transitions reservation to CONFIRMED and emits STAY_BOOKED outbox event.
   */
  async confirmStayBooking(orderId: string, paymentId: string) {
    const reservation = await prisma.stayReservation.findFirst({
      where: { paymentRef: orderId },
      include: { property: { include: { owner: true } } },
    });

    if (!reservation) {
      throw new Error(`RESERVATION_NOT_FOUND: No stay reservation found for order ${orderId}`);
    }

    if (reservation.status === "CONFIRMED") {
      return { alreadyConfirmed: true, reservationId: reservation.id };
    }

    const confirmed = await withOutbox(
      prisma,
      "STAY_BOOKED",
      {
        reservationId: reservation.id,
        propertyId: reservation.propertyId,
        guestId: reservation.userId,
        hostId: reservation.property?.ownerId,
        checkInDate: reservation.checkInDate.toISOString(),
        checkOutDate: reservation.checkOutDate.toISOString(),
        totalAmount: Number(reservation.totalAmount),
        paymentId,
        timestamp: new Date().toISOString(),
      },
      async (tx) => {
        // Update StayReservation status to CONFIRMED
        const updatedRes = await tx.stayReservation.update({
          where: { id: reservation.id },
          data: {
            status: "CONFIRMED",
            paymentRef: paymentId,
          },
        });

        // Update LedgerTransaction status to COMPLETED
        await tx.ledgerTransaction.updateMany({
          where: { referenceId: orderId },
          data: { status: "COMPLETED" },
        });

        // Append immutable FinancialLedgerEntry
        await tx.financialLedgerEntry.create({
          data: {
            transactionId: reservation.id,
            userId: reservation.userId,
            entryType: "CREDIT",
            eventCode: "ESCROW_HOLD",
            amount: reservation.totalAmount,
            notes: `Short Stay Booking Confirmed via Razorpay: ${paymentId}`,
          },
        });

        return updatedRes;
      }
    );

    return { alreadyConfirmed: false, reservation: confirmed };
  }

  /**
   * 3. Fetches booked date ranges for a property to populate the availability calendar.
   */
  async getBookedDateRanges(propertyId: string) {
    const reservations = await prisma.stayReservation.findMany({
      where: {
        propertyId,
        status: { in: ["CONFIRMED", "PAYMENT_PENDING"] },
        checkOutDate: { gte: new Date() },
      },
      select: {
        id: true,
        checkInDate: true,
        checkOutDate: true,
      },
      orderBy: { checkInDate: "asc" },
    });

    return reservations.map((r) => ({
      from: r.checkInDate.toISOString().split("T")[0],
      to: r.checkOutDate.toISOString().split("T")[0],
    }));
  }
}

export const stayBookingService = new StayBookingService();
