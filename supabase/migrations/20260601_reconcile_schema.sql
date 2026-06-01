-- ─────────────────────────────────────────────────────────────────────────────
-- Reconcile committed schema with the live database
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- These columns already exist in the production database but were missing from
-- the checked-in schema.sql / migrations, which caused confusion during audits.
-- All statements are idempotent (IF NOT EXISTS), so running this is a safe no-op
-- if the columns are already present.
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles: user-editable job title + 2-letter country code (for holidays/timezone)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS designation  TEXT,
  ADD COLUMN IF NOT EXISTS country_code TEXT;

-- schedules: free-text location/place for an activity (shown in reminders & calendar)
ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS location TEXT;

COMMENT ON COLUMN public.profiles.designation   IS 'User-entered job title / designation';
COMMENT ON COLUMN public.profiles.country_code  IS 'IANA 2-letter country code, e.g. PH / US';
COMMENT ON COLUMN public.schedules.location     IS 'Optional free-text location for the activity (max 120 chars in UI)';

-- ── OPTIONAL: enable a 4th "Critical" priority ───────────────────────────────
-- The app currently ships High / Medium / Low to match the priority_level enum.
-- If you want the "Critical" chip back, run the line below (it cannot run inside
-- a transaction block, so run it on its own), then re-add the chip in the UI.
--
--   ALTER TYPE priority_level ADD VALUE IF NOT EXISTS 'critical';
