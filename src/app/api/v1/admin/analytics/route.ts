import { NextRequest, NextResponse } from "next/server";
import { analyticsService, AnalyticsTimeframe } from "@/modules/analytics/services/AnalyticsService";
import { platformHealthReportWorker } from "@/modules/analytics/workers/PlatformHealthReportWorker";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const timeframeParam = (searchParams.get("timeframe") || "30d") as AnalyticsTimeframe;
    const bypassCache = searchParams.get("bypassCache") === "true";

    const validTimeframes: AnalyticsTimeframe[] = ["24h", "7d", "30d", "90d", "all"];
    const timeframe = validTimeframes.includes(timeframeParam) ? timeframeParam : "30d";

    const [overview, funnel, trends, breakdown] = await Promise.all([
      analyticsService.getPlatformOverviewMetrics(timeframe, bypassCache),
      analyticsService.getConversionFunnelMetrics(timeframe, bypassCache),
      analyticsService.getRevenueTrendMetrics(timeframe, bypassCache),
      analyticsService.getTransactionBreakdownMetrics(timeframe, bypassCache),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview,
        funnel,
        trends,
        breakdown,
      },
    });
  } catch (error: any) {
    console.error("[API:AdminAnalytics] Error fetching BI metrics:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load analytics data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "purge-cache") {
      await analyticsService.invalidateAnalyticsCache();
      return NextResponse.json({
        success: true,
        message: "Redis analytics cache purged successfully.",
      });
    }

    if (action === "trigger-health-report") {
      const summary = await platformHealthReportWorker.executeNow();
      return NextResponse.json({
        success: true,
        message: "Daily Platform Health Report generated and dispatched.",
        data: summary,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Supported: 'purge-cache', 'trigger-health-report'" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[API:AdminAnalytics] Action error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process analytics command" },
      { status: 500 }
    );
  }
}
