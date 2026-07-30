-- =====================================================================
-- EXPENSES - the seller's own books.
--
-- This table exists to be excluded. FR Services sees marketplace activity:
-- bookings, gross value, commission, documents, compliance. It does not
-- see what a company spends running its yard. Being the landlord is not
-- the same as being the accountant, and a console that quietly blurs the
-- two is one subpoena away from being a problem.
--
-- So `app.is_platform()` appears in no policy on this table. That absence
-- is the design, which is exactly why it is easy to undo by accident - a
-- later "add platform read for support" would erase it in one line. The
-- assertion in 1000 fails the migration if that happens.
-- =====================================================================

create table public.expenses (
  id          uuid primary key default extensions.gen_random_uuid(),
  company_id  app.slug not null references public.companies (id) on delete cascade,
  unit_id     uuid references public.units (id) on delete set null,

  spent_on    date not null default current_date,
  category    app.expense_category not null,
  payee       text not null default 'Unrecorded payee'
                check (length(trim(payee)) between 1 and 60),
  amount      app.peso not null check (amount > 0 and amount <= 50000000),
  method      text not null default 'Cash'
                check (method in ('Cash','GCash','Bank transfer','Company card','Cheque')),
  note        text not null default '' check (length(note) <= 200),

  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- a unit-attached cost must belong to the same company as the unit;
  -- checked by trigger because a CHECK cannot look at another table
  constraint expenses_amount_is_positive check (amount > 0)
);

-- A cost dated in the future is a forecast, not a ledger entry.
--
-- This is a trigger and not a CHECK on purpose. Postgres permits
-- current_date inside a CHECK, which makes it a trap rather than a
-- protection: the constraint is re-validated on restore, so every row that
-- was legitimately "today" when written fails years later and the dump will
-- not load. A trigger fires on write only, which is when the rule means
-- anything.
create or replace function app.expense_not_in_the_future()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.spent_on > current_date + 1 then
    raise exception 'an expense dated % is a forecast, not a ledger entry', new.spent_on
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger expenses_not_in_the_future
  before insert or update of spent_on on public.expenses
  for each row execute function app.expense_not_in_the_future();

create index expenses_company_date_idx on public.expenses (company_id, spent_on desc);
create index expenses_unit_idx on public.expenses (unit_id) where unit_id is not null;

create trigger expenses_touch before update on public.expenses
  for each row execute function app.touch_updated_at();

create or replace function app.expense_unit_belongs_to_company()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.unit_id is not null
     and not exists (select 1 from public.units u
                     where u.id = new.unit_id and u.company_id = new.company_id) then
    raise exception 'that unit belongs to another company'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger expenses_unit_matches_company
  before insert or update of unit_id, company_id on public.expenses
  for each row execute function app.expense_unit_belongs_to_company();

-- ---------------------------------------------------------------------
-- Policies. Company members only. No platform clause, deliberately.
-- ---------------------------------------------------------------------
alter table public.expenses enable row level security;

create policy expenses_company_only on public.expenses
  for all to authenticated
  using (app.is_member_of(company_id))
  with check (app.is_member_of(company_id));

grant select, insert, update, delete on public.expenses to authenticated;
revoke all on public.expenses from anon;

comment on table public.expenses is
  'The company''s private ledger. FR Services has no read path to this
   table by design - see the assertion in the final migration, which fails
   the build if a policy here ever mentions the platform.';
