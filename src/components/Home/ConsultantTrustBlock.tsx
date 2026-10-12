"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Compass, CheckCircle2, ArrowRight } from "lucide-react";

export default function ConsultantTrustBlock() {
  return (
    <section className="bg-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Tech Accents */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        {/* Left Column: Authoritative Copy */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-500/40 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Prakriti Engineering Authority Wing</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Backed by IIT-Tier Engineering. <br />
            <span className="text-emerald-400">Zero Guesswork.</span>
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-xl leading-relaxed">
            Don’t risk your life’s savings on unverified structures. Our certified engineering wing
            conducts comprehensive beam stress audits, foundation load assessments, and Vastu compliance checks.
          </p>

          {/* Leader Card Profile */}
          <div className="bg-slate-800/80 border border-slate-700/80 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center gap-4 max-w-xl shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-2xl shadow-inner flex-shrink-0 border border-emerald-500/30">
              AKJ
            </div>
            <div className="space-y-1">
              <h3 className="font-black text-white text-lg">Er. Aditya Kumar Jaiswal</h3>
              <p className="text-xs text-emerald-400 font-bold">
                Chief Structural Engineer • M.Tech (Structural Engineering), IIT Delhi
              </p>
              <p className="text-[11px] text-slate-400">
                Senior RERA Independent Technical Auditor & Seismic Safety Specialist
              </p>
            </div>
          </div>

          {/* Feature Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Foundation Load & Concrete Ultrasonic Testing</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>100% Structural Vastu & Soil Bearing Analysis</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>RERA Clear Title & Encumbrance Verification</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Tamper-Proof Digital Engineering Deeds</span>
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-4">
            <Link
              href="/consultants"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-black text-sm text-white shadow-xl shadow-emerald-700/20 transition cursor-pointer"
            >
              <span>Request Property Audit</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Right Column: High-Impact Visual */}
        <div className="lg:col-span-5 relative h-[360px] sm:h-[440px] rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
          <Image
            src="https://images.unsplash.com/photo-1541888946425-d0fbb186156f?auto=format&fit=crop&w=1000&q=80"
            alt="Structural Engineering Inspection on Site"
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 420px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end p-6">
            <div className="bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 w-full text-xs">
              <span className="font-bold text-emerald-400 block mb-0.5">Physical Site Due-Diligence</span>
              <p className="text-slate-300 text-[11px]">
                Every Prakriti Certified listing includes a downloadable signed engineering certificate.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
