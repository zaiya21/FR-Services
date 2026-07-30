-- =====================================================================
-- ASSERTIONS
--
-- This migration adds no tables. It fails the migration if any of the
-- boundaries the earlier files establish has been undone.
--
-- It exists because of how RLS goes wrong. Nobody removes a policy on
-- purpose; someone adds "platform read for support", or turns a masking
-- view into a plain one, or adds a table and forgets RLS - and none of
-- those produce an error. The database just quietly answers questions it
-- used to refuse. Anything checkable in SQL is checked here so that the
-- failure is a failed deploy rather than a discovery.
--
-- These are structural checks. They are not a substitute for signing in as
-- company A and trying to read company B's rows, which is the test that
-- actually matters and which supabase/README.md sets out.
-- =====================================================================

do $$
declare
  offenders text;
  n integer;
begin

  -- 1. Every table in public has RLS on. A table without it is readable by
  --    anyone holding the anon key, which is printed in the client bundle.
  select string_agg(c.relname, ', ' order by c.relname), count(*)
    into offenders, n
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity;
  if n > 0 then
    raise exception 'RLS is not enabled on: %', offenders;
  end if;

  -- 2. Every table with RLS has at least one policy. RLS on with no policy
  --    denies everything, which is safe but is almost always a mistake
  --    someone will "fix" by disabling RLS.
  select string_agg(c.relname, ', ' order by c.relname), count(*)
    into offenders, n
  from pg_class c
  join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity
    and not exists (select 1 from pg_policies p
                    where p.schemaname = 'public' and p.tablename = c.relname);
  if n > 0 then
    raise exception 'RLS enabled but no policy on: %', offenders;
  end if;

  -- 3. The expense ledger is not visible to the platform. No policy on
  --    that table may reference the platform helper.
  select count(*) into n
  from pg_policies
  where schemaname = 'public' and tablename = 'expenses'
    and (coalesce(qual, '') || coalesce(with_check, '')) like '%is_platform%';
  if n > 0 then
    raise exception
      'a policy on public.expenses references app.is_platform(); the seller''s '
      'ledger is deliberately outside the platform''s reach';
  end if;

  -- 4. anon holds no privilege on the tables that carry personal or
  --    commercial detail. Renters reach documents through the masking view
  --    and nothing else.
  select string_agg(format('%s:%s', table_name, privilege_type), ', '), count(*)
    into offenders, n
  from information_schema.role_table_grants
  where grantee = 'anon'
    and table_schema = 'public'
    and table_name in ('documents','document_reviews','bookings','booking_addons',
                       'expenses','company_reports','saved_companies','profiles');
  if n > 0 then
    raise exception 'anon has privileges it should not: %', offenders;
  end if;

  -- 5. The masking view exists and does not expose the columns it exists to
  --    withhold.
  if not exists (select 1 from pg_views
                 where schemaname = 'public' and viewname = 'published_documents') then
    raise exception 'public.published_documents is missing; renters have no document surface';
  end if;

  select string_agg(column_name, ', '), count(*) into offenders, n
  from information_schema.columns
  where table_schema = 'public' and table_name = 'published_documents'
    and column_name in ('review_note','reviewed_by','review');
  if n > 0 then
    raise exception
      'published_documents exposes %; a reviewer''s remark is internal', offenders;
  end if;

  -- 6. The badge is derived, not stored. A `verified` column on companies
  --    would be settable by the party it describes.
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'companies'
               and column_name in ('verified','is_verified','badge')) then
    raise exception
      'companies has a stored verified flag; the badge must stay derived '
      '(see public.company_standing)';
  end if;

  -- 7. The triggers that protect columns a row policy cannot are present.
  --    Without these, an UPDATE that RLS permits can change anything.
  if not exists (select 1 from pg_trigger
                 where tgname = 'documents_guard_review' and not tgisinternal) then
    raise exception 'documents_guard_review is missing; a company could write its own verdict';
  end if;
  if not exists (select 1 from pg_trigger
                 where tgname = 'profiles_guard_role' and not tgisinternal) then
    raise exception 'profiles_guard_role is missing; an account could promote itself';
  end if;
  if not exists (select 1 from pg_trigger
                 where tgname = 'companies_guard_trust' and not tgisinternal) then
    raise exception 'companies_guard_trust is missing; an owner could set its own rating';
  end if;
  if not exists (select 1 from pg_trigger
                 where tgname = 'bookings_enforce_capacity' and not tgisinternal) then
    raise exception 'bookings_enforce_capacity is missing; the fleet can be overbooked';
  end if;

  -- 8. Every SECURITY DEFINER function pins its search_path. Without it,
  --    a caller can shadow an unqualified name and change what the
  --    function - running with the owner's rights - actually does.
  select string_agg(p.proname, ', ' order by p.proname), count(*)
    into offenders, n
  from pg_proc p
  join pg_namespace ns on ns.oid = p.pronamespace
  where ns.nspname in ('app','public')
    and p.prosecdef
    and not exists (
      select 1 from unnest(coalesce(p.proconfig, array[]::text[])) cfg
      where cfg like 'search_path=%');
  if n > 0 then
    raise exception 'SECURITY DEFINER without a pinned search_path: %', offenders;
  end if;

  -- 9. The storage bucket holding paperwork is private.
  if exists (select 1 from storage.buckets
             where id = 'company-documents' and public) then
    raise exception
      'the company-documents bucket is public; every uploaded permit is '
      'fetchable by URL regardless of what the documents table says';
  end if;

  raise notice 'boundary assertions passed: RLS, expense isolation, document masking, '
               'derived badge, column guards, definer search_path, private bucket';
end;
$$;
