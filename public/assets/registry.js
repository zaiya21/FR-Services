/* =====================================================================
   FR SERVICES - the company registry.

   The list of companies that exist. It starts EMPTY: every company on the
   marketplace got there by completing the registration wizard, and there
   is no fixture data behind it any more.

   The demo set - 42 seeded companies with hand-written service areas and
   fleets - was removed deliberately so that what you see is what was
   actually registered. It is not gone, only unreferenced: recover it with
   `git show <the commit before this one>:public/assets/data.js` if a
   populated marketplace is ever wanted for a screenshot.

   Loaded after geo.js (it needs inPH and round-tripping) and before
   data.js, which reads FR_COMPANIES at parse time.
   ===================================================================== */

const REG_KEY = 'fr.companies';

/* Bumped when a stored record's shape changes in a way older records
   cannot satisfy. regLoad() drops anything from a future version rather
   than half-reading it. */
const REG_VERSION = 1;

/* ---------------------------------------------------------------------
   Storage.

   One key holding the whole list, not a key per company. The list is
   read on every page load and written only on registration, it will not
   plausibly exceed a few hundred entries, and a single key makes the
   read atomic - a per-company scheme has to enumerate localStorage and
   can be caught mid-write with a company half-added.
   --------------------------------------------------------------------- */
function regLoad(){
  let raw;
  try { raw = JSON.parse(localStorage.getItem(REG_KEY) || 'null'); }
  catch { return []; }                       // corrupt: behave as empty
  if (!raw) return [];

  /* Accept both the wrapped form and a bare array, so a list written by
     an earlier build still loads. */
  const list = Array.isArray(raw) ? raw
             : (raw.v == null || raw.v <= REG_VERSION) && Array.isArray(raw.companies)
               ? raw.companies : [];
  return list.map(regHydrate).filter(Boolean);
}

function regWrite(list){
  try {
    localStorage.setItem(REG_KEY, JSON.stringify({ v: REG_VERSION, companies: list }));
    return true;
  } catch (e) {
    /* Quota, or Safari private mode. The caller has to know: reporting
       "registered" after a failed write loses the company silently. */
    return false;
  }
}

/* ---------------------------------------------------------------------
   Adding one.

   Returns { ok, id } or { ok:false, error }. The id is the owner's slug,
   uniquified rather than rejected - the second "Davao Fleet" to register
   should not be turned away over a name collision.
   --------------------------------------------------------------------- */
function regAdd(input){
  const rec = regNormalise(input);
  if (rec.error) return { ok:false, error: rec.error };

  const list = regLoad();
  if (list.some(c => c.id === rec.id)){
    let n = 2;
    while (list.some(c => c.id === rec.id + '-' + n)) n++;
    rec.id = rec.id + '-' + n;
  }
  list.push(rec);
  if (!regWrite(list))
    return { ok:false, error:'Could not save, because browser storage is full or blocked.' };
  return { ok:true, id: rec.id, company: rec };
}

function regRemove(id){
  const list = regLoad().filter(c => c.id !== id);
  return regWrite(list);
}

/* Wipes the registry and everything keyed off a company id, because the
   fleet, theme, documents, bookings and expenses stores are separate keys
   and orphaning them leaves a new company inheriting a deleted one's
   inventory the moment a slug is reused. */
function regClear(){
  const ids = regLoad().map(c => c.id);
  const prefixes = ['fr.theme.', 'fr.fleet.', 'fr.docs.', 'fr.expenses.', 'fr.bookings.'];
  try {
    for (const id of ids)
      for (const p of prefixes) localStorage.removeItem(p + String(id).replace(/[^a-z0-9-]/gi, ''));
    localStorage.removeItem(REG_KEY);
    return true;
  } catch { return false; }
}

const regCount = () => regLoad().length;

/* ---------------------------------------------------------------------
   Validation and normalisation.

   Everything here arrives from a form, so nothing is trusted. The record
   that comes out has every field the rest of the app reads, at the right
   type - the alternative is `undefined` reaching `.toFixed()` three
   pages away, which is how a blank field becomes a white screen.
   --------------------------------------------------------------------- */
const REG_CATS = ['vehicles', 'equipment', 'towing'];

/* Duplicated from data.js rather than read from it, and that is the point.
   data.js loads AFTER this file and builds FR_COMPANIES by calling
   regLoad() at parse time, so anything here that reached forward into
   data.js would be touching a `const` in its temporal dead zone - where
   even `typeof` throws a ReferenceError rather than returning
   "undefined", so the usual guard does not save you. Two short tables are
   cheaper than that hazard. */
