import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard | Prakriti Estates",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-bold tracking-wider text-green-400">Prakriti Admin</h2>
          <p className="text-xs text-slate-400 mt-1">Superuser Dashboard</p>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <Link href="/admin" className="block px-4 py-2 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition">
            Dashboard
          </Link>
          <Link href="/admin/users" className="block px-4 py-2 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition">
            Users & KYC
          </Link>
          <Link href="/admin/properties" className="block px-4 py-2 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition">
            Properties & Locks
          </Link>
          <Link href="/admin/escrow" className="block px-4 py-2 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition">
            Escrow & Ledgers
          </Link>
          <Link href="/admin/disputes" className="block px-4 py-2 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition">
            Disputes & Tickets
          </Link>
          <Link href="/admin/theme" className="block px-4 py-2 rounded-lg text-slate-300 font-medium hover:bg-slate-700 transition">
            Theme Configuration
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white shadow-sm flex items-center justify-between px-8 z-10">
          <h1 className="text-lg font-semibold text-slate-800">System Administration</h1>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-800 font-bold">
              A
            </div>
            <span className="text-sm font-medium text-slate-600">Admin User</span>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
