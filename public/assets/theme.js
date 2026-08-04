/* =====================================================================
   FR SERVICES - company storefront theming
   Shared by admin.html (editing) and company.html (rendering).

   SECURITY NOTE - read before changing anything here.
   Every value in a theme originates from a company admin, i.e. untrusted
   input. Two rules, both enforced below:

     1. Colours are validated against a strict pattern before they ever
        reach the DOM. A string like `red;}body{display:none` must never
        reach a stylesheet. Values are written with
        `style.setProperty()`, never by concatenating CSS text.

     2. Images are read as data URLs and the MIME type is allow-listed to
        raster formats only. SVG is deliberately rejected: an .svg file is
        an XML document that can carry <script>, so accepting one as a
        "logo" is a stored-XSS vector the moment it is rendered inline or
        served from your own origin.

   None of this is a substitute for server-side validation - a client can
   skip this file entirely. See ARCHITECTURE.md §13.
   ===================================================================== */

/* ---------- validation ---------- */
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Returns `v` only if it is a plain hex colour, else the fallback. */
function safeColor(v, fallback){
  return (typeof v === 'string' && HEX_RE.test(v.trim())) ? v.trim().toLowerCase() : fallback;
}

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];  // no SVG, no GIF
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Validate a File before it is read. Returns null when acceptable. */
function imageProblem(file){
  if (!file) return 'No file selected.';
  if (!IMAGE_TYPES.includes(file.type))
    return 'Use a PNG, JPG or WebP. SVG is not accepted, because it can carry scripts.';
  if (file.size > MAX_IMAGE_BYTES)
    return 'That file is ' + (file.size / 1048576).toFixed(1) + ' MB. Maximum is 2 MB.';
  return null;
}

/** Read an already-validated image to a data URL. */
function readImage(file){
  return new Promise((resolve, reject) => {
    const problem = imageProblem(file);
    if (problem) return reject(new Error(problem));
    const fr = new FileReader();
    fr.onload  = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

/* ---------- colour maths ---------- */
function hexToRgb(hex){
  let h = safeColor(hex, '#000000').slice(1);
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
const rgbToHex = (r,g,b) =>
  '#' + [r,g,b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2,'0')).join('');

/** WCAG relative luminance. */
function luminance(hex){
  const [r,g,b] = hexToRgb(hex).map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126*r + 0.7152*g + 0.0722*b;
}

/** WCAG contrast ratio, 1–21. */
function contrast(a, b){
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la,lb) + 0.05) / (Math.min(la,lb) + 0.05);
}

const isDark = hex => luminance(hex) < 0.32;

/** Pick whichever of black/white is legible on `hex`. This is why an
    owner can choose *any* colour without producing unreadable text. */
function bestOn(hex){
  return contrast(hex, '#ffffff') >= contrast(hex, '#12131a') ? '#ffffff' : '#12131a';
}

function mix(a, b, t){
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0]+(B[0]-A[0])*t, A[1]+(B[1]-A[1])*t, A[2]+(B[2]-A[2])*t);
}

/* ---------- colour harmony (the "combinations" helper) ---------- */
function hexToHsl(hex){
  let [r,g,b] = hexToRgb(hex).map(v => v/255);
  const max = Math.max(r,g,b), min = Math.min(r,g,b), d = max-min;
  let h = 0;
  if (d){
    if (max === r)      h = ((g-b)/d) % 6;
    else if (max === g) h = (b-r)/d + 2;
    else                h = (r-g)/d + 4;
  }
  h = (h * 60 + 360) % 360;
  const l = (max+min)/2;
  const s = d ? d / (1 - Math.abs(2*l - 1)) : 0;
  return [h, s, l];
}
function hslToHex(h, s, l){
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2*l - 1)) * s, x = c * (1 - Math.abs((h/60) % 2 - 1)), m = l - c/2;
  const t = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x]
          : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
  return rgbToHex((t[0]+m)*255, (t[1]+m)*255, (t[2]+m)*255);
}

