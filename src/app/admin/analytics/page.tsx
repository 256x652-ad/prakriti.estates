import React from "react";
import { analyticsService } from "@/modules/analytics/services/AnalyticsService";
import AnalyticsDashboard from "@/components/Admin/AnalyticsCharts";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Analytics & Business Intelligence | Prakriti Admin",
  description: "Platform GMV, monetization take-rates, conversion funnels, and DLQ health monitoring.",
};

export default async function AdminAnalyticsPage() {
  // Server-side initial data fetch via Read-Replica client with Redis cache
  const [overview, funnel, trends, breakdown] = await Promise.all([
    analyticsService.getPlatformOverviewMetrics("30d"),
    analyticsService.getConversionFunnelMetrics("30d"),
    analyticsService.getRevenueTrendMetrics("30d"),
    analyticsService.getTransactionBreakdownMetrics("30d"),
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <AnalyticsDashboard
        initialOverview={overview}
        initialFunnel={funnel}
        initialTrends={trends}
        initialBreakdown={breakdown}
      />
    </div>
  );
}
