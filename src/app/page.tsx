import React from "react";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { AppShell } from "@/components/Layout/AppShell";
import HeroSection from "@/components/Home/HeroSection";
import {
  detectUserCity,
  getFeaturedProperties,
  getCertifiedProperties,
} from "@/modules/discovery/services/GeolocationService";
import {
  LazyInventoryCarousels,
  LazyConsultantTrustBlock,
  LazyMarketplaceFooter,
} from "@/components/Home/DynamicSections";

export const metadata: Metadata = {
  title: "Prakriti Estates — India's Certified Real Estate & Engineering Marketplace",
  description:
    "Explore certified eco-friendly villas, verified plots, and long-term rental estates backed by IIT-tier structural audits and 72-hour escrow locks.",
  openGraph: {
    title: "Prakriti Estates — Buy, Rent & Stay Certified",
    description:
      "Map-centric discovery with cryptographic escrow locks & IIT-grade engineering due diligence.",
    url: "https://prakritiestates.com",
    siteName: "Prakriti Estates",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
        width: 1200,
        height: 630,
        alt: "Prakriti Estates Certified Living",
      },
    ],
  },
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // 1. Geolocated user city detection (fallback strictly to Gorakhpur, UP)
  const location = await detectUserCity();

  // 2. Hydrate cached inventory streams in parallel (10-minute ISR)
  const [featuredProperties, certifiedProperties] = await Promise.all([
    getFeaturedProperties(location.city),
    getCertifiedProperties(),
  ]);

  // 3. Format AppShell User
  const appShellUser = session?.user
    ? {
        id: (session.user as any).id || "user",
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        phoneNumber: (session.user as any).phoneNumber || "",
        roles: (session.user as any).roles || ["USER"],
      }
    : null;

  // 4. Local SEO Structured Data (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    name: "Prakriti Estates",
    image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c",
    url: "https://prakritiestates.com",
    telephone: "+91-9999999999",
    priceRange: "₹₹₹₹",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Park Road",
      addressLocality: location.city,
      addressRegion: location.region,
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "26.7606",
      longitude: "83.3732",
    },
    areaServed: [location.city, "Gorakhpur", "Lucknow", "Gurgaon", "Noida", "Bengaluru"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AppShell user={appShellUser}>
        <main className="min-h-screen bg-slate-50 flex flex-col">
          {/* Synchronously loaded Hero with Unified Search */}
          <HeroSection defaultLocation={location.city} />

          {/* Lazily loaded Inventory Carousels */}
          <LazyInventoryCarousels
            cityName={location.city}
            featuredProperties={featuredProperties}
            certifiedProperties={certifiedProperties}
          />

          {/* Lazily loaded Engineering Trust Block */}
          <LazyConsultantTrustBlock />

          {/* Lazily loaded Platform Guarantees & Footer */}
          <LazyMarketplaceFooter />
        </main>
      </AppShell>
    </>
  );
}
