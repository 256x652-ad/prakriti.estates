import { NextRequest } from "next/server";
import { propertySearchService, SearchQueryFilters } from "@/modules/properties/services/PropertySearchService";
import { ApiResponseHelper } from "@/lib/api/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const typeParam = searchParams.get("type");
    const minPriceParam = searchParams.get("minPrice");
    const maxPriceParam = searchParams.get("maxPrice");
    const certifiedParam = searchParams.get("isPrakritiCertified");
    const qParam = searchParams.get("q");
    const boundsParam = searchParams.get("bounds");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const filters: SearchQueryFilters = {
      type: typeParam === "BUY" || typeParam === "RENT" || typeParam === "STAY" ? typeParam : undefined,
      minPrice: minPriceParam ? parseFloat(minPriceParam) : undefined,
      maxPrice: maxPriceParam ? parseFloat(maxPriceParam) : undefined,
      isPrakritiCertified: certifiedParam !== null ? certifiedParam === "true" || certifiedParam === "1" : undefined,
      q: qParam || undefined,
      limit: limitParam ? parseInt(limitParam, 10) : 20,
      offset: offsetParam ? parseInt(offsetParam, 10) : 0,
    };

    if (boundsParam) {
      const parts = boundsParam.split(",").map(Number);
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        filters.bounds = {
          minLng: parts[0],
          minLat: parts[1],
          maxLng: parts[2],
          maxLat: parts[3],
        };
      }
    }

    const result = await propertySearchService.search(filters);

    return ApiResponseHelper.success(result.items, {
      totalCount: result.total,
      limit: result.limit,
      hasMore: result.offset + result.items.length < result.total,
    });
  } catch (error: any) {
    console.error("[Search API Error]", error);
    return ApiResponseHelper.error(
      "INTERNAL_SERVER_ERROR",
      error.message || "Failed to execute search query",
      500
    );
  }
}
