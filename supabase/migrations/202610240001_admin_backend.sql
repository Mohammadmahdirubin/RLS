-- RLS admin backend: PostgreSQL schema + row-level security.
-- Run in Supabase SQL Editor after creating a project.
-- Public sign-up should remain disabled in Supabase Auth settings.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('admin', 'expert');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.article_status as enum ('draft', 'pending_review', 'published', 'rejected');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  role public.app_role not null default 'expert',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  corresponding_author text not null,
  language text not null default 'fa' check (language in ('fa','en','ru')),
  issue_label text not null default '',
  publication_year text not null default '',
  article_type text not null default 'research',
  abstract text not null default '',
  pdf_path text,
  poster_path text,
  cover_path text,
  status public.article_status not null default 'pending_review',
  created_by uuid not null references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  original_name text not null,
  storage_path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  media_kind text not null check (media_kind in ('article_pdf','poster','cover')),
  article_id uuid references public.articles(id) on delete set null,
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists articles_status_created_idx on public.articles(status, created_at desc);
create index if not exists articles_created_by_idx on public.articles(created_by, created_at desc);
create index if not exists media_uploaded_by_idx on public.media(uploaded_by, created_at desc);
create index if not exists audit_logs_created_at_idx on public.audit_logs(created_at desc);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();
drop trigger if exists articles_touch_updated_at on public.articles;
create trigger articles_touch_updated_at before update on public.articles
for each row execute function public.touch_updated_at();

-- New accounts are always experts. Role escalation is never available to a browser client.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'expert')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role language sql stable security definer set search_path = ''
as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.active = true
  limit 1;
$$;

create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.active = true);
$$;

alter table public.profiles enable row level security;
alter table public.articles enable row level security;
alter table public.media enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles read self or admin" on public.profiles;
create policy "profiles read self or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
-- Profile inserts are trigger-only; clients cannot create/promote profiles.
revoke insert, delete on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

drop policy if exists "published articles are public" on public.articles;
create policy "published articles are public" on public.articles for select to anon, authenticated
using (status = 'published' or (auth.uid() is not null and (created_by = auth.uid() or public.current_app_role() = 'admin')));

drop policy if exists "experts create own articles" on public.articles;
create policy "experts create own articles" on public.articles for insert to authenticated
with check (public.is_active_user() and created_by = auth.uid() and status in ('draft','pending_review'));

drop policy if exists "authors edit own unapproved articles" on public.articles;
create policy "authors edit own unapproved articles" on public.articles for update to authenticated
using (created_by = auth.uid() and status in ('draft','pending_review'))
with check (created_by = auth.uid() and status in ('draft','pending_review'));

drop policy if exists "admins manage all articles" on public.articles;
create policy "admins manage all articles" on public.articles for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "media readable by owner or admin" on public.media;
create policy "media readable by owner or admin" on public.media for select to authenticated
using (uploaded_by = auth.uid() or public.current_app_role() = 'admin');
drop policy if exists "active users register own media" on public.media;
create policy "active users register own media" on public.media for insert to authenticated
with check (public.is_active_user() and uploaded_by = auth.uid());
drop policy if exists "admins manage media metadata" on public.media;
create policy "admins manage media metadata" on public.media for update to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
drop policy if exists "admins delete media metadata" on public.media;
create policy "admins delete media metadata" on public.media for delete to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists "settings readable" on public.site_settings;
create policy "settings readable" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admins manage settings" on public.site_settings;
create policy "admins manage settings" on public.site_settings for all to authenticated
using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

drop policy if exists "admins read audit logs" on public.audit_logs;
create policy "admins read audit logs" on public.audit_logs for select to authenticated
using (public.current_app_role() = 'admin');
drop policy if exists "active users write own audit logs" on public.audit_logs;
create policy "active users write own audit logs" on public.audit_logs for insert to authenticated
with check (actor_id = auth.uid() and public.is_active_user());

-- Private storage bucket. Uploads must be placed under {auth.uid()}/...
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('rls-editorial', 'rls-editorial', false, 20971520,
  array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = 20971520,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png','image/webp'];

drop policy if exists "active users upload own editorial files" on storage.objects;
create policy "active users upload own editorial files" on storage.objects for insert to authenticated
with check (
  bucket_id = 'rls-editorial'
  and public.is_active_user()
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "owners and admins read editorial files" on storage.objects;
create policy "owners and admins read editorial files" on storage.objects for select to authenticated
using (
  bucket_id = 'rls-editorial'
  and ((storage.foldername(name))[1] = auth.uid()::text or public.current_app_role() = 'admin')
);

drop policy if exists "owners replace own editorial files" on storage.objects;
create policy "owners replace own editorial files" on storage.objects for update to authenticated
using (bucket_id = 'rls-editorial' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'rls-editorial' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "admins delete editorial files" on storage.objects;
create policy "admins delete editorial files" on storage.objects for delete to authenticated
using (bucket_id = 'rls-editorial' and public.current_app_role() = 'admin');

grant execute on function public.current_app_role() to anon, authenticated;
grant execute on function public.is_active_user() to authenticated;
