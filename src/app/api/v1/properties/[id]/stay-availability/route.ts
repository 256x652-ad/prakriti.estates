import { NextRequest } from "next/server";
import { stayBookingService } from "@/modules/stays/services/StayBookingService";
import { ApiResponseHelper } from "@/lib/api/response";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const bookedRanges = await stayBookingService.getBookedDateRanges(id);
    return ApiResponseHelper.success(bookedRanges);
  } catch (error: any) {
    console.error("[Stay Availability Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to fetch availability",
      500
    );
  }
}
