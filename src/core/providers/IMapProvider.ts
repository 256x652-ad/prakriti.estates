export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MapFeature {
  id: string;
  geometry: Coordinates;
  properties: Record<string, any>;
}

export interface IMapProvider {
  geocode(address: string): Promise<Coordinates>;
  reverseGeocode(coords: Coordinates): Promise<string>;
  getStaticMapUrl(coords: Coordinates, zoom?: number): string;
  calculateDistance(origin: Coordinates, destination: Coordinates): Promise<number>;
}
