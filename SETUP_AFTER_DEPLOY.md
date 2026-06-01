# PlanIQ — Required setup for the per-occurrence + notifications update

Two things must be done for this update to work fully. The app will **not crash**
if you skip them — recurring items just won't be completable per-occurrence, and
background push won't fire — but do both for full functionality.

## 1. Run the database migrations (required for recurring completion)

In **Supabase Dashboard → SQL Editor → New Query**, run these two files (paste &
Run each). They are idempotent (safe to re-run):

1. `supabase/migrations/20260601_reconcile_schema.sql`
   — documents columns that already exist (location/designation/country_code); a no-op if present.
2. `supabase/migrations/20260602_schedule_completions.sql`
   — **creates the `schedule_completions` table** that powers per-occurrence
   completion for recurring schedules. **This one is required.**

Until #2 is run, recurring occurrences display everywhere but tapping "done" on a
recurring occurrence has no effect (non-recurring completion is unaffected).

## 2. Configure Web Push (required for BACKGROUND notifications)

Foreground reminders (while the app is open) work with no setup. Background push
(app closed) needs VAPID keys + a running cron.

a. **Generate VAPID keys** (once), e.g. `npx web-push generate-vapid-keys`.

b. **Add env vars in Vercel → Project → Settings → Environment Variables**
   (Production + Preview):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = the public key
   - `VAPID_PRIVATE_KEY` = the private key
   - `VAPID_MAILTO` = a contact email (e.g. `mailto:you@domain.com` → just the address)
   - `CRON_SECRET` = any random string (Vercel also injects this for cron auth)
   - `SUPABASE_SERVICE_ROLE_KEY` = from Supabase → Settings → API (server-only)

c. **Enable the per-minute cron.** `vercel.json` registers `/api/notifications/cron`
   at `* * * * *`. **Per-minute crons require a Vercel Pro plan.** On Hobby, either
   upgrade, or switch to Supabase `pg_cron` (see the commented block in
   `supabase/migrations/20240601_notifications.sql`).

d. Redeploy. Then in the app, open the notification prompt and tap **Enable** to
   register the device's push subscription.

## What works without push setup
- Recurring schedules display across Calendar, Dashboard, Progress, Focus Hub, AI Priorities.
- Per-occurrence completion (after migration #2).
- Foreground reminders fire while the app is open (normal + recurring).
- AI Priorities **This Month** summary (computed client-side).
