"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";

export interface NavigationItem {
  label: string;
  href: string;
  roles?: string[]; // Allowed roles (if empty, public)
}

export interface AppShellUser {
  id: string;
  name?: string;
  email?: string;
  phoneNumber: string;
  roles: string[];
}

interface AppShellProps {
  children: React.ReactNode;
  user?: AppShellUser | null;
}

const PRIMARY_NAV_ITEMS: NavigationItem[] = [
  { label: "Marketplace", href: "/search" },
  { label: "Engineering Audits", href: "/consultants" },
  { label: "My Dashboard", href: "/dashboard", roles: ["USER", "BUYER", "SELLER", "CONSULTANT", "ADMIN", "SUPER_ADMIN"] },
  { label: "Admin Console", href: "/admin", roles: ["ADMIN", "SUPER_ADMIN"] },
];

export function AppShell({ children, user }: AppShellProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const userRoles = user?.roles || [];
  const isAuthenticated = !!user;

  // Filter items visible to current user
  const visibleNavItems = PRIMARY_NAV_ITEMS.filter((item) => {
    if (!item.roles) return true;
    if (!isAuthenticated) return false;
    return item.roles.some((r) => userRoles.includes(r));
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500/20 selection:text-emerald-900">
      {/* Top Application Header */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-xl border border-emerald-200 shadow-sm">
              🌿
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                Prakriti Estates
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700">
                & Consultants
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60 shadow-xs"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User Auth CTAs & Mobile Hamburger */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-slate-200">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-800">
                    {user?.name || user?.phoneNumber}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 tracking-wider">
                    {userRoles[0] || "MEMBER"}
                  </span>
                </div>
                <Link href="/api/auth/signout">
                  <Button variant="ghost" size="sm">
                    Sign Out
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 transition"
              aria-label="Open Navigation Drawer"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <Drawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="Navigation"
        description="Prakriti Estates & Engineering Portal"
      >
        <div className="space-y-4 py-2">
          <div className="flex flex-col gap-1">
            {visibleNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl text-base font-semibold transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="px-4 py-2 bg-slate-50 rounded-xl text-xs space-y-1">
                  <p className="font-bold text-slate-800">{user?.name || user?.phoneNumber}</p>
                  <p className="text-slate-500 font-mono">{user?.phoneNumber}</p>
                </div>
                <Link href="/api/auth/signout" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign Out
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">
                    Create Account
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </Drawer>

      {/* Main Page Canvas */}
      <main className="flex-1 flex flex-col">{children}</main>

      {/* Global Minimal Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <p>© 2026 Prakriti Estates & Engineering Consultancy. All rights reserved.</p>
        <p className="mt-1 text-[11px] text-slate-400">
          Precision Engineering • Smart Escrow • Vedic Architecture
        </p>
      </footer>
    </div>
  );
}
