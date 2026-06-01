-- ═══════════════════════════════════════════════════════════
-- PlanIQ — Supabase Database Schema
-- Run this entire file in: Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- ── ENUMS ──────────────────────────────────────────────────
CREATE TYPE schedule_type AS ENUM ('task', 'event', 'reminder', 'block');
CREATE TYPE priority_level AS ENUM ('high', 'medium', 'low');

-- ── PROFILES ───────────────────────────────────────────────
-- Auto-created when a user signs up via trigger below
CREATE TABLE public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  full_name    TEXT,
  avatar_url   TEXT,
  designation  TEXT,
  country_code TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── SCHEDULES ──────────────────────────────────────────────
CREATE TABLE public.schedules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  type          schedule_type DEFAULT 'task' NOT NULL,
  priority      priority_level DEFAULT 'medium' NOT NULL,
  start_time    TIMESTAMPTZ NOT NULL,
  end_time      TIMESTAMPTZ,
  all_day       BOOLEAN DEFAULT FALSE NOT NULL,
  color         TEXT,
  location      TEXT,
  is_completed  BOOLEAN DEFAULT FALSE NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast per-user date-range queries
CREATE INDEX idx_schedules_user_start ON public.schedules (user_id, start_time);
CREATE INDEX idx_schedules_user_completed ON public.schedules (user_id, is_completed);

-- ── SCHEDULE COMPLETIONS (per-occurrence completion for recurring) ──
-- Recurring schedules are one row; each occurrence's completion is tracked here.
-- Non-recurring schedules use schedules.is_completed instead.
CREATE TABLE public.schedule_completions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id     UUID        NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  occurrence_date DATE        NOT NULL,
  completed_at    TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  days_late       INTEGER,
  UNIQUE (schedule_id, occurrence_date)
);
CREATE INDEX idx_sched_compl_user  ON public.schedule_completions (user_id);
CREATE INDEX idx_sched_compl_sched ON public.schedule_completions (schedule_id, occurrence_date);

-- ── AI ANALYSES ─────────────────────────────────────────────
CREATE TABLE public.ai_analyses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  analysis_date    DATE DEFAULT CURRENT_DATE NOT NULL,
  workload_score   SMALLINT CHECK (workload_score BETWEEN 0 AND 100),
  summary          TEXT,
  recommendations  JSONB,
  issues           JSONB,
  raw_response     TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_ai_analyses_user_date ON public.ai_analyses (user_id, analysis_date DESC);

-- ═══════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- Users can only see and edit their own data
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_completions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Schedules
CREATE POLICY "Users can view own schedules"
  ON public.schedules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules"
  ON public.schedules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules"
  ON public.schedules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules"
  ON public.schedules FOR DELETE
  USING (auth.uid() = user_id);

-- AI Analyses
CREATE POLICY "Users can view own analyses"
  ON public.ai_analyses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analyses"
  ON public.ai_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Schedule completions (per-occurrence)
CREATE POLICY "Users manage own schedule completions"
  ON public.schedule_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER set_schedules_updated_at
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
