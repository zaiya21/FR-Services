/* =====================================================================
   AUTH - the sign-in gate for the FR Services platform console
   ---------------------------------------------------------------------
   READ THIS BEFORE TRUSTING IT.

   This prototype has no server. Everything below runs in the visitor's
   own browser, against their own localStorage, using code they can read
   and a devtools console they can type into. That means:

       THIS IS A GATE, NOT A LOCK.

   It stops someone wandering into the console by accident. It stops
   nobody who wants in. Anyone can open devtools and write a session
   object, or read this file and see exactly how. No amount of care on
   this side changes that, because the thing checking the password is the
   same thing asking for it.

   Real authentication is a server-side decision: the password never
   leaves as anything but a TLS-protected credential, it is stored under
   a slow KDF (argon2id or bcrypt, not SHA-256), the session is an opaque
   httpOnly cookie, rate limiting is per-account AND per-IP, and reset
   tokens go out by email and are single-use and short-lived. See
   ARCHITECTURE.md §14 for the migration.

   What IS worth doing here, and is done:
     - the password is never stored, in any form, anywhere. Only a salted
       SHA-256 digest is kept, so a glance at localStorage does not hand
       over a credential the operator probably reuses elsewhere;
     - failed attempts are counted and lock the account briefly, so the
       shape of the real thing is in the prototype;
     - sessions expire, and "keep me signed in" is a deliberate choice
       rather than the default;
     - reset codes are single-use and time-limited.
   ===================================================================== */

const AUTH_ACCOUNTS = 'fr.auth.accounts';
const AUTH_SESSION  = 'fr.auth.session';
const AUTH_LOCKS    = 'fr.auth.locks';
const AUTH_RESETS   = 'fr.auth.resets';

const SESSION_HOURS  = 12;
const REMEMBER_DAYS  = 14;
const MAX_ATTEMPTS   = 5;
const LOCK_SECONDS   = 60;
const RESET_MINUTES  = 10;
const MIN_PASSWORD   = 10;

/* The account this prototype ships with. Documented in the sign-in box
   itself, because a demo nobody can get into is not a demo. */
const FR_DEFAULT_ADMIN = {
  user: 'admin@frservices.ph',
  name: 'FR Services Admin',
  role: 'platform',
  password: 'FRadmin2026!'
};

/* ---------------------------------------------------------------
   Hashing
   --------------------------------------------------------------- */
const _te = s => new TextEncoder().encode(s);
const _hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

function randomHex(bytes){
  const a = new Uint8Array(bytes);
  if (globalThis.crypto && crypto.getRandomValues) crypto.getRandomValues(a);
  else for (let i = 0; i < bytes; i++) a[i] = Math.floor(Math.random() * 256);
  return _hex(a.buffer);
}

/* Chrome treats file:// as a secure context, so crypto.subtle is normally
   there. The fallback exists so the gate still functions if it is not -
   and labels itself, so nobody mistakes it for a digest. */
function weakDigest(s){
  let h1 = 0x811c9dc5, h2 = 0x01000193;
  for (let i = 0; i < s.length; i++){
    h1 = Math.imul(h1 ^ s.charCodeAt(i), 16777619) >>> 0;
    h2 = Math.imul(h2 + s.charCodeAt(i) + i, 2246822519) >>> 0;
  }
  return 'weak-' + h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
async function hashPassword(password, salt){
  const material = salt + '::' + password;
  if (globalThis.crypto && crypto.subtle && crypto.subtle.digest){
    try { return 'sha256-' + _hex(await crypto.subtle.digest('SHA-256', _te(material))); }
    catch { /* fall through */ }
  }
  return weakDigest(material);
}
/** Compare without leaking length or position through early exit. */
function safeEqual(a, b){
  const x = String(a || ''), y = String(b || '');
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++)
    diff |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  return diff === 0;
}

/* ---------------------------------------------------------------
   Store
   --------------------------------------------------------------- */
const normUser = u => String(u || '').trim().toLowerCase().slice(0, 120);

