"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, SlidersHorizontal, X } from "lucide-react";

export default function SearchLayoutShell({
  children,
  mapComponent
}: {
  children: React.ReactNode;
  mapComponent: React.ReactNode;
}) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const params = new URLSearchParams(searchParams.toString());
      if (searchQuery) {
        params.set("q", searchQuery);
      } else {
        params.delete("q");
      }
      router.push(`/search?${params.toString()}`);
    }
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-light">
      {/* 1. Global Fixed Header (Desktop & Mobile) */}
      <header className="h-16 flex-none border-b bg-surface flex items-center justify-between px-4 lg:px-8 z-50 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-prakriti-900 rounded-md flex items-center justify-center">
            <span className="text-white font-bold">P</span>
          </div>
          <span className="text-xl font-display font-bold text-prakriti-900 tracking-tight hidden sm:block">
            Prakriti Estates
          </span>
        </div>

        {/* Floating Search Bar (Mobile centric, but visible on desktop) */}
        <div className="flex-1 max-w-2xl mx-4 relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="Search by locality, project, or landmark (Press Enter)..."
            className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-300 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-prakriti-500 focus:border-transparent outline-none transition-all"
          />
          <Search className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        <button className="p-2 border rounded-full hover:bg-gray-100 transition lg:hidden">
          <SlidersHorizontal className="w-5 h-5 text-gray-600" />
        </button>
      </header>

      {/* 2. Main Layout Shell */}
      <main className="flex-1 flex relative overflow-hidden">
        
        {/* DESKTOP: Sidebar for Property Cards */}
        <section className="hidden lg:flex w-[450px] flex-col bg-surface border-r z-10 shadow-premium relative">
          <div className="p-4 border-b flex justify-between items-center bg-gray-50">
            <h2 className="font-semibold text-gray-800">Properties in Viewport</h2>
            <button className="flex items-center gap-2 text-sm text-prakriti-600 font-medium hover:text-prakriti-800">
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {children} {/* This is where the server-rendered cards go */}
          </div>
        </section>

        {/* MAP CONTAINER: Takes remaining space on desktop, full space on mobile */}
        <section className="flex-1 relative bg-gray-200">
          {mapComponent}

          {/* MOBILE ONLY: Floating button to trigger the bottom sheet */}
          <button 
            onClick={() => setIsMobileSheetOpen(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:hidden bg-prakriti-900 text-white px-6 py-3 rounded-full font-semibold shadow-float flex items-center gap-2 z-20"
          >
            <MapPin className="w-5 h-5" /> View List
          </button>
        </section>

        {/* 3. MOBILE: Swipeable Bottom Sheet */}
        <AnimatePresence>
          {isMobileSheetOpen && (
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden absolute bottom-0 left-0 right-0 h-[85vh] bg-surface rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.15)] z-50 flex flex-col"
            >
              <div className="flex justify-center p-3 cursor-grab active:cursor-grabbing" onClick={() => setIsMobileSheetOpen(false)}>
                <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
              </div>
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold text-lg text-gray-800">Listings</h2>
                <button onClick={() => setIsMobileSheetOpen(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}
