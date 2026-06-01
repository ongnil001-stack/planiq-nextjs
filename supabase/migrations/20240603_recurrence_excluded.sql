-- PlanIQ: Add excluded_dates to support "skip this occurrence" on recurring schedules
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS excluded_dates TEXT DEFAULT NULL;

COMMENT ON COLUMN schedules.excluded_dates
  IS 'JSON array of YYYY-MM-DD strings representing skipped occurrences of a recurring schedule';
