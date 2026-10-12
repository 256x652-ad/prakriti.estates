import Link from "next/link";
import {
  propertySearchService,
  SearchQueryFilters,
  SearchResultItem,
} from "@/modules/properties/services/PropertySearchService";
import { SearchFilterSchema } from "@/modules/properties/core/searchParams";
import SearchLayoutShell from "@/components/Layout/SearchLayout";
import EmiCalculator from "@/components/Calculators/EmiCalculator";
import PropertyMap from "@/components/Map/PropertyMap";
import PropertyCard from "@/components/Cards/PropertyCard";
import { getMockSearchResults } from "@/modules/properties/utils/mockPropertiesSeeder";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;

  // Normalize aliases from URL (mode -> type, query -> q, certifiedOnly -> isPrakritiCertified)
  const normalizedType =
    resolvedParams.type || resolvedParams.mode;
  const normalizedQuery =
    resolvedParams.q || resolvedParams.query;
  const normalizedCertified =
    resolvedParams.isPrakritiCertified !== undefined
      ? resolvedParams.isPrakritiCertified
      : resolvedParams.certifiedOnly !== undefined
      ? resolvedParams.certifiedOnly
      : undefined;

  const rawParams = {
    type: typeof normalizedType === "string" ? normalizedType : undefined,
    minPrice: resolvedParams.minPrice,
    maxPrice: resolvedParams.maxPrice,
    isPrakritiCertified: normalizedCertified,
    bounds: resolvedParams.bounds,
    radius: resolvedParams.radius,
    q: typeof normalizedQuery === "string" ? normalizedQuery : undefined,
  };

  const parseResult = SearchFilterSchema.safeParse(rawParams);
  const parsedFilters = parseResult.success ? parseResult.data : {};

  let properties: SearchResultItem[] = [];
  let totalCount = 0;

  try {
    const filters: SearchQueryFilters = {
      type: parsedFilters.type,
      minPrice: parsedFilters.minPrice,
      maxPrice: parsedFilters.maxPrice,
      isPrakritiCertified: parsedFilters.isPrakritiCertified,
      bounds: parsedFilters.bounds,
      q: parsedFilters.q,
      limit: 50,
      offset: 0,
    };

    const result = await propertySearchService.search(filters);
    properties = result.items;
    totalCount = result.total;
  } catch (error) {
    console.warn(
      "[SearchPage] Database query or PostGIS error, failing over gracefully to type-safe domain mocks:",
      error
    );
    let mockData = getMockSearchResults();
    if (parsedFilters.type) {
      mockData = mockData.filter((p) => p.type === parsedFilters.type);
    }
    if (parsedFilters.minPrice) {
      mockData = mockData.filter((p) => p.price >= (parsedFilters.minPrice as number));
    }
    if (parsedFilters.maxPrice) {
      mockData = mockData.filter((p) => p.price <= (parsedFilters.maxPrice as number));
    }
    if (parsedFilters.isPrakritiCertified) {
      mockData = mockData.filter((p) => p.isPrakritiCertified);
    }
    if (parsedFilters.q) {
      const query = parsedFilters.q.toLowerCase();
      mockData = mockData.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query)
      );
    }
    properties = mockData;
    totalCount = mockData.length;
  }

  return (
    <SearchLayoutShell
      mapComponent={<PropertyMap initialProperties={properties} />}
    >
      <div className="space-y-4">
        {/* Results Counter & Active Category */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <p className="text-xs font-semibold text-slate-500">
            Showing <span className="font-extrabold text-slate-900">{properties.length}</span>{" "}
            {properties.length === 1 ? "listing" : "listings"}
            {parsedFilters.bounds ? " in map viewport" : ""}
          </p>
          <div className="flex items-center gap-1.5">
            {parsedFilters.type && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                {parsedFilters.type}
              </span>
            )}
            {parsedFilters.isPrakritiCertified && (
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                ⭐ Certified
              </span>
            )}
          </div>
        </div>

        {/* Listings List */}
        {properties.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <span className="text-4xl block">🔍</span>
            <p className="text-sm font-bold text-slate-800">No properties found</p>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              {parsedFilters.bounds
                ? "No listings match your criteria in the current map viewport. Try zooming out or clearing the viewport."
                : "No listings match your current search filters. Try adjusting your search query or filters."}
            </p>
            <Link
              href="/search"
              className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-1.5 rounded-full border border-emerald-200 transition"
            >
              Reset All Filters
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        )}

        {/* EMI Calculator Widget */}
        <div className="pt-6 border-t border-slate-200">
          <EmiCalculator />
        </div>
      </div>
    </SearchLayoutShell>
  );
}
