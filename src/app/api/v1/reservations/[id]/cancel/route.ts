import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { stayCancellationService } from "@/modules/stays/services/StayCancellationService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const CancelReservationSchema = z.object({
  reason: z.string().min(3).default("Guest initiated cancellation"),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required to cancel stay", 401);
    }

    const userId = (session.user as any).id;
    const { id } = await context.params;

    let reason = "Guest initiated cancellation";
    try {
      const body = await req.json();
      const validation = CancelReservationSchema.safeParse(body);
      if (validation.success) reason = validation.data.reason;
    } catch {
      // Body is optional
    }

    const result = await stayCancellationService.cancelReservation(id, userId, reason);

    return ApiResponseHelper.success(result);
  } catch (error: any) {
    console.error("[Stay Cancellation Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to cancel reservation",
      500
    );
  }
}
