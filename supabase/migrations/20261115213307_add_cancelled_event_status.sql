ALTER TABLE public.rls_events DROP CONSTRAINT IF EXISTS rls_events_status_check;
ALTER TABLE public.rls_events
  ADD CONSTRAINT rls_events_status_check
  CHECK (status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text, 'cancelled'::text]));

DROP POLICY IF EXISTS "Public can read published RLS events" ON public.rls_events;
CREATE POLICY "Public can read published RLS events"
  ON public.rls_events
  FOR SELECT
  TO anon, authenticated
  USING (status = ANY (ARRAY['published'::text, 'archived'::text, 'cancelled'::text]));
