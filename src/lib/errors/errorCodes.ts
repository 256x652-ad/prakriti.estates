/**
 * STANDARDIZED ERROR DICTIONARY
 * Stable, unambiguous error codes returned across Web, iOS, Android, and API integrations.
 */
export enum PlatformErrorCode {
  // General & Validation
  INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  NOT_FOUND = "NOT_FOUND",
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  IDEMPOTENCY_VIOLATION = "IDEMPOTENCY_VIOLATION",

  // Property & Booking Domain
  PROPERTY_NOT_FOUND = "PROPERTY_NOT_FOUND",
  PROPERTY_ALREADY_LOCKED = "PROPERTY_ALREADY_LOCKED",
  PROPERTY_LOCK_EXPIRED = "PROPERTY_LOCK_EXPIRED",
  PROPERTY_NOT_AVAILABLE = "PROPERTY_NOT_AVAILABLE",

  // KYC & Compliance Domain
  KYC_REQUIRED = "KYC_REQUIRED",
  KYC_PENDING_APPROVAL = "KYC_PENDING_APPROVAL",
  KYC_FAILED = "KYC_FAILED",
  INVALID_AADHAAR_FORMAT = "INVALID_AADHAAR_FORMAT",
  INVALID_PAN_FORMAT = "INVALID_PAN_FORMAT",

  // Financial & Ledger Domain
  PAYMENT_FAILED = "PAYMENT_FAILED",
  PAYMENT_GATEWAY_TIMEOUT = "PAYMENT_GATEWAY_TIMEOUT",
  INVALID_STATE_TRANSITION = "INVALID_STATE_TRANSITION",
  ESCROW_FUNDS_NOT_AVAILABLE = "ESCROW_FUNDS_NOT_AVAILABLE",
  DISPUTE_ALREADY_RESOLVED = "DISPUTE_ALREADY_RESOLVED",

  // Tenancy & Audit Domain
  TENANCY_NOT_ACTIVE = "TENANCY_NOT_ACTIVE",
  AUDIT_VERSION_CONFLICT = "AUDIT_VERSION_CONFLICT",
  UNAUTHORIZED_AUDIT_SYNC = "UNAUTHORIZED_AUDIT_SYNC",
}

export interface ErrorMetadata {
  httpStatus: number;
  userMessage: string;
}

export const ERROR_METADATA_MAP: Record<PlatformErrorCode, ErrorMetadata> = {
  [PlatformErrorCode.INTERNAL_SERVER_ERROR]: { httpStatus: 500, userMessage: "An unexpected error occurred. Please try again." },
  [PlatformErrorCode.VALIDATION_ERROR]: { httpStatus: 422, userMessage: "The provided data is invalid." },
  [PlatformErrorCode.NOT_FOUND]: { httpStatus: 404, userMessage: "The requested resource could not be found." },
  [PlatformErrorCode.UNAUTHORIZED]: { httpStatus: 401, userMessage: "Authentication required to access this resource." },
  [PlatformErrorCode.FORBIDDEN]: { httpStatus: 403, userMessage: "You do not have permission to perform this action." },
  [PlatformErrorCode.RATE_LIMIT_EXCEEDED]: { httpStatus: 429, userMessage: "Too many requests. Please slow down." },
  [PlatformErrorCode.IDEMPOTENCY_VIOLATION]: { httpStatus: 409, userMessage: "This request has already been processed." },

  [PlatformErrorCode.PROPERTY_NOT_FOUND]: { httpStatus: 404, userMessage: "Property listing not found." },
  [PlatformErrorCode.PROPERTY_ALREADY_LOCKED]: { httpStatus: 409, userMessage: "Property is currently under offer or locked by another buyer." },
  [PlatformErrorCode.PROPERTY_LOCK_EXPIRED]: { httpStatus: 410, userMessage: "Your property lock has expired." },
  [PlatformErrorCode.PROPERTY_NOT_AVAILABLE]: { httpStatus: 409, userMessage: "Property is no longer available for booking." },

  [PlatformErrorCode.KYC_REQUIRED]: { httpStatus: 403, userMessage: "Aadhaar/PAN KYC verification is required to proceed." },
  [PlatformErrorCode.KYC_PENDING_APPROVAL]: { httpStatus: 403, userMessage: "Your KYC documents are currently pending verification." },
  [PlatformErrorCode.KYC_FAILED]: { httpStatus: 422, userMessage: "KYC verification was rejected or failed." },
  [PlatformErrorCode.INVALID_AADHAAR_FORMAT]: { httpStatus: 422, userMessage: "Invalid Aadhaar number format." },
  [PlatformErrorCode.INVALID_PAN_FORMAT]: { httpStatus: 422, userMessage: "Invalid PAN card format." },

  [PlatformErrorCode.PAYMENT_FAILED]: { httpStatus: 402, userMessage: "Payment processing failed." },
  [PlatformErrorCode.PAYMENT_GATEWAY_TIMEOUT]: { httpStatus: 504, userMessage: "Payment provider timed out. No funds were debited." },
  [PlatformErrorCode.INVALID_STATE_TRANSITION]: { httpStatus: 400, userMessage: "Illegal transaction state transition." },
  [PlatformErrorCode.ESCROW_FUNDS_NOT_AVAILABLE]: { httpStatus: 400, userMessage: "Insufficient escrow balance for this operation." },
  [PlatformErrorCode.DISPUTE_ALREADY_RESOLVED]: { httpStatus: 409, userMessage: "This dispute has already been finalized." },

  [PlatformErrorCode.TENANCY_NOT_ACTIVE]: { httpStatus: 400, userMessage: "Tenancy lease is not active." },
  [PlatformErrorCode.AUDIT_VERSION_CONFLICT]: { httpStatus: 409, userMessage: "Audit was modified on the server while you were offline." },
  [PlatformErrorCode.UNAUTHORIZED_AUDIT_SYNC]: { httpStatus: 403, userMessage: "You are not assigned to this property audit." },
};

/**
 * Base Application Error class for domain exceptions
 */
export class AppError extends Error {
  public readonly code: PlatformErrorCode;
  public readonly httpStatus: number;
  public readonly details?: any;

  constructor(code: PlatformErrorCode, message?: string, details?: any) {
    const meta = ERROR_METADATA_MAP[code] || ERROR_METADATA_MAP[PlatformErrorCode.INTERNAL_SERVER_ERROR];
    super(message || meta.userMessage);
    this.code = code;
    this.httpStatus = meta.httpStatus;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
