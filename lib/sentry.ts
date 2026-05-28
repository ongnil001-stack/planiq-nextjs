/**
 * lib/sentry.ts — Lightweight helpers for explicit Sentry captures.
 *
 * Use these in catch blocks throughout the app so errors are tagged
 * with useful context (which feature failed, what the user was doing).
 *
 * Usage:
 *   import { captureAppError } from '@/lib/sentry';
 *   captureAppError(err, 'ai_brief', { userId, scheduleCount });
 */
import * as Sentry from '@sentry/nextjs';

export type AppContext =
  | 'ai_brief'
  | 'ai_reschedule'
  | 'ai_focus_hub'
  | 'supabase_query'
  | 'supabase_mutation'
  | 'schedule_save'
  | 'schedule_delete'
  | 'auth'
  | 'avatar_upload'
  | 'notification'
  | 'feedback_submit'
  | 'unknown';

/**
 * Capture an error with feature context and optional extra data.
 * Silent (no-op) when Sentry DSN is not configured.
 */
export function captureAppError(
  error: unknown,
  context: AppContext,
  extra?: Record<string, unknown>,
): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.withScope(scope => {
    scope.setTag('app_context', context);
    if (extra) scope.setExtras(extra);
    Sentry.captureException(error);
  });
}

/**
 * Capture a non-fatal message (e.g. a warning or degraded state).
 */
export function captureAppMessage(
  message: string,
  context: AppContext,
  level: Sentry.SeverityLevel = 'warning',
): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;

  Sentry.withScope(scope => {
    scope.setTag('app_context', context);
    scope.setLevel(level);
    Sentry.captureMessage(message);
  });
}
