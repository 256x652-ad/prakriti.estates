import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/infrastructure/database/prisma";
import { buildRealEstateListingSchema, JsonLd } from "@/lib/seo/structuredData";

interface PropertyPageProps {
  params: Promise<{ slug: string }>;
}

// ISR configuration: Revalidate cached pages every 60 seconds
export const revalidate = 60;

// Enable dynamic params so newly created properties can be rendered on-demand & cached
export const dynamicParams = true;

/**
 * Pre-render top active properties at build time for instant TTFB
 */
export async function generateStaticParams() {
  try {
    const properties = await prisma.property.findMany({
      where: {
        lifecycleStatus: "PUBLISHED",
      },
      select: {
        slug: true,
        id: true,
      },
      take: 50,
      orderBy: {
        createdAt: "desc",
      },
    });

    return properties.map((prop) => ({
      slug: prop.slug || prop.id,
    }));
  } catch (error) {
    console.error("generateStaticParams error:", error);
    return [];
  }
}

/**
 * Helper to fetch property by slug or id with relations
 */
async function getProperty(slugOrId: string) {
  return await prisma.property.findFirst({
    where: {
      OR: [{ slug: slugOrId }, { id: slugOrId }],
    },
    include: {
      buyDetails: true,
      rentDetails: true,
      stayDetails: true,
      owner: {
        select: {
          firstName: true,
          lastName: true,
          phoneNumber: true,
        },
      },
    },
  });
}

/**
 * Dynamic Metadata Generator for SEO and Social Graph
 */
export async function generateMetadata(
  { params }: PropertyPageProps
): Promise<Metadata> {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.slug);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://prakritiestates.com";

  if (!property) {
    return {
      title: "Property Not Found | Prakriti Estates",
      description: "The requested property listing could not be found or has been removed.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  // Format price
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(property.price));

  // Dynamic state badge
  const statusLabel =
    property.lockStatus === "LOCKED"
      ? " [Under Token Lock]"
      : property.lockStatus === "COMPLETED"
      ? " [Sold / Off Market]"
      : "";

  const certificationBadge = property.isPrakritiCertified ? "🌿 Prakriti Certified | " : "";
  const pageTitle = `${certificationBadge}${property.title} - ${formattedPrice}${statusLabel}`;
  const pageDescription = `${property.type} listing in Prakriti Estates. ${property.description.slice(0, 160)}... Escrow-protected transaction, Vedic architectural review, and structural inspection.`;
  const canonicalUrl = `${baseUrl}/property/${property.slug || property.id}`;

  const primaryImage =
    property.images && property.images.length > 0
      ? property.images[0]
      : `${baseUrl}/images/property-placeholder.jpg`;

  const isPublished = property.lifecycleStatus === "PUBLISHED";

  return {
    title: pageTitle,
    description: pageDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: pageTitle,
      description: pageDescription,
      url: canonicalUrl,
      siteName: "Prakriti Estates",
      images: [
        {
          url: primaryImage,
          width: 1200,
          height: 630,
          alt: property.title,
        },
      ],
      type: "website",
      locale: "en_IN",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: pageDescription,
      images: [primaryImage],
      creator: "@PrakritiEstates",
    },
    robots: {
      // Do not index drafts or archived listings
      index: isPublished,
      follow: isPublished,
      googleBot: {
        index: isPublished,
        follow: isPublished,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  };
}

/**
 * Property Details Server Component
 */
export default async function PropertyPage({ params }: PropertyPageProps) {
  const resolvedParams = await params;
  const property = await getProperty(resolvedParams.slug);

  if (!property) {
    notFound();
  }

  // Construct structured data
  const jsonLdSchema = buildRealEstateListingSchema({
    id: property.id,
    slug: property.slug || property.id,
    title: property.title,
    description: property.description,
    price: Number(property.price),
    currency: "INR",
    images: property.images,
    type: property.type,
    lockStatus: property.lockStatus,
    isPrakritiCertified: property.isPrakritiCertified,
    datePosted: property.createdAt,
  });

  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(property.price));

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      {/* Schema.org Structured Data Injection */}
      <JsonLd schema={jsonLdSchema} />

      <article className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Hero / Cover */}
        <div className="relative h-96 w-full bg-slate-900 flex items-center justify-center text-slate-300">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-center p-6">
              <span className="text-6xl">🏡</span>
              <p className="mt-2 text-sm text-slate-400">Prakriti Verified Listing Imagery</p>
            </div>
          )}

          {property.isPrakritiCertified && (
            <div className="absolute top-4 left-4 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
              <span>🌿</span>
              <span>Prakriti Certified Structural Audit</span>
            </div>
          )}

          <div className="absolute top-4 right-4">
            <span
              className={`text-xs font-semibold px-3 py-1.5 rounded-full uppercase tracking-wider ${
                property.lockStatus === "AVAILABLE"
                  ? "bg-green-100 text-green-800"
                  : property.lockStatus === "LOCKED"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {property.lockStatus}
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-8 md:p-12 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 border-slate-100">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                {property.type}
              </span>
              <h1 className="mt-2 text-3xl md:text-4xl font-extrabold text-slate-900">
                {property.title}
              </h1>
            </div>
            <div className="text-left md:text-right">
              <span className="text-sm text-slate-500 block">Listed Price</span>
              <span className="text-3xl font-black text-slate-900">{formattedPrice}</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Description & Blueprint Overview</h2>
            <p className="text-slate-700 leading-relaxed whitespace-pre-line">
              {property.description}
            </p>
          </div>

          {/* Sub-Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-100">
            {property.buyDetails && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase font-bold text-slate-500">Plot Area</span>
                <p className="text-lg font-bold text-slate-800">{property.buyDetails.plotArea.toString()} Sq Ft</p>
                <span className="text-xs text-slate-500">
                  EMI Available: {property.buyDetails.emiAvailable ? "Yes" : "No"}
                </span>
              </div>
            )}

            {property.rentDetails && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase font-bold text-slate-500">Security Deposit</span>
                <p className="text-lg font-bold text-slate-800">₹{property.rentDetails.securityDeposit.toString()}</p>
                <span className="text-xs text-slate-500">
                  11-Month Lease: {property.rentDetails.isMin11Months ? "Yes" : "Flexible"}
                </span>
              </div>
            )}

            {property.stayDetails && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs uppercase font-bold text-slate-500">Daily Nightly Rate</span>
                <p className="text-lg font-bold text-slate-800">₹{property.stayDetails.dailyRate.toString()}/night</p>
                <span className="text-xs text-slate-500">
                  Policy: {property.stayDetails.cancellationRule}
                </span>
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-xs uppercase font-bold text-slate-500">Trust & Verification</span>
              <p className="text-sm font-semibold text-emerald-800 mt-1">
                {property.isPrakritiCertified ? "Verified Engineering Audit on File" : "Standard Listing"}
              </p>
              <span className="text-xs text-slate-500">Smart Escrow Token Locking Enabled</span>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
