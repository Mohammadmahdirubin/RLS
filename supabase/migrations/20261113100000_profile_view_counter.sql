-- Atomic public profile-view counter. Only approved public profiles can be counted.
create table if not exists public.rls_profile_view_counts (
  user_id uuid primary key references public.rls_profiles(user_id) on delete cascade,
  view_count bigint not null default 0 check (view_count >= 0),
  updated_at timestamptz not null default now()
);
alter table public.rls_profile_view_counts enable row level security;
revoke all on table public.rls_profile_view_counts from public, anon, authenticated;

create or replace function public.rls_record_profile_view(p_member_id uuid)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count bigint;
begin
  if p_member_id is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.rls_profiles p
    where p.user_id = p_member_id
      and p.membership_status = 'approved'
      and p.is_public = true
  ) then
    return null;
  end if;

  insert into public.rls_profile_view_counts(user_id, view_count, updated_at)
  values (p_member_id, 1, now())
  on conflict (user_id) do update
    set view_count = public.rls_profile_view_counts.view_count + 1,
        updated_at = now()
  returning view_count into v_count;

  return v_count;
end;
$$;

revoke all on function public.rls_record_profile_view(uuid) from public;
grant execute on function public.rls_record_profile_view(uuid) to anon, authenticated;
