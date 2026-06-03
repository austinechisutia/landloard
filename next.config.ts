import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Upload source maps in CI only to avoid slow local builds
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: { disable: !process.env.CI },
  disableLogger: true,

  // Automatically instrument server components and route handlers
  autoInstrumentServerFunctions: true,
  autoInstrumentMiddleware:      true,
});
