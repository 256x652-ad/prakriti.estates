import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT_PROPERTY_LOCKED"
  | "IDEMPOTENCY_VIOLATION"
  | "PAYMENT_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "OTP_RATE_LIMITED"
  | "INVALID_CREDENTIALS"
  | "REGISTRATION_FAILED"
  | "OTP_SEND_FAILED"
  | "OTP_VERIFY_FAILED"
  | "INTERNAL_SERVER_ERROR";

export interface PaginationMeta {
  cursor?: string | null;
  hasMore: boolean;
  totalCount?: number;
  limit: number;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export class ApiResponseHelper {
  /**
   * Generates a uniform HTTP 200/201 JSON success response
   */
  static success<T>(data: T, meta?: PaginationMeta, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
    const payload: ApiSuccessResponse<T> = {
      success: true,
      data,
      ...(meta && { meta }),
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload, { status });
  }

  /**
   * Generates a uniform JSON error response with standardized error codes
   */
  static error(
    code: ApiErrorCode,
    message: string,
    status: number = 400,
    details?: any
  ): NextResponse<ApiErrorResponse> {
    const payload: ApiErrorResponse = {
      success: false,
      error: {
        code,
        message,
        details,
      },
      timestamp: new Date().toISOString(),
    };
    return NextResponse.json(payload, { status });
  }

  /**
   * Enforces Idempotency-Key validation on mutating POST/PUT/DELETE endpoints
   */
  static validateIdempotencyKey(req: Request): string {
    const key = req.headers.get("Idempotency-Key") || req.headers.get("x-idempotency-key");
    if (!key || key.trim() === "") {
      throw new Error("MISSING_IDEMPOTENCY_KEY");
    }
    return key.trim();
  }
}
