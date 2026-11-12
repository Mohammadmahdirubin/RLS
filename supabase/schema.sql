-- RLS Association: secure membership schema for Supabase
-- Apply in Supabase SQL Editor. Do not expose service_role keys in client code.

create extension if not exists pgcrypto;
create schema if not exists private;
grant usage on schema private to authenticated;

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
  salutation text not null check (salutation in ('mr','ms')),
  member_number bigint unique,
  display_name text check (display_name is null or char_length(display_name) <= 160),
  category public.rls_member_category not null,
  email text,
  email_public boolean not null default false,
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
  researchgate_url text,
  google_scholar_url text,
  instagram_url text,
  telegram_url text,
  linkedin_url text,
  x_url text,
  articles_count integer check (articles_count is null or articles_count between 0 and 999999),
  books_count integer check (books_count is null or books_count between 0 and 999999),
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

-- Official membership numbers are assigned only when an application is approved.
create sequence if not exists public.rls_member_number_seq as bigint start with 1 increment by 1 minvalue 1;
do $
declare
  max_number bigint;
begin
  select max(member_number) into max_number
  from public.rls_profiles
  where membership_status = 'approved';
  if max_number is null then
    perform setval('public.rls_member_number_seq'::regclass, 1, false);
  else
    perform setval('public.rls_member_number_seq'::regclass, max_number, true);
  end if;
end $;

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

create or replace function private.rls_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.rls_user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function private.rls_is_admin() from public, anon;
grant execute on function private.rls_is_admin() to authenticated;

create or replace function private.rls_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists rls_profiles_touch_updated_at on public.rls_profiles;
create trigger rls_profiles_touch_updated_at
before update on public.rls_profiles
for each row execute function private.rls_touch_updated_at();

-- Allocate a permanent member number at approval; pending and rejected applicants have no member number.
create or replace function private.rls_assign_member_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $
begin
  if tg_op = 'INSERT' then
    if new.membership_status = 'approved' then
      if new.member_number is null then
        new.member_number := nextval('public.rls_member_number_seq'::regclass);
      end if;
    else
      new.member_number := null;
    end if;
    return new;
  end if;

  if old.member_number is not null then
    new.member_number := old.member_number;
    return new;
  end if;

  if new.membership_status = 'approved' then
    if new.member_number is null then
      new.member_number := nextval('public.rls_member_number_seq'::regclass);
    end if;
  else
    new.member_number := null;
  end if;
  return new;
end;
$;

drop trigger if exists rls_profiles_assign_member_number on public.rls_profiles;
create trigger rls_profiles_assign_member_number
before insert or update of membership_status, member_number
on public.rls_profiles
for each row execute function private.rls_assign_member_number();

-- Prevent members from changing moderation-controlled fields on their own profile.
create or replace function private.rls_protect_moderation_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() = old.user_id and not private.rls_is_admin() then
    new.membership_status := old.membership_status;
    new.is_public := old.is_public;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.review_note := old.review_note;
    new.member_number := old.member_number;
  end if;
  return new;
end;
$$;
drop trigger if exists rls_profiles_protect_moderation on public.rls_profiles;
create trigger rls_profiles_protect_moderation
before update on public.rls_profiles
for each row execute function private.rls_protect_moderation_fields();

alter table public.rls_profiles enable row level security;
alter table public.rls_user_roles enable row level security;

drop policy if exists "profile owner or admin can read" on public.rls_profiles;
create policy "profile owner or admin can read"
on public.rls_profiles for select to authenticated
using (user_id = auth.uid() or private.rls_is_admin());

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
  and review_note is null
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
using (private.rls_is_admin())
with check (private.rls_is_admin());

drop policy if exists "users read own role" on public.rls_user_roles;
create policy "users read own role"
on public.rls_user_roles for select to authenticated
using (user_id = auth.uid() or private.rls_is_admin());

