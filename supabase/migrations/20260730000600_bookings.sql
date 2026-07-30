-- =====================================================================
-- BOOKINGS
--
-- Two things here are worth more than the columns.
--
-- Fleet capacity. While building the prototype's data model I had a
-- generator that happily overlapped hires on the same unit, so per-unit
-- utilisation ran past 100% and every figure downstream inherited the lie.
-- In a database that class of bug is preventable outright, and
-- `app.enforce_fleet_capacity` below does it — see the note there for why
-- it is a trigger rather than the EXCLUDE constraint you would reach for.
--
-- The money CHECKs. total = net + vat, and a cancelled booking bills
-- nothing. The application computes both; the database refuses to store a
-- row where they disagree, so a reporting bug cannot become a stored fact.
-- =====================================================================

create table public.bookings (
  id          uuid primary key default extensions.gen_random_uuid(),
  reference   text not null unique
                check (reference ~ '^FR-[0-9]{4}-[0-9]{4,6}$'),
  company_id  app.slug not null references public.companies (id) on delete restrict,
  unit_id     uuid     not null references public.units (id)     on delete restrict,
  line        app.service_line not null,

  -- who
  renter_id   uuid references auth.users (id) on delete set null,
  customer    text not null check (length(trim(customer)) between 2 and 120),
  is_corporate boolean not null default false,
  channel     text not null default 'marketplace'
                check (channel in ('marketplace','direct','repeat','corporate','phone')),

  -- where and when
  site        text not null default '' check (length(site) <= 120),
  distance_km integer not null default 0 check (distance_km between 0 and 2000),
  starts_on   date not null,
  ends_on     date not null,
  -- the hire period as a range, so overlap is a single operator
  during      daterange generated always as
                (daterange(starts_on, ends_on, '[]')) stored,

  -- what it costs. Stored, not recomputed: a quote a renter accepted must
  -- not change because a rate card moved afterwards.
  rate_per_day  app.peso not null,
  discount_pct  app.pct  not null default 0,
  hire_total    app.peso not null,
  delivery_total app.peso not null default 0,
  addons_total  app.peso not null default 0,
  net_total     app.peso not null,
  vat_total     app.peso not null,
  grand_total   app.peso not null,
  balance_due   app.peso not null default 0,

  status      app.booking_status not null default 'pending',
  payment     app.payment_status not null default 'unpaid',

  placed_at   timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint bookings_dates_in_order check (ends_on >= starts_on),
  constraint bookings_net_is_the_sum check (
    net_total = hire_total + delivery_total + addons_total
  ),
  constraint bookings_total_is_net_plus_vat check (
    grand_total = case when status = 'cancelled' then 0 else net_total + vat_total end
  ),
  constraint bookings_cancelled_bills_nothing check (
    status <> 'cancelled' or (grand_total = 0 and balance_due = 0)
  ),
  constraint bookings_paid_owes_nothing check (
    payment not in ('paid','refund') or balance_due = 0
  ),
  constraint bookings_balance_within_total check (balance_due <= grand_total)
);

-- ---------------------------------------------------------------------
-- You cannot rent out four excavators when you own two.
--
-- The obvious tool is an EXCLUDE constraint on (unit_id =, during &&),
-- and it is the wrong one twice over. A constraint predicate cannot
-- contain a subquery, so it has no way to reach the unit's `quantity`;
-- and even given the number, "no two rows overlap" is not the rule —
-- a listing of three vans may legitimately have three overlapping hires
-- and must refuse the fourth. That is a count against a limit, which
-- needs a trigger.
--
-- The row lock is not decoration: without it two bookings submitted at
-- the same moment both count the pre-existing rows, both see room, and
-- both commit. Locking the unit serialises bookings per unit, which is
-- exactly the granularity that matters and no more.
-- ---------------------------------------------------------------------
create or replace function app.enforce_fleet_capacity()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  capacity integer;
  taken    integer;
