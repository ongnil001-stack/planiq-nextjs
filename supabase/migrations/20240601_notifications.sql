-- ─── PlanIQ: Notifications & Reminders Migration ──────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run

-- 1. Add reminder_minutes to schedules
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS reminder_minutes integer DEFAULT 15;

-- 2. Push subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint   text        NOT NULL UNIQUE,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);

-- 3. Row-level security
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── Optional: Supabase pg_cron (alternative to Vercel Cron) ─────────────────
-- If you are NOT on Vercel Pro (which requires Pro for minute-level crons),
-- use Supabase pg_cron instead. Enable it in:
--   Supabase Dashboard → Database → Extensions → pg_cron → Enable
-- Then run:

-- SELECT cron.schedule(
--   'planiq-reminders',              -- job name
--   '* * * * *',                     -- every minute
--   $$
--     SELECT net.http_get(
--       url := 'https://planiq-nextjs.vercel.app/api/notifications/cron',
--       headers := '{"Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb
--     );
--   $$
-- );

-- To remove the pg_cron job later:
-- SELECT cron.unschedule('planiq-reminders');
