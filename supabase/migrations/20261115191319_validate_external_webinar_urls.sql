ALTER TABLE public.rls_webinar_integrations
  ADD CONSTRAINT rls_webinar_integrations_https_url_check
  CHECK (meeting_url ~* '^https://[^[:space:]]+$');

ALTER TABLE public.rls_events
  ADD CONSTRAINT rls_events_registration_https_url_check
  CHECK (registration_url IS NULL OR registration_url ~* '^https?://[^[:space:]]+$');
