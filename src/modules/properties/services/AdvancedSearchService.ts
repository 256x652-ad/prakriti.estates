import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { SearchFiltersDTO } from "../core/searchParams";

export class AdvancedSearchService {
  /**
   * Dynamically constructs a complex PostGIS query combining spatial, 
   * categorical, and numerical filters.
   */
  async search(filters: SearchFiltersDTO) {
    const conditions: Prisma.Sql[] = [];

    // 1. Lifecycle Status (Only show published properties)
    conditions.push(Prisma.sql`"lifecycleStatus" = 'PUBLISHED'`);

    // 2. Mode Filtering
    if (filters.type) {
       conditions.push(Prisma.sql`"type" = ${filters.type}::"PropertyType"`);
    }

    // 3. Price Filtering
    if (filters.minPrice !== undefined) {
       conditions.push(Prisma.sql`"price" >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
       conditions.push(Prisma.sql`"price" <= ${filters.maxPrice}`);
    }

    // Text Search
    if (filters.q) {
       const searchPattern = `%${filters.q}%`;
       conditions.push(Prisma.sql`("title" ILIKE ${searchPattern} OR "description" ILIKE ${searchPattern})`);
    }

    // 4. Certification (Gold Pin)
    if (filters.isPrakritiCertified) {
       conditions.push(Prisma.sql`"isPrakritiCertified" = true`);
    }

    // 5. Spatial Filtering (Bounds OR Radius)
    if (filters.bounds) {
       // Bounding box from map viewport
       const { minLng, minLat, maxLng, maxLat } = filters.bounds;
       conditions.push(
         Prisma.sql`location && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`
       );
    } else if (filters.radius) {
       // Proximity search from a specific point
       const { lng, lat, distanceMeters } = filters.radius;
       conditions.push(
         Prisma.sql`ST_DWithin(location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${distanceMeters})`
       );
    }

    // Join all conditions securely using Prisma.join
    const whereClause = conditions.length > 0 
      ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` 
      : Prisma.empty;

    // Execute raw SQL safely to prevent SQL injection
    const results = await prisma.$queryRaw`
      SELECT 
        id, 
        title, 
        price, 
        type, 
        "isPrakritiCertified",
        ST_X(location::geometry) as lng, 
        ST_Y(location::geometry) as lat
      FROM "Property"
      ${whereClause}
      LIMIT 100
    `;

    return results;
  }
}
