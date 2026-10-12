import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { prisma } from "@/infrastructure/database/prisma";
import { PropertyCardData } from "@/components/Home/HomepagePropertyCard";

export interface GeoLocationContext {
  city: string;
  region: string;
  country: string;
  isDefault: boolean;
}

const DEFAULT_LOCATION: GeoLocationContext = {
  city: "Gorakhpur",
  region: "Uttar Pradesh",
  country: "IN",
  isDefault: true,
};

const DEFAULT_IMAGES: Record<string, string[]> = {
  STAY: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"],
  BUY: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"],
  RENT: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"],
};

/**
 * Detects user city via proxy/edge headers (Cloudflare, Vercel, AWS CloudFront, or x-forwarded)
 * Falls back strictly to Gorakhpur, Uttar Pradesh
 */
export async function detectUserCity(): Promise<GeoLocationContext> {
  const headerList = await headers();
  const detectedCity =
    headerList.get("x-vercel-ip-city") ||
    headerList.get("cf-ipcity") ||
    headerList.get("x-forwarded-city");
  const detectedRegion =
    headerList.get("x-vercel-ip-country-region") ||
    headerList.get("cf-region") ||
    headerList.get("x-forwarded-region");

  if (detectedCity && detectedCity.trim().length > 0) {
    return {
      city: detectedCity.trim(),
      region: detectedRegion || "India",
      country: "IN",
      isDefault: false,
    };
  }

  return DEFAULT_LOCATION;
}

/**
 * 1. Featured Properties Stream: Cached for 10 minutes (600s)
 */
export const getFeaturedProperties = unstable_cache(
  async (city: string): Promise<PropertyCardData[]> => {
    try {
      const dbProperties = await prisma.property.findMany({
        where: {
          lifecycleStatus: "PUBLISHED",
        },
        orderBy: { createdAt: "desc" },
        take: 12,
      });

      return dbProperties.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: Number(p.price) || 0,
        city: city || (p.type === "STAY" ? "Gurgaon" : p.type === "BUY" ? "Noida" : "South Delhi"),
        type: p.type,
        mediaUrls:
          p.images && p.images.length > 0
            ? p.images
            : DEFAULT_IMAGES[p.type] || DEFAULT_IMAGES.BUY,
        isPrakritiCertified: p.isPrakritiCertified ?? false,
      }));
    } catch (error) {
      console.error("Error fetching featured properties:", error);
      return [];
    }
  },
  ["prakriti_featured_properties"],
  { revalidate: 600, tags: ["properties"] }
);

/**
 * 2. Prakriti Certified Stream (Gold Pin): Cached for 10 minutes (600s)
 */
export const getCertifiedProperties = unstable_cache(
  async (): Promise<PropertyCardData[]> => {
    try {
      const dbProperties = await prisma.property.findMany({
        where: {
          lifecycleStatus: "PUBLISHED",
          isPrakritiCertified: true,
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });

      return dbProperties.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        description: p.description,
        price: Number(p.price) || 0,
        city: p.type === "STAY" ? "Gurgaon" : p.type === "BUY" ? "Noida" : "South Delhi",
        type: p.type,
        mediaUrls:
          p.images && p.images.length > 0
            ? p.images
            : DEFAULT_IMAGES[p.type] || DEFAULT_IMAGES.BUY,
        isPrakritiCertified: true,
      }));
    } catch (error) {
      console.error("Error fetching certified properties:", error);
      return [];
    }
  },
  ["prakriti_certified_properties"],
  { revalidate: 600, tags: ["properties"] }
);
