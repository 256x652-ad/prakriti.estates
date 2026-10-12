"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Moon,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { formatIndianPrice } from "@/components/Cards/PropertyCard";

export interface StayCalendarProps {
  propertyId: string;
  basePrice: number;
  cancellationPolicy?: string;
}

export default function StayCalendar({
  propertyId,
  basePrice,
  cancellationPolicy = "Flexible",
}: StayCalendarProps) {
  const [bookedDates, setBookedDates] = useState<{ from: string; to: string }[]>([]);
  const [checkIn, setCheckIn] = useState<string>("");
  const [checkOut, setCheckOut] = useState<string>("");
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [pricing, setPricing] = useState<any>(null);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Fetch booked ranges
  useEffect(() => {
    async function loadAvailability() {
      try {
        const res = await fetch(`/api/v1/properties/${propertyId}/stay-availability`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) setBookedDates(json.data);
        }
      } catch (e) {
        console.warn("Could not load booked dates", e);
      }
    }
    loadAvailability();
  }, [propertyId]);

  // Recalculate pricing on date selection
  useEffect(() => {
    if (!checkIn || !checkOut || checkIn >= checkOut) {
      setPricing(null);
      return;
    }

    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const nights = Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) return;

    setLoadingPricing(true);
    // Instant real-time preview computation
    const gross = nights * basePrice;
    const cleaning = 1500;
    const discount = nights >= 7 ? Math.round(gross * 0.1) : 0;
    const taxable = gross + cleaning - discount;
    const gst = Math.round(taxable * 0.12);
    const total = taxable + gst;

    setPricing({
      nights,
      gross,
      cleaning,
      discount,
      gst,
      total,
    });
    setLoadingPricing(false);
  }, [checkIn, checkOut, basePrice]);

  const isDateBooked = (dateStr: string) => {
    return bookedDates.some((range) => dateStr >= range.from && dateStr < range.to);
  };

  const handleCheckout = async () => {
    setBookingLoading(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/v1/checkout/stay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          checkInDate: new Date(checkIn).toISOString(),
          checkOutDate: new Date(checkOut).toISOString(),
          guestsCount,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json?.error?.message || "Booking request failed");
      }

      setBookingSuccess(json.data);
    } catch (err: any) {
      setBookingError(err.message || "Failed to initiate booking");
    } finally {
      setBookingLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-premium p-6 space-y-6 font-sans">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-slate-100 pb-4">
        <div>
          <span className="text-2xl font-bold font-display text-emerald-800">
            {formatIndianPrice(basePrice)}
          </span>
          <span className="text-xs text-slate-500 font-medium ml-1">/ night</span>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Instant Confirmation
        </span>
      </div>

      {bookingError && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-none" />
          <span>{bookingError}</span>
        </div>
      )}

      {bookingSuccess ? (
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span>Reservation Initiated!</span>
          </div>
          <p className="text-xs text-slate-600">
            Gateway Order <span className="font-mono font-bold">{bookingSuccess.orderId}</span> created. Total Payable:{" "}
            <span className="font-bold text-emerald-800">
              ₹{(bookingSuccess.amountInPaise / 100).toLocaleString("en-IN")}
            </span>
          </p>
          <div className="text-[11px] text-slate-500">
            Locked temporarily for your session. Proceeding to digital payment...
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Date Range Picker */}
          <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">
                Check-in
              </label>
              <input
                type="date"
                min={new Date().toISOString().split("T")[0]}
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">
                Check-out
              </label>
              <input
                type="date"
                min={checkIn || new Date().toISOString().split("T")[0]}
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full bg-white px-3 py-2 rounded-xl text-xs font-semibold text-slate-800 border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Guests Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Guests</label>
            <select
              value={guestsCount}
              onChange={(e) => setGuestsCount(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value={1}>1 Guest</option>
              <option value={2}>2 Guests</option>
              <option value={4}>4 Guests (Family Suite)</option>
              <option value={6}>6 Guests (Full Villa)</option>
            </select>
          </div>

          {/* Real-time Pricing Breakdown */}
          {pricing && (
            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>
                  {formatIndianPrice(basePrice)} x {pricing.nights} nights
                </span>
                <span className="font-semibold text-slate-900">
                  ₹{pricing.gross.toLocaleString("en-IN")}
                </span>
              </div>

              {pricing.discount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Long Stay Discount (10% off)</span>
                  <span>-₹{pricing.discount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>Hospitality Sanitation Fee</span>
                <span className="font-semibold text-slate-900">₹{pricing.cleaning}</span>
              </div>

              <div className="flex justify-between">
                <span>Taxes (Hospitality GST 12%)</span>
                <span className="font-semibold text-slate-900">₹{pricing.gst}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                <span>Total Payable</span>
                <span className="text-emerald-800 font-display text-base">
                  ₹{pricing.total.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* Reserve CTA */}
          <button
            onClick={handleCheckout}
            disabled={!pricing || bookingLoading}
            className="w-full py-3.5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {bookingLoading ? (
              "Securing Dates..."
            ) : (
              <>
                Reserve Stay (Zero Double-Booking) <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Policy footer */}
          <div className="pt-2 text-[11px] text-slate-400 text-center flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Policy: {cancellationPolicy} (Full refund up to 48h prior)</span>
          </div>
        </div>
      )}
    </div>
  );
}
