/**
 * Sentry Next.js App Router Architecture & Configuration Guide
 *
 * This file documents and provides the programmatic configuration helpers for
 * enterprise Next.js App Router observability using Sentry (@sentry/nextjs).
 */

export interface SentryConfigOptions {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  profilesSampleRate?: number;
}

export const defaultSentryOptions: SentryConfigOptions = {
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "",
  environment: process.env.NODE_ENV || "development",
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
};

/**
 * 1. SERVER CONFIGURATION (`sentry.server.config.ts`)
 * Initializes Sentry on the Node.js server runtime (Server Components, Server Actions, Route Handlers).
 */
export const sentryServerConfigCode = `
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  integrations: [
    Sentry.prismaIntegration(),
  ],
  beforeSend(event, hint) {
    // Strip sensitive KYC documents, passwords, or raw secrets from breadcrumbs
    if (event.request?.data) {
      delete (event.request.data as any).password;
      delete (event.request.data as any).otp;
      delete (event.request.data as any).aadhaarNumber;
    }
    return event;
  },
});
`;

/**
 * 2. CLIENT CONFIGURATION (`sentry.client.config.ts`)
 * Captures browser exceptions, Hydration errors, and Core Web Vitals on Client Components.
 */
export const sentryClientConfigCode = `
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
});
`;

/**
 * 3. EDGE CONFIGURATION (`sentry.edge.config.ts`)
 * Covers Next.js Middleware and Edge Route Handlers.
 */
export const sentryEdgeConfigCode = `
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});
`;

/**
 * 4. NEXT.JS CONFIGURATION WRAPPER (`next.config.ts`)
 * Instruments sourcemap generation and CI/CD upload.
 */
export const sentryNextConfigWrapperCode = `
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig = {
  // your existing nextConfig
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  reactComponentAnnotation: { enabled: true },
  tunnelRoute: "/monitoring",
  hideSourceMaps: true, // Prevents exposing raw source code in client browser dev tools
  disableLogger: true,
  automaticVercelMonitors: true,
});
`;
