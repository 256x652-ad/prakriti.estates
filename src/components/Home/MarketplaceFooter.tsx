import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, CopySlash } from "lucide-react";

export default function MarketplaceFooter() {
  return (
    <footer className="bg-white border-t border-slate-200">
      {/* Platform Guarantees Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-b border-slate-100">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            The Prakriti Institutional Guarantees
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Engineered to remove fraud, broker markups, and double-pledging from real estate transactions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">72-Hour Escrow Protection</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Token locks are held in safe, non-custodial escrow until physical and legal due diligence is fulfilled.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Mandatory KYC Verification</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Every seller and buyer is verified via Aadhaar & PAN before executing tokens or listing deeds.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CopySlash className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900">Zero Double-Bookings</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              PostgreSQL row-level locking ensures that concurrent checkout attempts never result in double sales.
            </p>
          </div>
        </div>
      </section>

      {/* Main Footer Links */}
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="space-y-3 md:col-span-1">
          <div className="flex items-center gap-2 text-lg font-black text-slate-900">
            <span>🌿</span> PRAKRITI ESTATES
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            India’s certified spatial real estate & structural engineering marketplace.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Discovery</h4>
          <ul className="space-y-2 text-xs text-slate-500 font-medium">
            <li>
              <Link href="/search?mode=BUY" className="hover:text-emerald-700 transition">
                Buy Eco-Villas
              </Link>
            </li>
            <li>
              <Link href="/search?mode=RENT" className="hover:text-emerald-700 transition">
                Long-Term Rentals
              </Link>
            </li>
            <li>
              <Link href="/search?mode=STAY" className="hover:text-emerald-700 transition">
                Short-Stay Retreats
              </Link>
            </li>
            <li>
              <Link href="/search?certifiedOnly=true" className="hover:text-emerald-700 transition">
                Gold Pin Inventory
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Engineering Services</h4>
          <ul className="space-y-2 text-xs text-slate-500 font-medium">
            <li>
              <Link href="/consultants" className="hover:text-emerald-700 transition">
                Structural Integrity Audit
              </Link>
            </li>
            <li>
              <Link href="/consultants" className="hover:text-emerald-700 transition">
                Soil Bearing Tests
              </Link>
            </li>
            <li>
              <Link href="/consultants" className="hover:text-emerald-700 transition">
                Vastu Compliance Check
              </Link>
            </li>
            <li>
              <Link href="/consultants" className="hover:text-emerald-700 transition">
                RERA Legal Due Diligence
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-3">Legal & Governance</h4>
          <ul className="space-y-2 text-xs text-slate-500 font-medium">
            <li>
              <Link href="/terms" className="hover:text-emerald-700 transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-emerald-700 transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/cancellation" className="hover:text-emerald-700 transition">
                Escrow & Refund Rules
              </Link>
            </li>
            <li>
              <Link href="/admin" className="text-emerald-700 font-bold hover:underline">
                Command Center
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-100 py-6 px-4 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Prakriti Estates. All rights reserved. Built with Next.js, PostGIS, & IIT-grade engineering standards.
      </div>
    </footer>
  );
}
