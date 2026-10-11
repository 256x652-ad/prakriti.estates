import { prisma } from "@/infrastructure/database/prisma";
import { Prisma } from "@prisma/client";

export interface SearchQueryFilters {
  bounds?: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
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
}

export class PropertySearchService {
  /**
   * Executes optimized PostGIS geospatial search using ST_MakeEnvelope
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

    // 1. PostGIS Bounding Box Filter (ST_MakeEnvelope)
    if (filters.bounds) {
      const { minLng, minLat, maxLng, maxLat } = filters.bounds;
      conditions.push(
        Prisma.sql`p.location && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)`
      );
    }

    // 2. Listing Mode (BUY, RENT, STAY)
    if (filters.type) {
      conditions.push(Prisma.sql`p."type" = ${filters.type}::"PropertyType"`);
    }

    // 3. Price Filter
    if (filters.minPrice !== undefined) {
      conditions.push(Prisma.sql`p."price" >= ${filters.minPrice}`);
    }
    if (filters.maxPrice !== undefined) {
      conditions.push(Prisma.sql`p."price" <= ${filters.maxPrice}`);
    }

    // 4. Certification (Prakriti Gold Standard)
    if (filters.isPrakritiCertified) {
      conditions.push(Prisma.sql`p."isPrakritiCertified" = true`);
    }

    // 5. Text Search (ILIKE)
    if (filters.q) {
      const pattern = `%${filters.q}%`;
      conditions.push(
        Prisma.sql`(p."title" ILIKE ${pattern} OR p."description" ILIKE ${pattern})`
      );
    }

    const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`;

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
        ST_Y(p.location::geometry) as lat
      FROM "Property" p
      ${whereClause}
      ORDER BY p."createdAt" DESC
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
    }));

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  /**
   * Helper method for bounding box viewport search
   */
  async getPropertiesInViewport(bounds: { minLng: number; minLat: number; maxLng: number; maxLat: number }): Promise<SearchResultItem[]> {
    const res = await this.search({ bounds });
    return res.items;
  }
}

export const propertySearchService = new PropertySearchService();
