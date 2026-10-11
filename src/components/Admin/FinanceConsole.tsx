"use client";

import React, { useState } from "react";
import {
  resolveDisputeAction,
  updateFeeConfigurationAction,
} from "@/modules/admin/actions/financeAdminActions";
import { FeeType, FeeCalculationMethod } from "@prisma/client";

interface FeeConfigItem {
  id: string;
  type: FeeType;
  method: FeeCalculationMethod;
  value: string;
  effectiveFrom: string;
}

interface TransactionItem {
  id: string;
  type: string;
  status: string;
  amount: string;
  currency: string;
  userName: string;
  userPhone: string;
  propertyTitle: string | null;
  referenceId: string | null;
  createdAt: string;
}

interface LedgerEntryItem {
  id: string;
  transactionId: string;
  entryType: string;
  eventCode: string;
  amount: string;
  notes: string | null;
  createdAt: string;
}

export default function FinanceConsole({
  feeConfigs,
  disputes,
  recentLedgerEntries,
}: {
  feeConfigs: FeeConfigItem[];
  disputes: TransactionItem[];
  recentLedgerEntries: LedgerEntryItem[];
}) {
  const [activeTab, setActiveTab] = useState<"disputes" | "fees" | "ledger">("disputes");
  const [isProcessing, setIsProcessing] = useState(false);

  // Dispute resolution state
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [resolutionAction, setResolutionAction] = useState<"REFUND_BUYER" | "RELEASE_TO_SELLER">("REFUND_BUYER");
  const [disputeReason, setDisputeReason] = useState("");

  // Fee configuration form state
  const [selectedFeeType, setSelectedFeeType] = useState<FeeType>("BUYER_PLATFORM_FEE");
  const [feeMethod, setFeeMethod] = useState<FeeCalculationMethod>("FLAT_AMOUNT");
  const [feeValue, setFeeValue] = useState<number>(5000);
  const [feeReason, setFeeReason] = useState("");

  const handleResolveDispute = async () => {
    if (!selectedDisputeId) return;
    if (!disputeReason.trim()) {
      alert("Please provide a reason for the dispute decision.");
      return;
    }
    setIsProcessing(true);
    try {
      await resolveDisputeAction({
        transactionId: selectedDisputeId,
        action: resolutionAction,
        reason: disputeReason,
      });
      setSelectedDisputeId(null);
      setDisputeReason("");
      alert("Dispute successfully resolved!");
      window.location.reload();
    } catch (err: any) {
      alert("Resolution error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feeReason.trim()) {
      alert("Please provide a rationale/audit reason for modifying the fee structure.");
      return;
    }
    setIsProcessing(true);
    try {
      await updateFeeConfigurationAction({
        feeType: selectedFeeType,
        method: feeMethod,
        value: Number(feeValue),
        reason: feeReason,
      });
      setFeeReason("");
      alert("Fee configuration updated and Redis cache evicted!");
      window.location.reload();
    } catch (err: any) {
      alert("Fee update error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab("disputes")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "disputes"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Dispute Resolution ({disputes.length})
        </button>
        <button
          onClick={() => setActiveTab("fees")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "fees"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Dynamic Fee Engine ({feeConfigs.length})
        </button>
        <button
          onClick={() => setActiveTab("ledger")}
          className={`pb-3 text-xs font-bold transition border-b-2 ${
            activeTab === "ledger"
              ? "border-emerald-600 text-emerald-800"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Immutable Financial Ledger ({recentLedgerEntries.length})
        </button>
      </div>

      {/* DISPUTES TAB */}
      {activeTab === "disputes" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-900 text-sm">Disputed & Pending Escrow Orders</h3>
            <span className="text-xs text-slate-500">Super Admin Arbitration Console</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-4">Transaction ID</th>
                  <th className="p-4">Type / Property</th>
                  <th className="p-4">Buyer / User</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Arbitration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {disputes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      No active disputes pending resolution. Platform escrow healthy! 🎉
                    </td>
                  </tr>
                ) : (
                  disputes.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 font-mono font-bold text-slate-900">
                        {d.id}
                        {d.referenceId && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Ref: {d.referenceId}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-bold text-slate-800">{d.type}</span>
                        {d.propertyTitle && (
                          <div className="text-slate-500 truncate max-w-xs">{d.propertyTitle}</div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="font-medium text-slate-900">{d.userName}</div>
                        <div className="text-slate-400 text-[11px]">{d.userPhone}</div>
                      </td>
                      <td className="p-4 font-black text-slate-900">
                        ₹{Number(d.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-red-100 text-red-800">
                          {d.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDisputeId(d.id);
                            setResolutionAction("REFUND_BUYER");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow-sm"
                        >
                          Refund Buyer
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDisputeId(d.id);
                            setResolutionAction("RELEASE_TO_SELLER");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                        >
                          Release to Seller
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DYNAMIC FEE CONFIG TAB */}
      {activeTab === "fees" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Fees List */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Current Platform Fee Matrix</h3>
            <p className="text-xs text-slate-500">
              Active fee formulas dynamically queried from PostgreSQL & Redis cache.
            </p>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {feeConfigs.map((cfg) => (
                <div key={cfg.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      {cfg.type.replace(/_/g, " ")}
                    </span>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Effective: {new Date(cfg.effectiveFrom).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-700">
                      {cfg.method === "PERCENTAGE" ? `${cfg.value}%` : `₹${Number(cfg.value).toLocaleString("en-IN")}`}
                    </span>
                    <span className="block text-[10px] uppercase font-bold text-slate-400">
                      {cfg.method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fee Mutation Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Adjust Platform Fee</h3>
            <p className="text-xs text-slate-500">
              Super Admin override. Automatically updates Redis key <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">fee_config:TYPE</code>.
            </p>

            <form onSubmit={handleUpdateFee} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee Type</label>
                <select
                  value={selectedFeeType}
                  onChange={(e) => setSelectedFeeType(e.target.value as FeeType)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="BUYER_PLATFORM_FEE">BUYER_PLATFORM_FEE</option>
                  <option value="SELLER_SUCCESS_FEE">SELLER_SUCCESS_FEE</option>
                  <option value="PURCHASE_PLATFORM_FEE">PURCHASE_PLATFORM_FEE</option>
                  <option value="RENTAL_TOKEN">RENTAL_TOKEN</option>
                  <option value="AUDIT_FEE">AUDIT_FEE</option>
                  <option value="MAINTENANCE_FEE">MAINTENANCE_FEE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFeeMethod("FLAT_AMOUNT")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      feeMethod === "FLAT_AMOUNT"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Flat Amount (₹ Flat)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeeMethod("PERCENTAGE")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      feeMethod === "PERCENTAGE"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-slate-50 text-slate-600 border-slate-200"
                    }`}
                  >
                    Percentage (%)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Value {feeMethod === "PERCENTAGE" ? "(%)" : "(INR ₹)"}
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={feeValue}
                  onChange={(e) => setFeeValue(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Audit Rationale / Reason
                </label>
                <textarea
                  value={feeReason}
                  onChange={(e) => setFeeReason(e.target.value)}
                  placeholder="e.g. Q4 promotional reduction or revised operational escrow costs"
                  rows={2}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
              >
                Apply Fee & Bust Cache 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* LEDGER TAB */}
      {activeTab === "ledger" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900 text-sm">Double-Entry Financial Ledger Stream</h3>
            <span className="text-xs text-slate-500">Immutable ledger entries</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="p-4">Entry ID</th>
                  <th className="p-4">Transaction</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Event Code</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Notes</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {recentLedgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-sans">
                      No ledger entries recorded yet.
                    </td>
                  </tr>
                ) : (
                  recentLedgerEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-4 text-slate-500">{entry.id.substring(0, 8)}...</td>
                      <td className="p-4 font-bold text-slate-800">
                        {entry.transactionId.substring(0, 8)}...
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded font-sans font-bold text-[10px] ${
                            entry.entryType === "CREDIT"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {entry.entryType}
                        </span>
                      </td>
                      <td className="p-4 text-slate-700">{entry.eventCode}</td>
                      <td className="p-4 font-bold text-slate-900 font-sans">
                        ₹{Number(entry.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-slate-500 max-w-xs truncate font-sans">
                        {entry.notes || "-"}
                      </td>
                      <td className="p-4 text-slate-400 font-sans">
                        {new Date(entry.createdAt).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispute Resolution Modal */}
      {selectedDisputeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              Arbitrate Dispute: {resolutionAction.replace(/_/g, " ")}
            </h3>
            <p className="text-xs text-slate-500">
              Transaction ID: <span className="font-mono font-bold">{selectedDisputeId}</span>.
              This executes an atomic escrow ledger transfer.
            </p>

            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Detailed arbitration findings and compliance rationale..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedDisputeId(null);
                  setDisputeReason("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={handleResolveDispute}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                Execute Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
