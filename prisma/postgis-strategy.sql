-- 1. Enable PostGIS Extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Add spatial columns (if not handled natively by Prisma's db push/migrate)
-- Note: In recent Prisma versions, Unsupported types are managed by migrations. 
-- If adding manually to an existing table, you would use:
-- ALTER TABLE "Property" ADD COLUMN "location" geometry(Point, 4326);
-- ALTER TABLE "Property" ADD COLUMN "boundary" geometry(Polygon, 4326);

-- 3. Create GIST Indexes for fast spatial queries
-- CREATE INDEX IF NOT EXISTS "property_location_idx" ON "Property" USING GIST ("location");
-- CREATE INDEX IF NOT EXISTS "property_boundary_idx" ON "Property" USING GIST ("boundary");

-- =================================================================
-- PRISMA $queryRaw STRATEGY EXAMPLES
-- =================================================================

/*
  A. Insert / Update a Property with Location (Point)
  Because Prisma doesn't natively serialize geometry types on insert, 
  we use $executeRaw to update the coordinates:
  
  await prisma.$executeRaw`
    UPDATE "Property" 
    SET location = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
    WHERE id = ${propertyId}
  `;
*/

/*
  B. Radius Search (Find properties within X meters of a given coordinate)
  ST_DWithin is highly optimized when paired with geography cast or ST_DistanceSphere.
  
  const properties = await prisma.$queryRaw`
    SELECT id, title, price, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat,
           ST_Distance(location::geography, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) as distance
    FROM "Property"
    WHERE ST_DWithin(
      location::geography, 
      ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, 
      ${radiusInMeters}
    )
    ORDER BY distance ASC;
  `;
*/

/*
  C. Bounding Box Search (Map Viewport)
  Find properties inside the visible map area (minLng, minLat, maxLng, maxLat).
  
  const properties = await prisma.$queryRaw`
    SELECT id, title, price, ST_X(location::geometry) as lng, ST_Y(location::geometry) as lat
    FROM "Property"
    WHERE location && ST_MakeEnvelope(
      ${minLng}, ${minLat}, 
      ${maxLng}, ${maxLat}, 
      4326
    );
  `;
*/

/*
  D. Find Properties within a specific polygon (e.g. drawn by user on map)
  Using GeoJSON polygon string input:
  
  const properties = await prisma.$queryRaw`
    SELECT id, title, price
    FROM "Property"
    WHERE ST_Contains(
      ST_GeomFromGeoJSON(${geojsonPolygonString}),
      location
    );
  `;
*/