/** Accent suggestions derived from the chosen brand colour. */
function harmonies(brand){
  const [h, s, l] = hexToHsl(brand);
  const sat = Math.max(0.45, Math.min(0.9, s || 0.6));
  const lig = Math.max(0.38, Math.min(0.58, l || 0.45));
  return [
    { name:'Complementary', hex: hslToHex(h + 180, sat, lig) },
    { name:'Analogous',     hex: hslToHex(h + 32,  sat, lig) },
    { name:'Triadic',       hex: hslToHex(h + 120, sat, lig) },
    { name:'Split',         hex: hslToHex(h + 150, sat, lig) },
    { name:'Warm gold',     hex: '#f2b705' },
    { name:'Deep slate',    hex: '#475569' }
  ];
}

/* ---------- storefront layouts ----------
   Ten structural skins a company can pick. These change shape - borders,
   radii, shadows, density, grid, cover proportions - not colour; colour
   stays under the owner's separate control so any layout works with any
   palette. Style directions are drawn from the ui-ux-pro-max style DB.
   `block` is the FR Services house style and the default. */
const LAYOUTS = [
  { id:'block',      name:'FR Block',    note:'Thick outlines, offset shadows. The FR Services house style.', tag:'Default' },
  { id:'swiss',      name:'Swiss',       note:'Hairline rules, no shadows, generous white space.' },
  { id:'soft',       name:'Soft',        note:'Deep rounding and gentle depth. No hard edges.' },
  { id:'glass',      name:'Glass',       note:'Frosted translucent panels layered over your cover.' },
  { id:'industrial', name:'Industrial',  note:'Square, dense, monospaced labels. Suits heavy equipment.' },
  { id:'editorial',  name:'Editorial',   note:'Tall cover, wide measure, magazine spacing.' },
  { id:'bento',      name:'Bento',       note:'Modular tiles at varied sizes, the lead unit twice as wide.' },
  { id:'paper',      name:'Paper',       note:'Matte and flat, ruled like a printed page.' },
  { id:'showcase',   name:'Showcase',    note:'Full-bleed cover, centred identity, large unit tiles.' },
  { id:'console',    name:'Console',     note:'Technical readout. Thin lines and glow, so pair with a dark backdrop.' }
];
const LAYOUT_IDS = LAYOUTS.map(l => l.id);

/* ---------- the theme model ---------- */
const THEME_DEFAULT = {
  brand:   '#057a2f',
  accent:  '#f2b705',
  bg:      '#fbfaf7',      // page backdrop - themes the whole storefront
  cover:   'gradient',     // gradient | solid | stripes | image
  coverImg: null,
  logo:    null,
  layout:  'block',
  unitImages: {}           // { unitId: dataURL } - one photo per listed unit
};

/* A company with a large fleet could otherwise push megabytes of base64
   into one record. Cap the count; the byte cap is per-file in readImage(). */
const MAX_UNIT_IMAGES = 40;

