import { ConfigurationService, FlagEvaluationContext } from "@/modules/settings/services/ConfigurationService";

/**
 * KNOWN PLATFORM FEATURE FLAGS
 * Centralized enum guaranteeing compile-time type safety across Web & Mobile.
 */
export type PlatformFeatureFlag =
  | "ENABLE_SHORT_STAY"
  | "ENABLE_WHATSAPP"
  | "ENABLE_HRA_RECEIPTS"
  | "ENABLE_MAINTENANCE_MODULE"
  | "ENABLE_CONSULTANT_BOOKING"
  | "ENABLE_VAS_UPSELL"
  | "ENABLE_INSTANT_KYC_BYPASS";

/**
 * Strongly typed feature flag evaluation function.
 * Safe for use in Next.js Server Components, Server Actions, and API Routes.
 * 
 * @example
 * const isShortStayLive = await isFeatureEnabled("ENABLE_SHORT_STAY", { role: user.role });
 * if (!isShortStayLive) return notFound();
 */
export async function isFeatureEnabled(
  flagName: PlatformFeatureFlag,
  context?: FlagEvaluationContext
): Promise<boolean> {
  return await ConfigurationService.isFeatureEnabled(flagName, context);
}
