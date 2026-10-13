"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  SlidersHorizontal,
  X,
  Award,
  Check,
  ChevronDown,
  User,
  LogOut,
  ShieldAlert,
} from "lucide-react";

export default function SearchLayoutShell({
  children,
  mapComponent,
}: {
  children: React.ReactNode;
  mapComponent: React.ReactNode;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();

  // URL state readers
  const currentQuery = searchParams.get("q") || searchParams.get("query") || "";
  const currentType = (searchParams.get("type") || searchParams.get("mode") || "ALL").toUpperCase();
  const isCertifiedOnly =
    searchParams.get("isPrakritiCertified") === "true" ||
    searchParams.get("certifiedOnly") === "true";
  const currentMinPrice = searchParams.get("minPrice") || "";
  const currentMaxPrice = searchParams.get("maxPrice") || "";
  const hasBounds = Boolean(searchParams.get("bounds"));

  // Local state
  const [searchQuery, setSearchQuery] = useState(currentQuery);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Keep search input synced with URL state
  useEffect(() => {
    setSearchQuery(currentQuery);
  }, [currentQuery]);

  // Helper to push URL param updates smoothly
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    startTransition(() => {
      router.push(`/search?${params.toString()}`);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: searchQuery.trim() || null, query: null, bounds: null });
  };

  const setTypeFilter = (type: string) => {
    if (type === "ALL") {
      updateParams({ type: null, mode: null, bounds: null });
    } else {
      updateParams({ type, mode: null, bounds: null });
    }
  };

  const toggleCertifiedFilter = () => {
    updateParams({
      isPrakritiCertified: isCertifiedOnly ? null : "true",
      certifiedOnly: null,
      bounds: null,
    });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-50 font-sans">
      {/* 1. Global Navigation Bar */}
      <header className="h-16 flex-none border-b border-slate-200/90 bg-white/95 backdrop-blur-md flex items-center justify-between px-4 lg:px-8 z-50 shadow-xs">
        {/* Brand Logo & Back to Home */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xl border border-emerald-200 shadow-xs group-hover:scale-105 transition">
              🌿
            </span>
            <div className="hidden sm:flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                Prakriti Estates
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                Certified Marketplace
              </span>
            </div>
          </Link>

          {/* Quick Nav Links */}
          <nav className="hidden md:flex items-center gap-2 ml-4 pl-4 border-l border-slate-200 text-xs font-bold text-slate-600">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg hover:text-emerald-700 hover:bg-slate-50 transition"
            >
              Home
            </Link>
            <Link
              href="/consultants"
              className="px-3 py-1.5 rounded-lg hover:text-emerald-700 hover:bg-slate-50 transition"
            >
              Engineering Audits
            </Link>
            <Link
              href="/dashboard"
              className="px-3 py-1.5 rounded-lg hover:text-emerald-700 hover:bg-slate-50 transition"
            >
              My Dashboard
            </Link>
          </nav>
        </div>

        {/* Central Search Bar with Form submission */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex-1 max-w-xl mx-3 sm:mx-6 relative"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search city, locality, project (e.g. Gurgaon, Noida)..."
            className="w-full h-10 pl-10 pr-20 rounded-full border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all shadow-xs"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 h-7 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold transition flex items-center justify-center cursor-pointer"
          >
            Find
          </button>
        </form>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2">
          {session?.user ? (
            <div className="flex items-center gap-2">
              {(session.user as any)?.roles?.some((r: string) => ["ADMIN", "SUPER_ADMIN"].includes(r)) && (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex px-3 py-1 text-xs font-bold text-purple-800 bg-purple-50 hover:bg-purple-100 rounded-full border border-purple-200 transition"
                >
                  Admin Console
                </Link>
              )}
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-full transition"
              >
                <User className="w-3.5 h-3.5 text-slate-600" />
                <span>{session.user.name?.split(" ")[0] || "Dashboard"}</span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/search" })}
                className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full border border-red-200 transition cursor-pointer flex items-center gap-1"
                title="Sign out of account"
              >
                <LogOut className="w-3 h-3" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-full border border-emerald-200 transition"
            >
              Sign In
            </Link>
          )}

          <button
            onClick={() => setIsFilterModalOpen(!isFilterModalOpen)}
            className="p-2 border border-slate-200 rounded-full hover:bg-slate-100 transition text-slate-700 cursor-pointer"
            aria-label="Filter Properties"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Interactive Filter Bar (Mode Tabs & Quick Filter Chips) */}
      <div className="h-12 flex-none bg-white border-b border-slate-200/80 px-4 lg:px-8 flex items-center justify-between gap-3 overflow-x-auto scrollbar-none z-40">
        {/* Mode Switcher Tabs */}
        <div className="flex items-center gap-1.5 flex-none">
          {[
            { label: "All Properties", value: "ALL" },
            { label: "Buy", value: "BUY" },
            { label: "Rent", value: "RENT" },
            { label: "Short-Stay", value: "STAY" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                currentType === tab.value || (tab.value === "ALL" && !["BUY", "RENT", "STAY"].includes(currentType))
                  ? "bg-emerald-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Filter Chips */}
        <div className="flex items-center gap-2 flex-none">
          {/* Gold Pin Toggle */}
          <button
            onClick={toggleCertifiedFilter}
            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              isCertifiedOnly
                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-xs"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-600" />
            <span>Prakriti Certified Gold Pin</span>
            {isCertifiedOnly && <Check className="w-3 h-3 text-amber-700 ml-0.5" />}
          </button>

          {/* Viewport Bounds Chip */}
          {hasBounds && (
            <button
              onClick={() => updateParams({ bounds: null })}
              className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition cursor-pointer flex items-center gap-1"
            >
              <span>Map Viewport</span>
              <X className="w-3 h-3 text-blue-500" />
            </button>
          )}

          {/* Quick Clear All Filters */}
          {(currentQuery || currentType !== "ALL" || isCertifiedOnly || currentMinPrice || currentMaxPrice || hasBounds) && (
            <button
              onClick={() => router.push("/search")}
              className="text-xs text-red-600 font-semibold hover:underline px-2 py-1 cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Main Split-Screen Workspace */}
      <main className="flex-1 flex relative overflow-hidden">
        {/* DESKTOP SIDEBAR: Scrollable Property Cards */}
        <section className="hidden lg:flex w-[460px] flex-col bg-white border-r border-slate-200 z-10 relative shadow-sm">
          <div className="p-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/70">
            <h2 className="font-bold text-xs uppercase tracking-wider text-slate-600">
              Properties in Viewport
            </h2>
            <span className="text-xs font-medium text-slate-400">
              {isPending ? "Updating..." : "Live PostGIS Sync"}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {children}
          </div>
        </section>

        {/* MAP CANVAS */}
        <section className="flex-1 relative bg-slate-100">
          {mapComponent}

          {/* MOBILE ONLY: Bottom floating pill to view listings sheet */}
          <button
            onClick={() => setIsMobileSheetOpen(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 lg:hidden bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-xs shadow-xl flex items-center gap-2 z-20 hover:bg-emerald-800 transition cursor-pointer"
          >
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span>View Property List</span>
          </button>
        </section>

        {/* MOBILE BOTTOM SHEET */}
        <AnimatePresence>
          {isMobileSheetOpen && (
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: "0%" }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden absolute bottom-0 left-0 right-0 h-[80vh] bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col border-t border-slate-200"
            >
              <div
                className="flex justify-center p-3 cursor-grab"
                onClick={() => setIsMobileSheetOpen(false)}
              >
                <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
              </div>
              <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                <h2 className="font-extrabold text-sm text-slate-900">
                  Properties in Viewport
                </h2>
                <button
                  onClick={() => setIsMobileSheetOpen(false)}
                  className="p-1.5 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                >
                  <X className="w-4 h-4 text-slate-600" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
