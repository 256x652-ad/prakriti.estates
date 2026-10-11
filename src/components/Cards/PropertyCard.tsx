import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, Lock, MapPin, Sparkles } from "lucide-react";
import { SearchResultItem } from "@/modules/properties/services/PropertySearchService";

export interface PropertyCardProps {
  property: SearchResultItem;
  className?: string;
}

export function formatIndianPrice(amount: number): string {
  if (amount >= 10000000) {
    const cr = amount / 10000000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100000) {
    const l = amount / 100000;
    return `₹${l % 1 === 0 ? l.toFixed(0) : l.toFixed(2)} L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

const DEFAULT_PROPERTY_IMAGE =
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

export default function PropertyCard({ property, className = "" }: PropertyCardProps) {
  const destinationSlug = property.slug || property.id;
  const isLocked = property.lockStatus !== "AVAILABLE";
  const displayImage =
    property.images && property.images.length > 0 && property.images[0].startsWith("http")
      ? property.images[0]
      : DEFAULT_PROPERTY_IMAGE;

  const modeBadgeColor =
    property.type === "BUY"
      ? "bg-blue-50 text-blue-700 border-blue-200"
      : property.type === "RENT"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : "bg-purple-50 text-purple-700 border-purple-200";

  return (
    <Link
      href={`/property/${destinationSlug}`}
      prefetch={false}
      className={`group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all duration-200 hover:border-prakriti-500 focus:outline-none focus:ring-2 focus:ring-prakriti-500 ${
        isLocked ? "opacity-75" : ""
      } ${className}`}
    >
      {/* Property Thumbnail */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
        <Image
          src={displayImage}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 100vw, 450px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 items-center z-10">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border shadow-sm backdrop-blur-md ${modeBadgeColor}`}
          >
            {property.type}
          </span>
          {property.isPrakritiCertified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-2.5 py-1 rounded-full shadow-sm backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-600 fill-amber-500" />
              Prakriti Certified
            </span>
          )}
        </div>

        {/* Lock Overlay */}
        {isLocked && (
          <div className="absolute top-3 right-3 bg-red-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-md">
            <Lock className="w-3 h-3" />
            {property.lockStatus === "LOCKED" ? "Locked" : "Completed"}
          </div>
        )}
      </div>

      {/* Card Details */}
      <div className="p-4 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xl font-bold font-display text-emerald-800">
            {formatIndianPrice(property.price)}
          </p>
          {property.type === "RENT" && (
            <span className="text-xs text-muted-foreground font-medium">/ month</span>
          )}
          {property.type === "STAY" && (
            <span className="text-xs text-muted-foreground font-medium">/ night</span>
          )}
        </div>

        <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-emerald-700 transition">
          {property.title}
        </h3>

        {property.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {property.description}
          </p>
        )}

        <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border">
          <span className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-prakriti-600" />
            {property.lat.toFixed(3)}, {property.lng.toFixed(3)}
          </span>
          <span className="font-medium text-prakriti-700 group-hover:underline">
            View Details &rarr;
          </span>
        </div>
      </div>
    </Link>
  );
}
