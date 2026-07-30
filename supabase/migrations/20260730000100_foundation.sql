-- =====================================================================
-- FOUNDATION - extensions, enums, and the identity helpers every policy
-- in the later migrations depends on.
--
-- The shape of the security model, stated once so the policies below read
-- as consequences of it rather than a pile of special cases:
--
--   anon           a visitor who has not signed in. May read a company's
--                  storefront and the documents it published. Nothing else.
--   authenticated  a renter. Additionally owns their saved companies and
--                  their own bookings.
--   company member a seller. Owns everything under one company_id.
--   platform       FR Services. Sees marketplace activity across every
--                  company and is the ONLY writer of a document verdict.
--                  Deliberately cannot read a company's expense ledger.
--
-- Two rules make the rest of this safe:
--   1. Every table enables RLS. With RLS on and no policy, Postgres denies
--      by default, so a table added without policies fails closed.
--   2. The helpers are SECURITY DEFINER with an empty search_path. Without
--      DEFINER, a policy on profiles that reads profiles recurses; without
--      the empty search_path, a caller can shadow a function name and
--      change what the policy means.
-- =====================================================================

create extension if not exists pgcrypto  with schema extensions;
-- btree_gist lets an exclusion constraint mix equality (unit_id) with a
-- range overlap (the hire dates). The fleet cannot be double-booked
-- without it - see 0600.
create extension if not exists btree_gist with schema extensions;

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, anon;

-- ---------------------------------------------------------------------
-- Domain vocabularies. Enums rather than text + CHECK because these are
-- closed sets the application already treats as closed, and a typo in an
-- INSERT should be a hard error, not a row nobody notices.
-- ---------------------------------------------------------------------
create type app.service_line as enum ('vehicles', 'equipment', 'towing');

create type app.rate_unit    as enum ('day', 'hour', 'call-out');
create type app.operator_mode as enum ('none', 'optional', 'included');
create type app.fuel_mode    as enum ('client', 'included');
create type app.delivery_mode as enum ('flat', 'perkm', 'quoted');

create type app.doc_type as enum (
  -- the three FR Services verifies
  'dti', 'permit', 'bir',
  -- the owner's own supporting documents; never reviewed
  'insurance', 'lto', 'ltfrb', 'pcab', 'tesda', 'dole', 'other');

create type app.doc_review as enum (
  'pending',   -- in the queue
  'verified',  -- checked with the issuing office
  'rejected',  -- could not be confirmed
  'exempt');   -- not a type we verify at all

create type app.booking_status as enum
  ('pending', 'confirmed', 'onhire', 'completed', 'cancelled');
create type app.payment_status as enum
  ('unpaid', 'deposit', 'paid', 'refund');

create type app.expense_category as enum
  ('fuel', 'maintenance', 'parts', 'wages', 'haulage', 'insurance', 'permits', 'admin');

create type app.report_reason as enum
  ('scam', 'listing', 'unsafe', 'conduct', 'reviews', 'other');
create type app.report_state as enum
  ('open', 'reviewing', 'upheld', 'dismissed');

create type app.account_role as enum ('renter', 'platform');
create type app.company_role as enum ('owner', 'staff');

create type app.cover_style as enum ('gradient', 'solid', 'stripes', 'image');
create type app.layout_id as enum ('block', 'swiss', 'soft', 'glass', 'industrial',
  'editorial', 'bento', 'paper', 'showcase', 'console');

-- ---------------------------------------------------------------------
-- Shared plumbing
-- ---------------------------------------------------------------------
create or replace function app.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- A company id is a slug because it is already in public URLs
-- (/company?c=fleetservice-davao). Changing it to a uuid would break
-- every link a company has ever handed out.
create domain app.slug as text
  check (value ~ '^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$');

-- Peso amounts are whole-peso integers, matching the application, which
-- rounds every figure it produces. Storing centavos here and pesos there
-- is how a total stops agreeing with its own line items.
create domain app.peso as integer check (value >= 0);
create domain app.pct  as numeric(5,2) check (value >= 0 and value <= 100);

comment on domain app.peso is
  'Whole pesos. The application rounds all money to the peso; keeping the
   database in the same unit avoids a total that disagrees with its lines.';
