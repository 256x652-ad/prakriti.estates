import React from "react";
import Link from "next/link";

/**
 * Premium Property Not Found State
 * Gracefully intercepts invalid or unlisted property slugs.
 */
export default function PropertyNotFound() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12">
      <div className="max-w-lg w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 text-center space-y-6">
        {/* Brand / Icon Badge */}
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-4xl shadow-inner border border-emerald-100">
          🏡
        </div>

        {/* Messaging */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Prakriti Estates Marketplace
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 pt-2">
            Property Listing Not Found
          </h1>
          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            This property is no longer available or the link is broken. The listing may have been reserved under Smart Escrow or recently completed.
          </p>
        </div>

        {/* Reassurance Feature List */}
        <div className="bg-slate-50 rounded-2xl p-4 text-xs text-slate-500 space-y-1.5 text-left border border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>All active listings are audited for structural & legal integrity</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>Live map updates with real-time token reservation status</span>
          </div>
        </div>

        {/* Clear Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            href="/search"
            className="flex-1 py-3.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-md shadow-emerald-700/20 transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>Explore Active Properties</span>
            <span>→</span>
          </Link>
          <Link
            href="/"
            className="py-3.5 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition text-sm flex items-center justify-center"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
