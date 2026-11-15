-- Resolve the PL/pgSQL name collision that blocked independent membership intake.
-- Keep the audit-history behavior unchanged; only qualify the unnest column alias.
CREATE OR REPLACE FUNCTION private.rls_capture_member_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  old_json jsonb := to_jsonb(OLD);
  new_json jsonb := to_jsonb(NEW);
  changed jsonb;
  old_safe jsonb := '{}'::jsonb;
  new_safe jsonb := '{}'::jsonb;
  tracked text[] := ARRAY[
    'full_name','display_name','email','category','membership_status','is_public',
    'member_number','reviewed_at','review_note','status','reviewed_by',
    'institution','country','city'
  ];
  field_name text;
  target_id uuid;
  record_id uuid;
  source_name text := TG_TABLE_NAME;
  display_name text;
  email_value text;
  event_action text := 'profile_updated';
BEGIN
  SELECT COALESCE(jsonb_agg(to_jsonb(tracked_fields.column_key)), '[]'::jsonb)
    INTO changed
  FROM unnest(tracked) AS tracked_fields(column_key)
  WHERE old_json -> tracked_fields.column_key
        IS DISTINCT FROM new_json -> tracked_fields.column_key;

  IF changed = '[]'::jsonb THEN
    RETURN NEW;
  END IF;

  FOR field_name IN SELECT jsonb_array_elements_text(changed)
  LOOP
    old_safe := old_safe || jsonb_build_object(field_name, old_json -> field_name);
    new_safe := new_safe || jsonb_build_object(field_name, new_json -> field_name);
  END LOOP;

  IF source_name = 'rls_profiles' THEN
    target_id := NEW.user_id;
    record_id := NEW.user_id;
    display_name := COALESCE(NEW.full_name, NEW.display_name, OLD.full_name, OLD.display_name);
    email_value := COALESCE(NEW.email, OLD.email);
    IF TG_OP = 'INSERT' THEN
      event_action := 'member_created';
    ELSIF OLD.membership_status IS DISTINCT FROM NEW.membership_status THEN
      event_action := 'membership_status_changed';
    ELSIF OLD.member_number IS DISTINCT FROM NEW.member_number THEN
      event_action := 'membership_number_changed';
    ELSE
      event_action := 'profile_updated';
    END IF;
  ELSE
    record_id := NEW.id;
    display_name := COALESCE(NEW.full_name, OLD.full_name);
    email_value := COALESCE(NEW.email, OLD.email);
    IF TG_OP = 'INSERT' THEN
      event_action := 'application_submitted';
    ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
      event_action := 'application_status_changed';
    ELSE
      event_action := 'application_updated';
    END IF;
  END IF;

  INSERT INTO public.rls_admin_member_history
    (target_user_id, source_table, source_record_id, member_name, member_email,
     actor_id, action, changed_fields, old_values, new_values)
  VALUES
    (target_id, source_name, record_id, display_name, email_value, auth.uid(),
     event_action, changed, old_safe, new_safe);

  RETURN NEW;
END;
$function$;

-- Authenticated clients need SQL privileges for the admin UI. Existing RLS
-- restricts both reads and writes to users whose rls_user_roles row is admin.
GRANT SELECT, UPDATE ON TABLE public.rls_membership_applications TO authenticated;
