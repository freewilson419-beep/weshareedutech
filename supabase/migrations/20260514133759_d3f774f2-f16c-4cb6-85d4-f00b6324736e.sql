ALTER TABLE public.platform_announcements
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS cta_label text NOT NULL DEFAULT 'Open',
  ADD COLUMN IF NOT EXISTS cta_url text NOT NULL DEFAULT '/dashboard';