"use client";

import React, { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  LoginFormSchema,
  LoginFormValues,
} from "@/modules/auth/schemas/authSchemas";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Email/Phone & Password Form
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
  });

  // Direct Email/Phone + Password Login
  const onCredentialsSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const res = await signIn("two-factor-credentials", {
        emailOrPhone: data.emailOrPhone,
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        throw new Error("Invalid email/phone or password.");
      }

      // Route admin users directly to /admin
      if (data.emailOrPhone.toLowerCase().includes("admin") || callbackUrl.includes("/admin")) {
        router.push(callbackUrl !== "/dashboard" ? callbackUrl : "/admin");
      } else {
        router.push(callbackUrl);
      }
    } catch (err: any) {
      setServerError(err.message || "Failed to authenticate.");
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

        <form onSubmit={handleLoginSubmit(onCredentialsSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              Email or Mobile Number
            </label>
            <input
              type="text"
              {...registerLogin("emailOrPhone")}
              placeholder="admin@prakritiestates.com or 9999999999"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            {loginErrors.emailOrPhone && (
              <p className="text-xs text-red-500 mt-1">{loginErrors.emailOrPhone.message}</p>
            )}
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
            <input
              type="password"
              {...registerLogin("password")}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
            />
            {loginErrors.password && (
              <p className="text-xs text-red-500 mt-1">{loginErrors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20 cursor-pointer"
          >
            {isLoading ? "Signing in..." : "Sign In to Account →"}
          </button>
        </form>

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
