-- 1. Drop tables we no longer need (cascade removes their policies/fks)
DROP TABLE IF EXISTS public.quiz_attempts CASCADE;
DROP TABLE IF EXISTS public.quizzes CASCADE;
DROP TABLE IF EXISTS public.submissions CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.course_invites CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;

-- 2. Drop helpers tied to courses/posts visibility
DROP FUNCTION IF EXISTS public.is_course_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_enrolled(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.can_view_post(uuid, uuid) CASCADE;

-- 3. Reshape posts table
ALTER TABLE public.posts
  DROP COLUMN IF EXISTS course_id,
  DROP COLUMN IF EXISTS invited_emails,
  DROP COLUMN IF EXISTS visibility,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS excerpt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_image_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS quiz_url text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS read_time_minutes integer NOT NULL DEFAULT 3;

DROP TYPE IF EXISTS public.post_visibility CASCADE;

-- Backfill slugs for any existing rows
UPDATE public.posts
SET slug = lower(regexp_replace(coalesce(title, 'untitled'), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 8)
WHERE slug IS NULL OR slug = '';

ALTER TABLE public.posts ALTER COLUMN slug SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_key ON public.posts(slug);
CREATE INDEX IF NOT EXISTS posts_published_at_idx ON public.posts(published_at DESC) WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS posts_author_idx ON public.posts(author_user_id);
CREATE INDEX IF NOT EXISTS posts_tags_idx ON public.posts USING GIN(tags);

-- Drop courses table now that posts no longer reference it
DROP TABLE IF EXISTS public.courses CASCADE;

-- 4. Refresh role enum: participant + admin (drop student/lecturer)
-- Re-create via add+migrate pattern
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'participant';
COMMIT;

-- New transaction so the new enum value is usable
UPDATE public.user_roles SET role = 'participant' WHERE role IN ('student', 'lecturer');

-- 5. Update signup trigger to assign 'participant'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'participant');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Posts RLS — published posts public, drafts private to author
DROP POLICY IF EXISTS posts_read_visible ON public.posts;
DROP POLICY IF EXISTS posts_insert_owner ON public.posts;
DROP POLICY IF EXISTS posts_update_owner ON public.posts;
DROP POLICY IF EXISTS posts_delete_owner ON public.posts;

CREATE POLICY posts_read_published ON public.posts
  FOR SELECT TO anon, authenticated
  USING (published_at IS NOT NULL);

CREATE POLICY posts_read_own_drafts ON public.posts
  FOR SELECT TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY posts_insert_self ON public.posts
  FOR INSERT TO authenticated
  WITH CHECK (author_user_id = auth.uid());

CREATE POLICY posts_update_owner ON public.posts
  FOR UPDATE TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY posts_delete_owner ON public.posts
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 7. Comments RLS — public read on published posts, authenticated write
DROP POLICY IF EXISTS comments_read_post ON public.comments;
DROP POLICY IF EXISTS comments_insert_self ON public.comments;
DROP POLICY IF EXISTS comments_delete_self ON public.comments;

CREATE POLICY comments_read_public ON public.comments
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.published_at IS NOT NULL));

CREATE POLICY comments_insert_self ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.published_at IS NOT NULL)
  );

CREATE POLICY comments_delete_self ON public.comments
  FOR DELETE TO authenticated
  USING (author_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 8. Profiles — make publicly readable so author cards work for anon visitors
DROP POLICY IF EXISTS profiles_read_all ON public.profiles;
CREATE POLICY profiles_read_public ON public.profiles
  FOR SELECT TO anon, authenticated
  USING (true);

-- 9. New: bookmarks
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY bookmarks_own ON public.bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. New: claps (Medium-style reactions, multiple per user up to a cap)
CREATE TABLE public.claps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  count integer NOT NULL DEFAULT 1 CHECK (count BETWEEN 1 AND 50),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);
ALTER TABLE public.claps ENABLE ROW LEVEL SECURITY;
CREATE POLICY claps_read_public ON public.claps
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY claps_write_own ON public.claps
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. New: lesson_views for analytics
CREATE TABLE public.lesson_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  viewer_user_id uuid,
  visitor_hash text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.lesson_views ENABLE ROW LEVEL SECURITY;
-- Anyone can record a view
CREATE POLICY views_insert_public ON public.lesson_views
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- Authors can read their own posts' views; admins read all
CREATE POLICY views_read_author ON public.lesson_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE INDEX lesson_views_post_idx ON public.lesson_views(post_id, created_at DESC);

-- 12. updated_at trigger on posts
DROP TRIGGER IF EXISTS posts_set_updated_at ON public.posts;
CREATE TRIGGER posts_set_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();