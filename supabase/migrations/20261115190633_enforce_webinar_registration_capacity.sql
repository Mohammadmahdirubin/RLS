CREATE OR REPLACE FUNCTION private.enforce_webinar_registration_capacity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_capacity integer; v_enabled boolean; v_status text; v_type text; v_count integer;
BEGIN
  IF NEW.status <> 'confirmed' THEN RETURN NEW; END IF;
  SELECT e.capacity, e.registration_enabled, e.status, e.event_type
    INTO v_capacity, v_enabled, v_status, v_type
  FROM public.rls_events e WHERE e.id = NEW.event_id FOR UPDATE;
  IF NOT FOUND OR v_type <> 'webinar' OR v_status <> 'published' OR NOT v_enabled THEN
    RAISE EXCEPTION 'Registration is not open for this webinar';
  END IF;
  IF v_capacity IS NOT NULL THEN
    SELECT count(*)::integer INTO v_count FROM public.rls_webinar_registrations r
    WHERE r.event_id = NEW.event_id AND r.status = 'confirmed' AND r.id IS DISTINCT FROM NEW.id;
    IF v_count >= v_capacity THEN RAISE EXCEPTION 'Webinar registration capacity has been reached'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_webinar_registration_capacity() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS rls_webinar_registration_capacity ON public.rls_webinar_registrations;
CREATE TRIGGER rls_webinar_registration_capacity
BEFORE INSERT OR UPDATE OF status ON public.rls_webinar_registrations
FOR EACH ROW EXECUTE FUNCTION private.enforce_webinar_registration_capacity();