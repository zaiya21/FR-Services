-- =====================================================================
-- DOCUMENTS - the verification model, in the database.
--
-- This is the table the whole trust design rests on, so the invariants
-- are here rather than in the client. Five of them:
--
--   1. FR Services verifies THREE document types (DTI, mayor's permit,
--      BIR 2303) and no others. Anything else is 'exempt' - not a verdict,
--      a statement that no verdict applies. Enforced as an equivalence:
--      exempt if and only if the type is not reviewable.
--
--   2. A company can publish and unpublish its own documents. It can
--      never write a verdict. RLS grants the UPDATE; a trigger stops the
--      update touching the review columns - because a row-level policy
--      cannot restrict which COLUMN an allowed update changes.
--
--   3. Editing a reviewed fact returns the document to the queue. Get a
--      permit approved, then move its expiry date, and the tick goes.
--
--   4. Expiry is derived from the date, never asserted, so no code path can
--      claim a lapsed permit is current. A function rather than a generated
--      column - see the note on app.is_expired below.
--
--   5. A rejected document is never published.
--
-- The file itself lives in Storage, not here. `file_path` points at it and
-- 1100 carries the bucket policies - a public bucket would leak every
-- company's paperwork regardless of what this table says.
-- =====================================================================

create or replace function app.is_reviewable_type(t app.doc_type)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select t in ('dti', 'permit', 'bir');
$$;

-- Expiry is derived, never stored - but NOT as a generated column. A
-- generated column's expression must be IMMUTABLE and current_date is only
-- STABLE, so `generated always as (expires_on < current_date)` is rejected
-- outright by Postgres. That is the right refusal for the wrong-looking
-- reason: a stored answer to "is this expired" would be wrong by morning.
-- So it is a function, evaluated at read time by the views below.
create or replace function app.is_expired(expires_on date)
returns boolean
language sql
stable
set search_path = ''
as $$
  select expires_on is not null and expires_on < current_date;
$$;

create table public.documents (
  id          uuid primary key default extensions.gen_random_uuid(),
  company_id  app.slug not null references public.companies (id) on delete cascade,

  doc_type    app.doc_type not null,
  name        text not null check (length(trim(name)) between 2 and 90),
  issuer      text not null default '' check (length(issuer) <= 90),
  doc_number  text not null default '' check (length(doc_number) <= 60),
  issued_on   date,
  expires_on  date,
  note        text not null default '' check (length(note) <= 240),

  -- the attached scan, in Storage
  file_path   text check (length(file_path) <= 400),
  file_name   text check (length(file_name) <= 120),
  file_bytes  integer check (file_bytes between 1 and 1572864),   -- 1.5 MB
  file_mime   text check (file_mime in
                ('application/pdf','image/png','image/jpeg','image/webp')),

  -- the owner's three choices about visibility
  published     boolean not null default false,
  show_number   boolean not null default false,
  show_file     boolean not null default false,

  -- platform-owned; see the trigger below
  review        app.doc_review not null default 'pending',
  review_note   text not null default '' check (length(review_note) <= 400),
  reviewed_by   uuid references auth.users (id),
  reviewed_at   timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- (1) the equivalence
  constraint documents_exempt_iff_unreviewable check (
    (review = 'exempt') = (not app.is_reviewable_type(doc_type))
  ),
  -- (5)
  constraint documents_rejected_is_not_published check (
    review <> 'rejected' or not published
  ),
  -- a document we verify needs something to verify against; a typed
  -- number gives a reviewer nothing to take to the issuing office
  constraint documents_reviewable_needs_a_file check (
    not app.is_reviewable_type(doc_type) or file_path is not null
  ),
  constraint documents_file_fields_together check (
    (file_path is null) = (file_name is null)
    and (file_path is null) = (file_mime is null)
  ),
  constraint documents_show_file_needs_a_file check (
    not show_file or file_path is not null
  ),
  constraint documents_dates_in_order check (
    issued_on is null or expires_on is null or issued_on <= expires_on
  ),
  constraint documents_verdict_has_a_reviewer check (
    review in ('pending','exempt') or reviewed_by is not null
  ),
  constraint documents_rejection_has_a_reason check (
    review <> 'rejected' or length(trim(review_note)) > 0
  )
);

