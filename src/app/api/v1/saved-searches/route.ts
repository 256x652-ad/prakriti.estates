import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { z } from "zod";

const SavedSearchSchema = z.object({
  queryParameters: z.object({
    name: z.string().optional(),
    mode: z.enum(["BUY", "RENT", "STAY"]).optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    bhk: z.number().optional(),
    city: z.string().optional(),
    bounds: z.array(z.number()).length(4).optional(), // [minLng, minLat, maxLng, maxLat]
    notifyViaPush: z.boolean().default(true),
  }),
  notifyViaEmail: z.boolean().default(true),
});

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: savedSearches,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json();
    const validated = SavedSearchSchema.parse(body);

    const created = await prisma.savedSearch.create({
      data: {
        userId,
        queryParameters: validated.queryParameters,
        notifyViaEmail: validated.notifyViaEmail,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: created,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION_ERROR", details: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR", message: error.message },
      { status: 500 }
    );
  }
}
