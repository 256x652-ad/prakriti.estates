import { MetadataRoute } from "next";
import { prisma } from "@/infrastructure/database/prisma";

const CHUNK_SIZE = 1000;

/**
 * Next.js App Router generateSitemaps allows generating chunked / paginated
 * sitemaps (e.g., /sitemap/0.xml, /sitemap/1.xml) to handle thousands of property records.
 */
export async function generateSitemaps() {
  try {
    const totalProperties = await prisma.property.count({
      where: {
        lifecycleStatus: "PUBLISHED",
      },
    });

    const numberOfSitemaps = Math.max(1, Math.ceil(totalProperties / CHUNK_SIZE));
    return Array.from({ length: numberOfSitemaps }, (_, i) => ({ id: i }));
  } catch (error) {
    console.error("Failed to generate sitemap chunks count:", error);
    return [{ id: 0 }];
  }
}

export default async function sitemap({
  id = 0,
}: {
  id?: number;
} = {}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prakritiestates.com";
  const chunkIndex = typeof id === "number" ? id : 0;

  // Static platform pages included in the root chunk (id: 0)
  const staticRoutes: MetadataRoute.Sitemap = chunkIndex === 0
    ? [
        {
          url: `${baseUrl}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 1.0,
        },
        {
          url: `${baseUrl}/search`,
          lastModified: new Date(),
          changeFrequency: "hourly",
          priority: 0.9,
        },
        {
          url: `${baseUrl}/consultants`,
          lastModified: new Date(),
          changeFrequency: "weekly",
          priority: 0.85,
        },
      ]
    : [];

  try {
    const properties = await prisma.property.findMany({
      where: {
        lifecycleStatus: "PUBLISHED",
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        isPrakritiCertified: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip: chunkIndex * CHUNK_SIZE,
      take: CHUNK_SIZE,
    });

    const propertyRoutes: MetadataRoute.Sitemap = properties.map((prop) => ({
      url: `${baseUrl}/property/${prop.slug || prop.id}`,
      lastModified: prop.updatedAt,
      changeFrequency: "daily",
      // Boost certified listings in search engine ranking signals
      priority: prop.isPrakritiCertified ? 0.95 : 0.8,
    }));

    return [...staticRoutes, ...propertyRoutes];
  } catch (error) {
    console.error("Error fetching properties for sitemap chunk", chunkIndex, error);
    return staticRoutes;
  }
}
