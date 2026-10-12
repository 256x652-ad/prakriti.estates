"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Building2,
  Users,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Wrench,
  ShieldAlert,
} from "lucide-react";

export default function LandlordManagedPropertiesDashboard() {
  const { data: session } = useSession();

  // Mock Managed Tenancies and Pending Maintenance
  const [managedTenancies, setManagedTenancies] = useState([
    {
      id: "tenancy_golf_course_01",
      propertyTitle: "Luxury 3 BHK in Golf Course Road, Gurugram",
      tenantName: "Arjun Kapoor",
      tenantPhone: "+91 98765 43210",
      monthlyRent: 48000,
      rentStatus: "PAID",
      leaseExpiry: "30 Sep 2027",
    },
    {
      id: "tenancy_taramandal_02",
      propertyTitle: "Biophilic Villa in Taramandal, Gorakhpur",
      tenantName: "Pooja Singhal",
      tenantPhone: "+91 98111 22334",
      monthlyRent: 28000,
      rentStatus: "DUE_IN_3_DAYS",
      leaseExpiry: "15 Dec 2027",
    },
  ]);

  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: "maint_ticket_001",
      tenancyId: "tenancy_golf_course_01",
      property: "Golf Course Road 3 BHK",
      issue: "Main Water Inflow Pressure Pump Repair",
      tenantClaim: 2400,
      status: "AWAITING_APPROVAL",
    },
  ]);

  const [approvalAmount, setApprovalAmount] = useState<number>(2400);

  const handleApproveTicket = async (ticketId: string) => {
    try {
      const res = await fetch("/api/v1/maintenance", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status: "APPROVED",
          approvedCost: approvalAmount,
        }),
      });

      if (res.ok) {
        setPendingApprovals((prev) => prev.filter((p) => p.id !== ticketId));
      }
    } catch (err) {
      console.error("Failed to approve ticket", err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏢</span> Landlord Managed Properties & Tenancies
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time rent collection, approve tenant maintenance deductions, and view active lease agreements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            Total Monthly Yield: ₹76,000 / mo
          </span>
        </div>
      </div>

      {/* Grid: Active Tenancies */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-emerald-700" /> Active Rented Portfolios
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {managedTenancies.map((tenancy) => (
            <div
              key={tenancy.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 hover:border-emerald-500 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{tenancy.propertyTitle}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Lease Expiry: {tenancy.leaseExpiry}</p>
                </div>
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    tenancy.rentStatus === "PAID"
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                >
                  {tenancy.rentStatus === "PAID" ? "Rent Received" : "Due Soon"}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Tenant Details</p>
                  <p className="text-xs font-bold text-slate-800">{tenancy.tenantName}</p>
                  <p className="text-[11px] text-slate-400 font-mono">{tenancy.tenantPhone}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-semibold uppercase">Monthly Rent</p>
                  <p className="text-lg font-bold text-emerald-800 font-display">
                    ₹{tenancy.monthlyRent.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Maintenance Approvals */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-700" /> Pending Maintenance Deductions
          </h2>
          <span className="text-xs text-slate-400 font-medium">
            Approving credits will deduct from the tenant&apos;s next monthly invoice
          </span>
        </div>

        {pendingApprovals.length === 0 ? (
          <div className="text-center py-8 text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
            <p className="text-xs font-semibold">No pending maintenance approvals required.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingApprovals.map((ticket) => (
              <div key={ticket.id} className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900">{ticket.issue}</p>
                  <p className="text-[11px] text-slate-500">{ticket.property}</p>
                  <p className="text-xs font-semibold text-slate-700">
                    Tenant Claimed Cost: <span className="font-bold text-emerald-700">₹{ticket.tenantClaim}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={approvalAmount}
                    onChange={(e) => setApprovalAmount(Number(e.target.value))}
                    className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold outline-none"
                  />
                  <button
                    onClick={() => handleApproveTicket(ticket.id)}
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Approve Credit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
