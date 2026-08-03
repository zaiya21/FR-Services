import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createSsrClient } from '../../../../lib/supabase/server';

/**
 * DELETE /api/companies/:id - platform-only, permanent removal.
 *
 * Everything keyed to the company by a foreign key with `on delete cascade`
 * (lines, service areas, theme, members, units, documents, expenses, trust
 * records) disappears the moment the `companies` row does - the schema
 * already does that work. Two things the schema does NOT do, on purpose,
 * are handled here instead:
 *
 *  - bookings.company_id is `on delete restrict`, and bookings has no
 *    delete policy at all ("a booking is a financial record" - see
 *    supabase/migrations/20260730000600_bookings.sql). This route respects
 *    that: a company with any booking history is refused, not force-deleted
 *    via the service key.
 *  - Storage objects are not foreign-keyed to anything, so the cascade
 *    never touches them - left alone, a removed company's uploaded permits
 *    and branding images would sit in the bucket forever. Removed here,
 *    best-effort, before the row goes.
 *
 * Needs the service key: platform has read/update access to `companies`
 * under RLS already, but no storage delete policy on either bucket (only
 * a company's own member can delete from its own folder - see
 * 20260730001000_storage.sql) - which stops mattering the instant the
 * company (and with it, its members) is gone.
 */
export async function DELETE(request, { params }){
  const { id } = await params;
  if (!id) return NextResponse.json({ ok: false, error: 'Missing company id.' }, { status: 400 });

  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 });

  // Not app.is_platform() over RPC: PostgREST on this project only exposes
  // the public schema (see 20260803000100_owner_status_public_schema.sql),
  // so app.* is unreachable by name over HTTP no matter how it's called.
  // A plain read of the caller's own profiles row needs none of that - the
  // row-level "id = auth.uid()" policy alone lets them read it.
  const { data: profile } = await ssr.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || profile.role !== 'platform')
    return NextResponse.json({ ok: false, error: 'Only FR Services staff can remove a company.' }, { status: 403 });

  const admin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: company } = await admin.from('companies').select('id,name').eq('id', id).maybeSingle();
  if (!company) return NextResponse.json({ ok: false, error: 'Company not found.' }, { status: 404 });

  const { count: bookingCount } = await admin
    .from('bookings').select('id', { count: 'exact', head: true }).eq('company_id', id);
  if (bookingCount){
    return NextResponse.json({
      ok: false,
      error: `${company.name} has ${bookingCount} booking${bookingCount === 1 ? '' : 's'} on record. ` +
        'Booking history is never deleted, so this company cannot be removed while it has any - ' +
        'unlist it instead if it needs to come off the marketplace.'
    }, { status: 409 });
  }

  for (const bucket of ['company-documents', 'company-branding']){
    const { data: files } = await admin.storage.from(bucket).list(id, { limit: 1000 });
    if (files && files.length){
      await admin.storage.from(bucket).remove(files.map(f => `${id}/${f.name}`));
    }
  }

  const { error } = await admin.from('companies').delete().eq('id', id);
  if (error)
    return NextResponse.json({ ok: false, error: 'Could not remove the company: ' + error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, name: company.name });
}
