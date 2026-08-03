-- =====================================================================
-- COMPANIES - the storefront and its coverage.
--
-- A company row is public: the marketplace has to list it to unsigned
-- visitors. What is NOT public is anything the seller has not published,
-- which is why `listed` exists and why the read policy checks it.
--
-- Ratings live here as a cached aggregate, not as an owner-writable
-- number. The verified badge is not stored at all - it is derived in 0900
-- from the documents FR Services actually approved, so it cannot be set
-- by the party it describes.
-- =====================================================================

create table public.companies (
  id            app.slug primary key,
  name          text not null check (length(trim(name)) between 2 and 120),
  about         text not null default '' check (length(about) <= 2000),

  -- location. `city` and `province` are what search matches on; the point
  -- is what the map pin uses.
  barangay      text not null default '' check (length(barangay) <= 80),
  city          text not null check (length(trim(city)) between 2 and 80),
  province      text not null check (length(trim(province)) between 2 and 80),
  lat           numeric(9,6),
  lon           numeric(9,6),
  service_radius_km integer not null default 50
                  check (service_radius_km between 1 and 500),

  operating_since smallint check (operating_since between 1900 and 2100),
  reply_minutes   integer  check (reply_minutes between 0 and 10080),

  -- cached from reviews; maintained by trigger in 0800, never by the owner
  rating        numeric(3,2) check (rating between 1 and 5),
  review_count  integer not null default 0 check (review_count >= 0),

  -- the seller's own switch for appearing in search at all
  listed        boolean not null default false,
  suspended_at  timestamptz,
  suspended_reason text check (length(suspended_reason) <= 400),

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- a lat without a lon is a pin that cannot be drawn
  constraint companies_coords_together
    check ((lat is null) = (lon is null))
);

alter table public.company_members
  add constraint company_members_company_fkey
  foreign key (company_id) references public.companies (id) on delete cascade;

-- Which service lines a company actually offers. A separate table rather
-- than an array because a company running all three is the normal case
-- and every filter in the app is "does it offer X".
create table public.company_lines (
  company_id app.slug not null references public.companies (id) on delete cascade,
  line       app.service_line not null,
  primary key (company_id, line)
);

-- Places a company will travel to, beyond its own city.
create table public.company_service_areas (
  company_id app.slug not null references public.companies (id) on delete cascade,
  city       text not null check (length(trim(city)) between 2 and 80),
  province   text not null check (length(trim(province)) between 2 and 80),
  primary key (company_id, city, province)
);

-- Storefront theming. One row per company; the owner's own colours.
create table public.company_themes (
  company_id app.slug primary key references public.companies (id) on delete cascade,
  brand      text not null default '#057A2F' check (brand  ~* '^#[0-9a-f]{6}$'),
  accent     text not null default '#F2B705' check (accent ~* '^#[0-9a-f]{6}$'),
  bg         text not null default '#FBFAF7' check (bg     ~* '^#[0-9a-f]{6}$'),
  cover      app.cover_style not null default 'gradient',
  layout     app.layout_id  not null default 'block',
  logo_path      text check (length(logo_path) <= 400),
  cover_path     text check (length(cover_path) <= 400),
  updated_at timestamptz not null default now()
);

comment on column public.company_themes.brand is
  'Hex is constrained here as well as in the client. The client validation
   exists to give a helpful message; this exists because the client is not
   a security boundary and a colour is interpolated into a style attribute.';

create index companies_city_idx     on public.companies (lower(city), lower(province));
create index companies_listed_idx   on public.companies (listed) where listed;
create index company_lines_line_idx on public.company_lines (line);
create index service_areas_city_idx on public.company_service_areas (lower(city), lower(province));

create trigger companies_touch before update on public.companies
  for each row execute function app.touch_updated_at();
create trigger themes_touch before update on public.company_themes
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------
-- Owners do not get to edit their own trust signals.
-- ---------------------------------------------------------------------
create or replace function app.guard_company_trust_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.is_platform() or current_user = 'service_role' then return new; end if;

  if new.rating       is distinct from old.rating
  or new.review_count is distinct from old.review_count then
    raise exception 'rating and review count are derived from reviews, not set'
      using errcode = '42501';
  end if;

  if new.suspended_at     is distinct from old.suspended_at
  or new.suspended_reason is distinct from old.suspended_reason then
    raise exception 'suspension is an FR Services action'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id then
    raise exception 'a company id is permanent; it is in published URLs'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger companies_guard_trust before update on public.companies
  for each row execute function app.guard_company_trust_columns();

-- ---------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------
alter table public.companies             enable row level security;
alter table public.company_lines         enable row level security;
alter table public.company_service_areas enable row level security;
alter table public.company_themes        enable row level security;

-- Public reads a listed, unsuspended company. Members read their own
-- whatever its state, which is what makes an unlisted draft possible.
create policy companies_public_read on public.companies
  for select to anon, authenticated
  using (
    (listed and suspended_at is null)
    or app.is_member_of(id)
    or app.is_platform()
  );

create policy companies_member_update on public.companies
  for update to authenticated
  using (app.is_member_of(id) or app.is_platform())
  with check (app.is_member_of(id) or app.is_platform());

-- Registration creates the company; the platform does it so that the
-- caller cannot invent a company and immediately be its owner.
create policy companies_insert_platform on public.companies
  for insert to authenticated with check (app.is_platform());
create policy companies_delete_platform on public.companies
  for delete to authenticated using (app.is_platform());

-- The child tables inherit the parent's visibility. Written out rather
-- than abstracted: a policy that is hard to read is a policy nobody
-- checks.
create policy lines_read on public.company_lines
  for select to anon, authenticated
  using (exists (
    select 1 from public.companies c where c.id = company_id
      and ((c.listed and c.suspended_at is null)
           or app.is_member_of(c.id) or app.is_platform())));

create policy lines_write on public.company_lines
  for all to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

create policy areas_read on public.company_service_areas
  for select to anon, authenticated
  using (exists (
    select 1 from public.companies c where c.id = company_id
      and ((c.listed and c.suspended_at is null)
           or app.is_member_of(c.id) or app.is_platform())));

create policy areas_write on public.company_service_areas
  for all to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

-- A theme is public: it is how the storefront is painted.
create policy themes_read on public.company_themes
  for select to anon, authenticated using (true);

create policy themes_write on public.company_themes
  for all to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

grant select on public.companies, public.company_lines,
                public.company_service_areas, public.company_themes to anon, authenticated;
grant insert, update, delete on public.company_lines, public.company_service_areas,
                                public.company_themes to authenticated;
grant update on public.companies to authenticated;
