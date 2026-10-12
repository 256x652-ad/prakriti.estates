"use client";

import React, { useRef } from "react";
import HomepagePropertyCard, { PropertyCardData } from "./HomepagePropertyCard";
import { ChevronLeft, ChevronRight, Award, MapPin } from "lucide-react";

export default function InventorySection({
  featuredProperties,
  certifiedProperties,
  cityName = "Gorakhpur",
}: {
  featuredProperties: PropertyCardData[];
  certifiedProperties: PropertyCardData[];
  cityName?: string;
}) {
  const localRef = useRef<HTMLDivElement>(null);
  const goldRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: "left" | "right") => {
    if (ref.current) {
      const offset = direction === "left" ? -380 : 380;
      ref.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="py-12 space-y-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      {/* 1. PRAKRITI CERTIFIED STREAM (GOLD PIN HOMES) */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-amber-200/70 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-amber-700 text-xs font-black uppercase tracking-widest mb-1">
              <Award className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
              The Gold Pin Standard
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Prakriti Certified Homes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              100% Structural, Soil & Legal Due Diligence Audited by Registered Engineers.
            </p>
          </div>

          {/* Desktop Nav Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll(goldRef, "left")}
              aria-label="Scroll left"
              className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition cursor-pointer text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll(goldRef, "right")}
              aria-label="Scroll right"
              className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition cursor-pointer text-slate-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scroll Container */}
        <div
          ref={goldRef}
          className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {certifiedProperties.length === 0 ? (
            <div className="py-8 text-sm text-slate-400">No certified listings currently in this view.</div>
          ) : (
            certifiedProperties.map((prop) => (
              <div key={prop.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start flex-shrink-0">
                <HomepagePropertyCard property={{ ...prop, isPrakritiCertified: true }} />
              </div>
            ))
          )}
        </div>
      </section>

      {/* 2. LOCALIZED FEATURED PROPERTIES STREAM */}
      <section className="space-y-6">
        <div className="flex items-end justify-between border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-1 text-emerald-700 text-xs font-black uppercase tracking-widest mb-1">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Local Discovery Hub
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Featured Properties in {cityName}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Handpicked verified inventory ready for immediate 72-hour escrow reservation.
            </p>
          </div>

          {/* Desktop Nav Controls */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => scroll(localRef, "left")}
              aria-label="Scroll left"
              className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition cursor-pointer text-slate-600"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll(localRef, "right")}
              aria-label="Scroll right"
              className="p-2 rounded-full border border-slate-200 hover:bg-slate-100 transition cursor-pointer text-slate-600"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scroll Container */}
        <div
          ref={localRef}
          className="flex gap-6 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none]"
        >
          {featuredProperties.length === 0 ? (
            <div className="py-8 text-sm text-slate-400">No properties found in this location.</div>
          ) : (
            featuredProperties.map((prop) => (
              <div key={prop.id} className="min-w-[280px] sm:min-w-[340px] max-w-[340px] snap-start flex-shrink-0">
                <HomepagePropertyCard property={prop} />
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
