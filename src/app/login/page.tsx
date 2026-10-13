"use client";

import React, { useState, Suspense } from "react";
import { signIn, useSession, signOut } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck, UserCheck } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const initialEmail = searchParams.get("emailOrPhone") || "";

  const { data: session } = useSession();
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
        console.error("[Login] Authentication error details:", res?.error);
        if (res?.error === "CredentialsSignin") {
          setServerError("Invalid email/phone or password. Please check your credentials.");
        } else if (res?.error === "csrf") {
          setServerError("Security token expired (CSRF). Please refresh the page and try again.");
        } else if (res?.error) {
          setServerError(`Sign-in error: ${res.error}. Please check your credentials.`);
        } else {
          setServerError("Invalid email/phone or password. Please check your credentials.");
        }
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

        {/* Active Session Notification */}
        {session?.user && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                <span>Active Session: {session.user.name || session.user.email}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-200 text-emerald-900">
                {(session.user as any)?.roles?.[0] || "ACTIVE"}
              </span>
            </div>
            <p className="text-emerald-800 leading-relaxed">
              You are already logged in on this browser. You can proceed directly or switch to another account.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const isUserAdmin = (session.user as any)?.roles?.some((r: string) => ["ADMIN", "SUPER_ADMIN"].includes(r));
                  window.location.href = isUserAdmin ? "/admin" : callbackUrl;
                }}
                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs transition cursor-pointer text-center"
              >
                Go to {(session.user as any)?.roles?.includes("ADMIN") ? "Admin Console" : "Dashboard"} →
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="py-2 px-3 bg-white border border-slate-200 text-red-600 hover:bg-red-50 rounded-xl font-semibold text-xs transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

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

          {/* Quick Test Accounts */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center">
              Quick Test Accounts
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setEmailOrPhone("admin@prakritiestates.com");
                  setPassword("Admin@123");
                  setServerError(null);
                }}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition cursor-pointer"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🛡️</span>
                  <span>Super Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">admin@prakritiestates.com</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailOrPhone("buyer@prakritiestates.com");
                  setPassword("Buyer@123");
                  setServerError(null);
                }}
                className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/50 text-left transition cursor-pointer"
              >
                <div className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🏡</span>
                  <span>Verified Buyer</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">buyer@prakritiestates.com</div>
              </button>
            </div>
          </div>
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
