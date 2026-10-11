import { prisma } from "@/infrastructure/database/prisma";
import { FeeType, FeeCalculationMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface FeeCalculationResult {
  baseAmount: Decimal;
  platformFee: Decimal;
  taxAmount: Decimal; // Usually 18% GST in India
  escrowHold: Decimal;
  totalPayable: Decimal;
}

export class FeeEngineService {
  private readonly GST_RATE = 0.18; // 18% GST standard

  /**
   * Dynamically calculates all fees and splits for a specific transaction type
   * by querying the active FeeConfiguration set by Admins.
   * Handles distinct fee types (e.g., SELLER_SUCCESS_FEE vs BUYER_PLATFORM_FEE).
   */
  async calculateTransactionFees(
    feeType: FeeType,
    baseAmount: number | Decimal
  ): Promise<FeeCalculationResult> {
    const amount = new Decimal(baseAmount);
    
    // 1. Find the currently active fee config for this transaction type
    const activeConfig = await prisma.feeConfiguration.findFirst({
      where: {
        type: feeType,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gt: new Date() } }
        ]
      },
      orderBy: { effectiveFrom: 'desc' }
    });

    if (!activeConfig) {
      throw new Error(`Critical: No active Fee Configuration found for type ${feeType}`);
    }

    // 2. Calculate the core fee dynamically
    let calculatedFee = new Decimal(0);
    if (activeConfig.method === "FLAT_AMOUNT") {
      calculatedFee = activeConfig.value;
    } else if (activeConfig.method === "PERCENTAGE") {
      calculatedFee = amount.mul(activeConfig.value).div(100);
    }

    // 3. Calculate Taxes (GST on the Platform Fee)
    const taxAmount = calculatedFee.mul(this.GST_RATE);
    const totalFeeWithTax = calculatedFee.add(taxAmount);

    // 4. Calculate Escrow Hold and Total Payable based on the party being billed
    let escrowHold = new Decimal(0);
    let totalPayable = new Decimal(0);

    if (feeType === "SELLER_SUCCESS_FEE") {
      // For a seller success fee (e.g., 1.5% at closing), it is usually deducted from their payout from escrow.
      // So the total payable upfront is 0, but the fee is deducted later. 
      // For the sake of this return object, the "fee" is what they owe.
      totalPayable = totalFeeWithTax; 
      // Escrow hold is not strictly applicable here unless they are funding an escrow account.
    } else if (feeType === "BUYER_PLATFORM_FEE") {
      // Buyer pays a flat fee to the platform. 
      totalPayable = totalFeeWithTax;
    } else if (feeType === "RENTAL_TOKEN") {
      // Rental token: buyer pays the token amount. Platform deducts fee, rest goes to escrow.
      escrowHold = amount.sub(totalFeeWithTax);
      totalPayable = amount;
      
      if (escrowHold.lt(0)) {
         throw new Error("Invalid configuration: Fees exceed the transaction amount.");
      }
    } else {
      // Default fallback
      totalPayable = totalFeeWithTax;
    }

    return {
      baseAmount: amount,
      platformFee: calculatedFee,
      taxAmount,
      escrowHold,
      totalPayable,
    };
  }
}
