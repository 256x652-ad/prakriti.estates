"use client";

import React, { useState } from "react";
import {
  bulkApprovePropertiesAction,
  suspendPropertyAction,
  overrideGoldPinAction,
} from "@/modules/admin/actions/moderationAdminActions";
import Link from "next/link";

interface PropertyItem {
  id: string;
  slug: string | null;
  title: string;
  type: string;
  price: string;
  lifecycleStatus: string;
  isPrakritiCertified: boolean;
  ownerName: string;
  ownerPhone: string;
  createdAt: string;
}

export default function PropertyModerationTable({ properties }: { properties: PropertyItem[] }) {
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [suspendModalId, setSuspendModalId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const filteredProperties = properties.filter((p) => {
    if (filter === "ALL") return true;
    return p.lifecycleStatus === filter;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    if (selectedIds.length === filteredProperties.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProperties.map((p) => p.id));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Are you sure you want to approve ${selectedIds.length} properties?`)) return;
    setIsProcessing(true);
    try {
      await bulkApprovePropertiesAction(selectedIds);
      setSelectedIds([]);
      window.location.reload();
    } catch (err: any) {
      alert("Bulk approval failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuspend = async (propertyId: string) => {
    if (!suspendReason.trim()) {
      alert("Please provide a reason for suspension");
      return;
    }
    setIsProcessing(true);
    try {
      await suspendPropertyAction(propertyId, suspendReason);
      setSuspendModalId(null);
      setSuspendReason("");
      window.location.reload();
    } catch (err: any) {
      alert("Suspension failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleGoldPin = async (propertyId: string, currentVal: boolean) => {
    const reason = prompt(
      currentVal
        ? "Reason for revoking Prakriti Gold Pin:"
        : "Reason for manual award of Prakriti Gold Pin:"
    );
    if (!reason) return;
    setIsProcessing(true);
    try {
      await overrideGoldPinAction(propertyId, !currentVal, reason);
      window.location.reload();
    } catch (err: any) {
      alert("Gold Pin update failed: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action and Filter Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING_APPROVAL", "PUBLISHED", "REJECTED", "ARCHIVED"].map((status) => (
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
        </div>

        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              disabled={isProcessing}
              onClick={handleBulkApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
            >
              Bulk Approve ({selectedIds.length})
            </button>
          )}
          <span className="text-xs text-slate-500 font-medium">
            Showing {filteredProperties.length} listings
          </span>
        </div>
      </div>

      {/* Properties Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredProperties.length > 0 &&
                      selectedIds.length === filteredProperties.length
                    }
                    onChange={selectAllVisible}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="p-4">Property</th>
                <th className="p-4">Type</th>
                <th className="p-4">Price</th>
                <th className="p-4">Owner</th>
                <th className="p-4">Status</th>
                <th className="p-4">Gold Pin</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProperties.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No properties match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredProperties.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(prop.id)}
                        onChange={() => toggleSelect(prop.id)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{prop.title}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{prop.id}</div>
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-slate-100 text-slate-700">
                        {prop.type}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      ₹{Number(prop.price).toLocaleString("en-IN")}
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-800">{prop.ownerName}</div>
                      <div className="text-[11px] text-slate-400">{prop.ownerPhone}</div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                          prop.lifecycleStatus === "PUBLISHED"
                            ? "bg-emerald-100 text-emerald-800"
                            : prop.lifecycleStatus === "PENDING_APPROVAL"
                            ? "bg-amber-100 text-amber-800"
                            : prop.lifecycleStatus === "REJECTED"
                            ? "bg-red-100 text-red-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {prop.lifecycleStatus}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleGoldPin(prop.id, prop.isPrakritiCertified)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition ${
                          prop.isPrakritiCertified
                            ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Click to toggle Gold Pin"
                      >
                        {prop.isPrakritiCertified ? "⭐ Certified" : "Uncertified"}
                      </button>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {prop.slug && (
                        <Link
                          href={`/property/${prop.slug}`}
                          target="_blank"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
                        >
                          View
                        </Link>
                      )}
                      {prop.lifecycleStatus !== "REJECTED" && (
                        <button
                          onClick={() => setSuspendModalId(prop.id)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 hover:bg-red-100 transition"
                        >
                          Suspend
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

      {/* Suspend Confirmation Modal */}
      {suspendModalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Suspend Listing</h3>
            <p className="text-xs text-slate-500">
              This will remove the property from the public marketplace and set status to REJECTED.
            </p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Reason for suspension (e.g. fraudulent ownership documents, misleading pricing)..."
              rows={3}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSuspendModalId(null);
                  setSuspendReason("");
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={isProcessing}
                onClick={() => handleSuspend(suspendModalId)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm disabled:opacity-50"
              >
                Confirm Takedown
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
