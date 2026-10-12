"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckoutSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read payment identifiers from query parameters
  const paymentIntent = searchParams.get("payment_intent");
  const transactionId = searchParams.get("transaction_id") || searchParams.get("transactionId");
  const propertyId = searchParams.get("property_id") || searchParams.get("propertyId");

  const effectiveId = transactionId || paymentIntent || "TX-CONFIRMED";
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (countdown <= 0) {
      router.push(`/dashboard/transactions?highlight=${effectiveId}`);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router, effectiveId]);

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-10 text-center space-y-6">
        {/* Animated Checkmark Badge */}
        <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-4xl border border-emerald-100 shadow-inner">
          ✓
        </div>

        {/* Header */}
        <div className="space-y-2">
          <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Escrow Lock Active
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 pt-2">
            Payment Successful!
          </h1>
          <p className="text-slate-600 text-sm leading-relaxed">
            Your token deposit has been locked in Smart Escrow. The property is now reserved exclusively for you.
          </p>
        </div>

        {/* Transaction Details Box */}
        <div className="bg-slate-50 rounded-2xl p-4 text-left font-mono text-xs text-slate-600 border border-slate-200/60 space-y-2">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-400 font-sans">Reference:</span>
            <span className="font-bold text-slate-800 truncate max-w-[200px]">{effectiveId}</span>
          </div>
          {propertyId && (
            <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
              <span className="text-slate-400 font-sans">Property ID:</span>
              <span className="text-slate-800 truncate max-w-[200px]">{propertyId}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-400 font-sans">Escrow Protection:</span>
            <span className="font-bold text-emerald-700 font-sans">ACTIVE (Protected)</span>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Auto-redirecting to your Transaction Ledger in{" "}
          <span className="font-bold text-slate-700">{countdown}s</span>...
        </p>

        {/* Action CTAs */}
        <div className="space-y-3 pt-2">
          <button
            onClick={() => router.push(`/dashboard/transactions?highlight=${effectiveId}`)}
            className="w-full py-3.5 px-6 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-md shadow-emerald-700/20 transition-all text-sm flex items-center justify-center gap-2"
          >
            <span>Go to Transaction Ledger</span>
            <span>→</span>
          </button>

          <Link
            href="/dashboard"
            className="block w-full py-3 rounded-xl text-slate-600 hover:text-slate-900 text-sm font-medium transition"
          >
            Go to User Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-slate-400 text-sm">Verifying payment receipt...</div>
        </div>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
