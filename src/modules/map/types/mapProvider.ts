/**
 * MAP PROVIDER ABSTRACTION INTERFACES
 * 
 * Decouples the application layer from Mapbox.
 * Allows seamless zero-downtime swapping or hybrid usage with:
 * - Mapbox GL
 * - Google Maps
 * - MapLibre GL
 * - OpenStreetMap / Leaflet
 * 
 * Crucial Invariant: The Map Provider is purely a presentation layer.
 * PostgreSQL + PostGIS remains the sole, immutable source of truth.
 */

export interface MapCoordinates {
  lng: number;
  lat: number;
}

export interface MapViewportBounds {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface MapViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  bounds?: MapViewportBounds;
}

export interface GeocodingResult {
  placeName: string;
  coordinates: MapCoordinates;
  bbox?: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
  context?: {
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
  };
}

export interface IMapProvider {
  readonly providerName: "mapbox" | "google" | "maplibre" | "osm";

  /**
   * Forward Geocoding: Location text query -> Geo coordinates
   */
  geocode(query: string): Promise<GeocodingResult[]>;

  /**
   * Reverse Geocoding: Geo coordinates -> Physical address context
   */
  reverseGeocode(coords: MapCoordinates): Promise<GeocodingResult | null>;

  /**
   * Helper to format bounding box parameters for PostGIS ST_MakeEnvelope
   */
  formatBoundsForPostgis(bounds: MapViewportBounds): string;
}
