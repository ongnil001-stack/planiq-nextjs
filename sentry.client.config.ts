/**
 * sentry.client.config.ts
 * Runs in the browser. Only active when NEXT_PUBLIC_SENTRY_DSN is set.
 *
 * To enable: add NEXT_PUBLIC_SENTRY_DSN to your Vercel environment variables.
 * Get your DSN from https://sentry.io → Project Settings → Client Keys.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only initialize when DSN is present (silent in dev/staging without it)
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 10% of sessions for performance tracing (adjust after launch)
  tracesSampleRate: 0.1,

  // Replay 5% of sessions normally, 100% on error
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  environment: process.env.NODE_ENV,

  // Don't flood Sentry with expected/network errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed',
    'Non-Error promise rejection captured',
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],

  beforeSend(event) {
    // Strip any auth tokens from breadcrumbs just in case
    if (event.request?.headers) {
      delete event.request.headers['Authorization'];
    }
    return event;
  },
});
