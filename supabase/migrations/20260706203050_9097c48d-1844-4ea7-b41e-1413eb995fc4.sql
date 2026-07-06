CREATE OR REPLACE FUNCTION public.delete_stale_drafts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE deleted_count integer;
BEGIN
  WITH del AS (
    DELETE FROM public.posts
    WHERE published_at IS NULL
      AND updated_at < now() - interval '24 hours'
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM del;
  RETURN deleted_count;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'delete-stale-drafts') THEN
    PERFORM cron.unschedule('delete-stale-drafts');
  END IF;
  PERFORM cron.schedule(
    'delete-stale-drafts',
    '0 * * * *',
    $cron$ SELECT public.delete_stale_drafts(); $cron$
  );
END $$;