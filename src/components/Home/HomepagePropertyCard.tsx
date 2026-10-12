"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, MapPin } from "lucide-react";

export interface PropertyCardData {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  price: number | string;
  city?: string | null;
  type?: string | null;
  mediaUrls: string[];
  isPrakritiCertified?: boolean;
}

export default function HomepagePropertyCard({
  property,
}: {
  property: PropertyCardData;
}) {
  const isGold = !!property.isPrakritiCertified;
  const primaryImage =
    property.mediaUrls?.[0] ||
    "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80";

  const numPrice = typeof property.price === "string" ? parseFloat(property.price) : Number(property.price);

  return (
    <div
      className={`relative flex flex-col justify-between rounded-3xl overflow-hidden bg-white transition-all duration-300 group ${
        isGold
          ? "border-2 border-amber-400 ring-2 ring-amber-400/30 shadow-xl shadow-amber-500/15 hover:shadow-2xl hover:shadow-amber-500/25"
          : "border border-slate-200/80 shadow-sm hover:shadow-xl hover:border-slate-300"
      }`}
    >
      {/* Media Window */}
      <div className="relative h-56 w-full overflow-hidden bg-slate-100">
        <Image
          src={primaryImage}
          alt={property.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 85vw, 360px"
        />

        {/* Gold Pin Badge */}
        {isGold && (
          <div className="absolute top-3 left-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5 border border-yellow-200">
            <ShieldCheck className="w-3.5 h-3.5 fill-slate-950" />
            <span>Prakriti Certified</span>
          </div>
        )}

        {/* Price Tag Overlay */}
        <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md text-white text-xs font-black px-3 py-1 rounded-xl">
          ₹{numPrice.toLocaleString("en-IN")}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-2 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>{property.city || "India"}</span> • <span>{property.type || "ESTATE"}</span>
          </div>
          <h3 className="font-extrabold text-slate-900 text-base line-clamp-1 group-hover:text-emerald-700 transition">
            {property.title}
          </h3>
          {property.description && (
            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
              {property.description}
            </p>
          )}
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">
            {isGold ? "Engineering Audited" : "Verified Listing"}
          </span>
          <Link
            href={`/property/${property.slug || property.id}`}
            className={`text-xs font-black hover:underline ${
              isGold ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
