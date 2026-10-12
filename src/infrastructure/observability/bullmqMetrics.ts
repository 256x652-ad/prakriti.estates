import { Queue, QueueEvents, Worker } from "bullmq";
import { logger } from "./logger";

export interface QueueHealthMetrics {
  queueName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  dlqLength?: number;
  timestamp: string;
}

/**
 * BullMQ Observability Manager
 * Emits telemetry, detects stalled queues, and forwards dead-letter queue (DLQ) alerts.
 */
export class BullMQMetricsEmitter {
  private queueEventsMap = new Map<string, QueueEvents>();

  /**
   * Attach lifecycle listeners to a BullMQ Queue to monitor stalled jobs, DLQ submissions, and failures
   */
  public instrumentQueue(queue: Queue, dlqQueue?: Queue) {
    const queueName = queue.name;

    // Attach QueueEvents for real-time lifecycle hooks
    const queueEvents = new QueueEvents(queueName, {
      connection: queue.opts.connection,
    });

    queueEvents.on("failed", async ({ jobId, failedReason, prev }) => {
      logger.error(`[BullMQ] Job ${jobId} failed in queue ${queueName}`, {
        component: "BullMQMetrics",
        queueName,
        jobId,
        failedReason,
        previousState: prev,
      });

      // If job has exhausted its retries, push to DLQ if configured
      if (dlqQueue) {
        const job = await queue.getJob(jobId);
        if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
          await dlqQueue.add(`dead-letter-${jobId}`, {
            originalQueue: queueName,
            originalJobId: jobId,
            data: job.data,
            failedReason,
            exhaustedAt: new Date().toISOString(),
          });

          logger.fatal(`[BullMQ DLQ] Job ${jobId} moved to Dead-Letter Queue ${dlqQueue.name}`, {
            component: "BullMQ-DLQ",
            queueName,
            dlqName: dlqQueue.name,
            jobId,
            failedReason,
          });
        }
      }
    });

    queueEvents.on("stalled", ({ jobId }) => {
      logger.warn(`[BullMQ Alert] Job ${jobId} stalled in queue ${queueName} - worker heartbeat missed`, {
        component: "BullMQMetrics",
        queueName,
        jobId,
      });
    });

    queueEvents.on("error", (err) => {
      logger.error(`[BullMQ Error] Redis QueueEvents error on queue ${queueName}`, {
        component: "BullMQMetrics",
        queueName,
      }, err);
    });

    this.queueEventsMap.set(queueName, queueEvents);
  }

  /**
   * Instrument a Worker to track processing time, unhandled errors, and throughput
   */
  public instrumentWorker(worker: Worker) {
    worker.on("failed", (job, err) => {
      logger.error(`[Worker Failure] Job ${job?.id} failed during execution`, {
        component: "BullMQWorker",
        workerName: worker.name,
        jobId: job?.id,
        attemptsMade: job?.attemptsMade,
      }, err);
    });

    worker.on("error", (err) => {
      logger.error(`[Worker Error] Fatal error in worker ${worker.name}`, {
        component: "BullMQWorker",
        workerName: worker.name,
      }, err);
    });

    worker.on("stalled", (jobId) => {
      logger.warn(`[Worker Stalled] Worker ${worker.name} stalled on job ${jobId}`, {
        component: "BullMQWorker",
        workerName: worker.name,
        jobId,
      });
    });
  }

  /**
   * Scrapes point-in-time metrics across all states for Prometheus / Grafana / Datadog
   */
  public async collectQueueMetrics(queue: Queue, dlqQueue?: Queue): Promise<QueueHealthMetrics> {
    const [counts, isPaused] = await Promise.all([
      queue.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
      queue.isPaused(),
    ]);

    let dlqCount = 0;
    if (dlqQueue) {
      dlqCount = await dlqQueue.getWaitingCount();
    }

    const metrics: QueueHealthMetrics = {
      queueName: queue.name,
      waiting: counts.waiting || 0,
      active: counts.active || 0,
      completed: counts.completed || 0,
      failed: counts.failed || 0,
      delayed: counts.delayed || 0,
      paused: isPaused,
      dlqLength: dlqCount,
      timestamp: new Date().toISOString(),
    };

    // Alert if backlog exceeds healthy thresholds
    if (metrics.waiting > 1000) {
      logger.warn(`[BullMQ Queue Backlog Alert] High waiting jobs in ${queue.name}: ${metrics.waiting}`, {
        component: "BullMQMetrics",
        ...metrics,
      });
    }

    if (metrics.failed > 50) {
      logger.error(`[BullMQ Queue Failure Spike] High failure rate in ${queue.name}: ${metrics.failed}`, {
        component: "BullMQMetrics",
        ...metrics,
      });
    }

    return metrics;
  }

  public async closeAll() {
    for (const events of this.queueEventsMap.values()) {
      await events.close();
    }
    this.queueEventsMap.clear();
  }
}

export const bullMQMetrics = new BullMQMetricsEmitter();
