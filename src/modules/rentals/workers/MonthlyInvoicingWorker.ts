import { Worker, Job } from "bullmq";
import { monthlyInvoicingService } from "../services/MonthlyInvoicingService";

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
  password: process.env.REDIS_PASSWORD,
};

/**
 * BullMQ Worker: Runs recurringly on the 1st of every month
 * to generate immutable MonthlyInvoices for all active tenancies.
 */
export class MonthlyInvoicingWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      "MonthlyInvoicingQueue",
      async (job: Job) => {
        const billingDate = job.data?.billingDate ? new Date(job.data.billingDate) : new Date();
        console.log(`[MonthlyInvoicingWorker] Generating invoices for period: ${billingDate.toISOString()}...`);
        const result = await monthlyInvoicingService.generateMonthlyRentInvoices(billingDate);
        console.log(`[MonthlyInvoicingWorker] Successfully generated ${result.generatedCount} invoices.`);
        return result;
      },
      { connection: redisConnection }
    );

    this.worker.on("completed", (job) => {
      console.log(`[MonthlyInvoicingWorker] Job ${job.id} completed successfully.`);
    });

    this.worker.on("failed", (job, err) => {
      console.error(`[MonthlyInvoicingWorker] Job ${job?.id} failed with error:`, err);
    });
  }
}