-- Public directory view exposes email and phone only when each member explicitly opts in.
create or replace view public.rls_public_members with (security_invoker = true)
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
  created_at,
  profile_headline,
  memberships,
  activities,
  publications,
  research_interests,
  languages,
  case when phone_public then phone else null::text end as phone,
  coalesce(display_name_en, display_name, full_name_en, full_name) as display_name_en,
  coalesce(display_name_ru, display_name, full_name_ru, full_name) as display_name_ru,
  full_name_en,
  full_name_ru,
  profile_headline_en,
  profile_headline_ru,
  country_en,
  country_ru,
  city_en,
  city_ru,
  institution_en,
  institution_ru,
  degree_en,
  degree_ru,
  specialty_en,
  specialty_ru,
  bio_en,
  bio_ru,
  memberships_en,
  memberships_ru,
  activities_en,
  activities_ru,
  publications_en,
  publications_ru,
  research_interests_en,
  research_interests_ru,
  languages_en,
  languages_ru,
  case when email_public then email else null::text end as email,
  researchgate_url,
  google_scholar_url,
  instagram_url,
  telegram_url,
  linkedin_url,
  x_url,
  articles_count,
  books_count,
  salutation,
  reviewed_at,
  member_number,
  membership_status,
  blog_url,
  full_name
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
    or private.rls_is_admin()
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
    or private.rls_is_admin()
  )
);

-- IMPORTANT: after creating your first account, promote its UUID manually:
-- insert into public.rls_user_roles(user_id, role)
-- values ('YOUR-AUTH-USER-UUID', 'admin')
-- on conflict (user_id) do update set role = 'admin';

 
-- Performance indexes and optimized policy predicates.
create index if not exists rls_profiles_reviewed_by_idx
  on public.rls_profiles(reviewed_by);

drop policy if exists "profile owner or admin can read" on public.rls_profiles;
create policy "profile owner or admin can read"
on public.rls_profiles for select to authenticated
using (user_id = (select auth.uid()) or (select private.rls_is_admin()));

drop policy if exists "users can submit own pending profile" on public.rls_profiles;
create policy "users can submit own pending profile"
on public.rls_profiles for insert to authenticated
with check (
  user_id = (select auth.uid())
  and membership_status = 'pending'
  and is_public = false
  and reviewed_by is null
  and reviewed_at is null
  and review_note is null
);

drop policy if exists "members can edit own profile without approval fields" on public.rls_profiles;
create policy "members can edit own profile without approval fields"
on public.rls_profiles for update to authenticated
using (user_id = (select auth.uid()) and membership_status <> 'suspended')
with check (user_id = (select auth.uid()) and membership_status <> 'suspended');

drop policy if exists "users read own role" on public.rls_user_roles;
create policy "users read own role"
on public.rls_user_roles for select to authenticated
using (user_id = (select auth.uid()) or (select private.rls_is_admin()));


-- Member contribution scoring and public transparency.
-- Supporting evidence links and administrator IDs remain hidden from public views.
create table if not exists public.rls_member_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.rls_profiles(user_id) on delete cascade,
  activity_type text not null check (activity_type in (
    'meeting_attendance','special_session_attendance','seminar_attendance',
    'workshop_attendance','national_conference_attendance','international_conference_attendance',
    'session_paper_presentation','paper_presentation','invited_lecture','session_chair','scientific_committee',
    'organizing_committee','peer_review','journal_article','book_authorship',
    'book_translation','book_chapter','research_project','course_teaching',
    'workshop_teaching','educational_content','cultural_outreach','mentoring','other'
  )),
  title text not null check (char_length(trim(title)) between 3 and 240),
  description text check (description is null or char_length(description) <= 2000),
  activity_date date not null,
  points integer not null check (points between 1 and 40),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.rls_member_points drop column if exists evidence_url;
