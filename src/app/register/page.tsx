"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "+91",
    email: "",
    role: "BUYER",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Registration failed");
      }

      // Redirect to login with prefilled phone and callback
      router.push(`/login?phone=${encodeURIComponent(formData.phoneNumber)}`);
    } catch (err: any) {
      setError(err.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-slate-100 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl font-black">
            🌿
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500">
            Join India's certified real estate & engineering ecosystem
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                First Name
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="Rohit"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Last Name
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="Sharma"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Mobile Number
            </label>
            <input
              type="tel"
              required
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="+919876543210"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="rohit@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Primary Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="BUYER">Buyer / Tenant</option>
              <option value="SELLER">Property Owner / Seller</option>
              <option value="CONSULTANT">Consultant / Engineer</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
          >
            {isLoading ? "Creating Account..." : "Register & Get OTP"}
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          Already registered?{" "}
          <Link href="/login" className="text-emerald-700 font-bold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>
    </main>
  );
}
