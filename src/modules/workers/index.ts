import { transactionalOutboxRelay } from "../outbox/workers/TransactionalOutboxRelay";
import { domainEventConsumer } from "../notifications/workers/DomainEventConsumer";
import { lockExpirationWorker } from "../workflows/workers/LockExpirationWorker";
import { monthlyInvoicingWorker } from "../rentals/workers/MonthlyInvoicingWorker";
import { propertyPublishedConsumer } from "../search/workers/PropertyPublishedConsumer";

export {
  transactionalOutboxRelay,
  domainEventConsumer,
  lockExpirationWorker,
  monthlyInvoicingWorker,
  propertyPublishedConsumer,
};

/**
 * Boots all background workers and cron schedules in one call
 */
export function initializePlatformWorkers() {
  console.log("[WorkerBootstrap] Starting background workers and schedulers...");

  // 1. Start Outbox Sweeper Poller (every 3 seconds)
  transactionalOutboxRelay.startPolling(3000);

  // 2. Start Domain Event Consumer
  domainEventConsumer.getWorker();

  // 3. Start Lock Expiration Worker and schedule repeatable cron
  lockExpirationWorker.startScheduledWorker();

  // 4. Start Monthly Invoicing Worker and schedule repeatable cron
  monthlyInvoicingWorker.getWorker();

  console.log("[WorkerBootstrap] All background workers successfully initialized.");
}
