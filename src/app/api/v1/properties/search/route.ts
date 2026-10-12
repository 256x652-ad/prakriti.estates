import { NextRequest } from "next/server";
import { ApiResponseHelper } from "@/lib/api/response";
import { AdvancedSearchService } from "@/modules/properties/services/AdvancedSearchService";
import { SearchFilterSchema } from "@/modules/properties/core/searchParams";
import { PropertySummaryDTO } from "@/lib/api/contracts";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // Extract query parameters
    const rawParams = {
      type: searchParams.get("type") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      isPrakritiCertified: searchParams.get("isPrakritiCertified") || undefined,
      bounds: searchParams.get("bounds") || undefined,
      radius: searchParams.get("radius") || undefined,
      q: searchParams.get("q") || undefined,
    };

    // Zod validation
    const parsedFilters = SearchFilterSchema.safeParse(rawParams);
    if (!parsedFilters.success) {
      return ApiResponseHelper.error(
        "VALIDATION_ERROR",
        "Invalid query parameters provided",
        422,
        parsedFilters.error.flatten()
      );
    }

    const searchService = new AdvancedSearchService();
    const rawResults = (await searchService.search(parsedFilters.data)) as any[];

    // Map to mobile-friendly PropertySummaryDTO
    const properties: PropertySummaryDTO[] = (rawResults || []).map((p) => ({
      id: p.id,
      title: p.title,
      price: typeof p.price?.toNumber === "function" ? p.price.toNumber() : Number(p.price),
      type: p.type,
      isPrakritiCertified: Boolean(p.isPrakritiCertified),
      coordinates: {
        lng: Number(p.lng),
        lat: Number(p.lat),
      },
    }));

    const limit = Number(searchParams.get("limit")) || 20;
    const hasMore = properties.length > limit;
    const items = hasMore ? properties.slice(0, limit) : properties;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : null;

    // Return strictly wrapped JSON response with cursor pagination
    return ApiResponseHelper.success(items, {
      cursor: nextCursor,
      hasMore,
      limit,
      totalCount: properties.length,
    });
  } catch (error: any) {
    console.error("[API v1 Properties Search Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      "Failed to execute property search",
      500,
      process.env.NODE_ENV === "development" ? error.message : undefined
    );
  }
}
