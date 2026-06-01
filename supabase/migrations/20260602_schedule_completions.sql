-- ─────────────────────────────────────────────────────────────────────────────
-- Per-occurrence completion for recurring schedules
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
--
-- Recurring schedules are stored as a SINGLE row in `schedules` (with a
-- recurrence_rule). The individual occurrences are generated on the fly, so they
-- have no row of their own to mark complete. This table records completion per
-- (schedule_id, occurrence_date) so that completing "Mon's Workout" does NOT
-- complete the whole series.
--
-- Non-recurring schedules continue to use schedules.is_completed (unchanged).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.schedule_completions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     uuid        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurrence_date date        NOT NULL,
  completed_at    timestamptz NOT NULL DEFAULT now(),
  days_late       integer,
  UNIQUE (schedule_id, occurrence_date)
);

CREATE INDEX IF NOT EXISTS idx_sched_compl_user  ON public.schedule_completions (user_id);
CREATE INDEX IF NOT EXISTS idx_sched_compl_sched ON public.schedule_completions (schedule_id, occurrence_date);

ALTER TABLE public.schedule_completions ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage completions for their own occurrences
CREATE POLICY "Users manage own schedule completions"
  ON public.schedule_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Refresh PostgREST schema cache so the new table is queryable immediately
NOTIFY pgrst, 'reload schema';
