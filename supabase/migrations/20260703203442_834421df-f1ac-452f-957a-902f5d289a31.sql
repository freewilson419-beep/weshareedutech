ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS edited_at timestamptz;

DROP POLICY IF EXISTS comments_update_self_once ON public.comments;
CREATE POLICY comments_update_self_once ON public.comments
  FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() AND edited_at IS NULL)
  WITH CHECK (author_user_id = auth.uid() AND edited_at IS NOT NULL);