comment on constraint documents_rejection_has_a_reason on public.documents is
  'Telling a company "no" without saying why leaves them nothing to act on.
   Approvals and returns may stand on their own; a rejection may not.';

-- The audit trail of verdicts. Append-only, so a decision cannot be
-- quietly rewritten after the fact.
create table public.document_reviews (
  id          bigint generated always as identity primary key,
  document_id uuid not null references public.documents (id) on delete cascade,
  review      app.doc_review not null,
  note        text not null default '' check (length(note) <= 400),
  automatic   boolean not null default false,
  actor       uuid references auth.users (id),
  created_at  timestamptz not null default now()
);

create index documents_company_idx on public.documents (company_id);
create index documents_queue_idx   on public.documents (review, expires_on)
  where review = 'pending';
create index documents_published_idx on public.documents (company_id) where published;
create index document_reviews_doc_idx on public.document_reviews (document_id, created_at desc);

create trigger documents_touch before update on public.documents
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------
-- (2) and (3): the review columns, and what an owner's edit does to them.
-- ---------------------------------------------------------------------
create or replace function app.guard_document_review()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  material_change boolean;
begin
  -- The facts a reviewer actually looked at. Change any and the previous
  -- verdict no longer describes this document.
  material_change :=
       new.doc_type   is distinct from old.doc_type
    or new.name       is distinct from old.name
    or new.issuer     is distinct from old.issuer
    or new.doc_number is distinct from old.doc_number
    or new.issued_on  is distinct from old.issued_on
    or new.expires_on is distinct from old.expires_on
    or new.file_path  is distinct from old.file_path;

  if app.is_platform() or current_user = 'service_role' then
    -- a verdict from the platform is recorded
    if new.review is distinct from old.review
    or new.review_note is distinct from old.review_note then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
      insert into public.document_reviews (document_id, review, note, actor)
      values (new.id, new.review, new.review_note, (select auth.uid()));
    end if;
    return new;
  end if;

  -- Not the platform. The verdict is not theirs to move.
  if new.review      is distinct from old.review
  or new.review_note is distinct from old.review_note
  or new.reviewed_by is distinct from old.reviewed_by
  or new.reviewed_at is distinct from old.reviewed_at then
    raise exception
      'a review verdict is written by FR Services, not by the company'
      using errcode = '42501';
  end if;

  -- (3) a material edit sends it back, and says so in the trail
  if material_change and app.is_reviewable_type(new.doc_type) then
    new.review      := 'pending';
    new.review_note := '';
    new.reviewed_by := null;
    new.reviewed_at := null;
    insert into public.document_reviews (document_id, review, note, automatic, actor)
    values (new.id, 'pending',
            'Returned to the queue automatically - the company changed a reviewed detail.',
            true, (select auth.uid()));
  end if;

  return new;
end;
$$;

create trigger documents_guard_review before update on public.documents
  for each row execute function app.guard_document_review();

-- A new document is never born verified, whoever inserts it.
create or replace function app.default_document_review()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.review := case when app.is_reviewable_type(new.doc_type)
                     then 'pending'::app.doc_review
                     else 'exempt'::app.doc_review end;
  new.review_note := '';
  new.reviewed_by := null;
  new.reviewed_at := null;
  return new;
end;
$$;

create trigger documents_default_review before insert on public.documents
  for each row execute function app.default_document_review();

-- ---------------------------------------------------------------------
-- Policies.
--
-- Note the read policy does NOT let the public read this table at all.
-- Renters read the view below instead, because RLS filters rows and the
-- masking this design needs is per COLUMN.
-- ---------------------------------------------------------------------
alter table public.documents        enable row level security;
alter table public.document_reviews enable row level security;

