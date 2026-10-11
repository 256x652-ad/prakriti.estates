"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Compass,
  FileCheck2,
  Award,
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
} from "lucide-react";

export default function ConsultantDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<{ availableToClaim: any[]; myAssignedRequests: any[] }>({
    availableToClaim: [],
    myAssignedRequests: [],
  });
  const [loading, setLoading] = useState(true);

  // Form State for Report Submission
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [auditType, setAuditType] = useState<"STRUCTURAL" | "VASTU" | "LEGAL">("STRUCTURAL");
  const [score, setScore] = useState<number>(85);
  const [findings, setFindings] = useState<string>("");
  const [recommendations, setRecommendations] = useState<string>("");
  const [isPublic, setIsPublic] = useState<boolean>(true);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  const fetchConsultantRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/consultancy/requests");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (e) {
      console.warn("Could not load consultant requests", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsultantRequests();
  }, []);

  const handleClaim = async (serviceRequestId: string) => {
    try {
      const res = await fetch("/api/v1/consultancy/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", serviceRequestId }),
      });
      if (res.ok) {
        fetchConsultantRequests();
      }
    } catch (e) {
      console.error("Claim error", e);
    }
  };

  const handleStart = async (serviceRequestId: string) => {
    try {
      const res = await fetch("/api/v1/consultancy/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", serviceRequestId }),
      });
      if (res.ok) {
        fetchConsultantRequests();
      }
    } catch (e) {
      console.error("Start audit error", e);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestId) return;
    setIsSubmittingReport(true);
    setSubmissionSuccess(null);

    try {
      const res = await fetch("/api/v1/consultancy/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId: selectedRequestId,
          auditType,
          score,
          findings,
          recommendations,
          reportPdfUrl: "https://prakriti-reports-public.s3.ap-south-1.amazonaws.com/audits/sample_report.pdf",
          isPublic,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Report submission failed");
      }

      setSubmissionSuccess(
        score >= 75
          ? "🎉 Audit Report Published! The property has been automatically awarded the Prakriti Certified Gold Pin!"
          : "Audit Report recorded. Score is below the certification threshold (75/100)."
      );

      setSelectedRequestId("");
      setFindings("");
      setRecommendations("");
      fetchConsultantRequests();
    } catch (err: any) {
      alert(err.message || "Failed to submit report");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <span>📐</span> Prakriti Consultants & Engineering Workspace
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Claim pending structural and Vastu audits, evaluate engineering blueprints, and award official Prakriti Gold Pins.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-950 font-extrabold text-xs border border-amber-300">
          <Sparkles className="w-4 h-4 text-amber-700 fill-amber-600" />
          <span>Chief Engineering Authority</span>
        </div>
      </div>

      {submissionSuccess && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs font-semibold flex items-center gap-2 shadow-sm">
          <Award className="w-5 h-5 text-amber-700 flex-none" />
          <span>{submissionSuccess}</span>
        </div>
      )}

      {/* Grid: Unassigned Queue & Active Assignments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Requests to Claim */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-emerald-700" /> Unassigned Audit Requests
            </h2>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
              {data.availableToClaim.length} Open
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Loading open requests...</p>
          ) : data.availableToClaim.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium">No pending requests awaiting claim.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.availableToClaim.map((req) => (
                <div key={req.id} className="py-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {req.type}
                    </span>
                    <p className="text-xs font-bold text-slate-900">{req.property.title}</p>
                    <p className="text-[11px] text-slate-500">
                      Requested by {req.user.firstName || req.user.phoneNumber}
                    </p>
                  </div>
                  <button
                    onClick={() => handleClaim(req.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Claim Audit
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* My Assigned Audits */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-emerald-700" /> My Assigned Audits
            </h2>
            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              {data.myAssignedRequests.length} Total
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Loading assignments...</p>
          ) : data.myAssignedRequests.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-1">
              <Clock className="w-6 h-6 text-slate-400 mx-auto" />
              <p className="text-xs font-medium">No assigned audits currently.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {data.myAssignedRequests.map((req) => (
                <div key={req.id} className="py-3.5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                        {req.type}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          req.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-900">{req.property.title}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === "ASSIGNED" && (
                      <button
                        onClick={() => handleStart(req.id)}
                        className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Start Inspection
                      </button>
                    )}
                    {req.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => {
                          setSelectedRequestId(req.id);
                          setAuditType(
                            req.type === "STRUCTURAL" || req.type === "VASTU" || req.type === "LEGAL"
                              ? req.type
                              : "STRUCTURAL"
                          );
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs transition cursor-pointer"
                      >
                        Submit Report
                      </button>
                    )}
                    {req.status === "COMPLETED" && (
                      <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Certified
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Audit Report Submission Form (Modal/Drawer style) */}
      {selectedRequestId && (
        <div className="bg-white rounded-3xl border-2 border-emerald-500/80 shadow-premium p-6 space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" /> Submit Audit Findings & Certification
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Request ID: <span className="font-mono font-semibold">{selectedRequestId}</span>
              </p>
            </div>
            <button
              onClick={() => setSelectedRequestId("")}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Audit Type</label>
                <select
                  value={auditType}
                  onChange={(e) => setAuditType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="STRUCTURAL">Structural Integrity</option>
                  <option value="VASTU">Vedic Vastu Harmonization</option>
                  <option value="LEGAL">Legal Title Search</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compliance Score (75+ triggers Gold Pin)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={score}
                  onChange={(e) => setScore(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Report Visibility</label>
                <select
                  value={isPublic ? "true" : "false"}
                  onChange={(e) => setIsPublic(e.target.value === "true")}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="true">Public (Visible to all users)</option>
                  <option value="false">Private (Buyer/Seller only)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Engineering Findings</label>
              <textarea
                required
                rows={3}
                placeholder="Reinforcement details, load-bearing column deflection analysis, foundation stability..."
                value={findings}
                onChange={(e) => setFindings(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Recommendations & Remediation</label>
              <textarea
                rows={2}
                placeholder="Recommended seismic joints, waterproofing treatment..."
                value={recommendations}
                onChange={(e) => setRecommendations(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingReport}
              className="w-full py-3 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
            >
              {isSubmittingReport ? "Publishing Audit & Updating Gold Pin..." : "Finalize Audit & Award Certification 🌟"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
