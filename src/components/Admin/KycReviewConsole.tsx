"use client";

import React, { useState } from "react";
import { overrideKycAction } from "@/modules/admin/actions/moderationAdminActions";

interface KycRecord {
  userId: string;
  userName: string;
  userPhone: string;
  userEmail: string | null;
  kycStatus: string;
  documentType: string;
  provider: string;
  failureReason: string | null;
  submittedAt: string;
}

export default function KycReviewConsole({ records }: { records: KycRecord[] }) {
  const [filter, setFilter] = useState<string>("MANUAL_REVIEW");
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectModalUserId, setRejectModalUserId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filtered = records.filter((r) => {
    if (filter === "ALL") return true;
    return r.kycStatus === filter;
  });

  const handleVerify = async (userId: string) => {
    if (!confirm("Are you sure you want to manually VERIFY this user's KYC?")) return;
    setIsProcessing(true);
    try {
      await overrideKycAction(userId, "VERIFIED", "Manual administrative verification by compliance officer");
      window.location.reload();
    } catch (err: any) {
      alert("Verification failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectReason.trim()) {
      alert("Please specify a reason for KYC rejection");
      return;
    }
    setIsProcessing(true);
    try {
      await overrideKycAction(userId, "REJECTED", rejectReason);
      setRejectModalUserId(null);
      setRejectReason("");
      window.location.reload();
    } catch (err: any) {
      alert("Rejection failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 bg-white p-4 rounded-2xl border border-slate-200">
        {["MANUAL_REVIEW", "PENDING", "REJECTED", "VERIFIED", "ALL"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              filter === status
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {status.replace("_", " ")}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">
          {filtered.length} submissions in view
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Document / Provider</th>
                <th className="p-4">Status</th>
                <th className="p-4">Provider Diagnostics / Failure</th>
                <th className="p-4">Date</th>
                <th className="p-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No KYC submissions found in this category.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.userId} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{item.userName}</div>
                      <div className="text-[11px] text-slate-500">{item.userPhone}</div>
                      {item.userEmail && (
                        <div className="text-[11px] text-slate-400">{item.userEmail}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="font-semibold text-slate-800">{item.documentType}</div>
                      <div className="text-[11px] text-slate-400">Provider: {item.provider}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                          item.kycStatus === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800"
                            : item.kycStatus === "MANUAL_REVIEW"
                            ? "bg-amber-100 text-amber-800"
                            : item.kycStatus === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {item.kycStatus}
                      </span>
                    </td>
                    <td className="p-4 max-w-xs truncate">
                      {item.failureReason ? (
                        <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded font-medium">
                          {item.failureReason}
                        </span>
                      ) : (
                        <span className="text-slate-400">Standard verification flow</span>
                      )}
                    </td>
                    <td className="p-4 text-slate-500">
                      {new Date(item.submittedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {item.kycStatus !== "VERIFIED" && (
                        <button
                          disabled={isProcessing}
                          onClick={() => handleVerify(item.userId)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition disabled:opacity-50"
                        >
                          Verify Pass
                        </button>
                      )}
                      {item.kycStatus !== "REJECTED" && (
                        <button
                          disabled={isProcessing}
                          onClick={() => setRejectModalUserId(item.userId)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {rejectModalUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Reject KYC Submission</h3>
            <p className="text-xs text-slate-500">
              Provide a clear reason for rejecting the applicant's KYC verification.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Unclear government ID photograph, name mismatch with Aadhaar/PAN..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setRejectModalUserId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleReject(rejectModalUserId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
