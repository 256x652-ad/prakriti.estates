import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import ImpersonationBanner from "@/components/Admin/ImpersonationBanner";

export const metadata: Metadata = {
  title: "Admin Dashboard | Prakriti Estates",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      {/* Persistent Impersonation Security Banner */}
      <ImpersonationBanner />

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col pt-2">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-black tracking-wider text-emerald-400">Prakriti Admin</h2>
          <p className="text-xs text-slate-400 mt-0.5">Superuser Command Center</p>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto text-xs font-semibold">
          <Link
            href="/admin"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            📊 Overview Dashboard
          </Link>
          <Link
            href="/admin/properties"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            🏡 Listings Moderation
          </Link>
          <Link
            href="/admin/kyc"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            🪪 KYC Compliance Console
          </Link>
          <Link
            href="/admin/finance"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            ⚖️ Finance & Disputes
          </Link>
          <Link
            href="/admin/users"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            👤 Users & Impersonation
          </Link>
          <Link
            href="/admin/consultants"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            📐 Consultants & Audits
          </Link>
          <Link
            href="/admin/settings/theme"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            🎨 Theme & CSS Tokens
          </Link>
          <Link
            href="/admin/audit-logs"
            className="block px-4 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            🔒 System Audit Trail
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link
            href="/"
            className="block text-center w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition"
          >
            Exit to Marketplace 🌿
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Environment: Production Cluster
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 font-black text-xs">
              SA
            </div>
            <div className="text-left">
              <span className="block text-xs font-bold text-slate-800 leading-tight">Super Admin</span>
              <span className="block text-[10px] text-slate-400">Prakriti Operations</span>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