function readJSON(key, fallback){
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function writeJSON(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

function loadAccounts(){
  const raw = readJSON(AUTH_ACCOUNTS, null);
  return Array.isArray(raw) ? raw.filter(a => a && a.user && a.hash && a.salt) : [];
}
function saveAccounts(rows){ return writeJSON(AUTH_ACCOUNTS, rows); }
function findAccount(user){
  const u = normUser(user);
  return loadAccounts().find(a => normUser(a.user) === u) || null;
}

/** Creates the shipped admin on first run. Safe to call repeatedly. */
async function authEnsureDefault(){
  if (findAccount(FR_DEFAULT_ADMIN.user)) return false;
  const salt = randomHex(16);
  const rows = loadAccounts();
  rows.push({
    user: FR_DEFAULT_ADMIN.user,
    name: FR_DEFAULT_ADMIN.name,
    role: FR_DEFAULT_ADMIN.role,
    salt,
    hash: await hashPassword(FR_DEFAULT_ADMIN.password, salt),
    /* Flags the account as still using the password printed in the UI, so
       the console can keep saying so until it is changed. */
    isDefault: true,
    created: new Date().toISOString().slice(0, 10)
  });
  saveAccounts(rows);
  return true;
}

/* ---------------------------------------------------------------
   Lockout
   --------------------------------------------------------------- */
function lockState(user){
  const locks = readJSON(AUTH_LOCKS, {});
  const l = locks[normUser(user)];
  if (!l) return { attempts: 0, until: 0, locked: false, secondsLeft: 0 };
  const left = Math.ceil((l.until - Date.now()) / 1000);
  return { attempts: l.attempts || 0, until: l.until || 0,
           locked: left > 0, secondsLeft: Math.max(0, left) };
}
function noteFailure(user){
  const locks = readJSON(AUTH_LOCKS, {});
  const k = normUser(user);
  const cur = locks[k] || { attempts: 0, until: 0 };
  cur.attempts = (cur.attempts || 0) + 1;
  if (cur.attempts >= MAX_ATTEMPTS){
    cur.until = Date.now() + LOCK_SECONDS * 1000;
    cur.attempts = 0;
  }
  locks[k] = cur;
  writeJSON(AUTH_LOCKS, locks);
  return lockState(user);
}
function clearFailures(user){
  const locks = readJSON(AUTH_LOCKS, {});
  delete locks[normUser(user)];
  writeJSON(AUTH_LOCKS, locks);
}

/* ---------------------------------------------------------------
   Session
   --------------------------------------------------------------- */
function authSession(){
  const s = readJSON(AUTH_SESSION, null);
  if (!s || !s.user || !s.expires) return null;
  if (Date.now() > s.expires){ localStorage.removeItem(AUTH_SESSION); return null; }
  return s;
}
function authSignOut(){
  try { localStorage.removeItem(AUTH_SESSION); } catch { /* nothing to do */ }
}

/**
 * @returns {Promise<{ok:boolean, error?:string, session?:object}>}
 * The failure message is deliberately the same whether the account does
 * not exist or the password is wrong - otherwise the form doubles as a
 * way to enumerate who has an account.
 */
async function authSignIn(user, password, remember){
  const lock = lockState(user);
  if (lock.locked)
    return { ok:false, error:`Too many attempts. Try again in ${lock.secondsLeft} seconds.` };

  const acct = findAccount(user);
  const WRONG = 'That email and password do not match an account.';

  /* Hash regardless, so a missing account and a wrong password take a
     comparable amount of time. */
  const candidate = await hashPassword(password || '', acct ? acct.salt : 'no-such-account');
  if (!acct || !safeEqual(candidate, acct.hash)){
    const after = noteFailure(user);
    return { ok:false,
      error: after.locked
        ? `Too many attempts. Locked for ${after.secondsLeft} seconds.`
        : WRONG };
  }

  clearFailures(user);
  const ms = remember ? REMEMBER_DAYS * 864e5 : SESSION_HOURS * 36e5;
  const session = {
    user: acct.user, name: acct.name, role: acct.role,
    since: Date.now(), expires: Date.now() + ms,
    remember: !!remember, usingDefaultPassword: !!acct.isDefault
  };
  writeJSON(AUTH_SESSION, session);
  return { ok:true, session };
}

/* ---------------------------------------------------------------
   Passwords
   --------------------------------------------------------------- */
/** @returns {string|null} null when acceptable. */
function passwordProblem(pw){
  const p = String(pw || '');
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (!/[a-z]/i.test(p)) return 'Include at least one letter.';
  if (!/[0-9]/.test(p))  return 'Include at least one number.';
  if (/^\s|\s$/.test(p)) return 'Remove the leading or trailing space.';
  const weak = ['password12','admin12345','1234567890','qwertyuiop','frservices1'];
  if (weak.includes(p.toLowerCase())) return 'That password is too easy to guess.';
  return null;
}

async function authChangePassword(user, current, next){
  const acct = findAccount(user);
  if (!acct) return { ok:false, error:'No such account.' };
  const cur = await hashPassword(current || '', acct.salt);
  if (!safeEqual(cur, acct.hash)) return { ok:false, error:'The current password is wrong.' };
  const problem = passwordProblem(next);
  if (problem) return { ok:false, error:problem };
  return applyNewPassword(acct.user, next);
}

async function applyNewPassword(user, next){
  const rows = loadAccounts();
  const acct = rows.find(a => normUser(a.user) === normUser(user));
  if (!acct) return { ok:false, error:'No such account.' };
  acct.salt = randomHex(16);
  acct.hash = await hashPassword(next, acct.salt);
  acct.isDefault = false;
  if (!saveAccounts(rows)) return { ok:false, error:'Could not save - browser storage is blocked.' };
  /* A password change ends every existing session. */
  authSignOut();
  clearFailures(user);
  return { ok:true };
}

/* ---------------------------------------------------------------
   Reset
   There is no mail server, so the code is returned to the caller and the
   UI shows it, with a note saying exactly why. Pretending an email went
   out would be worse: the operator would sit waiting for it.
   --------------------------------------------------------------- */
function authStartReset(user){
  const acct = findAccount(user);
  /* Same response either way - the reset form must not confirm whether an
     address is registered. The code is only returned when it is real. */
  if (!acct) return { ok:true, sent:false };

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const resets = readJSON(AUTH_RESETS, {});
  resets[normUser(user)] = {
    code, expires: Date.now() + RESET_MINUTES * 60000, used: false
  };
  writeJSON(AUTH_RESETS, resets);
  return { ok:true, sent:true, code, minutes: RESET_MINUTES };
}

async function authCompleteReset(user, code, next){
  const resets = readJSON(AUTH_RESETS, {});
  const k = normUser(user);
  const r = resets[k];
  if (!r || r.used)              return { ok:false, error:'That code has already been used. Request a new one.' };
  if (Date.now() > r.expires)    return { ok:false, error:'That code has expired. Request a new one.' };
  if (!safeEqual(String(code || '').trim(), r.code))
    return { ok:false, error:'That code is not right.' };

  const problem = passwordProblem(next);
  if (problem) return { ok:false, error:problem };

  const out = await applyNewPassword(user, next);
  if (!out.ok) return out;

  r.used = true;
  writeJSON(AUTH_RESETS, resets);
  return { ok:true };
}

/* =====================================================================
   SAVED COMPANIES
   A favourite belongs to an account, so it lives here rather than in
   ops.js: there is no such thing as a saved company for a signed-out
   visitor, and the key is the account.

   The signed-out check is in the STORE, not only in the button. Hiding a
   control is a courtesy to the person using the page; it is not a rule.
   Anything that writes has to refuse on its own.
   ===================================================================== */
const FAV_KEY = user => 'fr.saved.' + String(user).replace(/[^a-z0-9@.\-]/gi, '_');
const MAX_FAVOURITES = 200;

function loadFavourites(){
  const s = authSession();
  if (!s) return [];
  const raw = readJSON(FAV_KEY(s.user), []);
  return Array.isArray(raw)
    ? raw.filter(v => typeof v === 'string').slice(0, MAX_FAVOURITES) : [];
}
const isFavourite = id => loadFavourites().includes(String(id));

/**
 * @returns {{ok:boolean, on?:boolean, error?:string}}
 * Refuses when signed out, whatever the page thinks it is showing.
 */
function toggleFavourite(id){
  const s = authSession();
  if (!s) return { ok:false, error:'Sign in to save a company.' };
  const key = String(id);
  const list = loadFavourites();
  const at = list.indexOf(key);
  if (at >= 0) list.splice(at, 1);
  else if (list.length >= MAX_FAVOURITES) return { ok:false, error:'You have saved the maximum number of companies.' };
  else list.unshift(key);
  return writeJSON(FAV_KEY(s.user), list)
    ? { ok:true, on: at < 0 }
    : { ok:false, error:'Could not save - browser storage is blocked.' };
}

/**
 * Swaps a page's "Sign in" control for the signed-in name and a way out.
 * Pages call this once; it is the same on every renter-facing page, and
 * duplicating it five times is how five of them end up slightly different.
 */
function paintAuthNav(hostId){
  const host = document.getElementById(hostId || 'authNav');
  if (!host) return null;
  const s = authSession();
  if (!s){
    host.innerHTML = '<a class="btn btn-i" href="platform.html">Sign in</a>';
    return null;
  }
  host.innerHTML =
    `<span class="authwho" title="${String(s.user).replace(/"/g, '&quot;')}">` +
    `${String(s.name || s.user).replace(/[<>&]/g, '')}</span>` +
    '<button class="btn btn-w" type="button" data-signout>Sign out</button>';
  host.querySelector('[data-signout]').addEventListener('click', () => {
    authSignOut();
    location.reload();
  });
  return s;
}

/** Wipes accounts, sessions, locks and reset codes - the demo reset. */
function authFactoryReset(){
  const s = authSession();
  [AUTH_ACCOUNTS, AUTH_SESSION, AUTH_LOCKS, AUTH_RESETS]
    .concat(s ? [FAV_KEY(s.user)] : [])
    .forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
}
