import Link from "next/link";
import { AdvancedSearchService } from "@/modules/properties/services/AdvancedSearchService";
import { SearchFilterSchema } from "@/modules/properties/core/searchParams";
import SearchLayoutShell from "@/components/Layout/SearchLayout";
import EmiCalculator from "@/components/Calculators/EmiCalculator";
import PropertyMap from "@/components/Map/PropertyMap";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedParams = await searchParams;
  const rawParams = {
    type: resolvedParams.type,
    minPrice: resolvedParams.minPrice,
    maxPrice: resolvedParams.maxPrice,
    isPrakritiCertified: resolvedParams.isPrakritiCertified,
    bounds: resolvedParams.bounds,
    radius: resolvedParams.radius,
    q: resolvedParams.q
  };

  const parsedFilters = SearchFilterSchema.parse(rawParams);

  const searchService = new AdvancedSearchService();
  const rawProperties = await searchService.search(parsedFilters);
  
  // Serialize Prisma Decimal to plain numbers for the Client Component payload
  const initialProperties = ((rawProperties as any[]) || []).map((prop: any) => ({
    ...prop,
    price: prop.price?.toNumber ? prop.price.toNumber() : Number(prop.price)
  }));


  return (
    <SearchLayoutShell
      mapComponent={<PropertyMap initialProperties={initialProperties} />}
    >
      <div className="space-y-6">
        <p className="text-sm text-gray-500 font-medium">Found {initialProperties.length} results matching your criteria.</p>
        
        {initialProperties.map((prop: any) => {
          const destinationSlug = prop.slug || prop.id;
          return (
            <Link
              key={prop.id}
              href={`/property/${destinationSlug}`}
              prefetch={false}
              className="block p-4 border bg-white rounded-xl shadow-sm hover:shadow-md transition hover:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-lg text-gray-900 group-hover:text-emerald-700 transition">
                  {prop.title || "Beautiful Property"}
                </h3>
                {prop.type && (
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {prop.type}
                  </span>
                )}
              </div>
              <p className="text-emerald-700 font-bold text-xl mt-1">₹{prop.price}</p>
              {prop.isPrakritiCertified && (
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-md border border-amber-200">
                  🌿 Prakriti Certified
                </div>
              )}
            </Link>
          );
        })}

        <div className="pt-8 border-t">
          <EmiCalculator />
        </div>
      </div>
    </SearchLayoutShell>
  );
}
