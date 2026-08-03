-- =====================================================================
-- FIX - app.company_owner_status() was never actually callable.
--
-- PostgREST on this project only exposes the `public` and `graphql_public`
-- schemas (Settings -> API -> Exposed schemas) - `app` is not one of
-- them, and .schema('app').rpc(...) confirms PostgREST refuses it outright
-- ("Invalid schema: app"). Every *policy* that calls app.is_platform() or
-- app.is_member_of() still works, because RLS evaluates those as plain
-- SQL inside Postgres, never through the HTTP RPC endpoint - but
-- app.company_owner_status() was written specifically to be called BY
-- NAME over RPC (see 20260730001200_owner_visibility.sql), and that path
-- was broken from the moment it shipped. platform.js's
-- sb.rpc('company_owner_status', ...) call has been silently getting a
-- 404 back ever since; the UI never surfaced it because "no owner found"
-- and "the query failed" render identically in that table.
--
-- The fix is the function's schema, not the exposed-schema setting: this
-- is the one function in `app` that was ever meant to be reachable from
-- the browser, so it moves to `public`, where every other RPC-callable
-- and REST-readable thing in this project already lives. Its body is
-- unchanged - app.is_platform() inside it is still a normal, working
-- in-database call.
-- =====================================================================

drop function if exists app.company_owner_status(app.slug);

create or replace function public.company_owner_status(cid app.slug)
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

revoke all on function public.company_owner_status(app.slug) from public;
grant execute on function public.company_owner_status(app.slug) to authenticated;

comment on function public.company_owner_status(app.slug) is
  'Platform-only: the `and app.is_platform()` in the WHERE clause means a
   non-platform caller''s query matches zero rows, not an error - the
   function still executes, it just never returns anything for anyone
   who is not the platform, regardless of which company id they pass.
   Lives in public (not app) specifically so PostgREST''s RPC endpoint can
   reach it - see this migration''s header comment.';
