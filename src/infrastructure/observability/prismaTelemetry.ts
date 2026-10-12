import { logger } from "./logger";

/**
 * Prisma Metrics & Telemetry Collector
 * Interfaces with Prisma Client runtime metrics and query events.
 */
export interface PrismaEngineMetrics {
  timestamp: string;
  counters: Array<{ key: string; value: number }>;
  gauges: Array<{ key: string; value: number }>;
  histograms: Array<{ key: string; value: { buckets: [number, number][]; count: number; sum: number } }>;
}

export class PrismaTelemetryService {
  /**
   * Scrapes Prisma internal telemetry (pool connections, wait duration, query latency)
   * requires: previewFeatures = ["metrics"] in schema.prisma
   */
  public async scrapePrismaMetrics(prismaClient: any): Promise<PrismaEngineMetrics | null> {
    try {
      if (typeof prismaClient.$metrics?.json === "function") {
        const metrics = await prismaClient.$metrics.json();
        
        // Check for connection pool exhaustion
        const activeConnections = metrics.gauges?.find(
          (g: any) => g.key === "prisma_client_queries_active"
        )?.value || 0;

        const waitDuration = metrics.histograms?.find(
          (h: any) => h.key === "prisma_client_queries_wait_duration_ms"
        );

        if (activeConnections > 18) {
          logger.warn(`[Prisma Pool High] Active database connections near limit: ${activeConnections}`, {
            component: "PrismaTelemetry",
            activeConnections,
          });
        }

        if (waitDuration && waitDuration.value.sum / (waitDuration.value.count || 1) > 100) {
          logger.warn("[Prisma Slow Query Wait] Database connection acquisition latency exceeded 100ms", {
            component: "PrismaTelemetry",
            avgWaitMs: waitDuration.value.sum / (waitDuration.value.count || 1),
          });
        }

        return metrics;
      }
      return null;
    } catch (error) {
      logger.error("Failed to scrape Prisma metrics", { component: "PrismaTelemetry" }, error);
      return null;
    }
  }

  /**
   * Helper to attach query event listeners for logging queries exceeding threshold
   */
  public attachSlowQueryLogger(prismaClient: any, thresholdMs: number = 200) {
    if (typeof prismaClient.$on === "function") {
      prismaClient.$on("query", (e: any) => {
        if (e.duration >= thresholdMs) {
          logger.warn(`[Slow Query Detected] Query took ${e.duration}ms`, {
            component: "PrismaTelemetry",
            durationMs: e.duration,
            query: e.query,
            params: e.params,
          });
        }
      });
    }
  }
}

export const prismaTelemetry = new PrismaTelemetryService();
