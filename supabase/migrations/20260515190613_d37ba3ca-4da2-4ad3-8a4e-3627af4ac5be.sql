ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_unlisted boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS posts_is_unlisted_idx ON public.posts (is_unlisted);