CREATE UNIQUE INDEX IF NOT EXISTS rls_webinar_attendance_event_user_uidx
ON public.rls_webinar_attendance(event_id,user_id);