"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const initialEmail = searchParams.get("emailOrPhone") || "";

  const [emailOrPhone, setEmailOrPhone] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setServerError(null);

    const trimmedInput = emailOrPhone.trim();
    if (!trimmedInput) {
      setServerError("Please enter your email or 10-digit mobile number.");
      return;
    }
    if (!password) {
      setServerError("Please enter your password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn("two-factor-credentials", {
        emailOrPhone: trimmedInput,
        password: password,
        redirect: false,
      });

      if (!res || res.error) {
        setServerError("Invalid email/phone or password. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      // Check destination: Admin vs Regular user
      const isUserAdmin =
        trimmedInput.toLowerCase().includes("admin") ||
        trimmedInput.includes("9999999999");

      const destination = isUserAdmin
        ? (callbackUrl !== "/dashboard" ? callbackUrl : "/admin")
        : callbackUrl;

      window.location.href = destination;
    } catch (err: any) {
      setServerError(err.message || "An unexpected error occurred during sign-in.");
      setIsLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
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
            Sign In to Prakriti
          </h1>
          <p className="text-sm text-slate-500">
            Access your dashboard, verified properties, and command center
          </p>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email or Mobile Number
            </label>
            <input
              type="text"
              autoComplete="username"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="admin@prakritiestates.com or 9999999999"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                Password
              </label>
              <Link href="#" className="text-xs text-emerald-700 hover:underline font-semibold">
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="••••••••"
                className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 focus:outline-none transition cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer"
          >
            {isLoading ? "Signing in..." : "Sign In to Account →"}
          </button>
        </div>

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

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
