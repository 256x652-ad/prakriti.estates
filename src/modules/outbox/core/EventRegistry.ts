/**
 * CENTRALIZED EVENT REGISTRY
 * Defines every single domain event capable of triggering asynchronous side effects 
 * (emails, push notifications, analytics, webhooks) across the Prakriti Estates platform.
 */
export type DomainEventType = 
  | "USER_REGISTERED"
  | "KYC_VERIFIED"
  | "PROPERTY_PUBLISHED"
  | "PROPERTY_LOCKED"
  | "PROPERTY_UNLOCKED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "RENTAL_BOOKED"
  | "CONSULTATION_REQUESTED"
  | "DISPUTE_RAISED"
  | "DISPUTE_RESOLVED"
  | "STAY_BOOKED"
  | "STAY_CANCELLED"
  | "LAND_PLOT_RELATED_EVENT";

export interface IDomainEventPayload {
  eventId: string;
  timestamp: string;
  metadata: {
    userId?: string;
    propertyId?: string;
    transactionId?: string;
    [key: string]: any;
  };
}
