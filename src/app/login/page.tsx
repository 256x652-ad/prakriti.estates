"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [step, setStep] = useState<"PHONE" | "OTP">("PHONE");
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to dispatch verification code");
      }

      if (data.data?.testOtp) {
        setDebugOtp(data.data.testOtp);
      }

      setStep("OTP");
    } catch (err: any) {
      setError(err.message || "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify & Sign In via NextAuth
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await signIn("sms-otp", {
        phoneNumber,
        otp,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Verification failed");
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
            {step === "PHONE" ? "Sign In to Prakriti" : "Enter Verification Code"}
          </h1>
          <p className="text-sm text-slate-500">
            {step === "PHONE"
              ? "Access your dashboard, escrow locks, and verified properties"
              : `6-digit code sent to ${phoneNumber}`}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {debugOtp && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <span>Dev/Test OTP:</span>
            <button
              type="button"
              onClick={() => setOtp(debugOtp)}
              className="font-mono font-bold underline cursor-pointer"
            >
              {debugOtp} (Click to fill)
            </button>
          </div>
        )}

        {step === "PHONE" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Mobile Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+919876543210"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono text-slate-800 text-sm"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Include country code (e.g. +91 for India)
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading || phoneNumber.length < 10}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
            >
              {isLoading ? "Sending OTP..." : "Get One-Time Password"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                6-Digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center tracking-widest font-mono text-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
            >
              {isLoading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <button
                type="button"
                onClick={() => setStep("PHONE")}
                className="hover:underline text-slate-600"
              >
                ← Change Number
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                className="hover:underline text-emerald-700 font-semibold"
              >
                Resend Code
              </button>
            </div>
          </form>
        )}

        <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          New to Prakriti?{" "}
          <Link href="/register" className="text-emerald-700 font-bold hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </main>
  );
}
