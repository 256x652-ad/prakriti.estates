import { prismaReadOnly } from "@/infrastructure/database/prismaReadOnly";
import { Queues, createWorker, getDlqJobs } from "@/modules/workers/QueueManager";
import { notificationService } from "@/modules/notifications/services/NotificationService";
import { Job } from "bullmq";

export interface PlatformHealthSummary {
  reportDate: string;
  generatedAt: string;
  dailyGmv: number;
  dailyRevenue: number;
  dlqErrorsCount: number;
  kycTotalCount: number;
  kycRejectedCount: number;
  kycFailureRate: number;
  expiredLocksCount: number;
  status: "HEALTHY" | "ATTENTION_REQUIRED" | "CRITICAL";
}

export class PlatformHealthReportWorker {
  /**
   * Aggregates platform health, DLQ errors, and KYC failure rates over the last 24 hours
   */
  async generateDailyHealthReport(): Promise<PlatformHealthSummary> {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const todayStr = new Date().toISOString().split("T")[0];

    console.log(`[PlatformHealthReportWorker] Generating Daily Health Report for ${todayStr}...`);

    // 1. DLQ Error Rate from BullMQ Dead Letter Queue
    let dlqErrorsCount = 0;
    try {
      const dlqJobs = await getDlqJobs(100);
      // Count jobs failed or added to DLQ in the last 24 hours
      dlqErrorsCount = dlqJobs.filter((job) => {
        const timestamp = job.timestamp || job.data?.failedAt;
        if (!timestamp) return true;
        const jobDate = typeof timestamp === "string" ? new Date(timestamp) : new Date(timestamp);
        return jobDate >= oneDayAgo;
      }).length;
    } catch (err: any) {
      console.warn("[PlatformHealthReportWorker] DLQ inspection error:", err.message);
    }

    // 2. KYC Verification Failure Rate (Last 24 Hours)
    const [kycTotalCount, kycRejectedCount] = await Promise.all([
      prismaReadOnly.kycVerification.count({
        where: { createdAt: { gte: oneDayAgo } },
      }),
      prismaReadOnly.kycVerification.count({
        where: {
          status: "REJECTED",
          updatedAt: { gte: oneDayAgo },
        },
      }),
    ]);

    const kycFailureRate =
      kycTotalCount > 0
        ? Math.round((kycRejectedCount / kycTotalCount) * 1000) / 10
        : 0;

    // 3. Platform 24h GMV and Platform Revenue
    const dailyTx = await prismaReadOnly.ledgerTransaction.findMany({
      where: {
        status: "COMPLETED",
        createdAt: { gte: oneDayAgo },
      },
      select: { amount: true },
    });

    const dailyGmv = dailyTx.reduce((acc, tx) => acc + Number(tx.amount), 0);
    const dailyRevenue = Math.round(dailyGmv * 0.035);

    // 4. Expired locks in last 24 hours
    const expiredLocksCount = await prismaReadOnly.propertyLock.count({
      where: {
        status: "EXPIRED",
        updatedAt: { gte: oneDayAgo },
      },
    });

    // Determine platform operational health grade
    let status: PlatformHealthSummary["status"] = "HEALTHY";
    if (dlqErrorsCount > 10 || kycFailureRate > 25) {
      status = "CRITICAL";
    } else if (dlqErrorsCount > 0 || kycFailureRate > 15) {
      status = "ATTENTION_REQUIRED";
    }

    const summary: PlatformHealthSummary = {
      reportDate: todayStr,
      generatedAt: new Date().toISOString(),
      dailyGmv,
      dailyRevenue,
      dlqErrorsCount,
      kycTotalCount,
      kycRejectedCount,
      kycFailureRate,
      expiredLocksCount,
      status,
    };

    // 5. Dispatch Omnichannel Notification (Email/Slack/Push) to Super Admin
    await notificationService.sendDailyPlatformHealthReport(summary);

    console.log(
      `[PlatformHealthReportWorker] Health Report successfully generated and dispatched. Status: ${status}`
    );

    return summary;
  }

  /**
   * Initializes BullMQ worker and schedules daily cron at 08:00 AM UTC
   */
  startScheduledWorker() {
    createWorker(
      "scheduled-tasks",
      async (job: Job) => {
        if (job.name === "DAILY_PLATFORM_HEALTH_REPORT") {
          return await this.generateDailyHealthReport();
        }
      },
      1
    );

    // Register repeatable job in BullMQ (Every day at 8:00 AM)
    Queues.ScheduledTasks.upsertJobScheduler(
      "repeatable-daily-health-report",
      { pattern: "0 8 * * *" },
      { name: "DAILY_PLATFORM_HEALTH_REPORT", data: {} }
    ).catch((err) => {
      console.warn("[PlatformHealthReportWorker] Scheduler registration warning:", err.message);
    });
  }

  /**
   * Direct execution helper for admin testing or manual trigger
   */
  async executeNow(): Promise<PlatformHealthSummary> {
    return await this.generateDailyHealthReport();
  }
}

export const platformHealthReportWorker = new PlatformHealthReportWorker();
