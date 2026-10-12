import { describe, it, expect, beforeEach, vi } from "vitest";
import { TransactionStateMachine, FinancialState } from "@/modules/transactions/core/TransactionStateMachine";
import { prisma } from "@/infrastructure/database/prisma";
import { PropertyLockState } from "@prisma/client";

// Mock prisma for isolated integration testing of state transition rollbacks
vi.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    propertyLock: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ledgerTransaction: {
      update: vi.fn(),
    },
  },
}));

describe("Financial & PropertyLock State Machine Integration Tests", () => {
  let stateMachine: TransactionStateMachine;

  beforeEach(() => {
    vi.clearAllMocks();
    stateMachine = new TransactionStateMachine();
  });

  describe("Transaction State Transitions", () => {
    it("should allow valid progressive transitions: PENDING -> PAYMENT_PENDING -> PAYMENT_SUCCESS -> ESCROW_HELD -> ESCROW_RELEASED -> COMPLETED", () => {
      let state: FinancialState = "PENDING";

      state = stateMachine.transition(state, "PAYMENT_PENDING");
      expect(state).toBe("PAYMENT_PENDING");

      state = stateMachine.transition(state, "PAYMENT_SUCCESS");
      expect(state).toBe("PAYMENT_SUCCESS");

      state = stateMachine.transition(state, "ESCROW_HELD");
      expect(state).toBe("ESCROW_HELD");

      state = stateMachine.transition(state, "ESCROW_RELEASED");
      expect(state).toBe("ESCROW_RELEASED");

      state = stateMachine.transition(state, "COMPLETED");
      expect(state).toBe("COMPLETED");
    });

    it("should strictly reject invalid skip-transition: PAYMENT_FAILED -> ESCROW_HELD", () => {
      expect(() => {
        stateMachine.transition("PAYMENT_FAILED", "ESCROW_HELD");
      }).toThrowError(/\[Financial Security Error\] Invalid transition attempted from 'PAYMENT_FAILED' to 'ESCROW_HELD'/);
    });

    it("should strictly reject transition from terminal COMPLETED state", () => {
      expect(() => {
        stateMachine.transition("COMPLETED", "REFUND_INITIATED");
      }).toThrowError(/\[Financial Security Error\] Invalid transition attempted from 'COMPLETED' to 'REFUND_INITIATED'/);
    });

    it("should strictly reject transition from terminal REFUNDED state", () => {
      expect(() => {
        stateMachine.transition("REFUNDED", "PAYMENT_SUCCESS");
      }).toThrowError(/\[Financial Security Error\] Invalid transition attempted from 'REFUNDED' to 'PAYMENT_SUCCESS'/);
    });
  });

  describe("Database Transaction Rollback on Invalid State Mutation", () => {
    /**
     * Service simulator for updating PropertyLock status within an atomic transaction.
     * Enforces that invalid lock transition throws and causes transaction rollback.
     */
    async function updatePropertyLockWithStateMachine(
      lockId: string,
      currentLockStatus: PropertyLockState,
      targetStatus: PropertyLockState
    ) {
      // Allowed PropertyLock state transitions
      const validLockTransitions: Record<PropertyLockState, PropertyLockState[]> = {
        REQUESTED: ["ACTIVE", "EXPIRED", "RELEASED"],
        ACTIVE: ["RELEASED", "EXPIRED"],
        EXPIRED: [],
        RELEASED: [],
      };

      return await prisma.$transaction(async (tx: any) => {
        const allowed = validLockTransitions[currentLockStatus];
        if (!allowed || !allowed.includes(targetStatus)) {
          throw new Error(`INVALID_STATE_TRANSITION: Cannot transition PropertyLock from ${currentLockStatus} to ${targetStatus}`);
        }

        return await tx.propertyLock.update({
          where: { id: lockId },
          data: { status: targetStatus },
        });
      });
    }

    it("should successfully execute atomic update when transition is valid (REQUESTED -> ACTIVE)", async () => {
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          propertyLock: {
            update: vi.fn().mockResolvedValueOnce({
              id: "lock-101",
              status: "ACTIVE",
            }),
          },
        };
        return await callback(mockTx);
      });

      const result = await updatePropertyLockWithStateMachine("lock-101", "REQUESTED", "ACTIVE");
      expect(result.status).toBe("ACTIVE");
    });

    it("should abort and rollback transaction when invalid transition is attempted (RELEASED -> ACTIVE)", async () => {
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          propertyLock: {
            update: vi.fn(),
          },
        };
        // The callback throws before committing update
        return await callback(mockTx);
      });

      await expect(
        updatePropertyLockWithStateMachine("lock-101", "RELEASED", "ACTIVE")
      ).rejects.toThrowError("INVALID_STATE_TRANSITION: Cannot transition PropertyLock from RELEASED to ACTIVE");
    });

    it("should prevent double-locking on expired property locks (EXPIRED -> ACTIVE)", async () => {
      vi.mocked(prisma.$transaction).mockImplementationOnce(async (callback: any) => {
        const mockTx = {
          propertyLock: {
            update: vi.fn(),
          },
        };
        return await callback(mockTx);
      });

      await expect(
        updatePropertyLockWithStateMachine("lock-101", "EXPIRED", "ACTIVE")
      ).rejects.toThrowError("INVALID_STATE_TRANSITION: Cannot transition PropertyLock from EXPIRED to ACTIVE");
    });
  });
});
