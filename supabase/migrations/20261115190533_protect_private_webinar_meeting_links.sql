ALTER TABLE public.rls_events DROP COLUMN IF EXISTS meeting_url;
CREATE TABLE IF NOT EXISTS public.rls_webinar_integrations (
  event_id uuid PRIMARY KEY REFERENCES public.rls_events(id) ON DELETE CASCADE,
  meeting_url text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(meeting_url) <= 2000)
);
ALTER TABLE public.rls_webinar_integrations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rls_webinar_integrations TO authenticated;
CREATE POLICY "Owners and admins read webinar integrations" ON public.rls_webinar_integrations
 FOR SELECT TO authenticated USING (created_by=(SELECT auth.uid()) OR (SELECT private.rls_is_admin()));
CREATE POLICY "Owners and admins manage webinar integrations" ON public.rls_webinar_integrations
 FOR ALL TO authenticated USING (created_by=(SELECT auth.uid()) OR (SELECT private.rls_is_admin()))
 WITH CHECK (created_by=(SELECT auth.uid()) OR (SELECT private.rls_is_admin()));