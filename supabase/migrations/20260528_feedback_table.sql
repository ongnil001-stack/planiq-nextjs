-- ─────────────────────────────────────────────────────────────────────────────
-- feedback table — stores in-app bug reports, feature requests, and feedback
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feedback (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  type        text        NOT NULL CHECK (type IN ('bug', 'feature', 'general')),
  subject     text,
  message     text        NOT NULL,
  app_version text,
  user_agent  text,
  url         text,
  status      text        NOT NULL DEFAULT 'new'
                          CHECK (status IN ('new', 'acknowledged', 'resolved')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS feedback_user_id_idx  ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS feedback_type_idx      ON public.feedback (type);
CREATE INDEX IF NOT EXISTS feedback_created_idx   ON public.feedback (created_at DESC);

-- RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own feedback
CREATE POLICY "Users can insert feedback"
  ON public.feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can read their own feedback (so they can see if it was acknowledged)
CREATE POLICY "Users can read own feedback"
  ON public.feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
