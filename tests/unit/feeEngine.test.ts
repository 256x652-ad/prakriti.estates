import { describe, it, expect, vi, beforeEach } from "vitest";
import { FeeEngineService } from "@/modules/transactions/services/FeeEngineService";
import { prisma } from "@/infrastructure/database/prisma";
import { Decimal } from "@prisma/client/runtime/library";

vi.mock("@/infrastructure/database/prisma", () => ({
  prisma: {
    feeConfiguration: {
      findFirst: vi.fn(),
    },
  },
}));

describe("FeeEngineService Unit Tests - calculateTransactionFees", () => {
  let feeEngine: FeeEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    feeEngine = new FeeEngineService();
  });

  describe("Flat Amount Fees", () => {
    it("should calculate exact flat fee with 18% GST tax reconciliation", async () => {
      // Mock flat platform fee config of Rs. 1,000
      vi.mocked(prisma.feeConfiguration.findFirst).mockResolvedValueOnce({
        id: "config-1",
        type: "BUYER_PLATFORM_FEE",
        method: "FLAT_AMOUNT",
        value: new Decimal(1000),
        effectiveFrom: new Date("2026-01-01"),
        effectiveUntil: null,
        description: "Flat Buyer Fee",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const baseAmount = 50000;
      const result = await feeEngine.calculateTransactionFees("BUYER_PLATFORM_FEE", baseAmount);

      // Fee: 1,000, GST (18%): 180, Total: 1,180
      expect(result.platformFee.toNumber()).toBe(1000);
      expect(result.taxAmount.toNumber()).toBe(180);
      expect(result.totalPayable.toNumber()).toBe(1180);
      expect(result.platformFee.add(result.taxAmount).equals(result.totalPayable)).toBe(true);
    });
  });

  describe("Percentage-Based Fees", () => {
    it("should accurately calculate fractional percentage fees and reconcile total split", async () => {
      // Mock 2% seller success fee
      vi.mocked(prisma.feeConfiguration.findFirst).mockResolvedValueOnce({
        id: "config-2",
        type: "SELLER_SUCCESS_FEE",
        method: "PERCENTAGE",
        value: new Decimal(2.0), // 2%
        effectiveFrom: new Date("2026-01-01"),
        effectiveUntil: null,
        description: "Seller 2% closing fee",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const transactionAmount = 1000000; // 10 Lakhs
      const result = await feeEngine.calculateTransactionFees("SELLER_SUCCESS_FEE", transactionAmount);

      // Fee = 2% of 1,000,000 = 20,000
      // GST (18%) = 3,600
      // Total = 23,600
      expect(result.platformFee.toNumber()).toBe(20000);
      expect(result.taxAmount.toNumber()).toBe(3600);
      expect(result.totalPayable.toNumber()).toBe(23600);
    });

    it("should correctly handle odd decimal percentages without precision drift", async () => {
      // Mock 1.75% fee
      vi.mocked(prisma.feeConfiguration.findFirst).mockResolvedValueOnce({
        id: "config-3",
        type: "SELLER_SUCCESS_FEE",
        method: "PERCENTAGE",
        value: new Decimal(1.75),
        effectiveFrom: new Date("2026-01-01"),
        effectiveUntil: null,
        description: "1.75% Fee",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const transactionAmount = 250000; // 2.5 Lakhs
      const result = await feeEngine.calculateTransactionFees("SELLER_SUCCESS_FEE", transactionAmount);

      // Fee = 250,000 * 0.0175 = 4375
      // GST = 4375 * 0.18 = 787.5
      // Total = 5162.5
      expect(result.platformFee.toNumber()).toBe(4375);
      expect(result.taxAmount.toNumber()).toBe(787.5);
      expect(result.totalPayable.toNumber()).toBe(5162.5);
    });
  });

  describe("Rental Token Escrow Reconciliation", () => {
    it("should deduct platform fee & GST from token amount and hold remainder in Escrow", async () => {
      // Flat Rs. 500 processing fee on a Rs. 10,000 token
      vi.mocked(prisma.feeConfiguration.findFirst).mockResolvedValueOnce({
        id: "config-4",
        type: "RENTAL_TOKEN",
        method: "FLAT_AMOUNT",
        value: new Decimal(500),
        effectiveFrom: new Date("2026-01-01"),
        effectiveUntil: null,
        description: "Rental Token Processing",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const tokenAmount = 10000;
      const result = await feeEngine.calculateTransactionFees("RENTAL_TOKEN", tokenAmount);

      // Platform fee: 500, GST: 90 => Total platform deduction: 590
      // Escrow hold remainder: 10,000 - 590 = 9,410
      expect(result.platformFee.toNumber()).toBe(500);
      expect(result.taxAmount.toNumber()).toBe(90);
      expect(result.escrowHold.toNumber()).toBe(9410);
      expect(result.totalPayable.toNumber()).toBe(10000);

      // Mathematical invariant: escrowHold + platformFee + taxAmount == totalPayable
      const sum = result.escrowHold.add(result.platformFee).add(result.taxAmount);
      expect(sum.equals(result.totalPayable)).toBe(true);
    });

    it("should throw error if calculated fees exceed the token transaction amount", async () => {
      // Fee of Rs. 1,000 on a Rs. 500 token
      vi.mocked(prisma.feeConfiguration.findFirst).mockResolvedValueOnce({
        id: "config-5",
        type: "RENTAL_TOKEN",
        method: "FLAT_AMOUNT",
        value: new Decimal(1000),
        effectiveFrom: new Date("2026-01-01"),
        effectiveUntil: null,
        description: "Excessive fee",
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      await expect(
        feeEngine.calculateTransactionFees("RENTAL_TOKEN", 500)
      ).rejects.toThrow("Invalid configuration: Fees exceed the transaction amount.");
    });
  });

  describe("Error Scenarios", () => {
    it("should throw a critical error if no active configuration exists for fee type", async () => {
      vi.mocked(prisma.feeConfiguration.findFirst).mockResolvedValueOnce(null);

      await expect(
        feeEngine.calculateTransactionFees("SELLER_SUCCESS_FEE", 10000)
      ).rejects.toThrow("Critical: No active Fee Configuration found for type SELLER_SUCCESS_FEE");
    });
  });
});
