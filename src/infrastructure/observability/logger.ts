/**
 * Global Structured Logger for Prakriti Estates & Consultants
 * Produces structured JSON logs for log ingestion systems (Datadog, AWS CloudWatch, ELK, Grafana Loki).
 */

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  userId?: string;
  transactionId?: string;
  traceId?: string;
  spanId?: string;
  propertyId?: string;
  route?: string;
  ip?: string;
  component?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  environment: string;
  service: string;
}

class Logger {
  private serviceName: string = "prakriti-platform";
  private environment: string = process.env.NODE_ENV || "development";

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext,
    err?: Error | unknown
  ): string {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      service: this.serviceName,
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (err instanceof Error) {
      entry.error = {
        name: err.name,
        message: err.message,
        stack: err.stack,
        code: (err as any).code,
      };
    } else if (err && typeof err === "object") {
      entry.error = {
        name: "UnknownObjectError",
        message: JSON.stringify(err),
      };
    }

    return JSON.stringify(entry);
  }

  public info(message: string, context?: LogContext): void {
    const output = this.formatMessage("info", message, context);
    console.log(output);
  }

  public debug(message: string, context?: LogContext): void {
    if (this.environment !== "production") {
      const output = this.formatMessage("debug", message, context);
      console.debug(output);
    }
  }

  public warn(message: string, context?: LogContext, err?: Error | unknown): void {
    const output = this.formatMessage("warn", message, context, err);
    console.warn(output);
  }

  public error(message: string, context?: LogContext, err?: Error | unknown): void {
    const output = this.formatMessage("error", message, context, err);
    console.error(output);
  }

  public fatal(message: string, context?: LogContext, err?: Error | unknown): void {
    const output = this.formatMessage("fatal", message, context, err);
    console.error(output);
  }

  /**
   * Creates a child logger bound to specific ambient context (e.g. traceId, userId)
   */
  public child(boundContext: LogContext): {
    info: (msg: string, ctx?: LogContext) => void;
    debug: (msg: string, ctx?: LogContext) => void;
    warn: (msg: string, ctx?: LogContext, err?: unknown) => void;
    error: (msg: string, ctx?: LogContext, err?: unknown) => void;
    fatal: (msg: string, ctx?: LogContext, err?: unknown) => void;
  } {
    return {
      info: (msg, ctx) => this.info(msg, { ...boundContext, ...ctx }),
      debug: (msg, ctx) => this.debug(msg, { ...boundContext, ...ctx }),
      warn: (msg, ctx, err) => this.warn(msg, { ...boundContext, ...ctx }, err),
      error: (msg, ctx, err) => this.error(msg, { ...boundContext, ...ctx }, err),
      fatal: (msg, ctx, err) => this.fatal(msg, { ...boundContext, ...ctx }, err),
    };
  }
}

export const logger = new Logger();
