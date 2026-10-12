"use client";

import React, { useState } from "react";
import {
  PlatformOverviewMetrics,
  ConversionFunnelResponse,
  RevenueTrendPoint,
  TransactionBreakdownItem,
  AnalyticsTimeframe,
} from "@/modules/analytics/services/AnalyticsService";

interface AnalyticsDashboardProps {
  initialOverview: PlatformOverviewMetrics;
  initialFunnel: ConversionFunnelResponse;
  initialTrends: RevenueTrendPoint[];
  initialBreakdown: TransactionBreakdownItem[];
}

export default function AnalyticsDashboard({
  initialOverview,
  initialFunnel,
  initialTrends,
  initialBreakdown,
}: AnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<AnalyticsTimeframe>("30d");
  const [overview, setOverview] = useState<PlatformOverviewMetrics>(initialOverview);
  const [funnel, setFunnel] = useState<ConversionFunnelResponse>(initialFunnel);
  const [trends, setTrends] = useState<RevenueTrendPoint[]>(initialTrends);
  const [breakdown, setBreakdown] = useState<TransactionBreakdownItem[]>(initialBreakdown);
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Timeframe change handler
  const handleTimeframeChange = async (newTf: AnalyticsTimeframe) => {
    setTimeframe(newTf);
    setIsLoading(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/v1/admin/analytics?timeframe=${newTf}`);
      const json = await res.json();
      if (json.success) {
        setOverview(json.data.overview);
        setFunnel(json.data.funnel);
        setTrends(json.data.trends);
        setBreakdown(json.data.breakdown);
      }
    } catch (err: any) {
      console.error("Error updating timeframe:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Cache purge handler
  const handlePurgeCache = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "purge-cache" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage("⚡ Redis BI cache successfully cleared! Refreshing data...");
        // Re-fetch fresh
        await handleTimeframeChange(timeframe);
      }
    } catch (err: any) {
      setActionMessage("❌ Failed to purge cache: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger daily health report handler
  const handleTriggerHealthReport = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/admin/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "trigger-health-report" }),
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage(
          `✅ Daily Platform Health Report generated! DLQ Errors: ${json.data.dlqErrorsCount}, KYC Failure Rate: ${json.data.kycFailureRate}%`
        );
      }
    } catch (err: any) {
      setActionMessage("❌ Failed to run health report: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Controls & Timeframe Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Business Intelligence & Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              Read-Replica Isolated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time platform GMV, monetization take-rates, conversion funnels, and automated DLQ health monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Timeframe Buttons */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
            {(["24h", "7d", "30d", "90d", "all"] as AnalyticsTimeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => handleTimeframeChange(tf)}
                disabled={isLoading}
                className={`px-3 py-1.5 rounded-lg transition ${
                  timeframe === tf
                    ? "bg-white text-emerald-700 shadow-sm font-extrabold"
                    : "hover:text-slate-900"
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={handlePurgeCache}
            disabled={isLoading}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-300 transition flex items-center gap-1.5"
            title="Purge 15-minute Redis BI Cache"
          >
            <span>🔄 Purge Cache</span>
          </button>

          <button
            onClick={handleTriggerHealthReport}
            disabled={isLoading}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5"
          >
            <span>🏥 Trigger Health Report</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center justify-between">
          <span>{actionMessage}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-emerald-700 hover:text-emerald-950 font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* GMV Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Gross Merchandise Value (GMV)
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-emerald-100 text-emerald-800">
              +{overview.gmvGrowthPct}%
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            ₹{overview.totalGmv.toLocaleString("en-IN")}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <span>🌿 Total completed transactions</span>
          </div>
        </div>

        {/* Platform Revenue Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Platform Net Revenue
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-blue-100 text-blue-800">
              +{overview.revenueGrowthPct}%
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            ₹{overview.platformRevenue.toLocaleString("en-IN")}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Tokens, success fees, escrow, & VAS
          </div>
        </div>

        {/* MRR Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Monthly Recurring (MRR)
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-amber-100 text-amber-800">
              Active Leases
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            ₹{overview.mrr.toLocaleString("en-IN")}
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Rental commission & recurring fees
          </div>
        </div>

        {/* Active Users & Conversion */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Platform Users
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-black bg-purple-100 text-purple-800">
              30d Window
            </span>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            {overview.activeUsersCount} Users
          </div>
          <div className="mt-2 text-[11px] text-slate-400 font-medium">
            Funnel Conversion: <strong className="text-slate-700">{funnel.overallConversionRate}%</strong>
          </div>
        </div>
      </div>

      {/* Grid: Revenue Trends (Chart 1) & Transaction Split (Chart 3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Visualization 1: Revenue Trends Line Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Revenue Trends: GMV vs. Platform Revenue
              </h2>
              <p className="text-xs text-slate-500">
                Historical comparison over selected timeframe ({timeframe})
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> GMV
              </span>
              <span className="flex items-center gap-1.5 text-blue-600">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Platform Revenue
              </span>
            </div>
          </div>

          <RevenueTrendsSvgChart data={trends} />
        </div>

        {/* Visualization 3: Transaction Breakdown Donut Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-base font-bold text-slate-900">
                3. Revenue Breakdown by Stream
              </h2>
              <p className="text-xs text-slate-500">
                Distribution across Buy, Rent, Stay, & VAS Consultations
              </p>
            </div>
            <DonutChart breakdown={breakdown} />
          </div>

          <div className="mt-6 space-y-2.5 pt-4 border-t border-slate-100">
            {breakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-slate-700">{item.label}</span>
                </div>
                <div className="text-right">
                  <span className="font-black text-slate-900">
                    ₹{item.amount.toLocaleString("en-IN")}
                  </span>
                  <span className="text-slate-400 ml-1.5 font-bold">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visualization 2: Conversion Funnel Pipeline (Chart 2) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              2. Conversion Funnel: Property Booking Pipeline
            </h2>
            <p className="text-xs text-slate-500">
              Drop-off telemetry from initial listing view to completed transaction
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-500">End-to-End Conversion Rate: </span>
            <span className="text-sm font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {funnel.overallConversionRate}%
            </span>
          </div>
        </div>

        <ConversionFunnelVisualizer stages={funnel.stages} />
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// CHART 1: Interactive SVG Revenue Trends Dual Line/Area Chart
// -------------------------------------------------------------
function RevenueTrendsSvgChart({ data }: { data: RevenueTrendPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        No transaction history for this period.
      </div>
    );
  }

  const maxGmv = Math.max(...data.map((d) => d.gmv), 1000);
  const width = 640;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 35, left: 60 };

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const pointsGmv = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - (d.gmv / maxGmv) * chartH;
    return { x, y, data: d };
  });

  const pointsRev = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.platformRevenue * 15) / maxGmv) * chartH; // Scaled for visual contrast
    return { x, y, data: d };
  });

  const gmvPath = pointsGmv.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  const gmvArea = `${gmvPath} L ${pointsGmv[pointsGmv.length - 1].x} ${
    padding.top + chartH
  } L ${pointsGmv[0].x} ${padding.top + chartH} Z`;

  const revPath = pointsRev.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ""
  );

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
      >
        <defs>
          <linearGradient id="gmvGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
          const y = padding.top + chartH * (1 - pct);
          const val = Math.round(maxGmv * pct);
          return (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 font-sans"
              >
                ₹{val >= 100000 ? `${(val / 100000).toFixed(1)}L` : val}
              </text>
            </g>
          );
        })}

        {/* GMV Gradient Area */}
        <path d={gmvArea} fill="url(#gmvGradient)" />

        {/* GMV Stroke Line */}
        <path d={gmvPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

        {/* Platform Revenue Stroke Line */}
        <path
          d={revPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2"
          strokeDasharray="4 4"
          strokeLinecap="round"
        />

        {/* Data points & X Labels */}
        {pointsGmv.map((pt, idx) => (
          <g
            key={idx}
            className="cursor-pointer"
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Transparent hover target */}
            <rect
              x={pt.x - 15}
              y={padding.top}
              width={30}
              height={chartH}
              fill="transparent"
            />
            {/* GMV circle */}
            <circle
              cx={pt.x}
              cy={pt.y}
              r={hoverIndex === idx ? 5 : 3.5}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Rev circle */}
            <circle
              cx={pointsRev[idx].x}
              cy={pointsRev[idx].y}
              r={hoverIndex === idx ? 4.5 : 2.5}
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="1.5"
            />
            {/* X-axis date labels */}
            <text
              x={pt.x}
              y={height - 10}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 font-sans font-medium"
            >
              {pt.data.date}
            </text>
          </g>
        ))}
      </svg>

      {/* Tooltip Overlay */}
      {hoverIndex !== null && data[hoverIndex] && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900 text-white p-2.5 rounded-xl shadow-xl text-xs space-y-1"
          style={{
            left: `${((pointsGmv[hoverIndex].x) / width) * 100}%`,
            top: "10%",
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-bold text-slate-300 border-b border-slate-700 pb-1">
            {data[hoverIndex].date}
          </div>
          <div className="text-emerald-400 font-extrabold flex items-center justify-between gap-3">
            <span>GMV:</span>
            <span>₹{data[hoverIndex].gmv.toLocaleString("en-IN")}</span>
          </div>
          <div className="text-blue-300 font-bold flex items-center justify-between gap-3">
            <span>Revenue:</span>
            <span>₹{data[hoverIndex].platformRevenue.toLocaleString("en-IN")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// -------------------------------------------------------------
// CHART 2: Conversion Funnel Pipeline Visualizer
// -------------------------------------------------------------
function ConversionFunnelVisualizer({ stages }: { stages: ConversionFunnelResponse["stages"] }) {
  if (!stages || stages.length === 0) return null;

  return (
    <div className="space-y-4">
      {stages.map((stage, idx) => {
        const isFirst = idx === 0;
        const colorPalette = [
          "bg-emerald-500",
          "bg-teal-500",
          "bg-blue-500",
          "bg-indigo-500",
          "bg-purple-600",
        ];
        const barColor = colorPalette[idx % colorPalette.length];

        return (
          <div key={stage.stage} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] border border-slate-200">
                  {idx + 1}
                </span>
                <span className="font-bold text-slate-800">{stage.stage}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-black text-slate-900">
                  {stage.count.toLocaleString()} events
                </span>
                <span className="font-extrabold text-slate-500 w-12 text-right">
                  {stage.conversionRate}%
                </span>
                {!isFirst && stage.dropOffRate > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    -{stage.dropOffRate}% drop
                  </span>
                )}
              </div>
            </div>

            {/* Pipeline Width Bar */}
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div
                className={`h-full ${barColor} transition-all duration-500 rounded-full`}
                style={{ width: `${Math.max(stage.conversionRate, 5)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// -------------------------------------------------------------
// CHART 3: Interactive SVG Donut Chart
// -------------------------------------------------------------
function DonutChart({ breakdown }: { breakdown: TransactionBreakdownItem[] }) {
  const [hoverCategory, setHoverCategory] = useState<string | null>(null);

  const total = breakdown.reduce((acc, b) => acc + b.amount, 0);
  let cumulativeAngle = 0;

  // Render SVG donut segments using stroke-dasharray
  const size = 180;
  const radius = 65;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex flex-col items-center justify-center relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="select-none">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth={strokeWidth}
        />
        {breakdown.map((item) => {
          const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -cumulativeAngle;
          cumulativeAngle += (item.percentage / 100) * circumference;

          const isHovered = hoverCategory === item.category;

          return (
            <circle
              key={item.category}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-200 cursor-pointer"
              onMouseEnter={() => setHoverCategory(item.category)}
              onMouseLeave={() => setHoverCategory(null)}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
        })}
      </svg>

      {/* Center Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {hoverCategory || "Total"}
        </span>
        <span className="text-sm font-black text-slate-900 leading-tight">
          ₹{hoverCategory
            ? breakdown.find((b) => b.category === hoverCategory)?.amount.toLocaleString("en-IN")
            : total.toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}
