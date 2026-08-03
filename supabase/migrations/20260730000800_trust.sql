-- =====================================================================
-- TRUST & SAFETY - renter reports, reviews, saved companies.
--
-- The report table has an unusual read rule: the company being reported
-- cannot see the report. That is not an oversight. A renter who ticks
-- "keep me anonymous" is told the company will not see who complained,
-- and the only way to keep that promise is for the company to have no read
-- path at all - a report's wording routinely identifies its author even
-- with the name removed ("I collected the van on Tuesday afternoon").
-- =====================================================================

create table public.company_reports (
  id          uuid primary key default extensions.gen_random_uuid(),
  company_id  app.slug not null references public.companies (id) on delete cascade,
  booking_id  uuid references public.bookings (id) on delete set null,

  reporter_id uuid references auth.users (id) on delete set null,
  anonymous   boolean not null default false,

  reason      app.report_reason not null,
  detail      text not null default '' check (length(detail) <= 1200),

  state       app.report_state not null default 'open',
  operator_note text not null default '' check (length(operator_note) <= 400),
  handled_by  uuid references auth.users (id),
  handled_at  timestamptz,

  created_at  timestamptz not null default now(),

  constraint reports_resolution_has_a_handler check (
    state in ('open','reviewing') or handled_by is not null
  )
);

create index reports_state_idx   on public.company_reports (state, created_at desc);
create index reports_company_idx on public.company_reports (company_id);

-- Only the platform moves a report along, and doing so is recorded.
create or replace function app.guard_report_state()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not (app.is_platform() or current_user = 'service_role') then
    raise exception 'reports are triaged by FR Services Trust & Safety'
      using errcode = '42501';
  end if;
  if new.state is distinct from old.state then
    new.handled_by := (select auth.uid());
    new.handled_at := now();
  end if;
  return new;
end;
$$;

create trigger reports_guard_state before update on public.company_reports
  for each row execute function app.guard_report_state();

-- ---------------------------------------------------------------------
-- Reviews. A rating is a renter's, and only after a completed hire -
-- which is what stops a review farm being a text field.
-- ---------------------------------------------------------------------
create table public.company_reviews (
  id          uuid primary key default extensions.gen_random_uuid(),
  company_id  app.slug not null references public.companies (id) on delete cascade,
  booking_id  uuid not null unique references public.bookings (id) on delete cascade,
  author_id   uuid not null references auth.users (id) on delete cascade,
  rating      smallint not null check (rating between 1 and 5),
  body        text not null default '' check (length(body) <= 1200),
  created_at  timestamptz not null default now()
);

create index reviews_company_idx on public.company_reviews (company_id, created_at desc);

-- The cached aggregate on companies, maintained here so the number a
-- renter trusts is arithmetic rather than an owner-editable field.
create or replace function app.refresh_company_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target app.slug := coalesce(new.company_id, old.company_id);
begin
  update public.companies c
  set rating = sub.avg_rating, review_count = sub.n
  from (
    select round(avg(r.rating)::numeric, 2) as avg_rating, count(*) as n
    from public.company_reviews r where r.company_id = target
  ) sub
  where c.id = target;
  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.company_reviews
  for each row execute function app.refresh_company_rating();

-- ---------------------------------------------------------------------
-- Saved companies. Belongs to one account; there is no such thing as a
-- saved company for a visitor who has not signed in.
-- ---------------------------------------------------------------------
create table public.saved_companies (
  user_id    uuid not null references auth.users (id) on delete cascade,
  company_id app.slug not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, company_id)
);

create index saved_user_idx on public.saved_companies (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------
alter table public.company_reports enable row level security;
alter table public.company_reviews enable row level security;
alter table public.saved_companies enable row level security;

-- The reporter sees their own; the platform sees all. The company sees
-- none - see the note at the top of this file.
create policy reports_read on public.company_reports
  for select to authenticated
  using (
    app.is_platform()
    or (reporter_id = (select auth.uid()) and reporter_id is not null)
  );

-- Anyone signed in may report. `with check` pins the reporter to the
-- caller so a report cannot be filed in someone else's name.
create policy reports_insert on public.company_reports
  for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and state = 'open'
    and handled_by is null
  );

create policy reports_update_platform on public.company_reports
  for update to authenticated
  using (app.is_platform())
  with check (app.is_platform());

-- Reviews are public: they are the rating.
create policy reviews_read on public.company_reviews
  for select to anon, authenticated using (true);

-- You may review a booking that is yours and finished.
create policy reviews_insert_after_a_hire on public.company_reviews
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.renter_id = (select auth.uid())
        and b.company_id = company_id
        and b.status = 'completed')
  );

create policy reviews_update_own on public.company_reviews
  for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

create policy reviews_delete on public.company_reviews
  for delete to authenticated
  using (author_id = (select auth.uid()) or app.is_platform());

-- Saved companies: yours alone. Not even the platform.
create policy saved_own_only on public.saved_companies
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert on public.company_reports to authenticated;
grant update on public.company_reports to authenticated;
grant select on public.company_reviews to anon, authenticated;
grant insert, update, delete on public.company_reviews to authenticated;
grant select, insert, delete on public.saved_companies to authenticated;
revoke all on public.company_reports, public.saved_companies from anon;
