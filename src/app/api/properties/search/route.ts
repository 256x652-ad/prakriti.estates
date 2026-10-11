import { NextResponse } from "next/server";
import { PropertySearchService } from "@/modules/properties/services/PropertySearchService";
import { BoundingBoxSchema } from "@/modules/properties/core/schemas";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minLng = searchParams.get("minLng");
    const minLat = searchParams.get("minLat");
    const maxLng = searchParams.get("maxLng");
    const maxLat = searchParams.get("maxLat");

    const validatedBounds = BoundingBoxSchema.parse({ minLng, minLat, maxLng, maxLat });

    const searchService = new PropertySearchService();
    const properties = await searchService.getPropertiesInViewport(validatedBounds);

    return NextResponse.json({ properties });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid bounding box parameters", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
