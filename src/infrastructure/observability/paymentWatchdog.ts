import { prisma } from "../database/prisma";
import { logger } from "./logger";

export interface AnomalyAlert {
  alertType: "PAYMENT_LOCK_STALLED" | "UNMATCHED_PAYMENT_WEBHOOK" | "ORPHANED_PROPERTY_LOCK";
  severity: "CRITICAL" | "HIGH";
  transactionId?: string;
  propertyLockId?: string;
  paymentRef?: string;
  userId?: string;
  delaySeconds: number;
  message: string;
  occurredAt: string;
}

/**
 * Payment Reconciliation Watchdog
 *
 * Directives:
 * Inspects all payments marked SUCCESS / COMPLETED where the corresponding PropertyLock
 * failed to transition to ACTIVE within 60 seconds of payment receipt.
 * Dispatches high-priority Slack / PagerDuty webhook alerts to prevent silent lock failures.
 */
export class PaymentReconciliationWatchdog {
  private pagerDutyWebhookUrl: string | undefined = process.env.PAGERDUTY_ALERT_WEBHOOK_URL;
  private slackAlertWebhookUrl: string | undefined = process.env.SLACK_ALERT_WEBHOOK_URL;

  /**
   * Run watchdog inspection check
   * @param gracePeriodSeconds default 60 seconds
   */
  public async inspectAndAlert(gracePeriodSeconds: number = 60): Promise<AnomalyAlert[]> {
    const thresholdDate = new Date(Date.now() - gracePeriodSeconds * 1000);
    const anomalies: AnomalyAlert[] = [];

    try {
      // 1. Find LedgerTransactions with SUCCESS/COMPLETED status created before thresholdDate
      // where the user has a PropertyLock still in REQUESTED state.
      const successfulTransactions = await prisma.ledgerTransaction.findMany({
        where: {
          status: "COMPLETED",
          updatedAt: {
            lte: thresholdDate,
          },
          // Filter within the last 24 hours to prevent endless reprocessing of old anomalies
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        include: {
          property: true,
        },
        take: 100,
      });

      for (const tx of successfulTransactions) {
        if (!tx.propertyId) continue;

        // Check if there's a corresponding PropertyLock that failed to activate
        const stalledLock = await prisma.propertyLock.findFirst({
          where: {
            propertyId: tx.propertyId,
            userId: tx.userId,
            status: "REQUESTED", // STILL REQUESTED! Should have transitioned to ACTIVE
          },
        });

        if (stalledLock) {
          const delaySeconds = Math.round((Date.now() - tx.updatedAt.getTime()) / 1000);

          const alert: AnomalyAlert = {
            alertType: "PAYMENT_LOCK_STALLED",
            severity: "CRITICAL",
            transactionId: tx.id,
            propertyLockId: stalledLock.id,
            paymentRef: stalledLock.paymentRef || tx.referenceId || undefined,
            userId: tx.userId,
            delaySeconds,
            message: `CRITICAL: Payment ${tx.id} succeeded ${delaySeconds}s ago, but PropertyLock ${stalledLock.id} remains in REQUESTED status instead of ACTIVE!`,
            occurredAt: new Date().toISOString(),
          };

          anomalies.push(alert);

          logger.fatal(alert.message, {
            component: "PaymentReconciliationWatchdog",
            ...alert,
          });

          await this.dispatchExternalAlert(alert);
        }
      }

      // 2. Scan for PropertyLocks that have a paymentRef but are still in REQUESTED state beyond 60s
      const pendingLocksWithRef = await prisma.propertyLock.findMany({
        where: {
          status: "REQUESTED",
          paymentRef: { not: null },
          updatedAt: {
            lte: thresholdDate,
          },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
        take: 50,
      });

      for (const lock of pendingLocksWithRef) {
        const delaySeconds = Math.round((Date.now() - lock.updatedAt.getTime()) / 1000);

        // Check if already captured
        if (!anomalies.some((a) => a.propertyLockId === lock.id)) {
          const alert: AnomalyAlert = {
            alertType: "UNMATCHED_PAYMENT_WEBHOOK",
            severity: "HIGH",
            propertyLockId: lock.id,
            paymentRef: lock.paymentRef || undefined,
            userId: lock.userId,
            delaySeconds,
            message: `ALERT: PropertyLock ${lock.id} has paymentRef ${lock.paymentRef} but remained in REQUESTED for ${delaySeconds}s without confirmation webhook!`,
            occurredAt: new Date().toISOString(),
          };

          anomalies.push(alert);

          logger.error(alert.message, {
            component: "PaymentReconciliationWatchdog",
            ...alert,
          });

          await this.dispatchExternalAlert(alert);
        }
      }

      return anomalies;
    } catch (error) {
      logger.error("Watchdog inspection encountered an error", {
        component: "PaymentReconciliationWatchdog",
      }, error);
      return [];
    }
  }

  /**
   * Dispatches incident to PagerDuty Events API v2 and Slack Alert Webhook
   */
  private async dispatchExternalAlert(alert: AnomalyAlert): Promise<void> {
    const payload = {
      summary: alert.message,
      source: "prakriti-reconciliation-watchdog",
      severity: alert.severity === "CRITICAL" ? "critical" : "error",
      custom_details: alert,
    };

    // Slack Notification
    if (this.slackAlertWebhookUrl) {
      try {
        await fetch(this.slackAlertWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: `🚨 *[${alert.severity}] ${alert.alertType}* \n> ${alert.message}\n*Delay:* ${alert.delaySeconds}s | *Lock:* \`${alert.propertyLockId}\` | *User:* \`${alert.userId}\``,
          }),
        });
      } catch (err) {
        logger.error("Failed to post alert to Slack Webhook", { alert }, err);
      }
    }

    // PagerDuty Events API v2
    if (this.pagerDutyWebhookUrl) {
      try {
        await fetch(this.pagerDutyWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routing_key: process.env.PAGERDUTY_ROUTING_KEY,
            event_action: "trigger",
            dedup_key: `reconciliation-${alert.propertyLockId || alert.transactionId}`,
            payload,
          }),
        });
      } catch (err) {
        logger.error("Failed to trigger PagerDuty event", { alert }, err);
      }
    }
  }
}

export const paymentWatchdog = new PaymentReconciliationWatchdog();
