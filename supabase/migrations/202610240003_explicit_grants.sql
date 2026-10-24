-- Explicit grants for projects where default table grants were tightened.
grant select, insert, update, delete on public.articles to authenticated;
grant select on public.articles to anon;
grant select, insert, update, delete on public.media to authenticated;
grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant select, insert on public.audit_logs to authenticated;
grant usage, select on sequence public.audit_logs_id_seq to authenticated;
grant select, update on public.profiles to authenticated;
