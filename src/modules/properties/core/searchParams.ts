import { z } from "zod";

/**
 * Validates and sanitizes all incoming URL query parameters for the Search Engine.
 * Supports:
 * - type / mode: BUY, RENT, STAY
 * - q / query: search text
 * - minPrice, maxPrice
 * - isPrakritiCertified / certifiedOnly: boolean
 * - bounds / radius: PostGIS geospatial bounds
 */
export const SearchFilterSchema = z.object({
  type: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const upper = val.toUpperCase().trim();
        if (["BUY", "RENT", "STAY"].includes(upper)) return upper;
      }
      return undefined;
    }, z.enum(["BUY", "RENT", "STAY"]).optional()),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  isPrakritiCertified: z
    .preprocess((val) => {
      if (val === true || val === "true" || val === "1") return true;
      if (val === false || val === "false" || val === "0") return false;
      return undefined;
    }, z.boolean().optional()),
  q: z
    .preprocess((val) => {
      if (typeof val === "string" && val.trim().length > 0) return val.trim();
      return undefined;
    }, z.string().optional()),

  // Viewport bounds (comma-separated string from URL: minLng,minLat,maxLng,maxLat)
  bounds: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parts = val.split(",").map(Number);
      if (parts.length === 4 && parts.every((p) => !isNaN(p))) {
        return { minLng: parts[0], minLat: parts[1], maxLng: parts[2], maxLat: parts[3] };
      }
      return undefined;
    }),

  // Radius search (comma-separated string: lng,lat,distanceMeters)
  radius: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const parts = val.split(",").map(Number);
      if (parts.length === 3 && parts.every((p) => !isNaN(p))) {
        return { lng: parts[0], lat: parts[1], distanceMeters: parts[2] };
      }
      return undefined;
    }),
});

export type SearchFiltersDTO = z.infer<typeof SearchFilterSchema>;
