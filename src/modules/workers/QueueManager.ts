import { Queue, Worker, DefaultJobOptions, Job } from "bullmq";
import { prisma } from "@/infrastructure/database/prisma";
import IORedis from "ioredis";

// Centralized Redis Connection
export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/**
 * STRATEGY: EXPONENTIAL BACKOFF & DLQ
 * If an external API fails, the worker will retry 5 times.
 * Retries are exponentially delayed: 2s, 4s, 8s, 16s, 32s.
 * If all 5 fail, BullMQ automatically moves the job to the "failed" set (acting as our DLQ).
 */
const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000, 
  },
  removeOnComplete: true, // Keep Redis clean
  removeOnFail: false,    // Keep failed jobs for Admin Review (DLQ)
};

// 1. QUEUE TOPOLOGY: Segmented by Domain and Priority
export const Queues = {
  // Ultra-fast tasks (SMS OTPs, Payment confirmations)
  Notifications: new Queue("high-priority-notifications", { connection: redisConnection, defaultJobOptions }),
  
  // CPU-heavy synchronous tasks (PDFs, Image resizing)
  DocumentGeneration: new Queue("document-generation", { connection: redisConnection, defaultJobOptions }),
  
  // CRITICAL: Escrow sync, payout processing
  FinancialReconciliation: new Queue("financial-reconciliation", { connection: redisConnection, defaultJobOptions }),
  
  // Low priority cron jobs (Nightly reports, abandoned cart emails)
  ScheduledTasks: new Queue("scheduled-tasks", { connection: redisConnection, defaultJobOptions }),
};

/**
 * Abstract Worker Initialization Logic
 * Attaches standard error handling and DLQ logging to every worker.
 */
export function createWorker(queueName: string, processor: (job: Job) => Promise<void>, concurrency: number = 5) {
  const worker = new Worker(queueName, processor, { 
    connection: redisConnection,
    concurrency 
  });

  worker.on("completed", (job) => {
    console.log(`[Worker - ${queueName}] Job ${job.id} completed successfully.`);
  });

  worker.on("failed", async (job, err) => {
    console.error(`[Worker - ${queueName}] Job ${job?.id} FAILED after all retries:`, err.message);
    
    // DEAD LETTER STRATEGY: Log to PostgreSQL so Admins can view it in the Dashboard
    if (job && job.data.outboxEventId) {
      await prisma.outboxEvent.update({
        where: { id: job.data.outboxEventId },
        data: { 
          status: "FAILED", 
          error: `DLQ: ${err.message}` 
        }
      });
    }
  });

  return worker;
}
