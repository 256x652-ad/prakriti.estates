import { prisma } from "@/infrastructure/database/prisma";
import { redisClient } from "@/infrastructure/redis/redisClient";
import { FeeType, FeeCalculationMethod } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface FeeCalculationResult {
  baseAmount: Decimal;
  platformFee: Decimal;
  taxAmount: Decimal; // Standard 18% GST on platform service fees
  escrowHold: Decimal;
  totalPayable: Decimal;
}

export interface PurchaseFeesBreakdown {
  propertyId: string;
  buyerId: string;
  propertyPrice: number;
  tokenAmount: number;
  buyerPlatformFee: number;
  buyerPlatformGst: number;
  totalBuyerPlatformCharge: number;
  sellerSuccessFee: number;
  sellerSuccessGst: number;
  totalSellerSuccessDeduction: number;
  netSellerPayout: number;
  totalInitialPayable: number; // Token deposit + Buyer Platform Fee + GST
}

export class FeeEngineService {
  private readonly GST_RATE = 0.18; // 18% GST standard in India
  private readonly CACHE_TTL_SECONDS = 300; // 5-minute cache

  /**
   * Retrieves active FeeConfiguration, backed by Redis cache.
   */
  async getActiveFeeConfiguration(feeType: FeeType) {
    const cacheKey = `fee_config:${feeType}`;

    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          id: parsed.id,
          type: parsed.type as FeeType,
          method: parsed.method as FeeCalculationMethod,
          value: new Decimal(parsed.value),
        };
      }
    } catch (err: any) {
      console.warn(`[FeeEngineService] Redis cache lookup failed for ${feeType}:`, err.message);
    }

    // Query PostgreSQL Database
    const activeConfig = await prisma.feeConfiguration.findFirst({
      where: {
        type: feeType,
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveUntil: null },
          { effectiveUntil: { gt: new Date() } },
        ],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    if (activeConfig) {
      try {
        await redisClient.set(
          cacheKey,
          JSON.stringify({
            id: activeConfig.id,
            type: activeConfig.type,
            method: activeConfig.method,
            value: activeConfig.value.toString(),
          }),
          "EX",
          this.CACHE_TTL_SECONDS
        );
      } catch (err: any) {
        console.warn(`[FeeEngineService] Redis cache set failed for ${feeType}:`, err.message);
      }

      return activeConfig;
    }

    return null;
  }

  /**
   * Dynamically calculates all fees and splits for a specific transaction type
   * by querying the Redis-cached FeeConfiguration layer.
   */
  async calculateTransactionFees(
    feeType: FeeType,
    baseAmount: number | Decimal
  ): Promise<FeeCalculationResult> {
    const amount = new Decimal(baseAmount);
    const activeConfig = await this.getActiveFeeConfiguration(feeType);

    if (!activeConfig) {
      // Dynamic fallback defaults if not seeded
      let fallbackMethod: FeeCalculationMethod = "FLAT_AMOUNT";
      let fallbackVal = new Decimal(2500);

      if (feeType === "SELLER_SUCCESS_FEE") {
        fallbackMethod = "PERCENTAGE";
        fallbackVal = new Decimal(1.5); // 1.5% success fee
      } else if (feeType === "BUYER_PLATFORM_FEE" || feeType === "PURCHASE_PLATFORM_FEE") {
        fallbackMethod = "FLAT_AMOUNT";
        fallbackVal = new Decimal(5000); // ₹5,000 platform convenience fee
      }

      const calculatedFee =
        fallbackMethod === "FLAT_AMOUNT"
          ? fallbackVal
          : amount.mul(fallbackVal).div(100);

      const taxAmount = calculatedFee.mul(this.GST_RATE);
      const totalFeeWithTax = calculatedFee.add(taxAmount);

      return {
        baseAmount: amount,
        platformFee: calculatedFee,
        taxAmount,
        escrowHold: amount.sub(totalFeeWithTax),
        totalPayable: totalFeeWithTax,
      };
    }

    let calculatedFee = new Decimal(0);
    if (activeConfig.method === "FLAT_AMOUNT") {
      calculatedFee = activeConfig.value;
    } else if (activeConfig.method === "PERCENTAGE") {
      calculatedFee = amount.mul(activeConfig.value).div(100);
    }

    const taxAmount = calculatedFee.mul(this.GST_RATE);
    const totalFeeWithTax = calculatedFee.add(taxAmount);

    let escrowHold = new Decimal(0);
    let totalPayable = new Decimal(0);

    if (feeType === "SELLER_SUCCESS_FEE") {
      totalPayable = totalFeeWithTax;
    } else if (feeType === "BUYER_PLATFORM_FEE" || feeType === "PURCHASE_PLATFORM_FEE") {
      totalPayable = totalFeeWithTax;
    } else if (feeType === "RENTAL_TOKEN") {
      escrowHold = amount.sub(totalFeeWithTax);
      totalPayable = amount;
    } else {
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

  /**
   * Application Service: calculatePurchaseFees(propertyId, buyerId)
   * Dynamically evaluates Buyer Platform Fee, Seller Success Fee, Token Deposit, and splits.
   */
  async calculatePurchaseFees(
    propertyId: string,
    buyerId: string
  ): Promise<PurchaseFeesBreakdown> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, price: true, type: true, lifecycleStatus: true },
    });

    if (!property) {
      throw new Error(`PROPERTY_NOT_FOUND: Property with ID ${propertyId} does not exist.`);
    }

    const propertyPrice = property.price?.toNumber ? property.price.toNumber() : Number(property.price);

    // 1. Initial Token Amount (1% of property value or min ₹50,000)
    const tokenAmount = Math.max(Math.round(propertyPrice * 0.01), 50000);

    // 2. Buyer Platform Fee (Flat amount from dynamic FeeConfiguration)
    const buyerFeeResult = await this.calculateTransactionFees("BUYER_PLATFORM_FEE", propertyPrice);
    const buyerPlatformFee = Math.round(buyerFeeResult.platformFee.toNumber());
    const buyerPlatformGst = Math.round(buyerFeeResult.taxAmount.toNumber());
    const totalBuyerPlatformCharge = Math.round(buyerFeeResult.totalPayable.toNumber());

    // 3. Seller Success Fee (% of property value from dynamic FeeConfiguration)
    const sellerFeeResult = await this.calculateTransactionFees("SELLER_SUCCESS_FEE", propertyPrice);
    const sellerSuccessFee = Math.round(sellerFeeResult.platformFee.toNumber());
    const sellerSuccessGst = Math.round(sellerFeeResult.taxAmount.toNumber());
    const totalSellerSuccessDeduction = Math.round(sellerFeeResult.totalPayable.toNumber());

    // Net Seller Payout at closing
    const netSellerPayout = propertyPrice - totalSellerSuccessDeduction;

    // Total initial payable by buyer at checkout
    const totalInitialPayable = tokenAmount + totalBuyerPlatformCharge;

    return {
      propertyId,
      buyerId,
      propertyPrice,
      tokenAmount,
      buyerPlatformFee,
      buyerPlatformGst,
      totalBuyerPlatformCharge,
      sellerSuccessFee,
      sellerSuccessGst,
      totalSellerSuccessDeduction,
      netSellerPayout,
      totalInitialPayable,
    };
  }
}

export const feeEngineService = new FeeEngineService();
