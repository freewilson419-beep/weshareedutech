
-- New post fields (additive only)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS download_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS reflection_form_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count integer NOT NULL DEFAULT 0;

-- Targeted announcements (additive)
ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS target_user_ids uuid[] NOT NULL DEFAULT '{}';

-- Threaded comments (additive; existing comments untouched)
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS comments_parent_idx ON public.comments(parent_id);

-- Validate comment length via trigger (not CHECK — easier to evolve)
CREATE OR REPLACE FUNCTION public.comments_validate_length()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF length(NEW.body) > 1000 THEN
    RAISE EXCEPTION 'Comment too long (max 1000 chars)';
  END IF;
  IF length(btrim(NEW.body)) = 0 THEN
    RAISE EXCEPTION 'Comment cannot be empty';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS comments_validate_length ON public.comments;
CREATE TRIGGER comments_validate_length BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.comments_validate_length();

-- Comment likes
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
GRANT SELECT ON public.comment_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comment_likes_read" ON public.comment_likes;
CREATE POLICY "comment_likes_read" ON public.comment_likes FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "comment_likes_write_own" ON public.comment_likes;
CREATE POLICY "comment_likes_write_own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "comment_likes_delete_own" ON public.comment_likes;
CREATE POLICY "comment_likes_delete_own" ON public.comment_likes FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS comment_likes_comment_idx ON public.comment_likes(comment_id);

-- Maintain posts.view_count via trigger on lesson_views
CREATE OR REPLACE FUNCTION public.posts_inc_views()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET view_count = view_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS lesson_views_inc ON public.lesson_views;
CREATE TRIGGER lesson_views_inc AFTER INSERT ON public.lesson_views
  FOR EACH ROW EXECUTE FUNCTION public.posts_inc_views();

-- Maintain posts.like_count via trigger on claps
CREATE OR REPLACE FUNCTION public.posts_sync_likes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS claps_sync ON public.claps;
CREATE TRIGGER claps_sync AFTER INSERT OR DELETE ON public.claps
  FOR EACH ROW EXECUTE FUNCTION public.posts_sync_likes();

-- Backfill counts from existing data
UPDATE public.posts p SET
  view_count = COALESCE((SELECT count(*) FROM public.lesson_views v WHERE v.post_id = p.id), 0),
  like_count = COALESCE((SELECT count(*) FROM public.claps c WHERE c.post_id = p.id), 0);
