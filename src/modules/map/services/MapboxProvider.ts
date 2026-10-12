import {
  IMapProvider,
  MapCoordinates,
  MapViewportBounds,
  GeocodingResult,
} from "../types/mapProvider";

export class MapboxProvider implements IMapProvider {
  readonly providerName = "mapbox" as const;
  private readonly token: string;
  private readonly baseUrl = "https://api.mapbox.com/geocoding/v5/mapbox.places";

  constructor(token?: string) {
    this.token =
      token ||
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.MAPBOX_TOKEN ||
      "";
  }

  async geocode(query: string): Promise<GeocodingResult[]> {
    if (!query.trim() || !this.token) return [];

    try {
      const endpoint = `${this.baseUrl}/${encodeURIComponent(
        query.trim()
      )}.json?access_token=${this.token}&country=IN&types=place,locality,neighborhood,address,poi&limit=5`;

      const res = await fetch(endpoint, { next: { revalidate: 3600 } });
      if (!res.ok) return [];

      const data = await res.json();
      if (!data.features || !Array.isArray(data.features)) return [];

      return data.features.map((feature: any) => {
        const [lng, lat] = feature.center || [0, 0];
        return {
          placeName: feature.place_name,
          coordinates: { lng, lat },
          bbox: feature.bbox as [number, number, number, number] | undefined,
          context: {
            city: feature.context?.find((c: any) => c.id.startsWith("place"))?.text,
            state: feature.context?.find((c: any) => c.id.startsWith("region"))?.text,
            pincode: feature.context?.find((c: any) => c.id.startsWith("postcode"))?.text,
            country: feature.context?.find((c: any) => c.id.startsWith("country"))?.text,
          },
        };
      });
    } catch (err) {
      console.error("[MapboxProvider] Forward geocoding failed:", err);
      return [];
    }
  }

  async reverseGeocode(coords: MapCoordinates): Promise<GeocodingResult | null> {
    if (!this.token) return null;

    try {
      const endpoint = `${this.baseUrl}/${coords.lng},${coords.lat}.json?access_token=${this.token}&types=place,locality,neighborhood,address&limit=1`;
      const res = await fetch(endpoint, { next: { revalidate: 3600 } });
      if (!res.ok) return null;

      const data = await res.json();
      const feature = data.features?.[0];
      if (!feature) return null;

      return {
        placeName: feature.place_name,
        coordinates: coords,
        bbox: feature.bbox as [number, number, number, number] | undefined,
        context: {
          city: feature.context?.find((c: any) => c.id.startsWith("place"))?.text,
          state: feature.context?.find((c: any) => c.id.startsWith("region"))?.text,
          pincode: feature.context?.find((c: any) => c.id.startsWith("postcode"))?.text,
          country: feature.context?.find((c: any) => c.id.startsWith("country"))?.text,
        },
      };
    } catch (err) {
      console.error("[MapboxProvider] Reverse geocoding failed:", err);
      return null;
    }
  }

  formatBoundsForPostgis(bounds: MapViewportBounds): string {
    return `${bounds.minLng.toFixed(5)},${bounds.minLat.toFixed(5)},${bounds.maxLng.toFixed(5)},${bounds.maxLat.toFixed(5)}`;
  }
}

// Export singleton instance of current map provider
export const defaultMapProvider: IMapProvider = new MapboxProvider();
