"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Home,
  Receipt,
  Wrench,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Download,
  CreditCard,
  PlusCircle,
  Clock,
} from "lucide-react";
import Link from "next/link";

export default function TenantRentalsDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<any[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Mock Active Tenancy for demonstration
  const activeLease = {
    id: "lease_sample_delhi_01",
    propertyTitle: "Vaastu-Compliant 3 BHK High-Rise in Golf Course Road",
    monthlyRent: 48000,
    deposit: 96000,
    startDate: "01 Nov 2026",
    endDate: "30 Sep 2027",
    landlordName: "Sunita Sharma",
  };

  const pendingInvoice = {
    id: "inv_curr_month_01",
    month: "November 2026",
    rentAmount: 48000,
    maintenance: 2400,
    gst: 432,
    reimbursementCredit: 1500,
    totalPayable: 49332,
    dueDate: "05 Nov 2026",
    status: "ISSUED",
  };

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/maintenance");
      if (res.ok) {
        const json = await res.json();
        if (json.success) setTickets(json.data);
      }
    } catch (e) {
      console.warn("Tickets fetch error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingTicket(true);
    setTicketSuccess(false);

    try {
      const res = await fetch("/api/v1/maintenance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenancyId: "00000000-0000-0000-0000-000000000001", // fallback UUID
          title: newTitle,
          description: newDescription,
        }),
      });

      if (res.ok) {
        setTicketSuccess(true);
        setNewTitle("");
        setNewDescription("");
        fetchTickets();
      }
    } catch (err) {
      console.error("Ticket submission error", err);
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏡</span> Tenant Rental & Tenancy Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your lease agreement, download compliant HRA receipts, and submit maintenance tickets.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Lease Active (11 Months)
        </div>
      </div>

      {/* Grid: Active Lease Overview & Current Invoice */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Lease Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-700" /> Active Rental Property
            </h2>
            <span className="text-xs font-mono font-semibold text-slate-400">ID: {activeLease.id}</span>
          </div>

          <p className="text-base font-semibold text-slate-800">{activeLease.propertyTitle}</p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Monthly Rent</p>
              <p className="text-lg font-bold text-emerald-800 font-display">₹{activeLease.monthlyRent.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Security Deposit</p>
              <p className="text-sm font-semibold text-slate-700">₹{activeLease.deposit.toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Lease Period</p>
              <p className="text-xs font-semibold text-slate-700">{activeLease.startDate} – {activeLease.endDate}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase">Landlord</p>
              <p className="text-xs font-semibold text-slate-700">{activeLease.landlordName}</p>
            </div>
          </div>
        </div>

        {/* Current Monthly Invoice & HRA Download */}
        <div className="bg-slate-900 text-white rounded-2xl shadow-premium p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5"><Receipt className="w-4 h-4 text-emerald-400" /> Current Invoice</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold text-[10px]">DUE IN 5 DAYS</span>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-xs text-slate-400">Billing Period: {pendingInvoice.month}</p>
              <p className="text-2xl font-bold font-display text-emerald-400">
                ₹{pendingInvoice.totalPayable.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="mt-4 text-xs space-y-1 text-slate-300 border-t border-slate-800 pt-3">
              <div className="flex justify-between"><span>Base Rent:</span><span>₹{pendingInvoice.rentAmount}</span></div>
              <div className="flex justify-between"><span>Society Upkeep:</span><span>₹{pendingInvoice.maintenance}</span></div>
              <div className="flex justify-between text-emerald-300 font-medium">
                <span>Maintenance Credit:</span><span>-₹{pendingInvoice.reimbursementCredit}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <button className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer">
              <CreditCard className="w-4 h-4" /> Pay Rent Online (Razorpay)
            </button>
            <Link
              href={`/api/v1/invoices/${pendingInvoice.id}/receipt?format=pdf`}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Download Tax HRA Receipt (PDF)
            </Link>
          </div>
        </div>
      </div>

      {/* Maintenance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Submission Form */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-emerald-700" /> Request Maintenance
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Repairs approved by your landlord will be credited directly to your next rent invoice.
            </p>
          </div>

          {ticketSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              ✓ Maintenance request submitted! Awaiting landlord review.
            </div>
          )}

          <form onSubmit={handleCreateTicket} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Issue Title</label>
              <input
                type="text"
                required
                placeholder="e.g. Master Bedroom Geyser Leakage"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Cost Estimate</label>
              <textarea
                required
                rows={3}
                placeholder="Plumber quoted ₹1,500 for replacement valve..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingTicket}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> {isSubmittingTicket ? "Submitting..." : "Submit Ticket"}
            </button>
          </form>
        </div>

        {/* Maintenance History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Maintenance Tickets & Reimbursement Log</h3>
          {loading ? (
            <p className="text-xs text-slate-400">Loading tickets...</p>
          ) : tickets.length === 0 ? (
            <div className="text-center py-8 text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="text-xs font-medium">No open maintenance issues recorded.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tickets.map((t) => (
                <div key={t.id} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t.title}</p>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>
                    <span className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {t.status}
                    </span>
                    {t.approvedCost && (
                      <p className="text-xs font-bold text-emerald-700 mt-1">₹{t.approvedCost} credited</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
