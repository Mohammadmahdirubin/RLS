DROP POLICY IF EXISTS "Confirmed attendees read webinar integrations" ON public.rls_webinar_integrations;
CREATE POLICY "Confirmed attendees read webinar integrations" ON public.rls_webinar_integrations
 FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.rls_webinar_registrations r
    JOIN public.rls_events e ON e.id = r.event_id
    WHERE r.event_id = rls_webinar_integrations.event_id
      AND r.user_id = (SELECT auth.uid())
      AND r.status = 'confirmed'
      AND e.starts_at IS NOT NULL
      AND now() >= e.starts_at - interval '30 minutes'
      AND now() <= COALESCE(e.ends_at, e.starts_at + interval '4 hours') + interval '60 minutes'
  )
);