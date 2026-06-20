
CREATE INDEX IF NOT EXISTS lesson_views_created_at_idx ON public.lesson_views (created_at DESC);

CREATE OR REPLACE FUNCTION public.trending_post_ids(_since timestamptz, _limit int DEFAULT 4)
RETURNS TABLE(post_id uuid, views bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT post_id, count(*) AS views
  FROM public.lesson_views
  WHERE created_at >= _since
  GROUP BY post_id
  ORDER BY views DESC
  LIMIT _limit
$$;

GRANT EXECUTE ON FUNCTION public.trending_post_ids(timestamptz, int) TO anon, authenticated;
