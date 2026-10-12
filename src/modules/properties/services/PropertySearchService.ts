import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";

export interface SearchQueryFilters {
  bounds?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  radius?: {
    lng: number;
    lat: number;
    distanceMeters: number;
  };
  type?: "BUY" | "RENT" | "STAY";
  minPrice?: number;
  maxPrice?: number;
  isPrakritiCertified?: boolean;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  id: string;
  slug: string | null;
  title: string;
  description: string;
  price: number;
  type: string;
  lockStatus: string;
  isPrakritiCertified: boolean;
  images: string[];
  lng: number;
  lat: number;
  distanceMeters?: number;
}

/**
 * PROPERTY SEARCH SERVICE (SEARCH ENGINE ADAPTER)
 * 
 * Sits as the boundary interface between the application/UI layer and the search engine.
 * 
 * - Current Implementation: PostgreSQL + PostGIS (ST_MakeEnvelope, ST_DWithin, ST_Distance, GiST Index)
 * - Future Scalability: Ready for zero-downtime swapping to OpenSearch / Elasticsearch / Algolia / Meilisearch
 *   without altering UI components or business controllers.
 */
export class PropertySearchService {
  /**
   * Executes PostGIS geospatial search using ST_MakeEnvelope (bounding box) or ST_DWithin (radius),
   * alongside relational filters and pagination. Strictly queries PUBLISHED listings.
   */
  async search(filters: SearchQueryFilters): Promise<{
    items: SearchResultItem[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const limit = Math.min(filters.limit || 20, 100);
    const offset = filters.offset || 0;

    const conditions: Prisma.Sql[] = [
      Prisma.sql`p."lifecycleStatus" = 'PUBLISHED'`,
    ];

    // 1. PostGIS Bounding Box Filter (Viewport search)
    if (filters.bounds) {
      const { minLng, minLat, maxLng, maxLat } = filters.bounds;
      conditions.push(
        Prisma.sql`p.location && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`
      );
    }

    // 2. PostGIS Radius Search (ST_DWithin for nearby properties)
    if (filters.radius) {
      const { lng, lat, distanceMeters } = filters.radius;
      conditions.push(
        Prisma.sql`ST_DWithin(p.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${distanceMeters})`
      );
    }

    // 3. Listing Mode Filter (BUY, RENT, STAY)
    if (filters.type) {
      conditions.push(Prisma.sql`p."type" = ${filters.type}::"PropertyType"`);
    }

    // 4. Price Tier Filter
    if (filters.minPrice !== undefined) {
      conditions.push(Prisma.sql`p."price" >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(Prisma.sql`p."price" <= ${filters.maxPrice}`);
    }

    // 5. Certification Filter (Gold Pin)
    if (filters.isPrakritiCertified) {
      conditions.push(Prisma.sql`p."isPrakritiCertified" = true`);
    }

    // 6. Text Search (Case-insensitive ILIKE across title & description)
    if (filters.q) {
      const pattern = `%${filters.q}%`;
      conditions.push(
        Prisma.sql`(p."title" ILIKE ${pattern} OR p."description" ILIKE ${pattern})`
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

    // Order clause: When searching nearby radius, sort by physical distance ASC
    let orderClause = Prisma.sql`ORDER BY p."createdAt" DESC`;
    let distanceField = Prisma.sql`0 as "distanceMeters"`;

    if (filters.radius) {
      const { lng, lat } = filters.radius;
      distanceField = Prisma.sql`ST_Distance(p.location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as "distanceMeters"`;
      orderClause = Prisma.sql`ORDER BY "distanceMeters" ASC, p."createdAt" DESC`;
    }

    // Query Items with PostGIS ST_X and ST_Y coordinates
    const itemsRaw = await prisma.$queryRaw<any[]>`
      SELECT 
        p.id,
        p.slug,
        p.title,
        p.description,
        p.price,
        p.type,
        p."lockStatus",
        p."isPrakritiCertified",
        p.images,
        ST_X(p.location::geometry) as lng,
        ST_Y(p.location::geometry) as lat,
        ${distanceField}
      FROM "Property" p
      ${whereClause}
      ${orderClause}
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Count Total Matching Records
    const countResult = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count
      FROM "Property" p
      ${whereClause}
    `;

    const total = Number(countResult[0]?.count || 0);

    const items: SearchResultItem[] = itemsRaw.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      description: row.description,
      price: row.price?.toNumber ? row.price.toNumber() : Number(row.price),
      type: row.type,
      lockStatus: row.lockStatus,
      isPrakritiCertified: Boolean(row.isPrakritiCertified),
      images: Array.isArray(row.images) ? row.images : [],
      lng: Number(row.lng),
      lat: Number(row.lat),
      distanceMeters: row.distanceMeters ? Math.round(Number(row.distanceMeters)) : undefined,
    }));

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * Dedicated helper for nearby properties given coordinates and radius
   */
  async getNearbyProperties(
    lng: number,
    lat: number,
    radiusMeters: number = 10000,
    limit: number = 10
  ): Promise<SearchResultItem[]> {
    const res = await this.search({
      radius: { lng, lat, distanceMeters: radiusMeters },
      limit,
    });
    return res.items;
  }

  /**
   * Helper method for viewport search
   */
  async getPropertiesInViewport(bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  }): Promise<SearchResultItem[]> {
    const res = await this.search({ bounds });
    return res.items;
  }
}

export const propertySearchService = new PropertySearchService();
