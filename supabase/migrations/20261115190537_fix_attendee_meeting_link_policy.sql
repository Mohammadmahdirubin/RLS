DROP POLICY IF EXISTS "Confirmed attendees read webinar integrations" ON public.rls_webinar_integrations;
CREATE POLICY "Confirmed attendees read webinar integrations" ON public.rls_webinar_integrations
 FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rls_webinar_registrations r
    WHERE r.event_id = rls_webinar_integrations.event_id
      AND r.user_id = (SELECT auth.uid()) AND r.status = 'confirmed')
);