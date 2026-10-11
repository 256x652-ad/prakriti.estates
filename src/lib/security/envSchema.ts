import { z } from "zod";

/**
 * STRICT STARTUP ENVIRONMENT SCHEMA
 * Validates all required platform configuration before the application starts.
 */
export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().optional(),
  
  // Authentication
  NEXTAUTH_SECRET: z.string().min(16, "NEXTAUTH_SECRET must be at least 16 characters"),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),

  // Redis (Rate Limiting & BullMQ)
  REDIS_URL: z.string().default("redis://localhost:6379"),

  // Mapbox
  NEXT_PUBLIC_MAPBOX_TOKEN: z.string().default("pk.mock_token"),

  // Secure AWS S3 Configuration
  AWS_REGION: z.string().default("ap-south-1"),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_PUBLIC_BUCKET: z.string().default("prakriti-estates-public"),
  AWS_S3_PRIVATE_BUCKET: z.string().default("prakriti-estates-private-kyc"),

  // Payment Gateway
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
});

export type ValidatedEnv = z.infer<typeof EnvironmentSchema>;

/**
 * Validates environment variables and throws clean diagnostic errors if missing
 */
export function validateEnvironment(): ValidatedEnv {
  const result = EnvironmentSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ CRITICAL: Invalid Environment Configuration:");
    console.error(JSON.stringify(result.error.format(), null, 2));
    throw new Error("Invalid Environment Variables. Check your .env file.");
  }

  return result.data;
}

/**
 * MASS-ASSIGNMENT DEFENSE UTILITY
 * 
 * Enforces that an incoming request body contains ONLY the fields defined in the schema.
 * Rejects or strips malicious keys (e.g., injecting { roles: ["ADMIN"] } on registration).
 */
export function sanitizePayload<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  untrustedData: unknown
): z.infer<z.ZodObject<T>> {
  // .strict() causes Zod to throw an error if unapproved keys are present
  const strictSchema = schema.strict();
  return strictSchema.parse(untrustedData);
}
