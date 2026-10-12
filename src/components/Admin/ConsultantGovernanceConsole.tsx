"use client";

import React, { useState } from "react";
import { assignConsultantToServiceRequestAction } from "@/modules/admin/actions/consultantAdminActions";
import { overrideGoldPinAction } from "@/modules/admin/actions/moderationAdminActions";

interface ConsultantUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  reportsCount: number;
}

interface ServiceRequestItem {
  id: string;
  type: string;
  status: string;
  propertyId: string;
  propertyTitle: string;
  assignedConsultantId: string | null;
  assignedConsultantName: string | null;
  userName: string;
  createdAt: string;
  report?: {
    id: string;
    score: number;
    passed: boolean;
    findings: string;
    reportPdfUrl: string | null;
  } | null;
}

export default function ConsultantGovernanceConsole({
  consultants,
  serviceRequests,
}: {
  consultants: ConsultantUser[];
  serviceRequests: ServiceRequestItem[];
}) {
  const [selectedConsultant, setSelectedConsultant] = useState<string>(
    consultants[0]?.id || ""
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAssign = async (serviceRequestId: string, consultantId: string) => {
    if (!consultantId) {
      alert("Please select a consultant first.");
      return;
    }
    setIsProcessing(true);
    try {
      await assignConsultantToServiceRequestAction(serviceRequestId, consultantId);
      alert("Consultant assigned successfully!");
      window.location.reload();
    } catch (err: any) {
      alert("Assignment error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleGoldPin = async (propertyId: string, willCertify: boolean) => {
    const reason = prompt(
      willCertify
        ? "Administrative rationale for awarding Prakriti Gold Pin:"
        : "Administrative rationale for revoking Prakriti Gold Pin:"
    );
    if (!reason) return;

    setIsProcessing(true);
    try {
      await overrideGoldPinAction(propertyId, willCertify, reason);
      alert("Prakriti Gold Pin updated!");
      window.location.reload();
    } catch (err: any) {
      alert("Failed to update Gold Pin: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Onboarded Consultants</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{consultants.length}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Active Audit Requests</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {serviceRequests.filter((r) => r.status !== "COMPLETED").length}
          </p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase">Completed Audits</p>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {serviceRequests.filter((r) => r.status === "COMPLETED").length}
          </p>
        </div>
      </div>

      {/* Service Requests & Audits Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Engineering & Vastu Audit Pipeline</h3>
            <p className="text-xs text-slate-500">
              Assign expert consultants and inspect certification reports.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
              <tr>
                <th className="p-4">Property</th>
                <th className="p-4">Audit Type</th>
                <th className="p-4">Requester</th>
                <th className="p-4">Assigned Consultant</th>
                <th className="p-4">Status</th>
                <th className="p-4">Report Score</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {serviceRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No consultancy service requests found.
                  </td>
                </tr>
              ) : (
                serviceRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-bold text-slate-900">
                      {req.propertyTitle}
                      <div className="text-[10px] text-slate-400 font-mono">{req.propertyId}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-800">
                        {req.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-700">{req.userName}</td>
                    <td className="p-4">
                      {req.assignedConsultantName ? (
                        <span className="font-medium text-slate-800">
                          {req.assignedConsultantName}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <select
                            defaultValue={selectedConsultant}
                            onChange={(e) => setSelectedConsultant(e.target.value)}
                            className="p-1 border border-slate-200 rounded text-xs bg-slate-50"
                          >
                            <option value="">Select consultant...</option>
                            {consultants.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={isProcessing}
                            onClick={() => handleAssign(req.id, selectedConsultant)}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                          req.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : req.status === "IN_PROGRESS"
                            ? "bg-blue-100 text-blue-800"
                            : req.status === "ASSIGNED"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4">
                      {req.report ? (
                        <div>
                          <span
                            className={`font-black ${
                              req.report.passed ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {req.report.score}/100 {req.report.passed ? "(Passed)" : "(Failed)"}
                          </span>
                          {req.report.reportPdfUrl && (
                            <a
                              href={req.report.reportPdfUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block text-[10px] text-emerald-600 underline font-semibold mt-0.5"
                            >
                              View PDF
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">Pending submission</span>
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() =>
                          handleToggleGoldPin(req.propertyId, !(req.report?.passed ?? false))
                        }
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition"
                      >
                        Override Gold Pin ⭐
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
