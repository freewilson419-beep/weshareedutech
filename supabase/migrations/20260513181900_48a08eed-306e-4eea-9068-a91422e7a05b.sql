
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS section_media jsonb NOT NULL DEFAULT '{}'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "post-media public read" ON storage.objects;
CREATE POLICY "post-media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "post-media auth upload" ON storage.objects;
CREATE POLICY "post-media auth upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'post-media' AND owner = auth.uid());

DROP POLICY IF EXISTS "post-media owner update" ON storage.objects;
CREATE POLICY "post-media owner update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'post-media' AND owner = auth.uid());

DROP POLICY IF EXISTS "post-media owner delete" ON storage.objects;
CREATE POLICY "post-media owner delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'post-media' AND owner = auth.uid());
