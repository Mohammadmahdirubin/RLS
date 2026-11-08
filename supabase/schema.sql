-- RLS Association: secure membership schema for Supabase
-- Apply in Supabase SQL Editor. Do not expose service_role keys in client code.

create extension if not exists pgcrypto;

do $$ begin
  create type public.rls_member_category as enum (
    'student','graduate','faculty','researcher','translator','culture','honorary'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rls_membership_status as enum (
    'pending','approved','rejected','suspended'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.rls_user_role as enum ('member','admin');
exception when duplicate_object then null; end $$;

create table if not exists public.rls_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),
  display_name text check (display_name is null or char_length(display_name) <= 160),
  category public.rls_member_category not null,
  email text,
  country text,
  city text,
  institution text,
  degree text,
  specialty text,
  bio text check (bio is null or char_length(bio) <= 3000),
  avatar_path text,
  evidence_url text,
  website_url text,
  orcid text,
  membership_status public.rls_membership_status not null default 'pending',
  is_public boolean not null default false,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rls_profile_public_only_approved check (
    is_public = false or membership_status = 'approved'
  )
);

create table if not exists public.rls_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.rls_user_role not null default 'member',
  created_at timestamptz not null default now()
);

create index if not exists rls_profiles_public_category_idx
  on public.rls_profiles(category, country)
  where membership_status = 'approved' and is_public = true;
create index if not exists rls_profiles_status_created_idx
  on public.rls_profiles(membership_status, created_at desc);

create or replace function public.rls_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rls_user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.rls_is_admin() from public;
grant execute on function public.rls_is_admin() to authenticated;

create or replace function public.rls_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rls_profiles_touch_updated_at on public.rls_profiles;
create trigger rls_profiles_touch_updated_at
before update on public.rls_profiles
for each row execute function public.rls_touch_updated_at();

alter table public.rls_profiles enable row level security;
alter table public.rls_user_roles enable row level security;

drop policy if exists "profile owner or admin can read" on public.rls_profiles;
create policy "profile owner or admin can read"
on public.rls_profiles for select to authenticated
using (user_id = auth.uid() or public.rls_is_admin());

drop policy if exists "approved public profiles are readable" on public.rls_profiles;
create policy "approved public profiles are readable"
on public.rls_profiles for select to anon, authenticated
using (membership_status = 'approved' and is_public = true);

drop policy if exists "users can submit own pending profile" on public.rls_profiles;
create policy "users can submit own pending profile"
on public.rls_profiles for insert to authenticated
with check (
  user_id = auth.uid()
  and membership_status = 'pending'
  and is_public = false
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "members can edit own profile without approval fields" on public.rls_profiles;
create policy "members can edit own profile without approval fields"
on public.rls_profiles for update to authenticated
using (user_id = auth.uid() and membership_status <> 'suspended')
with check (
  user_id = auth.uid()
  and membership_status = 'pending'
  and is_public = false
  and reviewed_by is null
  and reviewed_at is null
);

drop policy if exists "admins manage all profiles" on public.rls_profiles;
create policy "admins manage all profiles"
on public.rls_profiles for all to authenticated
using (public.rls_is_admin())
with check (public.rls_is_admin());

drop policy if exists "users read own role" on public.rls_user_roles;
create policy "users read own role"
on public.rls_user_roles for select to authenticated
using (user_id = auth.uid() or public.rls_is_admin());

-- Public directory view deliberately excludes email, evidence, review notes and private fields.
create or replace view public.rls_public_members
with (security_invoker = true)
as
select
  user_id,
  coalesce(display_name, full_name) as display_name,
  category,
  country,
  city,
  institution,
  degree,
  specialty,
  bio,
  avatar_path,
  website_url,
  orcid,
  created_at
from public.rls_profiles
where membership_status = 'approved' and is_public = true;

grant select on public.rls_public_members to anon, authenticated;
grant select, insert, update on public.rls_profiles to authenticated;
grant select on public.rls_profiles to anon;
grant select on public.rls_user_roles to authenticated;

-- Private bucket: avatars and supporting evidence are not publicly addressable.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rls-members-private',
  'rls-members-private',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp','application/pdf']
)
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "members upload own private files" on storage.objects;
create policy "members upload own private files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'rls-members-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "members read own private files" on storage.objects;
create policy "members read own private files"
on storage.objects for select to authenticated
using (
  bucket_id = 'rls-members-private'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.rls_is_admin()
  )
);

drop policy if exists "members update own private files" on storage.objects;
create policy "members update own private files"
on storage.objects for update to authenticated
using (
  bucket_id = 'rls-members-private'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'rls-members-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "members delete own private files" on storage.objects;
create policy "members delete own private files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'rls-members-private'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.rls_is_admin()
  )
);

-- IMPORTANT: after creating your first account, promote its UUID manually:
-- insert into public.rls_user_roles(user_id, role)
-- values ('YOUR-AUTH-USER-UUID', 'admin')
-- on conflict (user_id) do update set role = 'admin';
