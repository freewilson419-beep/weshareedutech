CREATE TABLE IF NOT EXISTS public.signup_otp_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  alias_code text NOT NULL,
  real_token text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.signup_otp_aliases ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS signup_otp_aliases_lookup_idx
  ON public.signup_otp_aliases (lower(email), alias_code, created_at DESC)
  WHERE consumed_at IS NULL;

CREATE INDEX IF NOT EXISTS signup_otp_aliases_expiry_idx
  ON public.signup_otp_aliases (expires_at);

DROP POLICY IF EXISTS "No direct client access to signup otp aliases" ON public.signup_otp_aliases;
CREATE POLICY "No direct client access to signup otp aliases"
  ON public.signup_otp_aliases
  FOR ALL
  USING (false)
  WITH CHECK (false);