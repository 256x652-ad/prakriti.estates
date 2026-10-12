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
  OtpVerificationSchema,
  OtpVerificationValues,
} from "@/modules/auth/schemas/authSchemas";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [step, setStep] = useState<"CREDENTIALS" | "OTP">("CREDENTIALS");
  const [credentialsPayload, setCredentialsPayload] = useState<LoginFormValues | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string>("");
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Form 1: Email/Phone & Password
  const {
    register: registerLogin,
    handleSubmit: handleLoginSubmit,
    formState: { errors: loginErrors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(LoginFormSchema),
  });

  // Form 2: 6-Digit OTP
  const {
    register: registerOtp,
    handleSubmit: handleOtpSubmit,
    setValue: setOtpValue,
    formState: { errors: otpErrors },
  } = useForm<OtpVerificationValues>({
    resolver: zodResolver(OtpVerificationSchema),
  });

  // Step 1: Validate Email/Phone + Password & Trigger SMS OTP
  const onCredentialsSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/v1/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const response = await res.json();

      if (!res.ok || !response.success) {
        throw new Error(response.error?.message || "Invalid credentials provided.");
      }

      setCredentialsPayload(data);
      setMaskedPhone(response.data?.phoneNumberMasked || "your mobile");
      if (response.data?.testOtp) {
        setTestOtp(response.data.testOtp);
        setOtpValue("otp", response.data.testOtp, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
      }

      setStep("OTP");
    } catch (err: any) {
      setServerError(err.message || "Failed to authenticate.");
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Finalize 2FA Login via NextAuth Credentials Provider
  const onOtpVerify = async (data: OtpVerificationValues) => {
    if (!credentialsPayload) return;

    setServerError(null);
    setIsLoading(true);

    try {
      const res = await signIn("two-factor-credentials", {
        emailOrPhone: credentialsPayload.emailOrPhone,
        password: credentialsPayload.password,
        otp: data.otp,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === "INVALID_OTP") {
          throw new Error("Invalid verification code. Please check and try again.");
        } else if (res.error === "OTP_EXPIRED") {
          throw new Error("Verification code expired. Please request a new code.");
        } else {
          throw new Error("Authentication failed. Please verify your credentials.");
        }
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setServerError(err.message || "Failed to verify code.");
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
            {step === "CREDENTIALS" ? "Sign In to Prakriti" : "Two-Step Verification"}
          </h1>
          <p className="text-sm text-slate-500">
            {step === "CREDENTIALS"
              ? "Access your dashboard, escrow locks, and verified properties"
              : `Enter the 6-digit SMS code sent to ${maskedPhone}`}
          </p>
        </div>

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{serverError}</span>
          </div>
        )}

        {testOtp && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <span>Test / Sandbox OTP:</span>
            <button
              type="button"
              onClick={() => setOtpValue("otp", testOtp, { shouldValidate: true, shouldDirty: true, shouldTouch: true })}
              className="font-mono font-bold underline cursor-pointer"
            >
              {testOtp} (Click to fill)
            </button>
          </div>
        )}

        {step === "CREDENTIALS" ? (
          <form onSubmit={handleLoginSubmit(onCredentialsSubmit)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Email or Mobile Number
              </label>
              <input
                type="text"
                {...registerLogin("emailOrPhone")}
                placeholder="aditya@example.com or +919876543210"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              />
              {loginErrors.emailOrPhone && (
                <p className="text-xs text-red-500 mt-1">{loginErrors.emailOrPhone.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                Password
              </label>
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
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
            >
              {isLoading ? "Authenticating..." : "Continue to SMS OTP →"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit(onOtpVerify)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1 text-center">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                {...registerOtp("otp")}
                placeholder="123456"
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center tracking-widest font-mono text-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {otpErrors.otp && (
                <p className="text-xs text-red-500 mt-1 text-center">{otpErrors.otp.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
            >
              {isLoading ? "Verifying..." : "Verify & Complete Login"}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
              <button
                type="button"
                onClick={() => setStep("CREDENTIALS")}
                className="hover:underline text-slate-600"
              >
                ← Back to Credentials
              </button>
              <button
                type="button"
                onClick={() => credentialsPayload && onCredentialsSubmit(credentialsPayload)}
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
