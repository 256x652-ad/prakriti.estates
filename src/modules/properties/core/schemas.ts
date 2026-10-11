import { z } from "zod";

export const BoundingBoxSchema = z.object({
  minLng: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  maxLng: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90),
});

export const RadiusSearchSchema = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
  radiusMeters: z.coerce.number().min(100).max(50000), // Max 50km
});

export type BoundingBoxInput = z.infer<typeof BoundingBoxSchema>;
export type RadiusSearchInput = z.infer<typeof RadiusSearchSchema>;

export type PropertyMarkerDTO = {
  id: string;
  title: string;
  price: number;
  type: string;
  verificationStatus: string;
  lng: number;
  lat: number;
};
