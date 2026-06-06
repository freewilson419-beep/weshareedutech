
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS ai_grading_enabled boolean NOT NULL DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS ai_grading_limit integer;

INSERT INTO public.settings (key, value) VALUES ('ai_grading_enabled','true')
  ON CONFLICT (key) DO NOTHING;
INSERT INTO public.settings (key, value) VALUES ('announcement_send_email_default','true')
  ON CONFLICT (key) DO NOTHING;
