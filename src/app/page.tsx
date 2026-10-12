import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/infrastructure/auth/authOptions";
import { prisma } from "@/infrastructure/database/prisma";
import { AppShell } from "@/components/Layout/AppShell";
import HeroSection from "@/components/Home/HeroSection";
import InventorySection from "@/components/Home/InventorySection";
import ConsultantTrustBlock from "@/components/Home/ConsultantTrustBlock";
import MarketplaceFooter from "@/components/Home/MarketplaceFooter";
import { PropertyCardData } from "@/components/Home/HomepagePropertyCard";

export const metadata = {
  title: "Prakriti Estates — India's Certified Real Estate & Engineering Marketplace",
  description:
    "Explore certified eco-friendly villas, verified plots, and long-term rental estates backed by IIT-tier structural audits and 72-hour escrow locks.",
};

const DEFAULT_IMAGES: Record<string, string[]> = {
  STAY: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"],
  BUY: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80"],
  RENT: ["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"],
};

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  // Fetch published properties from the database
  let dbProperties: any[] = [];
  try {
    dbProperties = await prisma.property.findMany({
      where: {
        lifecycleStatus: "PUBLISHED",
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
  } catch (error) {
    console.error("Failed to fetch homepage properties:", error);
  }

  // Format properties into Card Data
  const formattedProperties: PropertyCardData[] = dbProperties.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    price: Number(p.price) || 0,
    city: p.type === "STAY" ? "Gurgaon" : p.type === "BUY" ? "Noida" : "South Delhi",
    type: p.type,
    mediaUrls:
      p.images && p.images.length > 0
        ? p.images
        : DEFAULT_IMAGES[p.type] || DEFAULT_IMAGES.BUY,
    isPrakritiCertified: p.isPrakritiCertified ?? false,
  }));

  const certifiedList = formattedProperties.filter((p) => p.isPrakritiCertified);
  const featuredList = formattedProperties;

  // Format AppShell User
  const appShellUser = session?.user
    ? {
        id: (session.user as any).id || "user",
        name: session.user.name || undefined,
        email: session.user.email || undefined,
        phoneNumber: (session.user as any).phoneNumber || "",
        roles: (session.user as any).roles || ["USER"],
      }
    : null;

  return (
    <AppShell user={appShellUser}>
      <main className="min-h-screen bg-slate-50 flex flex-col">
        {/* 1. Spatial Discovery Hero with Multi-Tab Search */}
        <HeroSection defaultLocation="Gorakhpur" />

        {/* 2. Real-time Inventory Carousels */}
        <InventorySection
          cityName="Gorakhpur & NCR Hubs"
          featuredProperties={featuredList}
          certifiedProperties={certifiedList}
        />

        {/* 3. Engineering Authority Trust Block */}
        <ConsultantTrustBlock />

        {/* 4. Platform Guarantees & Marketplace Footer */}
        <MarketplaceFooter />
      </main>
    </AppShell>
  );
}
