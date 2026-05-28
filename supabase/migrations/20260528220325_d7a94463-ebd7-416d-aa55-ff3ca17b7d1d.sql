-- 1. Username edit tracking
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_edits_used integer NOT NULL DEFAULT 0;

-- 2. Grading fields on voice_submissions
ALTER TABLE public.voice_submissions
  ADD COLUMN IF NOT EXISTS transcript text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS clarity_score integer,
  ADD COLUMN IF NOT EXISTS accuracy_score integer,
  ADD COLUMN IF NOT EXISTS completeness_score integer,
  ADD COLUMN IF NOT EXISTS total_score integer,
  ADD COLUMN IF NOT EXISTS ai_feedback text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS released_at timestamptz,
  ADD COLUMN IF NOT EXISTS grading_error text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_voice_submissions_post_graded
  ON public.voice_submissions (post_id, graded_at);

-- 3. Replace blanket "voice_own" ALL policy with granular ones so students
--    cannot tamper with their own scores via direct API calls.
DROP POLICY IF EXISTS voice_own ON public.voice_submissions;

CREATE POLICY voice_select_own
  ON public.voice_submissions
  FOR SELECT TO authenticated
  USING (student_user_id = auth.uid());

CREATE POLICY voice_insert_own
  ON public.voice_submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_user_id = auth.uid());

CREATE POLICY voice_delete_own
  ON public.voice_submissions
  FOR DELETE TO authenticated
  USING (student_user_id = auth.uid());

-- Author / admin can update (for grading) and delete
CREATE POLICY voice_update_author_admin
  ON public.voice_submissions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts p
            WHERE p.id = voice_submissions.post_id
              AND p.author_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.posts p
            WHERE p.id = voice_submissions.post_id
              AND p.author_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY voice_delete_author_admin
  ON public.voice_submissions
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts p
            WHERE p.id = voice_submissions.post_id
              AND p.author_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );