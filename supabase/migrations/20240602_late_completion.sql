-- ─── PlanIQ: Late Completion Tracking ─────────────────────────────────────────
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run

-- Add completion timestamp and days-late counter to schedules
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS days_late     integer;

-- Backfill completed_at for already-completed rows (use updated_at as approximation)
UPDATE schedules
SET    completed_at = updated_at
WHERE  is_completed = true
  AND  completed_at IS NULL;
