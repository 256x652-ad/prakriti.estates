import { prisma } from "@/infrastructure/database/prisma";
import { BoundingBoxInput, RadiusSearchInput, PropertyMarkerDTO } from "../core/schemas";

export class PropertyRepository {
  async findByBoundingBox({ minLng, minLat, maxLng, maxLat }: BoundingBoxInput): Promise<PropertyMarkerDTO[]> {
    const result = await prisma.$queryRaw<PropertyMarkerDTO[]>`
      SELECT 
        id, 
        title, 
        price, 
        type, 
        "verificationStatus",
        ST_X(location::geometry) as lng, 
        ST_Y(location::geometry) as lat
      FROM "Property"
      WHERE location && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)
    `;
    return result;
  }

  async findByRadius({ lng, lat, radiusMeters }: RadiusSearchInput): Promise<(PropertyMarkerDTO & { distance: number })[]> {
    const result = await prisma.$queryRaw<(PropertyMarkerDTO & { distance: number })[]>`
      SELECT 
        id, 
        title, 
        price, 
        type, 
        "verificationStatus",
        ST_X(location::geometry) as lng, 
        ST_Y(location::geometry) as lat,
        ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography) as distance
      FROM "Property"
      WHERE ST_DWithin(
        location::geography, 
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, 
        ${radiusMeters}
      )
      ORDER BY distance ASC
      LIMIT 100
    `;
    return result;
  }
}
