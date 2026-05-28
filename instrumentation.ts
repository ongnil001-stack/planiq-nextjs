/**
 * instrumentation.ts
 * Next.js 14 instrumentation hook — loads Sentry for server & edge runtimes.
 * This file must live at the project root (next to next.config.js).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}
