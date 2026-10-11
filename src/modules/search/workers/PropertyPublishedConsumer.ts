import { prisma } from "@/infrastructure/database/prisma";
import { notificationService } from "@/modules/notifications/services/NotificationService";

export interface PropertyPublishedPayload {
  propertyId: string;
  slug?: string;
  title?: string;
  type?: string;
  price?: string | number;
}

export class PropertyPublishedConsumer {
  /**
   * Matches a newly published property against all user SavedSearch criteria
   * using PostGIS geographic coordinates and relational attributes.
   */
  async handlePropertyPublished(payload: PropertyPublishedPayload): Promise<{
    matchedUsersCount: number;
    matchedUserIds: string[];
  }> {
    const { propertyId } = payload;
    console.log(`[PropertyPublishedConsumer] Evaluating saved searches for property #${propertyId}...`);

    // 1. Fetch property details and coordinates using PostGIS ST_X / ST_Y
    const propertyCoords: any[] = await prisma.$queryRaw`
      SELECT 
        id, 
        title, 
        slug, 
        type, 
        price, 
        ST_X(location::geometry) as lng, 
        ST_Y(location::geometry) as lat 
      FROM "Property" 
      WHERE id = ${propertyId} 
      LIMIT 1
    `;

    if (!propertyCoords || propertyCoords.length === 0) {
      console.warn(`[PropertyPublishedConsumer] Property #${propertyId} not found in database.`);
      return { matchedUsersCount: 0, matchedUserIds: [] };
    }

    const prop = propertyCoords[0];
    const propLng = prop.lng !== null ? Number(prop.lng) : null;
    const propLat = prop.lat !== null ? Number(prop.lat) : null;
    const propPrice = Number(prop.price);
    const propType = prop.type;

    // 2. Query all SavedSearch records
    const savedSearches = await prisma.savedSearch.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (savedSearches.length === 0) {
      return { matchedUsersCount: 0, matchedUserIds: [] };
    }

    const matchedUserIds: string[] = [];

    // 3. Evaluate criteria for each SavedSearch
    for (const search of savedSearches) {
      const qp = (search.queryParameters as any) || {};

      // A. Listing Mode / Type Filter
      if (qp.mode && qp.mode !== propType) {
        continue;
      }

      // B. Price Filters
      if (qp.minPrice && propPrice < Number(qp.minPrice)) {
        continue;
      }
      if (qp.maxPrice && propPrice > Number(qp.maxPrice)) {
        continue;
      }

      // C. PostGIS Geographic Bounding Box Match
      // Format: [minLng, minLat, maxLng, maxLat]
      if (qp.bounds && Array.isArray(qp.bounds) && qp.bounds.length === 4) {
        const [minLng, minLat, maxLng, maxLat] = qp.bounds;
        if (propLng !== null && propLat !== null) {
          const withinBounds =
            propLng >= minLng && propLng <= maxLng && propLat >= minLat && propLat <= maxLat;
          if (!withinBounds) {
            continue;
          }
        }
      }

      // MATCH CONFIRMED: Queue targeted omnichannel alert
      matchedUserIds.push(search.userId);

      try {
        await notificationService.sendPropertyAlert(search.userId, {
          id: prop.id,
          title: prop.title,
          price: propPrice,
        });

        console.log(
          `[PropertyPublishedConsumer] Targeted alert dispatched to User #${search.userId} for match "${prop.title}".`
        );
      } catch (err: any) {
        console.error(
          `[PropertyPublishedConsumer] Failed to alert User #${search.userId}:`,
          err.message
        );
      }
    }

    console.log(
      `[PropertyPublishedConsumer] Finished evaluation. Dispatched alerts to ${matchedUserIds.length} users.`
    );

    return {
      matchedUsersCount: matchedUserIds.length,
      matchedUserIds,
    };
  }
}

export const propertyPublishedConsumer = new PropertyPublishedConsumer();
