-- =====================================================================
-- PLATFORM — the commission model, and the badge as a derived fact.
--
-- The verified badge is a view, not a column. That is the single most
-- important decision in this file: a stored `verified` boolean can drift
-- from the documents it claims to summarise, and the party it describes
-- has an incentive for it to drift. Derived from the approved documents,
-- it cannot.
-- =====================================================================

-- Listing is free; income is commission on completed bookings, and the
-- rate follows the service line. A table rather than a constant because a
-- rate change must not silently re-price bookings already taken — the
-- effective_from column is what lets an old booking keep its old rate.
create table public.commission_rates (
  line           app.service_line not null,
  rate           numeric(5,4) not null check (rate >= 0 and rate <= 0.5),
  effective_from date not null default current_date,
  primary key (line, effective_from)
);

insert into public.commission_rates (line, rate, effective_from) values
  ('vehicles',  0.0800, date '2026-01-01'),
  ('equipment', 0.0800, date '2026-01-01'),
  -- towing is dispatch work: short notice, small ticket, and finding an
  -- available truck at 2am is the service being sold
  ('towing',    0.1200, date '2026-01-01');

comment on table public.commission_rates is
  'Listing is free — there is no subscription row here because there is no
   subscription. Income is 8% on rentals, 12% on emergency towing.';

create or replace function app.commission_rate(l app.service_line, on_date date)
returns numeric
language sql
stable
set search_path = ''
as $$
  select r.rate
  from public.commission_rates r
  where r.line = l and r.effective_from <= on_date
  order by r.effective_from desc
  limit 1;
$$;

-- Commission per booking, at that booking's line and date. Summed per
-- booking rather than applied to a company total, because a company
-- running both towing and rental earns at two different rates and one
-- multiplication against combined revenue is wrong for every one of them.
-- security_invoker, unlike published_documents. That view is definer-rights
-- because its job is to show a masked subset to people with no access to
-- the base table. This one has no masking to do, so definer rights would
-- simply hand every authenticated user the totals of every booking on the
-- marketplace. It must inherit the caller's RLS.
create view public.booking_commission
with (security_invoker = true) as
select
  b.id            as booking_id,
  b.company_id,
  b.line,
  b.starts_on,
  b.grand_total,
  app.commission_rate(b.line, b.starts_on)                        as rate,
  round(b.grand_total * app.commission_rate(b.line, b.starts_on))::integer
                                                                  as commission
from public.bookings b
where b.status <> 'cancelled';

-- ---------------------------------------------------------------------
-- Registration completeness, and the badge.
--
-- Complete means a reviewer has something to work with: all three
-- registration documents on file WITH A FILE. Verified means they have
-- finished. Registration must not sit blocked in our queue, so the two are
-- separate questions.
-- ---------------------------------------------------------------------
create view public.company_registration as
select
  c.id as company_id,
  count(*) filter (
    where d.doc_type in ('dti','permit','bir') and d.file_path is not null
  )::integer as documents_on_file,
  3 as documents_required,
  count(*) filter (
    where d.doc_type in ('dti','permit','bir') and d.file_path is not null
  ) = 3 as complete,
  count(*) filter (
    where d.doc_type in ('dti','permit','bir')
      and d.review = 'verified' and not app.is_expired(d.expires_on)
  ) = 3 as verified
from public.companies c
left join public.documents d on d.company_id = c.id
group by c.id;

-- The badge. All three approved and none expired, and nothing else counts:
-- an expired insurance policy cannot cost a badge the platform never
-- granted on its account.
create view public.company_standing as
select
  r.company_id,
  r.complete            as registration_complete,
  r.verified            as badge_ok,
  3 - least(3, (select count(*) from public.documents d
                where d.company_id = r.company_id
                  and d.doc_type in ('dti','permit','bir')
                  and d.review = 'verified'
                  and not app.is_expired(d.expires_on)))::integer
                        as badge_gap
from public.company_registration r;

comment on view public.company_standing is
  'The verified badge, derived. A badge is only worth anything if it can be
   lost — this is what loses it.';

grant select on public.commission_rates to anon, authenticated;
grant select on public.company_registration, public.company_standing to anon, authenticated;
grant select on public.booking_commission to authenticated;

alter table public.commission_rates enable row level security;

-- The rate card is public: a seller is entitled to know what they are
-- charged before they list, and it is stated on the registration page.
create policy rates_read on public.commission_rates
  for select to anon, authenticated using (true);
create policy rates_write_platform on public.commission_rates
  for all to authenticated
  using (app.is_platform()) with check (app.is_platform());
