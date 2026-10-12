"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MapPin, Sparkles } from "lucide-react";

type SearchTab = "BUY" | "RENT" | "STAY";

export default function HeroSection({
  defaultLocation = "Gorakhpur",
}: {
  defaultLocation?: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>("BUY");
  const [query, setQuery] = useState(defaultLocation);
  const [propertyType, setPropertyType] = useState("ALL");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("mode", activeTab);
    if (query.trim()) params.set("query", query.trim());
    if (propertyType !== "ALL") params.set("type", propertyType);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center pt-16 pb-16 px-4 sm:px-6 lg:px-8 bg-slate-950 overflow-hidden">
      {/* Subtle Spatial Map Grid Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Ambient Gradient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[300px] bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-5xl w-full mx-auto text-center space-y-8">
        {/* Geo-Aware Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Spatial Real Estate Discovery • Pre-Audited Hubs</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">
          Don’t Just Buy a House. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-amber-300">
            Own a Certified, Verified Home.
          </span>
        </h1>

        <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto font-medium">
          PostGIS geospatial resolution, IIT-audited structural integrity, and tamper-proof 72-hour escrow locks.
        </p>

        {/* Glassmorphic Unified Search Console */}
        <div className="w-full max-w-3xl mx-auto bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-black/60">
          {/* Multi-Tab Switcher */}
          <div className="flex items-center justify-center gap-2 mb-4 border-b border-slate-800/80 pb-3">
            {(["BUY", "RENT", "STAY"] as SearchTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                {tab === "BUY" && "Buy Property"}
                {tab === "RENT" && "Rent Long-Term"}
                {tab === "STAY" && "Eco Short-Stay"}
              </button>
            ))}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Location Input */}
            <div className="sm:col-span-6 text-left">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                Target Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g., Gorakhpur, Lucknow, Gurgaon..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            {/* Property Category */}
            <div className="sm:col-span-3 text-left">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 ml-1">
                Category
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950/70 border border-slate-700/80 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="ALL">All Units</option>
                <option value="VILLA">Eco-Villa</option>
                <option value="APARTMENT">Apartment</option>
                <option value="FARMHOUSE">Farmhouse</option>
                <option value="PLOT">Verified Plot</option>
              </select>
            </div>

            {/* CTA Button */}
            <div className="sm:col-span-3 pt-2 sm:pt-4">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow-lg shadow-emerald-700/30 transition flex items-center justify-center gap-2 text-sm cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Search Map</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
