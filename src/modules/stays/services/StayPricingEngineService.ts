import { prisma } from "@/infrastructure/database/prisma";
import { feeEngineService } from "@/modules/transactions/services/FeeEngineService";

export interface StayPricingBreakdown {
  propertyId: string;
  totalNights: number;
  weekdayNights: number;
  weekendNights: number;
  baseDailyRate: number;
  weekendDailyRate: number;
  grossAccommodationCharge: number;
  seasonalSurgePercentage: number;
  seasonalSurgeAmount: number;
  lengthOfStayDiscountPercentage: number;
  lengthOfStayDiscountAmount: number;
  cleaningFee: number;
  taxesGst: number; // 12% GST for standard hospitality below ₹7,500/night; 18% otherwise
  netTotalPayable: number;
}

export class StayPricingEngineService {
  /**
   * Calculates dynamic pricing for short stay bookings.
   * Considers weekday vs weekend rates, seasonal multipliers from FeeConfiguration,
   * length-of-stay discounts, and statutory hospitality GST.
   */
  async calculateStayPricing(
    propertyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StayPricingBreakdown> {
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { stayDetails: true },
    });

    if (!property) {
      throw new Error(`PROPERTY_NOT_FOUND: Property ${propertyId} does not exist.`);
    }

    if (property.type !== "STAY") {
      throw new Error(`PROPERTY_NOT_A_STAY: Property ${propertyId} is listed under '${property.type}', not 'STAY'.`);
    }

    const baseDailyRate = property.stayDetails?.dailyRate
      ? Number(property.stayDetails.dailyRate)
      : (property.price?.toNumber ? property.price.toNumber() : Number(property.price));

    const weekendDailyRate = property.stayDetails?.weekendRate
      ? Number(property.stayDetails.weekendRate)
      : Math.round(baseDailyRate * 1.2); // 20% standard weekend surcharge if not specified

    // Count weekday vs weekend nights
    let weekdayNights = 0;
    let weekendNights = 0;
    const cur = new Date(startDate);

    while (cur < endDate) {
      const dayOfWeek = cur.getDay(); // 0 is Sunday, 5 is Friday, 6 is Saturday
      if (dayOfWeek === 5 || dayOfWeek === 6) {
        weekendNights++;
      } else {
        weekdayNights++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const totalNights = weekdayNights + weekendNights;
    if (totalNights <= 0) {
      throw new Error("INVALID_DATE_RANGE: Check-out date must be strictly after check-in date.");
    }

    const grossAccommodationCharge = (weekdayNights * baseDailyRate) + (weekendNights * weekendDailyRate);

    // 1. Seasonal Surge multiplier (fetched dynamically from FeeConfiguration layer)
    let seasonalSurgePercentage = 0;
    try {
      const surgeConfig = await feeEngineService.getActiveFeeConfiguration("AUDIT_FEE"); // or general seasonal surge
      seasonalSurgePercentage = surgeConfig ? Number(surgeConfig.value) : 0;
    } catch {
      seasonalSurgePercentage = 0;
    }

    const seasonalSurgeAmount = Math.round((grossAccommodationCharge * seasonalSurgePercentage) / 100);

    // 2. Length of Stay Discount (e.g. >= 7 nights = 10% off; >= 28 nights = 20% off)
    let lengthOfStayDiscountPercentage = 0;
    if (totalNights >= 28) {
      lengthOfStayDiscountPercentage = 20;
    } else if (totalNights >= 7) {
      lengthOfStayDiscountPercentage = 10;
    }

    const lengthOfStayDiscountAmount = Math.round(
      ((grossAccommodationCharge + seasonalSurgeAmount) * lengthOfStayDiscountPercentage) / 100
    );

    const cleaningFee = 1500; // Flat hospitality sanitation & linen fee

    const taxableAmount = (grossAccommodationCharge + seasonalSurgeAmount - lengthOfStayDiscountAmount) + cleaningFee;
    
    // Statutory Indian GST on Accommodation:
    // Rate <= ₹7,500/night is 12% GST; Rate > ₹7,500/night is 18% GST
    const averageNightlyRate = taxableAmount / totalNights;
    const gstRate = averageNightlyRate > 7500 ? 0.18 : 0.12;
    const taxesGst = Math.round(taxableAmount * gstRate);

    const netTotalPayable = taxableAmount + taxesGst;

    return {
      propertyId,
      totalNights,
      weekdayNights,
      weekendNights,
      baseDailyRate,
      weekendDailyRate,
      grossAccommodationCharge,
      seasonalSurgePercentage,
      seasonalSurgeAmount,
      lengthOfStayDiscountPercentage,
      lengthOfStayDiscountAmount,
      cleaningFee,
      taxesGst,
      netTotalPayable,
    };
  }
}

export const stayPricingEngineService = new StayPricingEngineService();
