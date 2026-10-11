import { Queue, Worker, DefaultJobOptions, Job } from "bullmq";
import { prisma } from "@/infrastructure/database/prisma";
import IORedis from "ioredis";

// Centralized Redis Connection with null maxRetriesPerRequest required by BullMQ
export const redisConnection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/**
 * STRATEGY: EXPONENTIAL BACKOFF & DEAD LETTER QUEUE (DLQ)
 * 5 retry attempts with exponential delays (2s, 4s, 8s, 16s, 32s).
 * If all 5 attempts fail, job is routed to the DeadLetterQueue and logged to OutboxEvent in PostgreSQL.
 */
export const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
  removeOnComplete: true, // Keep Redis memory clean
  removeOnFail: false,    // Retain failed jobs in BullMQ failed state
};

// 1. QUEUE TOPOLOGY: Segmented by Domain, SLA, and Dead Lettering
export const Queues = {
  // High-priority omnichannel notifications (SMS, Push, transactional emails)
  Notifications: new Queue("high-priority-notifications", {
    connection: redisConnection,
    defaultJobOptions,
  }),

  // Domain Event bus populated by Outbox Relay
  DomainEvents: new Queue("domain-events", {
    connection: redisConnection,
    defaultJobOptions,
  }),

  // CPU-heavy document generation (PDF receipts, reports)
  DocumentGeneration: new Queue("document-generation", {
    connection: redisConnection,
    defaultJobOptions,
  }),

  // Financial ledger reconciliation & escrow payouts
  FinancialReconciliation: new Queue("financial-reconciliation", {
    connection: redisConnection,
    defaultJobOptions,
  }),

  // Recurring cron schedules (Lock expiration, Monthly invoices)
  ScheduledTasks: new Queue("scheduled-tasks", {
    connection: redisConnection,
    defaultJobOptions,
  }),

  // DEAD LETTER QUEUE (DLQ) for permanently failed jobs after all retries exhausted
  DeadLetterQueue: new Queue("dead-letter-queue", {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: false,
      removeOnFail: false,
    },
  }),
};

/**
 * Standard Worker Factory with DLQ Forwarding
 */
export function createWorker(
  queueName: string,
  processor: (job: Job) => Promise<any>,
  concurrency: number = 5
) {
  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency,
  });

  worker.on("completed", (job) => {
    console.log(`[Worker:${queueName}] Job #${job.id} [${job.name}] completed successfully.`);
  });

  worker.on("failed", async (job, err) => {
    if (!job) return;

    const attemptsExhausted = job.attemptsMade >= (job.opts.attempts || 5);

    if (attemptsExhausted) {
      console.error(
        `[Worker:${queueName}] Job #${job.id} PERMANENTLY EXHAUSTED (${job.attemptsMade} attempts). Moving to DLQ. Error: ${err.message}`
      );

      try {
        // 1. Route to BullMQ Dead Letter Queue for monitoring and replay
        await Queues.DeadLetterQueue.add(`DLQ_${queueName}_${job.name}`, {
          originalQueue: queueName,
          jobId: job.id,
          jobName: job.name,
          data: job.data,
          failedReason: err.message,
          stackTrace: err.stack,
          attemptsMade: job.attemptsMade,
          failedAt: new Date().toISOString(),
        });

        // 2. If backed by OutboxEvent in PostgreSQL, flag as FAILED
        if (job.data?.outboxEventId) {
          await prisma.outboxEvent.update({
            where: { id: job.data.outboxEventId },
            data: {
              status: "FAILED",
              error: `DLQ_PERMANENT_FAILURE: ${err.message}`,
            },
          });
        }
      } catch (dlqErr: any) {
        console.error(`[Worker:${queueName}] Failed to dispatch to DLQ:`, dlqErr.message);
      }
    } else {
      console.warn(
        `[Worker:${queueName}] Job #${job.id} failed attempt ${job.attemptsMade}/${job.opts.attempts}. Retrying with exponential backoff... Error: ${err.message}`
      );
    }
  });

  return worker;
}

/**
 * Helper to inspect Dead Letter Queue jobs
 */
export async function getDlqJobs(limit: number = 50) {
  return await Queues.DeadLetterQueue.getJobs(["waiting", "active", "completed", "failed"], 0, limit);
}
