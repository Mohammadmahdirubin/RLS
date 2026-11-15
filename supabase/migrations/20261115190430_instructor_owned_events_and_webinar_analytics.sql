ALTER TABLE public.rls_events
  ADD COLUMN IF NOT EXISTS webinar_mode text NOT NULL DEFAULT 'external'
    CHECK (webinar_mode IN ('external','embedded')),
  ADD COLUMN IF NOT EXISTS webinar_platform text NOT NULL DEFAULT 'google_meet'
    CHECK (webinar_platform IN ('google_meet','zoom','teams','jitsi','other')),
  ADD COLUMN IF NOT EXISTS meeting_url text,
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity > 0),
  ADD COLUMN IF NOT EXISTS registration_enabled boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS rls_events_created_by_idx ON public.rls_events(created_by, created_at DESC);
CREATE INDEX IF NOT EXISTS rls_events_status_date_idx ON public.rls_events(status, event_date);

DROP POLICY IF EXISTS "RLS admins manage events" ON public.rls_events;
CREATE POLICY "Admins manage all events" ON public.rls_events
  FOR ALL TO authenticated
  USING ((SELECT private.rls_is_admin()))
  WITH CHECK ((SELECT private.rls_is_admin()));

CREATE POLICY "Instructor admins read own events" ON public.rls_events
  FOR SELECT TO authenticated
  USING (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.rls_user_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin'
  ));

CREATE POLICY "Instructor admins create own events" ON public.rls_events
  FOR INSERT TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.rls_user_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin'
  ));

CREATE POLICY "Instructor admins update own events" ON public.rls_events
  FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.rls_user_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin'
  ))
  WITH CHECK (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.rls_user_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin'
  ));

CREATE POLICY "Instructor admins delete own events" ON public.rls_events
  FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) AND EXISTS (
    SELECT 1 FROM public.rls_user_roles r
    WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin'
  ));

CREATE TABLE IF NOT EXISTS public.rls_webinar_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.rls_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending','confirmed','cancelled')),
  registered_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id,user_id)
);
CREATE INDEX IF NOT EXISTS rls_webinar_registrations_event_idx ON public.rls_webinar_registrations(event_id,status,registered_at DESC);
CREATE INDEX IF NOT EXISTS rls_webinar_registrations_user_idx ON public.rls_webinar_registrations(user_id,registered_at DESC);
ALTER TABLE public.rls_webinar_registrations ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rls_webinar_registrations TO authenticated;

CREATE POLICY "Users read own webinar registrations" ON public.rls_webinar_registrations
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Users register themselves" ON public.rls_webinar_registrations
  FOR INSERT TO authenticated WITH CHECK (
    user_id = (SELECT auth.uid()) AND EXISTS (
      SELECT 1 FROM public.rls_events e WHERE e.id = event_id
      AND e.event_type = 'webinar' AND e.status = 'published'
      AND e.registration_enabled = true
    )
  );
CREATE POLICY "Users cancel own webinar registrations" ON public.rls_webinar_registrations
  FOR UPDATE TO authenticated USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'cancelled');
CREATE POLICY "Event owners read registrations" ON public.rls_webinar_registrations
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id = event_id AND e.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  );
CREATE POLICY "Event owners manage registrations" ON public.rls_webinar_registrations
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id = event_id AND e.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id = event_id AND e.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  );

CREATE TABLE IF NOT EXISTS public.rls_webinar_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.rls_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  attendance_source text NOT NULL DEFAULT 'manual'
    CHECK (attendance_source IN ('manual','google_meet','zoom','teams','jitsi','embedded')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (left_at IS NULL OR left_at >= joined_at)
);
CREATE INDEX IF NOT EXISTS rls_webinar_attendance_event_idx ON public.rls_webinar_attendance(event_id,joined_at DESC);
CREATE INDEX IF NOT EXISTS rls_webinar_attendance_user_idx ON public.rls_webinar_attendance(user_id,joined_at DESC);
ALTER TABLE public.rls_webinar_attendance ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rls_webinar_attendance TO authenticated;

CREATE POLICY "Users read own webinar attendance" ON public.rls_webinar_attendance
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "Event owners read attendance" ON public.rls_webinar_attendance
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id = event_id AND e.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  );
CREATE POLICY "Event owners manage attendance" ON public.rls_webinar_attendance
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id = event_id AND e.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id = event_id AND e.created_by = (SELECT auth.uid()))
    OR (SELECT private.rls_is_admin())
  );

CREATE POLICY "Admins assign instructor admins" ON public.rls_user_roles
  FOR INSERT TO authenticated WITH CHECK ((SELECT private.rls_is_admin()) AND role::text = 'instructor_admin');
CREATE POLICY "Admins remove instructor admins" ON public.rls_user_roles
  FOR DELETE TO authenticated USING ((SELECT private.rls_is_admin()) AND role::text = 'instructor_admin');

CREATE POLICY "Instructor admins upload own event posters" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'rls-event-posters'
    AND EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id::text = (storage.foldername(name))[1] AND e.created_by = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.rls_user_roles r WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin')
  );
CREATE POLICY "Instructor admins delete own event posters" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'rls-event-posters'
    AND EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id::text = (storage.foldername(name))[1] AND e.created_by = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.rls_user_roles r WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin')
  );
CREATE POLICY "Instructor admins update own event posters" ON storage.objects
  FOR UPDATE TO authenticated USING (
    bucket_id = 'rls-event-posters'
    AND EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id::text = (storage.foldername(name))[1] AND e.created_by = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.rls_user_roles r WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin')
  ) WITH CHECK (
    bucket_id = 'rls-event-posters'
    AND EXISTS (SELECT 1 FROM public.rls_events e WHERE e.id::text = (storage.foldername(name))[1] AND e.created_by = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.rls_user_roles r WHERE r.user_id = (SELECT auth.uid()) AND r.role::text = 'instructor_admin')
  );