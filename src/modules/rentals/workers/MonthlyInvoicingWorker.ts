import { Job } from "bullmq";
import { monthlyInvoicingService } from "../services/MonthlyInvoicingService";
import { Queues, createWorker } from "@/modules/workers/QueueManager";

/**
 * BullMQ Worker: Runs recurringly on the 1st of every month (0 0 1 * *)
 * to generate immutable MonthlyInvoices for all active tenancies.
 */
export class MonthlyInvoicingWorker {
  private worker;

  constructor() {
    this.worker = createWorker(
      "scheduled-tasks",
      async (job: Job) => {
        if (job.name === "MONTHLY_INVOICING_CRON") {
          const billingDate = job.data?.billingDate ? new Date(job.data.billingDate) : new Date();
          console.log(
            `[MonthlyInvoicingWorker] Generating invoices for period: ${billingDate.toISOString()}...`
          );
          const result = await monthlyInvoicingService.generateMonthlyRentInvoices(billingDate);
          console.log(`[MonthlyInvoicingWorker] Successfully generated ${result.generatedCount} invoices.`);
          return result;
        }
      },
      1
    );

    // Schedule repeatable monthly cron job on the 1st of every month at midnight
    Queues.ScheduledTasks.upsertJobScheduler(
      "repeatable-monthly-invoicing-cron",
      { pattern: "0 0 1 * *" },
      { name: "MONTHLY_INVOICING_CRON", data: {} }
    ).catch((err) => {
      console.warn("[MonthlyInvoicingWorker] Schedule registration warning:", err.message);
    });
  }

  public getWorker() {
    return this.worker;
  }
}

export const monthlyInvoicingWorker = new MonthlyInvoicingWorker();
