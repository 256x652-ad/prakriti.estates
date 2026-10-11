import { Queue } from "bullmq";
import { redisClient } from "../redis/redisClient";

// Define Queues
export const transactionQueue = new Queue("transaction-jobs", { connection: redisClient });
export const notificationQueue = new Queue("notification-jobs", { connection: redisClient });

export type InvoiceJobData = {
  transactionId: string;
  userId: string;
  propertyId: string;
  amount: number;
};

export type ConsultantNotificationJobData = {
  propertyId: string;
  serviceType: "AUDIT" | "VASTU_REPORT" | "STRUCTURAL_ENGINEERING";
  notes?: string;
};
