import { z } from "zod";

/**
 * COMPREHENSIVE RUNTIME ENVIRONMENT VALIDATION SCHEMA
 * Validates all required platform configuration before the application boots.
 * Protects against startup misconfiguration, missing secret keys, and runtime failures.
 */
export const EnvironmentSchema = z.object({
  // Runtime & App
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  PORT: z.string().optional().default("3000"),

  // Database (Supabase PostgreSQL + PostGIS)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required for Prisma queries"),
  DIRECT_URL: z.string().optional(),

  // Distributed Cache & Queues (Redis / Upstash)
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Authentication & Session
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  JWT_ACCESS_SECRET: z.string().min(16).optional().default("default-jwt-access-secret-32-chars"),
  JWT_REFRESH_SECRET: z.string().min(16).optional().default("default-jwt-refresh-secret-32-chars"),

  // Geospatial (Mapbox)
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().default("pk.mock_token"),

  // Payment Gateway (Razorpay)
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  // Secure Object Storage (AWS S3)
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_PUBLIC_BUCKET: z.string().default("prakriti-estates-public"),
  AWS_S3_PRIVATE_BUCKET: z.string().default("prakriti-estates-private-kyc"),

  // Identity & KYC
  SUREPASS_API_KEY: z.string().optional(),
  SUREPASS_API_BASE_URL: z.string().url().optional().default("https://kyc.surepass.io/api/v1"),

  // Notifications
  EXPO_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_BUSINESS_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  NOTIFICATION_FROM_EMAIL: z.string().email().optional().default("noreply@prakritiestates.com"),

  // Observability & Alerting
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_ORG: z.string().optional(),
  SENTRY_PROJECT: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  SLACK_ALERT_WEBHOOK_URL: z.string().url().optional(),
  PAGERDUTY_ALERT_WEBHOOK_URL: z.string().url().optional(),
  PAGERDUTY_ROUTING_KEY: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof EnvironmentSchema>;

/**
 * Validates environment variables and produces clean diagnostic errors if missing
 */
export function validateEnvironment(): ValidatedEnv {
  const result = EnvironmentSchema.safeParse(process.env);

  if (!result.success) {
    const errorDetails = result.error.format();
    console.error("❌ CRITICAL: Invalid Environment Configuration on startup:");
    console.error(JSON.stringify(errorDetails, null, 2));

    if (process.env.NODE_ENV === "production") {
      throw new Error("Invalid Environment Variables. Boot terminated to prevent runtime compromise.");
    }
  }

  return (result.success ? result.data : process.env) as ValidatedEnv;
}

/**
 * MASS-ASSIGNMENT DEFENSE UTILITY
 * Enforces that an incoming request body contains ONLY the fields defined in the schema.
 * Rejects or strips malicious keys (e.g., injecting { roles: ["ADMIN"] } on registration).
 */
export function sanitizePayload<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  untrustedData: unknown
): z.infer<z.ZodObject<T>> {
  const strictSchema = schema.strict();
  return strictSchema.parse(untrustedData);
}
