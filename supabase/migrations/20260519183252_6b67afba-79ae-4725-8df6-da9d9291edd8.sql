
-- Voice submissions for the "Learn to teach" section of lessons
CREATE TABLE public.voice_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  student_user_id uuid NOT NULL,
  storage_path text NOT NULL,
  duration_seconds integer NOT NULL DEFAULT 0,
  file_size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text NOT NULL DEFAULT 'audio/webm',
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_voice_submissions_post ON public.voice_submissions(post_id, created_at DESC);
CREATE INDEX idx_voice_submissions_student ON public.voice_submissions(student_user_id, created_at DESC);

ALTER TABLE public.voice_submissions ENABLE ROW LEVEL SECURITY;

-- Student can see + manage their own submissions
CREATE POLICY voice_own ON public.voice_submissions
  FOR ALL TO authenticated
  USING (student_user_id = auth.uid())
  WITH CHECK (student_user_id = auth.uid());

-- Lesson author (or admin) can read all submissions for their lesson
CREATE POLICY voice_read_author ON public.voice_submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- Storage policies for the existing private "submissions" bucket
-- Path convention: {user_id}/voice/{post_id}/{filename}
CREATE POLICY "voice upload own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "voice read own folder"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "voice read lesson author"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'submissions'
    AND EXISTS (
      SELECT 1 FROM public.voice_submissions vs
      JOIN public.posts p ON p.id = vs.post_id
      WHERE vs.storage_path = storage.objects.name
        AND (p.author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role))
    )
  );

CREATE POLICY "voice delete own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'submissions' AND (storage.foldername(name))[1] = auth.uid()::text);
