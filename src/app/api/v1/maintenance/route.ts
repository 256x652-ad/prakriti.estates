import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { maintenanceTicketService } from "@/modules/rentals/services/MaintenanceTicketService";
import { ApiResponseHelper } from "@/lib/api/response";
import { MaintenanceTicketStatus } from "@prisma/client";
import { z } from "zod";

const CreateTicketSchema = z.object({
  tenancyId: z.string().uuid("Invalid tenancy UUID"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  estimatedCost: z.number().positive().optional(),
});

const UpdateTicketSchema = z.object({
  ticketId: z.string().uuid("Invalid ticket UUID"),
  status: z.enum([
    "OPEN",
    "IN_PROGRESS",
    "AWAITING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "RESOLVED",
  ]),
  approvedCost: z.number().nonnegative().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const userId = (session.user as any).id;
    const tickets = await maintenanceTicketService.getTickets(userId);

    return ApiResponseHelper.success(tickets);
  } catch (error: any) {
    console.error("[Maintenance GET Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to fetch maintenance tickets",
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = await req.json();
    const validation = CreateTicketSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid maintenance ticket details",
        422,
        validation.error.flatten()
      );
    }

    const ticket = await maintenanceTicketService.createTicket(validation.data);

    return ApiResponseHelper.success(ticket, undefined, 201);
  } catch (error: any) {
    console.error("[Maintenance POST Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to submit maintenance ticket",
      500
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = await req.json();
    const validation = UpdateTicketSchema.safeParse(body);
    if (!validation.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid ticket status update details",
        422,
        validation.error.flatten()
      );
    }

    const { ticketId, status, approvedCost } = validation.data;
    const updated = await maintenanceTicketService.updateTicketStatus({
      ticketId,
      targetStatus: status as MaintenanceTicketStatus,
      approvedCost,
    });

    return ApiResponseHelper.success(updated);
  } catch (error: any) {
    console.error("[Maintenance PATCH Error]", error);
    return ApiResponseHelper.error(
      "VALIDATION_ERROR",
      error.message || "Failed to update maintenance ticket",
      400
    );
  }
}
