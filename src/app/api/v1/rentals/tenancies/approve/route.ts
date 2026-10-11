import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { tenancyManagementService } from "@/modules/rentals/services/TenancyManagementService";
import { ApiResponseHelper } from "@/lib/api/response";
import { z } from "zod";

const ApproveTenancySchema = z.object({
  propertyLockId: z.string().uuid("Invalid PropertyLock UUID"),
  startDate: z.string().datetime().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const userRoles = (session.user as any).roles || [];
    const isAuthorized =
      userRoles.includes("ADMIN") ||
      userRoles.includes("SUPER_ADMIN") ||
      userRoles.includes("SELLER") ||
      userRoles.includes("LANDLORD");

    if (!isAuthorized) {
      return ApiResponseHelper.error("FORBIDDEN", "Only landlords or admins can approve tenancies", 403);
    }

    const body = await req.json();
    const validation = ApproveTenancySchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid tenancy approval parameters",
        422,
        validation.error.flatten()
      );
    }

    const { propertyLockId, startDate } = validation.data;
    const tenancy = await tenancyManagementService.approveTenancy(
      propertyLockId,
      startDate ? new Date(startDate) : undefined
    );

    return ApiResponseHelper.success(tenancy, undefined, 201);
  } catch (error: any) {
    console.error("[Approve Tenancy Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to approve tenancy",
      500
    );
  }
}
