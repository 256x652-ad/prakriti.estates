import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";

export class StayBookingService {
  /**
   * Creates a strict, non-overlapping stay reservation.
   * Utilizes PostgreSQL's SERIALIZABLE isolation level to guarantee that even if 
   * two users hit the exact same route simultaneously at the millisecond level, 
   * the database engine will detect the read/write dependency conflict and abort one.
   */
  async createStayReservation(
    propertyId: string,
    userId: string,
    checkInDate: Date,
    checkOutDate: Date,
    totalAmount: number
  ) {
    if (checkInDate >= checkOutDate) {
      throw new Error("Check-out date must be strictly after check-in date.");
    }

    try {
      // 1. Enter a strict Serializable Transaction
      return await prisma.$transaction(async (tx) => {
        
        // 2. Query for overlapping dates
        // A reservation overlaps if (Existing CheckIn < New CheckOut) AND (Existing CheckOut > New CheckIn)
        const overlappingReservations = await tx.stayReservation.findFirst({
          where: {
            propertyId: propertyId,
            status: "CONFIRMED",
            AND: [
              { checkInDate: { lt: checkOutDate } },
              { checkOutDate: { gt: checkInDate } }
            ]
          }
        });

        if (overlappingReservations) {
          throw new Error("These dates are no longer available. Another booking overlaps with your selection.");
        }

        // 3. Create the Reservation
        const reservation = await tx.stayReservation.create({
          data: {
            propertyId,
            userId,
            checkInDate,
            checkOutDate,
            totalAmount: new Prisma.Decimal(totalAmount),
            status: "CONFIRMED"
          }
        });

        // 4. Update the parent Property lock state (optional, if we want to visually lock it)
        // For short-term stays, you might not fully 'LOCK' the property like a purchase, 
        // but rather just rely on the StayReservation table.

        return reservation;
        
      }, {
        // Enforce the highest transaction isolation level. 
        // This ensures the database prevents dirty reads, non-repeatable reads, and phantom reads.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
      
    } catch (error: any) {
      // Catch serialization failures (Postgres error code 40001) and gracefully retry or fail
      if (error.code === 'P2034') { // Prisma's error code for transaction conflict
        throw new Error("High concurrency detected. Please try booking again.");
      }
      throw error;
    }
  }
}
