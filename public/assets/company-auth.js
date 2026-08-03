/* =====================================================================
   COMPANY-AUTH - real sign-in for a company owner, over /api/auth/owner/*.
   ---------------------------------------------------------------------
   Parallel to platform-auth.js, not shared with it: a platform session
   and an owner session answer different questions (role='platform' vs
   membership of one company), and keeping them in separate routes means
   neither can be loosened by a change meant for the other.

   Company data itself (profile, theme, documents) is not read through
   fetch calls here - once signed in, the page talks to Postgres directly
   via window.supabaseBrowser (see app/_SupabaseBrowser.jsx), under the
   same RLS a signed-in member would get from any Supabase client. This
   file only answers "who is signed in".
   ===================================================================== */

const COMPANY_MIN_PASSWORD = 10;

async function postJSON(url, body){
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return res.json().catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }));
}

/** @returns {Promise<object|null>} */
async function companyAuthSession(){
  try {
    const res = await fetch('/api/auth/owner/session', { cache: 'no-store' });
    const data = await res.json();
    return data.session || null;
  } catch {
    return null;
  }
}

/** @returns {Promise<{ok:boolean, error?:string, unconfirmed?:boolean, session?:object}>} */
async function companyAuthSignIn(email, password, remember){
  return postJSON('/api/auth/owner/sign-in', { email, password, remember: !!remember });
}

async function companyAuthSignOut(){
  await postJSON('/api/auth/owner/sign-out', {});
}

/**
 * Overrides a page's "Sign in" nav button with the real signed-in name,
 * whoever holds the session - a platform operator or a registered company
 * owner. Shared across every renter-facing page rather than copied into
 * each one's script, which is how five copies end up slightly different.
 *
 * Leaves the host untouched when nobody is signed in, so it still shows
 * whatever that page's own markup (or auth.js's paintAuthNav, on the pages
 * that call it for favourites) already put there.
 */
async function paintRealAuthNav(hostId){
  const host = document.getElementById(hostId || 'authNav');
  if (!host) return null;
  const session = await companyAuthSession();
  if (!session) return null;

  const esc = s => String(s == null ? '' : s).replace(/[<>&"]/g, c => ({ '<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;' }[c]));
  const SHIELD_SVG = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-label="FR Services staff" ' +
    'style="vertical-align:-2px;margin-right:5px;flex:none">' +
    '<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/><path d="M9 12l2 2 4-4"/></svg>';
  const badge = session.role === 'platform' ? SHIELD_SVG : '';

  host.innerHTML =
    `<span class="authwho" title="${esc(session.email)}${session.role === 'platform' ? ' · FR Services staff' : ''}">${badge}${esc(session.name || session.email)}</span>` +
    '<button class="btn btn-w" type="button" data-real-signout>Sign out</button>';
  host.querySelector('[data-real-signout]').addEventListener('click', async () => {
    try { await companyAuthSignOut(); } finally { location.reload(); }
  });

  /* FR Services staff already run the platform - "List your company" is
     the acquisition CTA aimed at a renter thinking about registering
     their own business, not at the person who owns the whole thing. */
  if (session.role === 'platform'){
    const listBtn = document.getElementById('listCompanyBtn');
    if (listBtn) listBtn.hidden = true;
  }
  return session;
}

/** @returns {string|null} null when acceptable. Mirrors lib/password-rules.js. */
function companyPasswordProblem(pw){
  const p = String(pw || '');
  if (p.length < COMPANY_MIN_PASSWORD) return `Use at least ${COMPANY_MIN_PASSWORD} characters.`;
  if (!/[a-z]/i.test(p)) return 'Include at least one letter.';
  if (!/[0-9]/.test(p)) return 'Include at least one number.';
  if (/^\s|\s$/.test(p)) return 'Remove the leading or trailing space.';
  const weak = ['password12', 'admin12345', '1234567890', 'qwertyuiop', 'frservices1'];
  if (weak.includes(p.toLowerCase())) return 'That password is too easy to guess.';
  return null;
}
