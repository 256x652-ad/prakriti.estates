import { PrismaClient, Prisma } from "@prisma/client";
import { DomainEventType } from "./EventRegistry";

// A type helper to represent either the global prisma client or a transaction client
type PrismaTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * ATOMIC OUTBOX UTILITY
 * 
 * This wrapper guarantees that a domain event is ONLY emitted if the business
 * database mutation succeeds. It achieves this by forcing both the business logic
 * and the OutboxEvent insertion into the exact same PostgreSQL ACID transaction.
 * 
 * @param prisma - The Prisma instance to initiate the transaction
 * @param eventType - The exact DomainEventType from our Registry
 * @param eventPayload - The JSON payload to be processed later by BullMQ
 * @param operation - A callback containing the business logic (must use the provided `tx` object)
 */
export async function withOutbox<T>(
  prisma: PrismaClient,
  eventType: DomainEventType,
  eventPayload: Record<string, any>,
  operation: (tx: PrismaTransactionClient) => Promise<T>
): Promise<T> {
  return await prisma.$transaction(async (tx) => {
    // 1. Execute the core business operation FIRST
    const result = await operation(tx);

    // 2. Automatically insert the Outbox Event within the SAME database lock
    await tx.outboxEvent.create({
      data: {
        eventType: eventType,
        payload: JSON.parse(JSON.stringify(eventPayload)), // Ensure clean JSON serialization
        status: "PENDING"
      }
    });

    // 3. Both succeed or both rollback together!
    return result;
  }, {
    // Default to Serializable to ensure absolute data integrity during event creation
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable 
  });
}
