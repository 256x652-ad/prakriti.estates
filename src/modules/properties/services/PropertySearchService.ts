import { PropertyRepository } from "../infrastructure/PropertyRepository";
import { BoundingBoxInput, RadiusSearchInput, PropertyMarkerDTO } from "../core/schemas";

export class PropertySearchService {
  private repository: PropertyRepository;

  constructor() {
    this.repository = new PropertyRepository();
  }

  async getPropertiesInViewport(bounds: BoundingBoxInput): Promise<PropertyMarkerDTO[]> {
    return this.repository.findByBoundingBox(bounds);
  }

  async getPropertiesNearby(params: RadiusSearchInput): Promise<PropertyMarkerDTO[]> {
    return this.repository.findByRadius(params);
  }
}
