/**
 * lib/analytics.ts — Typed PostHog event helpers for PlanIQ.
 *
 * All tracking is opt-out safe: if NEXT_PUBLIC_POSTHOG_KEY is not set,
 * every call is a silent no-op.
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track('schedule_created', { type: 'task', priority: 'high' });
 */
import posthog from 'posthog-js';

// ─── Event catalogue ──────────────────────────────────────────────────────────
// Add new events here as you build features. Keep names snake_case.

export type PlanIQEvent =
  // ── Auth ──────────────────────────────────────────────────────────────────
  | 'sign_up'                  // new user completes registration
  | 'sign_in'                  // existing user signs in
  | 'sign_out'                 // user signs out

  // ── Onboarding ────────────────────────────────────────────────────────────
  | 'app_opened'               // app loaded (fired on dashboard mount)
  | 'daily_checkin'            // first open of the day (streak tick)

  // ── Scheduling ────────────────────────────────────────────────────────────
  | 'schedule_created'         // new schedule saved
  | 'schedule_edited'          // existing schedule updated
  | 'schedule_deleted'         // schedule deleted
  | 'task_completed'           // task marked complete
  | 'task_skipped'             // task marked skip/missed

  // ── AI Features ───────────────────────────────────────────────────────────
  | 'ai_brief_viewed'          // dashboard AI insights card shown
  | 'ai_brief_refreshed'       // user manually refreshed AI insights
  | 'ai_focus_hub_opened'      // Focus Hub sheet opened
  | 'ai_reschedule_run'        // Smart Reschedule AI executed
  | 'ai_request_failed'        // any AI call returned an error

  // ── Navigation ────────────────────────────────────────────────────────────
  | 'page_viewed'              // route change (auto-tracked by PostHogProvider)
  | 'calendar_view_changed'    // daily/weekly/monthly/yearly
  | 'focus_hub_opened'         // Focus Hub nav tap

  // ── Profile & Settings ────────────────────────────────────────────────────
  | 'theme_changed'            // user applied a different theme
  | 'profile_updated'          // name, designation, or avatar changed
  | 'notifications_toggled'    // push notifications enabled/disabled

  // ── Engagement ────────────────────────────────────────────────────────────
  | 'feedback_submitted'       // user submitted Help & Feedback form
  | 'paywall_viewed'           // subscription paywall shown (Phase 3)
  | 'trial_started'            // free trial activated (Phase 3)
  | 'subscription_started';    // paid plan activated (Phase 3)

// ─── Property shapes per event ────────────────────────────────────────────────
// Optional — add props you want to filter by in PostHog.

type EventProperties = {
  schedule_created:       { type: string; priority: string; has_location: boolean; has_recurrence: boolean };
  schedule_edited:        { type: string; priority: string };
  task_completed:         { priority: string; minutes_taken?: number };
  task_skipped:           { priority: string; reason: 'missed' | 'skip' };
  ai_brief_viewed:        { schedule_count: number };
  ai_brief_refreshed:     { schedule_count: number };
  ai_focus_hub_opened:    { tab: string };
  ai_reschedule_run:      { conflict_count: number };
  ai_request_failed:      { context: string; error: string };
  theme_changed:          { theme: string };
  notifications_toggled:  { enabled: boolean };
  feedback_submitted:     { type: 'bug' | 'feature' | 'general' };
  calendar_view_changed:  { view: 'daily' | 'weekly' | 'monthly' | 'yearly' };
  paywall_viewed:         { trigger: string };
  sign_up:                { method: 'email' };
  sign_in:                { method: 'email' };
};

// ─── Track helper ─────────────────────────────────────────────────────────────

type PropsFor<E extends PlanIQEvent> =
  E extends keyof EventProperties ? EventProperties[E] : Record<string, unknown>;

export function track<E extends PlanIQEvent>(
  event: E,
  ...args: E extends keyof EventProperties
    ? [properties: EventProperties[E]]
    : [properties?: Record<string, unknown>]
): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.capture(event, args[0] as PropsFor<E>);
  } catch {
    // Never let analytics crash the app
  }
}

/** Identify a user after sign-in so events are linked to their account. */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.identify(userId, traits);
  } catch { /* silent */ }
}

/** Reset identity on sign-out. */
export function resetAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
  try {
    posthog.reset();
  } catch { /* silent */ }
}
