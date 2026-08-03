-- =====================================================================
-- OWNER VISIBILITY - lets the platform see whether a registered
-- company's owner has confirmed their email.
--
-- auth.users is not exposed to PostgREST, and for good reason - it is
-- the one table nobody gets a row policy onto. A platform session still
-- needs to answer "has this owner verified their email" when judging a
-- registration, so this is a narrow, single-purpose SECURITY DEFINER
-- reader, the same shape as app.is_platform(): it looks at exactly one
-- thing (email + confirmation timestamp) for exactly one company's
-- owner - but unlike is_platform(), which only ever reveals a fact about
-- the caller themselves, this one reveals a fact about someone else, so
-- the platform check has to live INSIDE the function. Granting EXECUTE to
-- `authenticated` is not enough on its own: without the check below, any
-- signed-in renter could call this with any company id and get back a
-- stranger's email address and verification state.
-- =====================================================================

create or replace function app.company_owner_status(cid app.slug)
returns table (owner_email text, email_confirmed boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text, (u.email_confirmed_at is not null)
  from public.company_members m
  join auth.users u on u.id = m.user_id
  where m.company_id = cid and m.role = 'owner'
    and app.is_platform()
  limit 1;
$$;

revoke all on function app.company_owner_status(app.slug) from public;
grant execute on function app.company_owner_status(app.slug) to authenticated;

comment on function app.company_owner_status(app.slug) is
  'Platform-only: the `and app.is_platform()` in the WHERE clause means a
   non-platform caller''s query matches zero rows, not an error - the
   function still executes, it just never returns anything for anyone
   who is not the platform, regardless of which company id they pass.';
