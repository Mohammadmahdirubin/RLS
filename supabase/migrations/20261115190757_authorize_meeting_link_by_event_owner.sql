DROP POLICY IF EXISTS "Owners and admins read webinar integrations" ON public.rls_webinar_integrations;
DROP POLICY IF EXISTS "Owners and admins manage webinar integrations" ON public.rls_webinar_integrations;
CREATE POLICY "Event owners and admins read webinar integrations" ON public.rls_webinar_integrations
 FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rls_events e
    WHERE e.id = rls_webinar_integrations.event_id AND e.created_by = (SELECT auth.uid()))
  OR (SELECT private.rls_is_admin())
);
CREATE POLICY "Event owners and admins manage webinar integrations" ON public.rls_webinar_integrations
 FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rls_events e
    WHERE e.id = rls_webinar_integrations.event_id AND e.created_by = (SELECT auth.uid()))
  OR (SELECT private.rls_is_admin())
 ) WITH CHECK (
  EXISTS (SELECT 1 FROM public.rls_events e
    WHERE e.id = rls_webinar_integrations.event_id AND e.created_by = (SELECT auth.uid()))
  OR (SELECT private.rls_is_admin())
);