create index if not exists rls_member_points_user_date_idx on public.rls_member_points(user_id, activity_date desc);
create index if not exists rls_member_points_created_idx on public.rls_member_points(created_at desc);
alter table public.rls_member_points enable row level security;
drop policy if exists "public can read approved member points" on public.rls_member_points;
create policy "public can read approved member points" on public.rls_member_points for select to anon
using (exists (select 1 from public.rls_profiles p where p.user_id=rls_member_points.user_id and p.membership_status='approved' and p.is_public=true));
drop policy if exists "members and admins can read visible member points" on public.rls_member_points;
create policy "members and admins can read visible member points" on public.rls_member_points for select to authenticated
using (user_id=(select auth.uid()) or (select private.rls_is_admin()) or exists (select 1 from public.rls_profiles p where p.user_id=rls_member_points.user_id and p.membership_status='approved' and p.is_public=true));
drop policy if exists "admins manage member points" on public.rls_member_points;
create policy "admins manage member points" on public.rls_member_points for all to authenticated
using ((select private.rls_is_admin())) with check ((select private.rls_is_admin()));
revoke all on public.rls_member_points from anon, authenticated;
grant select (id,user_id,activity_type,title,description,activity_date,points,created_at) on public.rls_member_points to anon,authenticated;
grant insert (user_id,activity_type,title,description,activity_date,points) on public.rls_member_points to authenticated;
grant delete on public.rls_member_points to authenticated;
create or replace view public.rls_public_member_points with (security_invoker=true) as
select a.id,a.user_id,a.activity_type,a.title,a.description,a.activity_date,a.points,a.created_at
from public.rls_member_points a join public.rls_profiles p on p.user_id=a.user_id
where p.membership_status='approved' and p.is_public=true;
create or replace view public.rls_public_member_scores with (security_invoker=true) as
select p.user_id,coalesce(sum(a.points),0)::integer as total_points,
case when coalesce(sum(a.points),0)>=300 then 5 when coalesce(sum(a.points),0)>=180 then 4 when coalesce(sum(a.points),0)>=100 then 3 when coalesce(sum(a.points),0)>=50 then 2 when coalesce(sum(a.points),0)>=20 then 1 else 0 end::integer as star_level
from public.rls_profiles p left join public.rls_member_points a on a.user_id=p.user_id
where p.membership_status='approved' and p.is_public=true group by p.user_id;
grant select on public.rls_public_member_points,public.rls_public_member_scores to anon,authenticated;
comment on table public.rls_member_points is 'Admin-verified, publicly transparent member contribution points. Supporting evidence URL is never exposed in public views.';
comment on view public.rls_public_member_points is 'Public approved activity records without private evidence links or administrator identifiers.';
comment on view public.rls_public_member_scores is 'Public cumulative score and five-level star rating for approved public members.';

-- Keep the contribution activity type constraint aligned with the public scoring policy.
alter table public.rls_member_points drop constraint if exists rls_member_points_activity_type_check;
alter table public.rls_member_points add constraint rls_member_points_activity_type_check check (activity_type in (
  'meeting_attendance','special_session_attendance','seminar_attendance',
  'workshop_attendance','national_conference_attendance','international_conference_attendance',
  'session_paper_presentation','paper_presentation','invited_lecture','session_chair','scientific_committee',
  'organizing_committee','peer_review','journal_article','book_authorship',
  'book_translation','book_chapter','research_project','course_teaching',
  'workshop_teaching','educational_content','cultural_outreach','mentoring','other'
));

-- Supporting evidence is stored separately and is visible only to association administrators.
create table if not exists public.rls_member_point_evidence (
  point_id uuid primary key references public.rls_member_points(id) on delete cascade,
  evidence_url text not null check (char_length(evidence_url) <= 1000),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);
alter table public.rls_member_point_evidence enable row level security;
drop policy if exists "admins manage member point evidence" on public.rls_member_point_evidence;
create policy "admins manage member point evidence" on public.rls_member_point_evidence for all to authenticated
using ((select private.rls_is_admin())) with check ((select private.rls_is_admin()));
revoke all on public.rls_member_point_evidence from anon,authenticated;
grant select,insert,update,delete on public.rls_member_point_evidence to authenticated;