/** Coerce anything (localStorage, a URL, a stale record) into a valid theme. */
function normaliseTheme(raw){
  const t = Object.assign({}, THEME_DEFAULT, raw && typeof raw === 'object' ? raw : {});
  t.brand  = safeColor(t.brand,  THEME_DEFAULT.brand);
  t.accent = safeColor(t.accent, THEME_DEFAULT.accent);
  t.bg     = safeColor(t.bg,     THEME_DEFAULT.bg);
  if (!['gradient','solid','stripes','image'].includes(t.cover)) t.cover = 'gradient';
  if (!LAYOUT_IDS.includes(t.layout))                            t.layout = THEME_DEFAULT.layout;
  // a raster data URL (the local/demo path) or a real https:// URL (a
  // live company's photo, already uploaded to Storage - see saveTheme)
  const okImg = v => typeof v === 'string' &&
    (/^data:image\/(png|jpeg|webp);base64,/.test(v) || /^https:\/\//.test(v));
  if (!okImg(t.logo))     t.logo = null;
  if (!okImg(t.coverImg)) t.coverImg = null;

  /* Per-unit photos get the same treatment: keys are constrained to the
     id charset so nothing exotic reaches a selector or a storage key, and
     values must be an allow-listed raster data URL. */
  const clean = {};
  if (t.unitImages && typeof t.unitImages === 'object'){
    let n = 0;
    for (const k of Object.keys(t.unitImages)){
      if (n >= MAX_UNIT_IMAGES) break;
      if (!/^[a-z0-9_-]{1,64}$/i.test(k)) continue;
      if (!okImg(t.unitImages[k])) continue;
      clean[k] = t.unitImages[k];
      n++;
    }
  }
  t.unitImages = clean;
  return t;
}

/* ---------- persistence ----------
   localStorage stands in for a company_theme row for a local/demo
   company - per-browser, trivially editable by the visitor, fine for a
   prototype. A LIVE company (registered for real - see registry.js's
   `.live` flag) has a real public.company_themes row instead; RLS
   already scopes writes to a signed-in member of that company
   (themes_write). Either way, the *local* copy below is still what
   every synchronous reader (loadTheme, and every page's own top-level
   code) actually reads - see live-registry.js's header comment on why
   that has to stay synchronous. A live save writes Supabase first, then
   mirrors the result into the same local cache, so the two can never
   show different values inside one browser. */
const THEME_KEY = id => 'fr.theme.' + String(id).replace(/[^a-z0-9-]/gi, '');

function loadTheme(id){
  try { return normaliseTheme(JSON.parse(localStorage.getItem(THEME_KEY(id)))); }
  catch { return normaliseTheme(null); }
}

/** Local-cache write only, no Supabase - used by saveTheme's own local
 *  path and, for a live company, by live-registry.js to seed the cache
 *  from a fresh fetch without that seed itself round-tripping back to
 *  Supabase as if it were an edit. */
function seedThemeLocal(id, theme){
  try { localStorage.setItem(THEME_KEY(id), JSON.stringify(normaliseTheme(theme))); return true; }
  catch { return false; }                     // quota / private mode
}

/* ---------- live <-> local field mapping (theme + fleet) --------------
   The DB uses snake_case columns and a Storage *path* for images; the
   local shape everything else in this app already reads (admin.js,
   company.js, booking.js) uses camelCase and a resolved, displayable
   URL. Defined once, here, since theme.js is the first script to load
   that needs it (see the reordering note in live-registry.js) - both
   the write path below and live-registry.js's seed-from-Supabase path
   call these same functions, so the translation can't drift between
   the two directions.
   ------------------------------------------------------------------- */
function brandingUrl(sb, path){
  return path ? sb.storage.from('company-branding').getPublicUrl(path).data.publicUrl : null;
}
function themeFromDb(row, sb){
  if (!row) return normaliseTheme(null);
  return normaliseTheme({
    brand: row.brand, accent: row.accent, bg: row.bg,
    cover: row.cover, layout: row.layout,
    logo: brandingUrl(sb, row.logo_path), coverImg: brandingUrl(sb, row.cover_path),
    _logoPath: row.logo_path || null, _coverPath: row.cover_path || null
  });
}
function themeToDb(t){
  return {
    brand: t.brand, accent: t.accent, bg: t.bg, cover: t.cover, layout: t.layout,
    logo_path: t._logoPath || null, cover_path: t._coverPath || null
  };
}

/**
 * Saves a theme. For a local/demo company this only ever touched
 * localStorage and still does. For a live company it upserts
 * `company_themes` under RLS via window.supabaseBrowser, then mirrors
 * the saved row back into the local cache so every synchronous reader
 * sees the same thing immediately, without a reload.
 *
 * `theme._logoPath`/`_coverPath` (see themeFromDb/bindUpload) carry the
 * Storage path for whatever the visible `logo`/`coverImg` URL currently
 * is - this function never uploads anything itself, only persists
 * whichever path the upload step already produced.
 */
async function saveTheme(id, theme){
  const clean = normaliseTheme(theme);
  const co = typeof byId === 'function' ? byId(id) : null;
  if (!(co && co.live)) return seedThemeLocal(id, clean);

  const sb = window.supabaseBrowser;
  if (!sb) return false;              // can't reach the database right now
  const { data, error } = await sb.from('company_themes')
    .upsert(Object.assign({ company_id: id }, themeToDb(clean)), { onConflict: 'company_id' })
    .select().single();
  if (error){ console.error('saveTheme:', error.message); return false; }
  seedThemeLocal(id, themeFromDb(data, sb));
  return true;
}

/* =====================================================================
   FLEET STORE
   The units a company lists, with everything a rental actually needs to
   quote a job. Separate from the theme: appearance and inventory are
   different concerns with different validation.

   Same trust posture as the theme - every field is owner-supplied and is
   coerced into range here before it can reach the DOM or a price
   calculation. A negative rate or a 900% discount must never be storable.
   ===================================================================== */
const OPERATOR_MODES = ['none', 'optional', 'included'];
const FUEL_MODES     = ['client', 'included'];
const RATE_UNITS     = ['day', 'hour', 'call-out'];

/* Which service line a listing belongs to. A company running more than
   one needs this per unit, so its storefront can group them. */
const UNIT_CATS = ['vehicles', 'equipment', 'towing'];

/* How delivery / mobilisation is charged. A flat fee only fits short
   hauls - equipment mobilisation and out-of-town vehicle drops are
   almost always distance-based, and some sites can only be quoted after
   someone has looked at the access. */
const DELIVERY_MODES = ['flat', 'perkm', 'quoted'];

const UNIT_DEFAULT = {
  id:'', cat:'vehicles', name:'', type:'', model:'', year:'', capacity:'',
  price:0, unit:'day', qty:1,
  operator:'none', fuel:'client', minDays:1,
  deliveryMode:'flat',             // flat | perkm | quoted
  delivery:0,                      // flat fee, or the base fee under perkm
  deliveryKm:0,                    // ₱ per km beyond the free radius
  deliveryFree:0,                  // km included before per-km billing starts
  d3:0, d7:0, d30:0,               // % off at 3+, 7+ and 30+ days
  photo:null, notes:''
};

const money = n => '₱' + Number(n || 0).toLocaleString('en-PH');

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : dflt;
};
const clampText = (v, max) =>
  (typeof v === 'string' ? v : '').replace(/\s+/g, ' ').trim().slice(0, max);

