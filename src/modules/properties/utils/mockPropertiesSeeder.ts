import { PropertyType, LifecycleStatus, LockStatus } from "@prisma/client";
import { SearchResultItem } from "@/modules/properties/services/PropertySearchService";

export interface MockPropertyTemplate {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  type: PropertyType;
  lifecycleStatus: LifecycleStatus;
  lockStatus: LockStatus;
  isPrakritiCertified: boolean;
  images: string[];
  lng: number;
  lat: number;
}

const DELHI_ANCHOR = { lng: 77.209, lat: 28.6139 };
const GORAKHPUR_ANCHOR = { lng: 83.3732, lat: 26.7606 };

const CURATED_IMAGES = [
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800&q=80",
];

const LOCALITY_NAMES = [
  "Vasant Vihar",
  "Defence Colony",
  "Greater Kailash",
  "Golf Course Road",
  "Cyber City",
  "Sector 62 Noida",
  "Taramandal",
  "Civil Lines",
  "Golghar",
  "Medical Road",
  "Rustampur",
  "Shahpur",
  "Asuran Chowk",
  "Indirapuram",
  "Dwarka Expressway",
];

const PROPERTY_TITLES = [
  "Eco-Luxury Villa with Solar Grid",
  "Vaastu-Compliant 3 BHK High-Rise Apartment",
  "Architectural Green Estate with Rainwater Harvesting",
  "Biophilic Modern Penthouse with Private Terrace",
  "Certified Net-Zero Courtyard Home",
  "Serene Garden Duplex in Prime Enclave",
  "Lakeside Boutique Farmhouse Stay",
  "Heritage Haveli Restoration with Modern Amenities",
  "Smart Integrated Sustainable Residency",
  "Panoramic Sky Villa with Thermal Insulation",
];

/**
 * Generates 50+ geographically dispersed mock properties strictly conforming
 * to the Prisma Property domain definitions and SearchResultItem interface.
 */
export function generateMockProperties(count = 55): MockPropertyTemplate[] {
  const properties: MockPropertyTemplate[] = [];

  for (let i = 1; i <= count; i++) {
    const isDelhi = i % 2 === 0;
    const anchor = isDelhi ? DELHI_ANCHOR : GORAKHPUR_ANCHOR;

    // Disperse within ~0.15 degrees (~15km radius)
    const lngOffset = (Math.sin(i * 1.7) * 0.12) + (Math.cos(i * 0.5) * 0.04);
    const latOffset = (Math.cos(i * 1.3) * 0.12) + (Math.sin(i * 0.8) * 0.04);

    const lng = Number((anchor.lng + lngOffset).toFixed(6));
    const lat = Number((anchor.lat + latOffset).toFixed(6));

    const type: PropertyType =
      i % 3 === 0 ? "BUY" : i % 3 === 1 ? "RENT" : "STAY";

    let price: number;
    if (type === "BUY") {
      // 45 Lakhs to 12.5 Crores
      price = 4500000 + (i * 1800000) % 120000000;
    } else if (type === "RENT") {
      // 18,000 to 1,80,000 / month
      price = 18000 + (i * 7500) % 165000;
    } else {
      // 2,500 to 25,000 / night
      price = 2500 + (i * 950) % 22500;
    }

    const locality = LOCALITY_NAMES[i % LOCALITY_NAMES.length];
    const titleTemplate = PROPERTY_TITLES[i % PROPERTY_TITLES.length];
    const title = `${titleTemplate} in ${locality}`;
    const slug = `prakriti-${locality.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${i}`;

    const isCertified = i % 2 === 0;
    const lockStatus: LockStatus = i % 15 === 0 ? "LOCKED" : "AVAILABLE";

    const imageIndex = i % CURATED_IMAGES.length;
    const images = [
      CURATED_IMAGES[imageIndex],
      CURATED_IMAGES[(imageIndex + 1) % CURATED_IMAGES.length],
    ];

    properties.push({
      id: `mock-prop-${i.toString().padStart(3, "0")}`,
      slug,
      title,
      description: `A masterfully designed ${type.toLowerCase()} property situated in the prestigious ${locality}. Features comprehensive sustainability audits, natural ventilation, and superior connectivity.`,
      price,
      type,
      lifecycleStatus: "PUBLISHED",
      lockStatus,
      isPrakritiCertified: isCertified,
      images,
      lng,
      lat,
    });
  }

  return properties;
}

/**
 * Converts generated mock properties to SearchResultItem format.
 */
export function getMockSearchResults(count = 55): SearchResultItem[] {
  return generateMockProperties(count).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: p.price,
    type: p.type,
    lockStatus: p.lockStatus,
    isPrakritiCertified: p.isPrakritiCertified,
    images: p.images,
    lng: p.lng,
    lat: p.lat,
  }));
}