begin
  if new.status = 'cancelled' then
    return new;
  end if;

  select u.quantity into capacity
  from public.units u
  where u.id = new.unit_id
  for update;                       -- serialise concurrent bookings

  if capacity is null then
    raise exception 'unit % does not exist', new.unit_id using errcode = '23503';
  end if;

  select count(*) into taken
  from public.bookings b
  where b.unit_id = new.unit_id
    and b.status <> 'cancelled'
    and b.id is distinct from new.id          -- ignore the row being updated
    and b.during && new.during;

  if taken >= capacity then
    raise exception
      'no % left for % to %: % of % already committed',
      (select u.name from public.units u where u.id = new.unit_id),
      new.starts_on, new.ends_on, taken, capacity
      using errcode = '23514',
            hint = 'Cancel an overlapping hire or raise the listing quantity.';
  end if;

  return new;
end;
$$;

create trigger bookings_enforce_capacity
  before insert or update of unit_id, starts_on, ends_on, status on public.bookings
  for each row execute function app.enforce_fleet_capacity();

-- The overlap count above is the hot path of that trigger. btree_gist is
-- what allows unit_id (equality) and during (overlap) in one GiST index.
create index bookings_unit_during_idx
  on public.bookings using gist (unit_id, during)
  where status <> 'cancelled';

create index bookings_company_idx  on public.bookings (company_id, starts_on desc);
create index bookings_unit_idx     on public.bookings (unit_id);
create index bookings_renter_idx   on public.bookings (renter_id) where renter_id is not null;
create index bookings_queue_idx    on public.bookings (company_id) where status = 'pending';

create trigger bookings_touch before update on public.bookings
  for each row execute function app.touch_updated_at();

-- The add-ons attached to a booking, priced as at the time of booking.
create table public.booking_addons (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  name       text not null check (length(trim(name)) between 2 and 90),
  amount     app.peso not null,
  primary key (booking_id, name)
);

-- ---------------------------------------------------------------------
-- Status is the company's decision; money is not editable after the fact.
-- ---------------------------------------------------------------------
create or replace function app.guard_booking_amounts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.is_platform() then return new; end if;

  if new.rate_per_day   is distinct from old.rate_per_day
  or new.hire_total     is distinct from old.hire_total
  or new.delivery_total is distinct from old.delivery_total
  or new.addons_total   is distinct from old.addons_total
  or new.net_total      is distinct from old.net_total
  or new.vat_total      is distinct from old.vat_total
  or new.grand_total    is distinct from old.grand_total then
    raise exception
      'a booking''s amounts are fixed at the quote; cancel and re-book instead'
      using errcode = '42501';
  end if;

  if new.reference is distinct from old.reference then
    raise exception 'a booking reference is permanent' using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger bookings_guard_amounts before update on public.bookings
  for each row execute function app.guard_booking_amounts();

-- ---------------------------------------------------------------------
-- Policies. A booking is visible to the company fulfilling it, the renter
-- who placed it, and the platform. Nobody else — this is the most
-- sensitive table in the schema: names, addresses and money.
-- ---------------------------------------------------------------------
alter table public.bookings       enable row level security;
alter table public.booking_addons enable row level security;

create policy bookings_read on public.bookings
  for select to authenticated
  using (
    app.is_member_of(company_id)
    or renter_id = (select auth.uid())
    or app.is_platform()
  );

-- A renter creates their own booking request, for themselves, on a listed
-- unit. `with check` pins renter_id so one account cannot book as another.
create policy bookings_insert_renter on public.bookings
  for insert to authenticated
  with check (
    renter_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.units u
      join public.companies c on c.id = u.company_id
      where u.id = unit_id and u.company_id = company_id
        and u.listed and c.listed and c.suspended_at is null)
  );

-- The company accepts, hands over, closes. The trigger above keeps the
-- edit away from the amounts.
create policy bookings_update_company on public.bookings
  for update to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

-- No delete policy at all. A booking is a financial record; cancelling is
-- a status, not a disappearance.

create policy addons_read on public.booking_addons
  for select to authenticated
  using (exists (
    select 1 from public.bookings b where b.id = booking_id
      and (app.is_member_of(b.company_id)
           or b.renter_id = (select auth.uid())
           or app.is_platform())));

create policy addons_write on public.booking_addons
  for all to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id
                 and (app.is_member_of(b.company_id) or app.is_platform())))
  with check (exists (select 1 from public.bookings b where b.id = booking_id
                 and (app.is_member_of(b.company_id) or app.is_platform())));

grant select, insert, update on public.bookings to authenticated;
grant select, insert, update, delete on public.booking_addons to authenticated;
revoke all on public.bookings, public.booking_addons from anon;
