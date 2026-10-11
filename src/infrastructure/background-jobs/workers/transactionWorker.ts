import { Worker, Job } from "bullmq";
import { redisClient } from "../../redis/redisClient";
import { InvoiceJobData, ConsultantNotificationJobData } from "../queue";

export const transactionWorker = new Worker(
  "transaction-jobs",
  async (job: Job) => {
    switch (job.name) {
      case "send-invoice": {
        const data = job.data as InvoiceJobData;
        console.log(`[Job: send-invoice] Generating and emailing invoice for Transaction: ${data.transactionId}`);
        // 1. Generate PDF
        // 2. Upload to S3 (Private Bucket)
        // 3. Send via Email Provider (e.g., Resend/Sendgrid)
        break;
      }
      case "notify-consultants": {
        const data = job.data as ConsultantNotificationJobData;
        console.log(`[Job: notify-consultants] Alerting Prakriti Consultants for Property: ${data.propertyId} [Type: ${data.serviceType}]`);
        // 1. Create Internal Ticket / Alert Engineering Team
        // 2. Send SMS to Lead Consultant
        break;
      }
      default:
        console.warn(`Unknown job name: ${job.name}`);
    }
  },
  { connection: redisClient }
);

transactionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

transactionWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});
