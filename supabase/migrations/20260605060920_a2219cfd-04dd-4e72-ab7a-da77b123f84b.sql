REVOKE SELECT (email, phone_number, whatsapp_number, control_number) ON public.profiles FROM anon;

DROP POLICY IF EXISTS platann_read ON public.platform_announcements;
CREATE POLICY platann_read ON public.platform_announcements
  FOR SELECT
  TO authenticated
  USING (
    target_user_ids IS NULL
    OR cardinality(target_user_ids) = 0
    OR auth.uid() = ANY (target_user_ids)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );