"use client";

import React, { useState, useEffect } from "react";
import { StepUpAction } from "@/modules/auth/services/StepUpVerificationService";

interface StepUpVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (stepUpToken: string) => void;
  action: StepUpAction;
  actionTitle?: string;
  actionDescription?: string;
  userId?: string;
}

export default function StepUpVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  action,
  actionTitle = "Security Verification Required",
  actionDescription = "This is a sensitive financial transaction or platform modification. Please verify with the 6-digit SMS code sent to your registered mobile.",
  userId,
}: StepUpVerificationModalProps) {
  const [otp, setOtp] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [testOtp, setTestOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  // Request SMS challenge when modal opens
  const requestOtp = async () => {
    setIsRequesting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "REQUEST", action, userId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to dispatch verification code.");
      }
      setMaskedPhone(data.data.phoneNumberMasked);
      if (data.data.testOtp) {
        setTestOtp(data.data.testOtp);
        setOtp(data.data.testOtp);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send code.");
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setOtp("");
      setError(null);
      requestOtp();
    }
  }, [isOpen, action]);

  if (!isOpen) return null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/step-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "VERIFY", action, otp: otp.trim(), userId }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Invalid verification code.");
      }
      onSuccess(data.data.stepUpToken);
      onClose();
    } catch (err: any) {
      setError(err.message || "Verification failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 font-bold text-sm"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-2xl font-bold border border-amber-200">
            🔐
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{actionTitle}</h3>
            <p className="text-xs text-slate-500">Action: {action}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">{actionDescription}</p>

        {maskedPhone && (
          <div className="text-xs font-semibold text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
            📱 Code sent to: <span className="font-mono text-emerald-700">{maskedPhone}</span>
          </div>
        )}

        {testOtp && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
            <span>Development Test Code:</span>
            <button
              type="button"
              onClick={() => setOtp(testOtp)}
              className="font-mono font-bold underline cursor-pointer"
            >
              {testOtp} (Click to fill)
            </button>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              autoFocus
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-center tracking-widest font-mono text-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || isRequesting}
              className="flex-2 py-3 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-semibold rounded-xl text-xs transition shadow-md shadow-emerald-700/20"
            >
              {isLoading ? "Authorizing..." : "Authorize Action →"}
            </button>
          </div>

          <div className="text-center pt-1">
            <button
              type="button"
              onClick={requestOtp}
              disabled={isRequesting}
              className="text-xs text-emerald-700 hover:underline font-semibold"
            >
              {isRequesting ? "Sending new code..." : "Resend SMS Code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
