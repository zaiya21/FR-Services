/**
 * Creates (or promotes) a platform-console account for real in Supabase
 * Auth, and marks it role='platform' in public.profiles.
 *
 * Needs the service-role key, which bypasses row level security - that is
 * exactly why this is a script you run once per account from your own
 * machine, never code that ships to the browser or runs on every deploy.
 *
 * Usage:
 *   node --env-file=.env.local scripts/seed-platform-admin.mjs
 *     Creates the shipped demo account, admin@frservices.ph.
 *
 *   node --env-file=.env.local scripts/seed-platform-admin.mjs <email> <password> ["Full Name"]
 *     Creates (or promotes) any other platform account - your own included.
 */
import { createClient } from '@supabase/supabase-js';
import { passwordProblem } from '../lib/password-rules.js';

const [, , argEmail, argPassword, argName] = process.argv;

const EMAIL = argEmail || 'admin@frservices.ph';
const PASSWORD = argPassword || 'FRadmin2026!';
const FULL_NAME = argName || (argEmail ? '' : 'FR Services Admin');
const IS_SHIPPED_DEMO = !argEmail;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey){
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    'Run this with: node --env-file=.env.local scripts/seed-platform-admin.mjs'
  );
  process.exit(1);
}

if (argEmail && !argPassword){
  console.error('Give a password as the second argument: <email> <password> ["Full Name"]');
  process.exit(1);
}
if (argPassword){
  const problem = passwordProblem(argPassword);
  if (problem){ console.error('Password rejected: ' + problem); process.exit(1); }
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function findUserByEmail(email){
  // admin.listUsers() is paginated; the project has at most a handful of
  // accounts at this stage, so one page is enough.
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find(u => u.email?.toLowerCase() === email.toLowerCase()) || null;
}

async function main(){
  let user = await findUserByEmail(EMAIL);

  if (!user){
    const { data, error } = await admin.auth.admin.createUser({
      email: EMAIL,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: FULL_NAME, is_default_password: IS_SHIPPED_DEMO }
    });
    if (error) throw error;
    user = data.user;
    console.log(`Created auth user ${EMAIL}.`);
  } else {
    console.log(`${EMAIL} already exists in Supabase Auth - leaving the password as-is.`);
  }

  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: 'platform', ...(FULL_NAME ? { full_name: FULL_NAME } : {}) })
    .eq('id', user.id);
  if (profileError) throw profileError;

  console.log(`${EMAIL} is now role='platform'. Sign in at /platform with that password.`);
}

main().catch(err => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
