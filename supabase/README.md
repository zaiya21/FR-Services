# Database — schema and row-level security

The schema for FR Services, with the trust boundaries the application
documents enforced in Postgres rather than in the browser.

**Nothing in the app uses this yet.** The Next app still reads and writes
`localStorage`; wiring it up is separate work. These migrations exist so the
database is correct before any code depends on it, because retrofitting RLS
onto a working app means auditing every query instead of writing policies
once.

## Running it

```bash
npm i -g supabase          # or: brew install supabase/tap/supabase
supabase init              # if you have not already
supabase start             # local Postgres in Docker
supabase db reset          # applies every migration in order
```

The last migration asserts the boundaries and **fails loudly** if any has
been undone, so `db reset` completing is itself a check. Against a hosted
project:

```bash
supabase link --project-ref <ref>
supabase db push
```

## The security model

| Who | Sees |
|---|---|
| `anon` | listed companies, their units and services, published documents **through the masking view only**, reviews, the rate card |
| renter (`authenticated`) | the above, plus their own bookings, their own reports, their own saved companies |
| company member | everything under their own `company_id`, including their private expense ledger |
| platform | marketplace activity across every company, and the sole ability to write a document verdict |

Two properties make the rest safe. Every table enables RLS, so a table
added without policies fails closed rather than open. And the helper
functions are `SECURITY DEFINER` with a pinned empty `search_path` —
without the first, a policy on `profiles` that reads `profiles` recurses;
without the second, a caller can shadow an unqualified name and change what
a function running with the owner's rights actually does.

## Where a row policy is not enough

RLS filters **rows**. Three things in this schema needed something else,
and each is the kind of gap that looks covered when it is not.

**Columns a permitted UPDATE must not touch.** A company may update its own
document — that is how publishing works — so RLS has to allow the UPDATE.
It cannot then say "but not the `review` column". Triggers do that:
`documents_guard_review`, `profiles_guard_role`, `companies_guard_trust`,
`bookings_guard_amounts`. Without them a seller can approve their own
paperwork, promote their own account, set their own star rating, and edit
the price of a booking someone already accepted.

**Columns a renter must not see.** `published_documents` is a
definer-rights view precisely because the alternative leaks. Granting
`anon` SELECT on `documents` with a row policy for published rows would
also hand over the full `doc_number` and the reviewer's `review_note` —
the masking is per column, which no row policy can express. So `anon` has
no privilege on the base table at all, and the view's `WHERE` clause is the
whole boundary. `booking_commission`, which has nothing to mask, is
`security_invoker` for the opposite reason: definer rights there would show
every authenticated user the totals of every booking on the marketplace.

**A count against a limit.** "This unit is not double-booked" looks like an
`EXCLUDE` constraint and is not one. A constraint predicate cannot contain
a subquery, so it cannot reach the unit's `quantity`; and a listing of
three vans may legitimately have three overlapping hires and must refuse
the fourth. `app.enforce_fleet_capacity` counts overlaps under a row lock
on the unit — the lock is load-bearing, because two bookings submitted at
the same instant would otherwise both see room.

## Invariants worth knowing

- **Verification covers three documents.** DTI, mayor's permit, BIR 2303.
  Everything else is `exempt` — not a verdict, a statement that none
  applies. Held as an equivalence: `exempt` if and only if the type is not
  reviewable.
- **Expiry is a generated column.** No code path can claim a lapsed permit
  is current.
- **A reviewable document needs a file.** A typed permit number gives a
  reviewer nothing to take to the issuing office.
- **A rejection needs a reason.** Approvals and returns may stand alone.
- **A material edit returns a document to the queue**, with an automatic
  entry in `document_reviews` saying so.
- **The verified badge is a view** (`company_standing`), never a column.
  All three approved and current, or no badge. An expired insurance policy
  cannot cost a badge the platform never granted on its account.
- **`total = net + vat`, and a cancelled booking bills nothing** — CHECKs,
  so a reporting bug cannot become a stored fact.
- **Longer hires cannot cost more than shorter ones.** The booking engine
  always quotes the best applicable tier, so an inverted discount silently
  costs the owner money instead of erroring.
- **The reported company cannot read the report.** A renter who asks to
  stay anonymous is promised the company will not see who complained, and a
  report's wording routinely identifies its author even without a name.

## What is deliberately absent

- **No `verified` column on companies** — see above.
- **No platform read path to `expenses`.** Assertion 3 fails the migration
  if a policy there ever mentions `app.is_platform()`.
- **No DELETE policy on `bookings`.** A booking is a financial record;
  cancelling is a status.
- **No SVG** in either storage bucket's mime list. An SVG is a script
  container and these files are served from the app's own origin.

## Verify it yourself before trusting it

**I could not execute this SQL.** There is no Postgres or Docker in the
environment it was written in, so it is unrun: expect to fix a syntax
error or two on the first `supabase db reset`. Structural correctness is
argued in the comments and checked by the final migration; neither is the
same as having run.

More importantly, the assertions are structural. They confirm a policy
exists, not that it says the right thing. The test that matters is two
accounts:

```sql
-- as company A, with company B's id
select * from public.documents where company_id = '<company-b>';   -- expect 0 rows
select * from public.expenses  where company_id = '<company-b>';   -- expect 0 rows
update public.documents set review = 'verified' where id = '<own-doc>';  -- expect 42501

-- as an FR Services operator
select * from public.expenses;                                     -- expect 0 rows
update public.documents set review = 'verified' where id = '<any>';-- expect success

-- as anon
select doc_number from public.documents limit 1;                   -- expect permission denied
select doc_number from public.published_documents limit 1;         -- expect '••••1234'
```

If any of those five lines does something other than what it says, the
policy is wrong and the comment above it is a lie.

## Not built yet

- **Seed data.** The 42 demo companies, their fleets and documents still
  live in `assets/data.js`. A `supabase/seed.sql` would replace the
  generators; until then a fresh database is empty.
- **`unit_instances`.** Capacity is enforced per listing quantity, which is
  right for availability but cannot tell you *which* excavator went out.
  Per-machine records need their own table.
- **Rate-limiting on reports.** RLS pins the reporter to the caller but
  does not stop one account filing a hundred reports; that belongs in an
  edge function or a trigger with a time window.