function slugify(s){
  return clampText(s, 60).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unit';
}

function normaliseUnit(raw){
  const u = Object.assign({}, UNIT_DEFAULT, raw && typeof raw === 'object' ? raw : {});
  u.id       = /^[a-z0-9-]{1,64}$/.test(u.id) ? u.id : slugify(u.name) + '-' + Math.random().toString(36).slice(2, 6);
  u.name     = clampText(u.name, 80);
  u.type     = clampText(u.type, 40);
  u.model    = clampText(u.model, 60);
  u.capacity = clampText(u.capacity, 40);
  u.notes    = clampText(u.notes, 400);
  u.year     = u.year === '' ? '' : String(clampInt(u.year, 1950, 2035, ''));
  u.price    = clampInt(u.price, 0, 10000000, 0);
  u.delivery = clampInt(u.delivery, 0, 1000000, 0);
  u.deliveryKm   = clampInt(u.deliveryKm, 0, 100000, 0);
  u.deliveryFree = clampInt(u.deliveryFree, 0, 500, 0);
  u.qty      = clampInt(u.qty, 0, 999, 1);
  u.minDays  = clampInt(u.minDays, 1, 60, 1);
  /* a discount over 90% is almost certainly a typo, and a negative one
     would silently invert the price */
  u.d3  = clampInt(u.d3,  0, 90, 0);
  u.d7  = clampInt(u.d7,  0, 90, 0);
  u.d30 = clampInt(u.d30, 0, 90, 0);
  if (!UNIT_CATS.includes(u.cat))           u.cat = 'vehicles';
  if (!OPERATOR_MODES.includes(u.operator)) u.operator = 'none';
  if (!FUEL_MODES.includes(u.fuel))         u.fuel = 'client';
  if (!RATE_UNITS.includes(u.unit))         u.unit = 'day';
  if (!DELIVERY_MODES.includes(u.deliveryMode)) u.deliveryMode = 'flat';
  /* per-km with no rate set would silently behave as free - fall back */
  if (u.deliveryMode === 'perkm' && !u.deliveryKm) u.deliveryMode = 'flat';
  // a raster data URL (the local/demo path) or a real https:// URL (a
  // live company's photo, already uploaded to Storage - see saveFleet)
  if (!(typeof u.photo === 'string' &&
        (/^data:image\/(png|jpeg|webp);base64,/.test(u.photo) || /^https:\/\//.test(u.photo))))
    u.photo = null;
  return u.name ? u : null;          // a listing with no name is not a listing
}

const MAX_UNITS = 60;
const fleetKey = id => 'fr.fleet.' + String(id).replace(/[^a-z0-9-]/gi, '');

/** Returns the owner's stored fleet, or null if they've never edited it.
 *  Always synchronous, always localStorage - see saveTheme's comment
 *  above on why a live company's real fleet reaches this same cache via
 *  live-registry.js's seeding instead of this function talking to
 *  Supabase directly. */
function loadFleet(companyId){
  try {
    const raw = JSON.parse(localStorage.getItem(fleetKey(companyId)));
    if (!Array.isArray(raw)) return null;
    return raw.slice(0, MAX_UNITS).map(normaliseUnit).filter(Boolean);
  } catch { return null; }
}

/** Local-cache write only, no Supabase - same role as seedThemeLocal. */
function seedFleetLocal(companyId, units){
  try {
    const clean = (Array.isArray(units) ? units : []).slice(0, MAX_UNITS)
      .map(normaliseUnit).filter(Boolean);
    localStorage.setItem(fleetKey(companyId), JSON.stringify(clean));
    return clean;
  } catch { return null; }
}

function unitFromDb(row, sb){
  return normaliseUnit({
    id: row.id, cat: row.line, name: row.name, type: row.unit_type, model: row.model,
    year: row.year == null ? '' : row.year, capacity: row.capacity,
    price: row.price, unit: row.rate_unit, qty: row.quantity,
    operator: row.operator, fuel: row.fuel, minDays: row.min_days,
    deliveryMode: row.delivery_mode, delivery: row.delivery_fee,
    deliveryKm: row.delivery_per_km, deliveryFree: row.delivery_free_km,
    d3: row.discount_3d, d7: row.discount_7d, d30: row.discount_30d,
    photo: brandingUrl(sb, row.photo_path), notes: row.notes,
    _photoPath: row.photo_path || null
  });
}
function unitToDb(u, companyId){
  return {
    company_id: companyId, line: u.cat, name: u.name, unit_type: u.type, model: u.model,
    year: u.year === '' ? null : Number(u.year), capacity: u.capacity,
    price: u.price, rate_unit: u.unit, quantity: u.qty,
    discount_3d: u.d3, discount_7d: u.d7, discount_30d: u.d30,
    operator: u.operator, fuel: u.fuel, min_days: u.minDays,
    delivery_mode: u.deliveryMode, delivery_fee: u.delivery,
    delivery_per_km: u.deliveryKm, delivery_free_km: u.deliveryFree,
    photo_path: u._photoPath || null, notes: u.notes
  };
}

/**
 * Saves a fleet. Local/demo path unchanged (whole array overwrites the
 * local cache, same as always). Live path cannot do that: `units.id` is
 * a server-generated uuid, not the client-assignable string id the
 * local path uses, so a unit already in the DB (its id matches an
 * existing row) is updated, one with no matching row is inserted (and
 * gets a real id back), and any DB row not present in `units` anymore
 * is deleted - the closest real-write equivalent of "the local array is
 * now the whole truth" without actually being able to delete-and-
 * reinsert everything under a stable id. Returns the synced array (with
 * real ids for anything newly created) so the caller can carry on
 * editing/deleting against ids that actually exist.
 */
async function saveFleet(companyId, units){
  const clean = (Array.isArray(units) ? units : []).slice(0, MAX_UNITS).map(normaliseUnit).filter(Boolean);
  const co = typeof byId === 'function' ? byId(companyId) : null;
  if (!(co && co.live)) return seedFleetLocal(companyId, clean);

  const sb = window.supabaseBrowser;
  if (!sb) return clean;              // can't reach the database right now

  const { data: existing, error: readErr } = await sb.from('units').select('id').eq('company_id', companyId);
  if (readErr){ console.error('saveFleet:', readErr.message); return clean; }
  const existingIds = new Set((existing || []).map(r => r.id));
  const keepIds = new Set(clean.filter(u => existingIds.has(u.id)).map(u => u.id));
  const toDelete = [...existingIds].filter(id => !keepIds.has(id));
  if (toDelete.length) await sb.from('units').delete().in('id', toDelete);

  const synced = [];
  for (const u of clean){
    const row = unitToDb(u, companyId);
    const isExisting = existingIds.has(u.id);
    const { data, error } = isExisting
      ? await sb.from('units').update(row).eq('id', u.id).select().single()
      : await sb.from('units').insert(row).select().single();
    if (error){ console.error('saveFleet:', error.message); synced.push(u); continue; }
    synced.push(unitFromDb(data, sb));
  }

  seedFleetLocal(companyId, synced);
  return synced;
}

/** Best rate for a given number of days, applying the owner's tiers. */
function unitRate(u, days){
  const n = Math.max(1, Math.round(Number(days) || 1));
  const pct = n >= 30 ? u.d30 : n >= 7 ? u.d7 : n >= 3 ? u.d3 : 0;
  const perDay = Math.round(u.price * (1 - pct / 100));
  return { perDay, pct, total: perDay * n };
}

/** The highest discount an owner has configured, for a "save up to" badge. */
const bestDiscount = u => Math.max(u.d3 || 0, u.d7 || 0, u.d30 || 0);

/**
 * What delivery costs for a job `km` away.
 * Returns null when the owner has said it must be quoted, so callers can
 * show "quoted" rather than a misleading ₱0.
 */
function deliveryCost(u, km){
  if (u.deliveryMode === 'quoted') return null;
  if (u.deliveryMode === 'perkm'){
    const billable = Math.max(0, (Number(km) || 0) - (u.deliveryFree || 0));
    return (u.delivery || 0) + Math.round(billable * (u.deliveryKm || 0));
  }
  return u.delivery || 0;
}

/** Human-readable delivery terms for a listing. */
function deliveryText(u){
  if (u.deliveryMode === 'quoted') return 'Quoted per site';
  if (u.deliveryMode === 'perkm'){
    const rate = money(u.deliveryKm) + ' / km';
    if (u.deliveryFree && u.delivery)
      return `${money(u.delivery)} + ${rate} beyond ${u.deliveryFree} km`;
    if (u.deliveryFree) return `Free within ${u.deliveryFree} km, then ${rate}`;
    if (u.delivery)     return `${money(u.delivery)} + ${rate}`;
    return rate;
  }
  return u.delivery ? money(u.delivery) : 'Free';
}

/* ---------- applying ----------
   Writes CSS custom properties only. Nothing here builds a CSS string, so
   a hostile colour value has nothing to break out of. */
function applyTheme(theme, root){
  const t = normaliseTheme(theme);
  const el = root || document.documentElement;
  const dark = isDark(t.bg);

  const surface = dark ? mix(t.bg, '#ffffff', 0.08) : '#ffffff';
  const ink     = bestOn(t.bg);
  const line    = dark ? mix(t.bg, '#ffffff', 0.22) : mix(t.bg, '#000000', 0.14);

  /* A soft wash of the brand, mixed toward whatever the backdrop is, so it
     reads as a light tint on pale themes and a deep one on dark themes.
     Solid brand behind every unit card was far too heavy. */
  const tint   = mix(t.brand, t.bg, 0.86);
  const onTint = contrast(t.brand, tint) >= 3 ? t.brand : bestOn(tint);

  const set = (k, v) => el.style.setProperty(k, v);
  set('--co-primary',      t.brand);
  set('--co-on-primary',   bestOn(t.brand));
  set('--co-primary-tint', tint);
  set('--co-on-tint',      onTint);
  set('--co-accent',     t.accent);
  set('--co-on-accent',  bestOn(t.accent));
  set('--co-bg',         t.bg);
  set('--co-surface',    surface);
  set('--co-ink',        ink);
  set('--co-ink-2',      mix(ink, t.bg, 0.38));
  set('--co-line',       line);
  set('--co-hero',       coverCss(t));
  el.setAttribute('data-co-mode', dark ? 'dark' : 'light');
  el.setAttribute('data-co-layout', t.layout);
  return t;
}

function coverCss(t){
  const b = t.brand, a = t.accent;
  if (t.cover === 'image' && t.coverImg)
    return `center / cover no-repeat url("${t.coverImg}")`;
  if (t.cover === 'solid')   return b;
  if (t.cover === 'stripes') return `repeating-linear-gradient(45deg, ${b} 0 22px, ${mix(b,'#000000',0.45)} 22px 44px)`;
  return `linear-gradient(115deg, ${b} 0%, ${mix(b,a,0.45)} 55%, ${a} 100%)`;
}

/* ---------- contrast auditing ----------
   An owner may pick any colour. What they may not do is ship a page their
   customers cannot read - so instead of restricting the palette, every
   pairing is measured and reported back to them. */
function themeWarnings(theme){
  const t = normaliseTheme(theme);
  const out = [];
  const push = (label, ratio, need) => {
    if (ratio < need) out.push({
      label,
      ratio: ratio.toFixed(2),
      need: need.toFixed(1),
      level: ratio < need - 1 ? 'bad' : 'warn'
    });
  };
  /* Brand is used for more than fills - the active tab underline and other
     bare 3–4px elements sit directly on the backdrop with no border of
     their own, so WCAG 1.4.11's 3:1 applies to it. */
  push('Brand colour against the page backdrop', contrast(t.brand, t.bg), 3.0);

  /* Accent only ever appears as a *filled* control, and every control in
     this system carries a 2.5px near-black border. 1.4.11 is satisfied by
     that boundary regardless of the fill, so demanding 3:1 here would flag
     perfectly legible combinations (gold on cream measures 1.78:1 and is
     entirely readable). What's worth warning about is an accent so close
     to the backdrop that the button reads as an empty outline. */
  push('Accent is nearly invisible against the backdrop', contrast(t.accent, t.bg), 1.5);

  /* Text is derived by bestOn(), so this should never fire - it is a
     regression guard on that derivation, not a user-facing risk. */
  push('Body text against the page backdrop', contrast(bestOn(t.bg), t.bg), 4.5);
  if (contrast(t.brand, t.accent) < 1.4)
    out.push({ label:'Brand and accent are nearly the same colour',
               ratio: contrast(t.brand, t.accent).toFixed(2), need:'1.4', level:'warn' });
  return out;
}
