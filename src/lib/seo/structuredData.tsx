import React from "react";

export interface RealEstateSchemaProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number | string;
  currency?: string;
  images?: string[];
  type: string;
  lockStatus: string;
  isPrakritiCertified?: boolean;
  datePosted?: string | Date;
  address?: {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string;
  };
  geo?: {
    latitude?: number;
    longitude?: number;
  };
}

export function buildRealEstateListingSchema(data: RealEstateSchemaProps, baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prakritiestates.com") {
  const propertyUrl = `${baseUrl}/property/${data.slug || data.id}`;
  
  // Availability mapping
  let availability = "https://schema.org/InStock";
  if (data.lockStatus === "LOCKED") {
    availability = "https://schema.org/Reserved";
  } else if (data.lockStatus === "SOLD") {
    availability = "https://schema.org/SoldOut";
  }

  const images = data.images && data.images.length > 0
    ? data.images
    : [`${baseUrl}/og-default.jpg`];

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    "@id": `${propertyUrl}#listing`,
    name: data.title,
    description: data.description,
    url: propertyUrl,
    image: images,
    datePosted: data.datePosted ? new Date(data.datePosted).toISOString() : new Date().toISOString(),
    offers: {
      "@type": "Offer",
      price: data.price.toString(),
      priceCurrency: data.currency || "INR",
      availability: availability,
      validFrom: data.datePosted ? new Date(data.datePosted).toISOString() : new Date().toISOString(),
      url: propertyUrl,
    },
    about: {
      "@type": "SingleFamilyResidence",
      name: data.title,
      description: data.description,
      additionalProperty: [
        {
          "@type": "PropertyValue",
          name: "Prakriti Certified",
          value: data.isPrakritiCertified ? "Yes" : "No",
        },
        {
          "@type": "PropertyValue",
          name: "Listing Type",
          value: data.type,
        },
      ],
      ...(data.address && {
        address: {
          "@type": "PostalAddress",
          streetAddress: data.address.streetAddress || "Plot/Sector Area",
          addressLocality: data.address.addressLocality || "Delhi NCR",
          addressRegion: data.address.addressRegion || "UP/Haryana",
          postalCode: data.address.postalCode || "201301",
          addressCountry: data.address.addressCountry || "IN",
        },
      }),
      ...(data.geo && data.geo.latitude && data.geo.longitude && {
        geo: {
          "@type": "GeoCoordinates",
          latitude: data.geo.latitude,
          longitude: data.geo.longitude,
        },
      }),
    },
  };
}

export function buildProfessionalServiceSchema(baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prakritiestates.com") {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${baseUrl}/consultants#service`,
    name: "Prakriti Consultants",
    alternateName: "Prakriti Estates & Engineering Consultancy",
    url: `${baseUrl}/consultants`,
    logo: `${baseUrl}/logo.png`,
    image: `${baseUrl}/images/consultants-hero.jpg`,
    description: "Expert structural engineering audits, Vedic Vastu compliance, and modern architectural design services.",
    priceRange: "$$",
    currenciesAccepted: "INR",
    paymentAccepted: "Cash, Credit Card, Bank Transfer, UPI",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Cyber City, DLF Phase 2",
      addressLocality: "Gurugram",
      addressRegion: "Haryana",
      postalCode: "122002",
      addressCountry: "IN",
    },
    founder: {
      "@type": "Person",
      name: "Er. Aditya Jaiswal",
      jobTitle: "Chief Structural Engineer",
      description: "Graduate of HBTU Kanpur (B.Tech) and IIT Delhi (M.Tech), specializing in seismic resistance and structural integrity.",
      alumniOf: [
        {
          "@type": "EducationalOrganization",
          name: "HBTU Kanpur",
        },
        {
          "@type": "EducationalOrganization",
          name: "IIT Delhi",
        },
      ],
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Engineering & Architectural Services",
      itemListElement: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Structural Integrity Audit",
            description: "Full non-destructive testing, foundation analysis, and municipal certification.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Vedic Vastu Compliance",
            description: "Harmonizing floorplans with natural directional energies and microclimate ventilation.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "Service",
            name: "Full Architectural Blueprints",
            description: "3D BIM rendering, structural drafting, and local municipal bye-law approval assistance.",
          },
        },
      ],
    },
  };
}

export function JsonLd({ schema }: { schema: Record<string, any> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema, null, 2),
      }}
    />
  );
}
