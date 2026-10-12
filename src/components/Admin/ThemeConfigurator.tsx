"use client";

import React, { useState } from "react";
import { updateThemeConfigurationAction } from "@/modules/admin/actions/themeAdminActions";

interface ThemeData {
  primaryColor: string;
  secondaryColor: string;
  backgroundLight: string;
  backgroundDark: string;
  enableDarkMode: boolean;
}

export default function ThemeConfigurator({ initialTheme }: { initialTheme: ThemeData }) {
  const [theme, setTheme] = useState<ThemeData>(initialTheme);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(false);
    try {
      await updateThemeConfigurationAction(theme);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 4000);
    } catch (err: any) {
      alert("Failed to save theme: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Editor Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">System Color Tokens</h3>
          <p className="text-xs text-slate-500">
            Define global hex values for the platform design system and CSS variables.
          </p>
        </div>

        {successMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-bold flex items-center gap-2">
            <span>✓</span> Theme configuration updated and published across all pages!
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Primary Brand Color (Emerald / Accent)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                placeholder="#22c55e"
                className="flex-1 text-xs p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Secondary Color (Headers / Dark Accents)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.secondaryColor}
                onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={theme.secondaryColor}
                onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                placeholder="#0f172a"
                className="flex-1 text-xs p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Background Light Tone
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.backgroundLight}
                onChange={(e) => setTheme({ ...theme, backgroundLight: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={theme.backgroundLight}
                onChange={(e) => setTheme({ ...theme, backgroundLight: e.target.value })}
                placeholder="#f8fafc"
                className="flex-1 text-xs p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Background Dark Tone
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.backgroundDark}
                onChange={(e) => setTheme({ ...theme, backgroundDark: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
              />
              <input
                type="text"
                value={theme.backgroundDark}
                onChange={(e) => setTheme({ ...theme, backgroundDark: e.target.value })}
                placeholder="#020617"
                className="flex-1 text-xs p-2.5 font-mono border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={theme.enableDarkMode}
                onChange={(e) => setTheme({ ...theme, enableDarkMode: e.target.checked })}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-800">
                Enable Global Dark Mode Toggle in Header
              </span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
        >
          {isSaving ? "Publishing Changes..." : "Save & Update Theme Engine 🎨"}
        </button>
      </form>

      {/* Live Preview Card */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base">Realtime Preview Matrix</h3>
        <div
          className="p-6 rounded-3xl border shadow-sm space-y-5 transition-colors"
          style={{
            backgroundColor: theme.backgroundLight,
            borderColor: theme.secondaryColor + "33",
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-lg font-black tracking-wider"
              style={{ color: theme.secondaryColor }}
            >
              PRAKRITI <span style={{ color: theme.primaryColor }}>ESTATES</span>
            </span>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full text-white shadow-sm"
              style={{ backgroundColor: theme.primaryColor }}
            >
              Certified Green
            </span>
          </div>

          <div
            className="p-4 rounded-2xl border bg-white"
            style={{ borderColor: theme.primaryColor + "40" }}
          >
            <h4 className="font-bold text-sm" style={{ color: theme.secondaryColor }}>
              Luxury Himalayan Eco Villa
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Live token color binding simulated with CSS variable inputs.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: theme.primaryColor }}
              >
                Book Inspection
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: theme.secondaryColor }}
              >
                View Ledger
              </button>
            </div>
          </div>

          <div
            className="p-4 rounded-2xl text-xs font-mono text-white"
            style={{ backgroundColor: theme.backgroundDark }}
          >
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">
              Dark Mode Palette
            </p>
            <p>Background: {theme.backgroundDark}</p>
            <p>Accent: {theme.primaryColor}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
