import { NextRequest, NextResponse } from "next/server";
import { AppError, PlatformErrorCode, ERROR_METADATA_MAP } from "./errorCodes";
import { ZodError } from "zod";
import crypto from "crypto";

export type NextRouteHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

/**
 * HIGHER-ORDER API ROUTE WRAPPER
 * 
 * Intercepts all synchronous and asynchronous route exceptions:
 * 1. Generates an immutable request trace ID.
 * 2. Formats all responses into standardized JSON error envelopes.
 * 3. Logs stack traces internally for observability.
 * 4. Strictly suppresses internal stack traces in production responses.
 */
export function withErrorHandler(handler: NextRouteHandler): NextRouteHandler {
  return async (req: NextRequest, context?: any) => {
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID();

    try {
      const response = await handler(req, context);
      response.headers.set("x-request-id", requestId);
      return response;
    } catch (error: any) {
      // 1. Structured internal logging for Observability (Datadog/Sentry/CloudWatch)
      console.error(`[API Error Trace] [ReqID: ${requestId}] [Path: ${req.nextUrl.pathname}]`, {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // 2. Handle Known AppError Exceptions
      if (error instanceof AppError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            requestId,
            timestamp: new Date().toISOString(),
          },
          {
            status: error.httpStatus,
            headers: { "x-request-id": requestId },
          }
        );
      }

      // 3. Handle Zod Validation Errors
      if (error instanceof ZodError) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: PlatformErrorCode.VALIDATION_ERROR,
              message: "Invalid request payload format",
              details: error.flatten(),
            },
            requestId,
            timestamp: new Date().toISOString(),
          },
          {
            status: 422,
            headers: { "x-request-id": requestId },
          }
        );
      }

      // 4. Handle Prisma Database Constraint Errors (e.g., P2002 Unique Constraint)
      if (error?.code === "P2002") {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: PlatformErrorCode.IDEMPOTENCY_VIOLATION,
              message: "A record with these unique details already exists.",
            },
            requestId,
            timestamp: new Date().toISOString(),
          },
          {
            status: 409,
            headers: { "x-request-id": requestId },
          }
        );
      }

      // 5. Unhandled Server Exceptions (Strictly Masked to Prevent Data Leaks)
      const isDev = process.env.NODE_ENV === "development";
      return NextResponse.json(
        {
          success: false,
          error: {
            code: PlatformErrorCode.INTERNAL_SERVER_ERROR,
            message: ERROR_METADATA_MAP[PlatformErrorCode.INTERNAL_SERVER_ERROR].userMessage,
            details: isDev ? error.message : undefined,
          },
          requestId,
          timestamp: new Date().toISOString(),
        },
        {
          status: 500,
          headers: { "x-request-id": requestId },
        }
      );
    }
  };
}