const REG_BG = { vehicles:'#E8F6EC', equipment:'#EEF2F6', towing:'#FDECEC' };

function slugify(s){
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);
}

function regNormalise(input){
  const i = input || {};
  const name = String(i.name || '').trim();
  if (name.length < 2)  return { error:'Company name is required.' };
  if (name.length > 90) return { error:'Company name is too long (90 characters max).' };

  const cats = (Array.isArray(i.cats) ? i.cats : [])
    .filter(c => REG_CATS.includes(c));
  if (!cats.length) return { error:'Choose at least one service you offer.' };

  const lat = Number(i.lat), lon = Number(i.lon);
  if (!isFinite(lat) || !isFinite(lon))
    return { error:'Coordinates are required so renters can find you on the map.' };
  if (typeof inPH === 'function' ? !inPH(lat, lon) : false)
    return { error:'Those coordinates are outside the Philippines.' };

  const id = slugify(i.slug) || slugify(name) || 'company';

  /* Radius drives who ever sees this company, so it is clamped rather
     than trusted: a stray 100000 would put one yard in every search
     result in the country. */
  const radius = Math.max(1, Math.min(500, Math.round(Number(i.radius) || 25)));

  const base = String(i.base || '').trim();
  const city = String(i.city || '').trim();
  const province = String(i.province || '').trim();

  return {
    id,
    /* The primary line drives the card photo and default icon; cats is
       the full set, which is what filtering uses. */
    cat: cats[0],
    cats,
    name,
    loc: base || [city, province].filter(Boolean).join(', ') || 'Location not set',
    city, province,
    lat, lon, radius,

    /* Distance is computed live from wherever the renter is, so a stored
       one would only ever be stale. Kept at 0 as a defined default for
       the sort comparator. */
    km: 0,

    /* No reviews, because there are no bookings. Not seeded with a
       flattering 4.8 - a fake rating on a real listing is the one piece
       of dishonesty a marketplace cannot come back from. */
    rating: 0,
    reviews: 0,

    price: regPrice(i.price),
    /* Not checked against the known type list: an owner who rents out
       something we never thought of should be able to say so, and a
       whitelist here would silently drop it. Length-capped instead. */
    types: (Array.isArray(i.types) ? i.types : [])
             .map(t => String(t).trim().slice(0, 30)).filter(Boolean).slice(0, 24),
    tags: (Array.isArray(i.tags) ? i.tags : []).map(t => String(t).slice(0, 34)).slice(0, 4),

    operator: !!i.operator,
    delivery: !!i.delivery,
    instant:  !!i.instant,
    open247:  !!i.open247,

    since: (() => {
      const y = Math.round(Number(i.since));
      const now = new Date().getUTCFullYear();
      return y >= 1900 && y <= now ? y : now;
    })(),
    about: String(i.about || '').trim().slice(0, 900),
    phone: String(i.phone || '').trim().slice(0, 40),
    email: String(i.email || '').trim().slice(0, 90),

    /* Coverage is derived from the pin and the radius at read time, not
       stored - see servesOf() in data.js. Kept only as the base city so
       a company always matches a search for the place it sits in. */
    serves: [[city, province].filter(Boolean).join(', ')].filter(Boolean),

    registeredAt: Date.now(),
    bg: REG_BG[cats[0]] || '#EEF2F6'
  };
}

/* Prices are displayed as strings elsewhere ("12,000"), so the registry
   stores that form to avoid a formatted/unformatted split. */
function regPrice(v){
  const n = Math.round(Number(String(v == null ? '' : v).replace(/[^0-9.]/g, '')));
  if (!isFinite(n) || n <= 0) return '0';
  return n.toLocaleString('en-PH');
}

/* Re-reading a stored record. Runs the same defaults as regNormalise so
   a record written by an older build cannot arrive missing a field the
   UI reads, but keeps the stored id and timestamps. */
function regHydrate(raw){
  if (!raw || typeof raw !== 'object' || !raw.id) return null;
  const rec = regNormalise(raw);
  if (rec.error) return null;
  rec.id = String(raw.id);
  rec.registeredAt = Number(raw.registeredAt) || Date.now();
  rec.rating  = Number(raw.rating)  || 0;
  rec.reviews = Number(raw.reviews) || 0;
  return rec;
}
