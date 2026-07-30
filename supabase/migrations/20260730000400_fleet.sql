-- =====================================================================
-- FLEET - the units a company rents out, and the add-on services.
--
-- The interesting part is the delivery model. The application supports
-- three ways of charging for getting a unit to site, and the fields only
-- make sense in combination - a per-km listing without a per-km rate
-- would quote every job at zero. That coherence is a CHECK here rather
-- than a fallback in JavaScript, because a row that cannot be priced
-- should not be storable.
-- =====================================================================

create table public.units (
  id          uuid primary key default extensions.gen_random_uuid(),
  company_id  app.slug not null references public.companies (id) on delete cascade,

  line        app.service_line not null,
  name        text not null check (length(trim(name)) between 2 and 90),
  unit_type   text not null default '' check (length(unit_type) <= 40),
  model       text not null default '' check (length(model) <= 60),
  year        smallint check (year between 1950 and 2100),
  capacity    text not null default '' check (length(capacity) <= 40),

  -- rate
  price       app.peso not null check (price <= 10000000),
  rate_unit   app.rate_unit not null default 'day',
  quantity    integer not null default 1 check (quantity between 0 and 999),

  -- long-hire discounts, as percentages off the daily rate
  discount_3d  app.pct not null default 0 check (discount_3d  <= 90),
  discount_7d  app.pct not null default 0 check (discount_7d  <= 90),
  discount_30d app.pct not null default 0 check (discount_30d <= 90),

  -- terms
  operator    app.operator_mode not null default 'none',
  fuel        app.fuel_mode     not null default 'client',
  min_days    integer not null default 1 check (min_days between 1 and 60),

  -- delivery / mobilisation
  delivery_mode      app.delivery_mode not null default 'flat',
  delivery_fee       app.peso not null default 0 check (delivery_fee <= 1000000),
  delivery_per_km    app.peso not null default 0 check (delivery_per_km <= 100000),
  delivery_free_km   integer  not null default 0 check (delivery_free_km between 0 and 500),

  photo_path  text check (length(photo_path) <= 400),
  notes       text not null default '' check (length(notes) <= 400),

  listed      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- A per-km listing must actually have a per-km rate. Without this the
  -- mode is a promise the row cannot keep.
  constraint units_perkm_needs_a_rate check (
    delivery_mode <> 'perkm' or delivery_per_km > 0
  ),
  -- A quoted job has no figure by definition; storing one invites the UI
  -- to show it.
  constraint units_quoted_has_no_figures check (
    delivery_mode <> 'quoted'
    or (delivery_fee = 0 and delivery_per_km = 0 and delivery_free_km = 0)
  ),
  -- A free radius is meaningless unless distance is being billed.
  constraint units_free_km_needs_perkm check (
    delivery_free_km = 0 or delivery_mode = 'perkm'
  ),
  -- Longer hires cannot be worse value than shorter ones.
  constraint units_discounts_are_monotonic check (
    discount_3d <= discount_7d and discount_7d <= discount_30d
  )
);

comment on constraint units_discounts_are_monotonic on public.units is
  'A 7-day rate cheaper than a 30-day rate is almost always a typo, and the
   booking engine always quotes the best applicable tier - so the mistake
   would silently cost the owner money rather than error.';

-- Optional extras: airport pickup, an operator, a damage waiver.
create table public.services (
  id          uuid primary key default extensions.gen_random_uuid(),
  company_id  app.slug not null references public.companies (id) on delete cascade,
  line        app.service_line not null,
  name        text not null check (length(trim(name)) between 2 and 90),
  note        text not null default '' check (length(note) <= 300),
  price       app.peso not null default 0 check (price <= 1000000),
  -- 'quoted' and 'included' are priced at zero and say so in words
  price_basis text not null default 'day'
                check (price_basis in ('day','hour','trip','booking','quoted','included')),
  created_at  timestamptz not null default now(),

  constraint services_zero_price_when_not_charged check (
    price_basis not in ('quoted','included') or price = 0
  )
);

create index units_company_idx  on public.units (company_id);
create index units_line_idx     on public.units (line) where listed;
create index services_company_idx on public.services (company_id);

create trigger units_touch before update on public.units
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------
-- Policies. A listed unit on a listed company is public - that is the
-- shop window. Everything else belongs to the company.
-- ---------------------------------------------------------------------
alter table public.units    enable row level security;
alter table public.services enable row level security;

create policy units_read on public.units
  for select to anon, authenticated
  using (
    (listed and exists (
      select 1 from public.companies c
      where c.id = company_id and c.listed and c.suspended_at is null))
    or app.is_member_of(company_id)
    or app.is_platform()
  );

create policy units_write on public.units
  for all to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

create policy services_read on public.services
  for select to anon, authenticated
  using (
    exists (select 1 from public.companies c
            where c.id = company_id and c.listed and c.suspended_at is null)
    or app.is_member_of(company_id) or app.is_platform()
  );

create policy services_write on public.services
  for all to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

grant select on public.units, public.services to anon, authenticated;
grant insert, update, delete on public.units, public.services to authenticated;
