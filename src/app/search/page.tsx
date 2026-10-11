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
        
        {initialProperties.map((prop: any) => (
          <div key={prop.id} className="p-4 border bg-white rounded-xl shadow-sm hover:shadow-md transition">
            <h3 className="font-semibold text-lg text-gray-900">{prop.title || "Beautiful Property"}</h3>
            <p className="text-prakriti-700 font-bold text-xl mt-1">₹{prop.price}</p>
            {prop.isPrakritiCertified && (
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-gold-600 bg-gold-400/10 px-2 py-1 rounded-md">
                ✨ Prakriti Certified
              </div>
            )}
          </div>
        ))}

        <div className="pt-8 border-t">
          <EmiCalculator />
        </div>
      </div>
    </SearchLayoutShell>
  );
}
