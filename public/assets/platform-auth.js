/* =====================================================================
   PLATFORM-AUTH - the real sign-in gate for the FR Services platform
   console, backed by Supabase Auth over the /api/auth/* routes.
   ---------------------------------------------------------------------
   This replaces the localStorage password/session system that used to
   live in auth.js for this one console. It is deliberately a separate
   file: auth.js still powers the marketplace-wide "Sign in" nav button
   and saved companies on the renter-facing pages, which is a different,
   still-client-only feature this change does not touch.

   The password is checked server-side, the session is an httpOnly
   cookie no script on this page can read, and only an account with
   role='platform' in the database is let in - see
   app/api/auth/sign-in/route.js and supabase/migrations/…_identity.sql.
   ===================================================================== */

const PLATFORM_RESET_MINUTES = 10;
const PLATFORM_MIN_PASSWORD = 10;

/* Shown in the sign-in box so a demo nobody can enter is not a demo. The
   account itself lives in Supabase Auth now, not in this file - this is
   display copy, not a credential the code checks against. */
const FR_DEFAULT_ADMIN = {
  user: 'admin@frservices.ph',
  password: 'FRadmin2026!'
};

async function postJSON(url, body){
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  return res.json().catch(() => ({ ok: false, error: 'Something went wrong. Try again.' }));
}

/** @returns {Promise<object|null>} */
async function platformAuthSession(){
  try {
    const res = await fetch('/api/auth/session', { cache: 'no-store' });
    const data = await res.json();
    return data.session || null;
  } catch {
    return null;
  }
}

/** @returns {Promise<{ok:boolean, error?:string, session?:object}>} */
async function platformAuthSignIn(user, password, remember){
  return postJSON('/api/auth/sign-in', { email: user, password, remember: !!remember });
}

async function platformAuthSignOut(){
  await postJSON('/api/auth/sign-out', {});
}

/** @returns {Promise<{ok:boolean, minutes?:number}>} */
async function platformAuthStartReset(user){
  return postJSON('/api/auth/reset-request', { email: user });
}

/** @returns {Promise<{ok:boolean, error?:string}>} */
async function platformAuthCompleteReset(user, code, next){
  return postJSON('/api/auth/reset-confirm', { email: user, code, password: next });
}

/** @returns {string|null} null when acceptable. Mirrors lib/password-rules.js -
 *  this copy is for instant feedback only; the route re-checks it. */
function platformPasswordProblem(pw){
  const p = String(pw || '');
  if (p.length < PLATFORM_MIN_PASSWORD) return `Use at least ${PLATFORM_MIN_PASSWORD} characters.`;
  if (!/[a-z]/i.test(p)) return 'Include at least one letter.';
  if (!/[0-9]/.test(p)) return 'Include at least one number.';
  if (/^\s|\s$/.test(p)) return 'Remove the leading or trailing space.';
  const weak = ['password12', 'admin12345', '1234567890', 'qwertyuiop', 'frservices1'];
  if (weak.includes(p.toLowerCase())) return 'That password is too easy to guess.';
  return null;
}
