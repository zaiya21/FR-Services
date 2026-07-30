-- =====================================================================
-- IDENTITY — who is asking, and what they are allowed to be.
--
-- Supabase Auth owns auth.users. This adds the two things it cannot know:
-- whether an account is an FR Services operator, and which company (if
-- any) a seller belongs to.
--
-- The critical property: a user cannot promote themselves. `role` and
-- company membership are writable only by the platform, enforced by
-- policy AND by a trigger, because a policy that permits an UPDATE cannot
-- by itself stop that update from changing the wrong column.
-- =====================================================================

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (length(full_name) <= 120),
  role        app.account_role not null default 'renter',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.company_members (
  company_id  app.slug not null,   -- FK added in 0300, once companies exists
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        app.company_role not null default 'staff',
  created_at  timestamptz not null default now(),
  primary key (company_id, user_id)
);

-- RLS policies filter on these constantly. Without the indexes every
-- policy check is a sequential scan, which is the usual reason people
-- conclude "RLS is slow".
create index company_members_user_idx    on public.company_members (user_id);
create index company_members_company_idx on public.company_members (company_id);

create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------
-- Helpers.
--
-- SECURITY DEFINER for two separate reasons:
--   * a policy on profiles that queried profiles through RLS would
--     recurse until Postgres gave up;
--   * membership must be readable while deciding whether the caller may
--     read anything, which is a chicken-and-egg the definer breaks.
-- STABLE so the planner evaluates them once per statement, not per row.
-- ---------------------------------------------------------------------
create or replace function app.is_platform()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'platform'
  );
$$;

create or replace function app.is_member_of(target app.slug)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = target and m.user_id = (select auth.uid())
  );
$$;

create or replace function app.my_companies()
returns setof app.slug
language sql
stable
security definer
set search_path = ''
as $$
  select m.company_id from public.company_members m
  where m.user_id = (select auth.uid());
$$;

revoke all on function app.is_platform(), app.is_member_of(app.slug),
                      app.my_companies() from public;
grant execute on function app.is_platform(), app.is_member_of(app.slug),
                          app.my_companies() to authenticated, anon;

-- ---------------------------------------------------------------------
-- Nobody grants themselves a role.
-- ---------------------------------------------------------------------
create or replace function app.guard_profile_role()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not app.is_platform() then
    raise exception
      'role is assigned by FR Services, not by the account holder'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role before update on public.profiles
  for each row execute function app.guard_profile_role();

-- ---------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.company_members enable row level security;

-- A signed-in user reads their own profile; the platform reads all.
create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or app.is_platform());

-- They may edit their own display name. The trigger above stops the edit
-- reaching `role`, so this policy does not have to try.
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or app.is_platform())
  with check (id = (select auth.uid()) or app.is_platform());

-- The row is created by a trigger on auth.users (below), not by the
-- client, so there is deliberately no INSERT policy for `authenticated`.
create policy profiles_insert_platform on public.profiles
  for insert to authenticated
  with check (app.is_platform());

create policy profiles_delete_platform on public.profiles
  for delete to authenticated
  using (app.is_platform());

-- Membership: you can see the companies you belong to; the platform sees
-- every membership. Only the platform writes them — attaching yourself to
-- a company is exactly the escalation this table exists to prevent.
create policy members_select on public.company_members
  for select to authenticated
  using (user_id = (select auth.uid()) or app.is_platform());

create policy members_write_platform on public.company_members
  for all to authenticated
  using (app.is_platform())
  with check (app.is_platform());

-- ---------------------------------------------------------------------
-- Every new auth user gets a profile, as a renter.
-- ---------------------------------------------------------------------
create or replace function app.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.on_auth_user_created();

grant select, update on public.profiles        to authenticated;
grant select          on public.company_members to authenticated;