create policy documents_read_own on public.documents
  for select to authenticated
  using (app.is_member_of(company_id) or app.is_platform());

create policy documents_insert_own on public.documents
  for insert to authenticated
  with check (app.is_member_of(company_id) or app.is_platform());

create policy documents_update on public.documents
  for update to authenticated
  using (app.is_member_of(company_id) or app.is_platform())
  with check (app.is_member_of(company_id) or app.is_platform());

create policy documents_delete_own on public.documents
  for delete to authenticated
  using (app.is_member_of(company_id) or app.is_platform());

-- The trail is readable by the company it concerns and by the platform.
-- It is written only by the triggers above, which run as the table owner -
-- so there is no INSERT policy for anyone.
create policy document_reviews_read on public.document_reviews
  for select to authenticated
  using (exists (
    select 1 from public.documents d
    where d.id = document_id
      and (app.is_member_of(d.company_id) or app.is_platform())));

-- ---------------------------------------------------------------------
-- The masking view: what a renter is allowed to see.
--
-- THIS VIEW IS DEFINER-RIGHTS ON PURPOSE, and that decision is the whole
-- security boundary for public document access. The reasoning matters:
--
-- RLS filters ROWS. It cannot hide a COLUMN. So if `anon` were granted
-- SELECT on public.documents with a policy allowing published rows, anon
-- could read those rows' `doc_number` in full and their `review_note` -
-- defeating both the masking and the rule that a reviewer's remark stays
-- internal. A row policy cannot express "these columns, not those".
--
-- So anon gets no privilege on the base table at all. It reads this view,
-- which runs with the owner's rights and therefore must carry its own
-- restriction: the WHERE clause below IS the policy. It is short and
-- total on purpose - published, on a company that is listed and not
-- suspended, and nothing else.
-- ---------------------------------------------------------------------
create or replace function app.mask_number(n text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- last four alphanumerics, so it can be matched against the paper
  -- without being copied off a public page
  select case
    when coalesce(trim(n), '') = '' then ''
    when length(regexp_replace(n, '[^0-9A-Za-z]', '', 'g')) < 4 then '••••'
    else '••••' || right(regexp_replace(n, '[^0-9A-Za-z]', '', 'g'), 4)
  end;
$$;

create view public.published_documents as
select
  d.id,
  d.company_id,
  d.doc_type,
  d.name,
  d.issuer,
  case when d.show_number then d.doc_number
       else app.mask_number(d.doc_number) end          as doc_number,
  (not d.show_number and d.doc_number <> '')           as number_masked,
  d.issued_on,
  d.expires_on,
  app.is_expired(d.expires_on) as expired,
  -- a renter sees "checked by us" or "the company's own word", and
  -- 'exempt' and 'pending' are the same sentence from their side
  case when d.review = 'verified' then 'verified' else 'submitted' end as standing,
  case when d.show_file then d.file_path else null end as file_path,
  case when d.show_file then d.file_name else null end as file_name,
  (d.file_path is not null)                            as has_file,
  d.note
from public.documents d
join public.companies c on c.id = d.company_id
where d.published
  and c.listed
  and c.suspended_at is null;

comment on view public.published_documents is
  'The only document surface a renter sees. review_note and the review
   trail are deliberately absent: a reviewer''s remark can name a
   suspicion, an unfinished check or a person, and none of that belongs on
   a public page where it would read as a published accusation.';

grant select on public.published_documents to anon, authenticated;
grant select, insert, update, delete on public.documents to authenticated;
grant select on public.document_reviews to authenticated;

-- Said explicitly rather than left to the default, because it is the point:
-- nobody reads the raw table except the company it belongs to and the
-- platform. A renter's only route to a document is the view above.
revoke all on public.documents        from anon;
revoke all on public.document_reviews from anon;
