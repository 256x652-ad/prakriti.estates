import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { PropertyLifecycleService } from "@/modules/properties/services/PropertyLifecycleService";
import { ApiResponseHelper } from "@/lib/api/response";
import { PropertyType, Prisma } from "@prisma/client";
import { z } from "zod";

const PropertyCreationSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  type: z.enum(["BUY", "RENT", "STAY"]),
  price: z.number().positive(),
  latitude: z.number(),
  longitude: z.number(),
  images: z.array(z.string().url()).min(1, "At least one property image is required"),
  // Polymorphic details
  buyDetails: z.object({
    plotArea: z.number().positive(),
    totalPrice: z.number().positive(),
    emiAvailable: z.boolean().default(false),
  }).optional(),
  rentDetails: z.object({
    securityDeposit: z.number().nonnegative(),
    isMin11Months: z.boolean().default(true),
    tenantPreferences: z.string().optional(),
  }).optional(),
  stayDetails: z.object({
    dailyRate: z.number().positive(),
    weekendRate: z.number().positive().optional(),
    cancellationRule: z.string().default("Flexible"),
  }).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const cursor = searchParams.get("cursor");

    const properties = await prisma.property.findMany({
      where: { lifecycleStatus: "PUBLISHED" },
      take: limit + 1,
      ...(cursor && { skip: 1, cursor: { id: cursor } }),
      orderBy: { createdAt: "desc" },
      include: {
        buyDetails: true,
        rentDetails: true,
        stayDetails: true,
      },
    });

    const hasMore = properties.length > limit;
    const data = hasMore ? properties.slice(0, limit) : properties;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return ApiResponseHelper.success(data, {
      hasMore,
      cursor: nextCursor,
      limit,
    });
  } catch (error: any) {
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", error.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Sign in required to create properties", 401);
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const validation = PropertyCreationSchema.safeParse(body);

    if (!validation.success) {
      return ApiResponseHelper.error("VALIDATION_ERROR", "Invalid property fields", 422, validation.error.flatten());
    }

    const { title, description, type, price, latitude, longitude, images, buyDetails, rentDetails, stayDetails } = validation.data;
    const slug = PropertyLifecycleService.slugify(title);

    // Create property in DRAFT state with polymorphic relation
    const property = await prisma.$transaction(async (tx) => {
      const created = await tx.property.create({
        data: {
          title,
          description,
          slug,
          type: type as PropertyType,
          price: new Prisma.Decimal(price),
          images,
          ownerId: userId,
          lifecycleStatus: "DRAFT",
          ...(type === "BUY" && buyDetails && {
            buyDetails: {
              create: {
                plotArea: new Prisma.Decimal(buyDetails.plotArea),
                totalPrice: new Prisma.Decimal(buyDetails.totalPrice),
                emiAvailable: buyDetails.emiAvailable,
              },
            },
          }),
          ...(type === "RENT" && rentDetails && {
            rentDetails: {
              create: {
                securityDeposit: new Prisma.Decimal(rentDetails.securityDeposit),
                isMin11Months: rentDetails.isMin11Months,
                tenantPreferences: rentDetails.tenantPreferences,
              },
            },
          }),
          ...(type === "STAY" && stayDetails && {
            stayDetails: {
              create: {
                dailyRate: new Prisma.Decimal(stayDetails.dailyRate),
                weekendRate: stayDetails.weekendRate ? new Prisma.Decimal(stayDetails.weekendRate) : undefined,
                cancellationRule: stayDetails.cancellationRule,
              },
            },
          }),
        },
      });

      // Inject PostGIS WGS84 coordinates
      await tx.$executeRaw`
        UPDATE "Property"
        SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
        WHERE id = ${created.id}
      `;

      return created;
    });

    return ApiResponseHelper.success(property, undefined, 201);
  } catch (error: any) {
    console.error("[Property Creation Error]", error);
    return ApiResponseHelper.error("INTERNAL_SERVER_ERROR", error.message || "Failed to create property", 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return ApiResponseHelper.error("UNAUTHORIZED", "Authentication required", 401);
    }

    const roles = (session.user as any).roles || [];
    const body = await req.json();
    const { propertyId, status } = body;

    if (!propertyId || !status) {
      return ApiResponseHelper.error("VALIDATION_ERROR", "propertyId and status required", 422);
    }

    const updated = await PropertyLifecycleService.transitionStatus(propertyId, status, roles);
    return ApiResponseHelper.success(updated);
  } catch (error: any) {
    return ApiResponseHelper.error("VALIDATION_ERROR", error.message || "Transition rejected", 400);
  }
}
