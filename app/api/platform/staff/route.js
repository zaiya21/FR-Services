import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createSsrClient } from '../../../../lib/supabase/server';
import { passwordProblem } from '../../../../lib/password-rules';

/**
 * Browser-side staff management for /platform's Staff tab - the in-app
 * equivalent of running scripts/seed-platform-admin.mjs from a terminal.
 * Same two things that script does (find-or-create the Auth user, then
 * set profiles.role='platform'), reachable without shell access.
 *
 * Needs the service key for both verbs: an email only exists in
 * auth.users, which RLS never exposes even to a platform session, and
 * creating a sign-in is the Auth admin API, not a table insert - neither
 * is reachable from window.supabaseBrowser no matter who is asking.
 */
async function requirePlatform(){
  const ssr = await createSsrClient();
  const { data: { user } } = await ssr.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: 'Sign in required.' }, { status: 401 }) };
  const { data: isPlatform } = await ssr.rpc('is_platform');
  if (!isPlatform) return { error: NextResponse.json({ ok: false, error: 'Platform access required.' }, { status: 403 }) };
  return {
    admin: createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
  };
}

export async function GET(){
  const { admin, error } = await requirePlatform();
  if (error) return error;

  const { data: staff, error: profErr } = await admin
    .from('profiles').select('id,full_name,created_at').eq('role', 'platform').order('created_at');
  if (profErr) return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });

  // listUsers() is paginated; a handful of staff accounts fits on one page
  // (same call, same assumption, as scripts/seed-platform-admin.mjs).
  const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers();
  if (usersErr) return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
  const emailById = Object.fromEntries(usersPage.users.map(u => [u.id, u.email]));

  return NextResponse.json({
    ok: true,
    staff: staff.map(s => ({
      id: s.id, fullName: s.full_name, email: emailById[s.id] || '(no auth account)', createdAt: s.created_at
    }))
  });
}

export async function POST(request){
  const { admin, error } = await requirePlatform();
  if (error) return error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ ok: false, error: 'Malformed request.' }, { status: 400 });

  const fullName = String(body.fullName || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');

  if (fullName.length < 2)
    return NextResponse.json({ ok: false, error: 'Full name is required.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ ok: false, error: 'Enter a valid email address.' }, { status: 400 });
  const pwProblem = passwordProblem(password);
  if (pwProblem) return NextResponse.json({ ok: false, error: pwProblem }, { status: 400 });

  const { data: usersPage, error: usersErr } = await admin.auth.admin.listUsers();
  if (usersErr) return NextResponse.json({ ok: false, error: usersErr.message }, { status: 500 });
  let account = usersPage.users.find(u => u.email?.toLowerCase() === email);
  let created = false;

  if (!account){
    const { data, error: createErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: fullName }
    });
    if (createErr) return NextResponse.json({ ok: false, error: createErr.message }, { status: 400 });
    account = data.user;
    created = true;
  }

  const { error: profileError } = await admin
    .from('profiles').update({ role: 'platform', full_name: fullName }).eq('id', account.id);
  if (profileError) return NextResponse.json({ ok: false, error: profileError.message }, { status: 500 });

  return NextResponse.json({
    ok: true, email, created,
    note: created ? null : `${email} already had an account - its existing password was kept, only its role changed.`
  });
}
