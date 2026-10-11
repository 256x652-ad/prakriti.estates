import React from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Prakriti Consultants | Engineering & Architecture",
  description: "Expert structural engineering, Vastu, and architectural services.",
};

export default function ConsultantsPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
            Prakriti Consultants
          </h1>
          <p className="mt-4 text-xl text-slate-600">
            Precision Engineering. Traditional Wisdom. Modern Architecture.
          </p>
          <div className="w-24 h-1 bg-[var(--theme-primary)] mx-auto mt-6 rounded"></div>
        </div>

        {/* Lead Engineer Profile */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-16 border border-slate-100">
          <div className="md:flex">
            <div className="md:flex-shrink-0 bg-slate-800 md:w-64 flex items-center justify-center p-8">
              {/* Placeholder for Headshot */}
              <div className="w-32 h-32 rounded-full border-4 border-[var(--theme-primary)] bg-slate-600 flex items-center justify-center text-white text-3xl font-bold">
                AJ
              </div>
            </div>
            <div className="p-8 md:p-10 flex flex-col justify-center">
              <div className="uppercase tracking-wide text-sm text-[var(--theme-primary)] font-bold">
                Chief Structural Engineer
              </div>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">Er. Aditya Jaiswal</h2>
              <div className="mt-3 flex items-center space-x-4 text-sm font-semibold text-slate-600">
                <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  B.Tech, HBTU Kanpur
                </span>
                <span className="bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  M.Tech, IIT Delhi
                </span>
              </div>
              <p className="mt-6 text-slate-600 leading-relaxed">
                Leading the engineering division at Prakriti Consultants, Er. Aditya Jaiswal brings rigorous academic excellence from India's top technical institutes. His expertise ensures that every property passing through our platform meets the highest standards of structural integrity and safety.
              </p>
            </div>
          </div>
        </div>

        {/* Services Grid */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-slate-900 mb-8 text-center">Value-Added Services</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Service 1 */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">📐</span>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Structural Audits & Space Frames</h4>
              <p className="text-slate-600">
                Comprehensive load-bearing analysis and advanced space frame designs for complex architectural structures, ensuring earthquake resilience and longevity.
              </p>
            </div>

            {/* Service 2 */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🧭</span>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">Vastu Compliance</h4>
              <p className="text-slate-600">
                Traditional Vastu Shastra consultations seamlessly integrated with modern floor plans to harmonize your living or commercial space.
              </p>
            </div>

            {/* Service 3 */}
            <div className="bg-white p-8 rounded-xl shadow-md border border-slate-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🏢</span>
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-3">3D Walkthroughs</h4>
              <p className="text-slate-600">
                High-fidelity 3D architectural rendering and virtual walkthroughs. Visualize your space before construction begins with photorealistic accuracy.
              </p>
            </div>

          </div>
        </div>

        {/* CTA */}
        <div className="bg-[var(--theme-secondary)] text-white rounded-2xl p-8 text-center shadow-inner">
          <h3 className="text-2xl font-bold mb-4">Need an Expert Opinion?</h3>
          <p className="mb-6 text-slate-300">Add an architectural or Vastu consultation to your property transaction today.</p>
          <button className="bg-[var(--theme-primary)] hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-colors">
            Request a Consultation
          </button>
        </div>

      </div>
    </div>
  );
}
