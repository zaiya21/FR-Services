/**
 * Server-side mirror of the rules in public/assets/platform-auth.js. Kept
 * in sync deliberately, not shared by import - one is a classic script
 * loaded in the browser, the other runs in a Route Handler, and a client
 * check is a courtesy, never a boundary. This one is the boundary.
 */
const MIN_PASSWORD = 10;
const WEAK = ['password12', 'admin12345', '1234567890', 'qwertyuiop', 'frservices1'];

export function passwordProblem(pw){
  const p = String(pw || '');
  if (p.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  if (!/[a-z]/i.test(p)) return 'Include at least one letter.';
  if (!/[0-9]/.test(p)) return 'Include at least one number.';
  if (/^\s|\s$/.test(p)) return 'Remove the leading or trailing space.';
  if (WEAK.includes(p.toLowerCase())) return 'That password is too easy to guess.';
  return null;
}
