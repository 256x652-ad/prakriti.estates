"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  ShieldCheck,
  Download,
  Lock,
  Sparkles,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export interface PropertyAuditReportItem {
  id: string;
  type: "STRUCTURAL" | "VASTU" | "LEGAL";
  score: number;
  passed: boolean;
  findings: string;
  recommendations?: string;
  reportPdfUrl?: string;
  consultantName: string;
  createdAt: string;
}

export default function PropertyAuditViewer({
  propertyId,
  isPrakritiCertified,
}: {
  propertyId: string;
  isPrakritiCertified: boolean;
}) {
  const [reports, setReports] = useState<PropertyAuditReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAudits() {
      try {
        setLoading(true);
        const res = await fetch(`/api/v1/properties/${propertyId}/audits`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setReports(json.data.reports || []);
          }
        }
      } catch (e: any) {
        setError(e.message || "Failed to load audit reports");
      } finally {
        setLoading(false);
      }
    }
    loadAudits();
  }, [propertyId]);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>Prakriti Engineering & Architectural Audits</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Independent structural stability, Vedic Vastu compliance, and legal title certifications conducted by IIT alumni.
          </p>
        </div>

        {isPrakritiCertified && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold text-amber-950 bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-400 border border-amber-300 shadow-sm flex-none">
            <Sparkles className="w-3.5 h-3.5 text-amber-900 fill-amber-800" />
            Prakriti Certified Gold Pin
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-xs text-slate-400 py-4">Checking audit database...</p>
      ) : reports.length === 0 ? (
        <div className="py-6 text-center space-y-2 bg-slate-50 rounded-2xl border border-slate-100">
          <FileText className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="text-xs font-semibold text-slate-700">No Pre-Listing Audit Reports Published</p>
          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
            You can bundle a dedicated Structural or Vastu audit directly during checkout to receive an unredacted engineering analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div
              key={report.id}
              className="p-5 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:shadow-md transition space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {report.type} Audit
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    Score: {report.score}/100
                  </span>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                    report.passed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {report.passed ? "Certified" : "Needs Remediation"}
                </span>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-800">Key Engineering Findings:</p>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{report.findings}</p>
              </div>

              {report.recommendations && (
                <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200">
                  <span className="font-semibold text-slate-700">Consultant Notes: </span>
                  {report.recommendations}
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-[11px]">
                <span className="text-slate-500">
                  Audited by <span className="font-semibold text-slate-700">{report.consultantName}</span>
                </span>

                {report.reportPdfUrl ? (
                  <a
                    href={report.reportPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Full Engineering PDF
                  </a>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Unlocked upon Token Escrow
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
