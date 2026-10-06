ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS require_teaching boolean NOT NULL DEFAULT true;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS gate_questions jsonb NOT NULL DEFAULT '{}'::jsonb;