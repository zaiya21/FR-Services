/* =====================================================================
   FR SERVICES - shared data + helpers.

   Companies come from the registry (registry.js), which holds what people
   actually registered. Nothing here is seeded. Requires geo.js loaded
   first: distances are computed, not stored.
   ===================================================================== */

/* ---------- Where the renter is --------------------------------------
   The starting point, not the answer. A stored fix from geo.js overrides
   it on load, and an explicit city choice overrides both - detection is a
   convenience, never a cage (ARCHITECTURE.md §2).

   `source` says which of those we are showing, and the UI is expected to
   say so out loud: 'geolocation' is the device's own fix and can be
   trusted to the metre, 'default' is this fallback and is a guess.
   --------------------------------------------------------------------- */
const FR_GEO = {
  city: "Davao City",
  province: "Davao del Sur",
  region: "Region XI",
  lat: 7.0731, lon: 125.6128,
  radiusKm: 50,
  accuracy: null,
  source: "default"      // explicit | geolocation | default
};

/* Adopt a stored device fix, if geo.js kept one from a previous visit.
   Runs before anything reads FR_GEO so the first render is already right,
   rather than showing the fallback city and then jumping. */
(() => {
  if (typeof geoLoad !== 'function') return;
  const fix = geoLoad();
  if (!fix) return;
  FR_GEO.lat = fix.lat; FR_GEO.lon = fix.lon;
  FR_GEO.accuracy = fix.accuracy;
  FR_GEO.source = 'geolocation';
  /* The city label is filled in by frNameGeo() once CITY_XY exists -
     it is declared further down this file. */
})();

/* ---------- Category metadata ----------------------------------------
   Counts are derived, never typed. A headline claiming 631 vehicles over
   an empty marketplace is the most obvious kind of lie a listing site can
   tell, and it was exactly what the seeded numbers did once the demo
   companies went away. frRecount() fills these in.
   --------------------------------------------------------------------- */
const FR_CATS = {
  vehicles:  { label:"Vehicles",        units:0, cos:0, color:"var(--c-vehicle)", tint:"var(--c-vehicle-tint)", unit:"/ day" },
  equipment: { label:"Heavy Equipment", units:0, cos:0, color:"var(--c-equip)",   tint:"var(--c-equip-tint)",   unit:"/ day" },
  towing:    { label:"Towing",          units:0, cos:0, color:"var(--c-tow)",     tint:"var(--c-tow-tint)",     unit:"/ call-out" }
};

/* Companies per line, and units across their fleets. Units are counted
   from each company's own fleet store, so the figure tracks what owners
   have actually listed rather than what they claimed at signup. */
function frRecount(){
  for (const k in FR_CATS){ FR_CATS[k].units = 0; FR_CATS[k].cos = 0; }
  for (const c of FR_COMPANIES){
    for (const k of catsOf(c)) if (FR_CATS[k]) FR_CATS[k].cos++;
    const fleet = (typeof loadFleet === 'function' && loadFleet(c.id)) || [];
    for (const u of fleet){
      const k = u && u.cat;
      if (FR_CATS[k]) FR_CATS[k].units += Math.max(1, Number(u.avail) || 1);
    }
  }
  return FR_CATS;
}

/* ---------- Companies ----------------------------------------------
   Every company here is one that somebody registered. The list comes
   from the registry (registry.js) and is EMPTY until the first
   registration completes - there is no demo set behind it any more.

   Mutated in place, never reassigned: this is a `const` that the
   marketplace, the storefront, the platform console and the map all
   close over, so a reassignment would leave half the app holding the
   old array. See frReloadCompanies().
   ------------------------------------------------------------------- */
const FR_COMPANIES = (typeof regLoad === 'function') ? regLoad() : [];

function frReloadCompanies(){
  const next = (typeof regLoad === 'function') ? regLoad() : [];
  FR_COMPANIES.length = 0;
  for (const c of next) FR_COMPANIES.push(c);
  frRecount();
  return FR_COMPANIES;
}

/* Unit types offered per category - drives the "Unit type" dropdown. */
const FR_TYPES = {
  /* Motorcycle is a thing you rent, so it lives here - not under towing,
     where it only ever described what was being recovered. */
  vehicles:  ["Sedan","SUV","Van","Pickup","Truck","Motorcycle"],
  equipment: ["Excavator","Backhoe","Crane","Bulldozer","Dump Truck","Boom Lift","Compactor","Loader"],
  towing:    ["Flatbed","Wheel-Lift","Heavy Duty","Long-haul","Winch-out"]
};


/* Destinations worth surfacing before anyone types - the searches that
   actually happen. `as` is the name people use when it differs from the
   LGU: nobody searches "Malay, Aklan", they search "Boracay". */
const FR_POPULAR = [
  { name:'Malay',                province:'Aklan',              as:'Boracay' },
  { name:'General Luna',         province:'Surigao del Norte',  as:'Siargao' },
  { name:'El Nido',              province:'Palawan',            as:'' },
  { name:'Coron',                province:'Palawan',            as:'' },
  { name:'Panglao',              province:'Bohol',              as:'' },
  { name:'Baguio City',          province:'Benguet',            as:'' },
  { name:'Tagaytay City',        province:'Cavite',             as:'' },
  { name:'San Juan',             province:'La Union',           as:'Elyu' },
  { name:'Cebu City',            province:'Cebu',               as:'' },
  { name:'Puerto Princesa City', province:'Palawan',            as:'' },
  { name:'Vigan City',           province:'Ilocos Sur',         as:'' },
  { name:'Dumaguete City',       province:'Negros Oriental',    as:'' }
];

/* "City, Province" → { name, province } */
function splitPlace(s){
  const i = (s || '').indexOf(',');
  return i < 0 ? { name:(s || '').trim(), province:'' }
               : { name:s.slice(0, i).trim(), province:s.slice(i + 1).trim() };
}

/* Every place a company serves, deduped - the "we actually cover this"
   list, used to surface useful options in the location picker ahead of
   the other 1,600 places we have no providers in yet. Deduped on the
   normalised name+province so "Digos" and "Digos City" collapse to one. */
const FR_COVERED = (() => {
  const seen = new Map();
  for (const s of FR_COMPANIES.flatMap(c => c.serves || [])){
    const p = splitPlace(s);
    const key = normCity(p.name) + '|' + normCity(p.province);
    if (!seen.has(key)) seen.set(key, p);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

/* ---------- Filtering + sorting (single source of truth) --------------- */

/* A company may run more than one service line - plenty of Philippine
   operators rent vehicles, hire out equipment AND run a tow truck. `cat`
   stays as the primary line (it drives the card photo and the default
   icon); `cats` is the full set. Anything without `cats` is single-line. */
function catsOf(c){
  return (c && Array.isArray(c.cats) && c.cats.length) ? c.cats : [c.cat];
}
const isMultiService = c => catsOf(c).length > 1;

/* PSGC registers cities as "City of Davao"; the picker shows "Davao City";
   our company records say "Davao". Fold all three to one comparable form,
   and expand the Sto./Sta. abbreviations Filipinos actually type. */
function normCity(s){
  return (s || '').toLowerCase()
    .replace(/^city of\s+/, '')
    .replace(/\s+city$/, '')
    .replace(/\bsto\.?\b/g, 'santo')
    .replace(/\bsta\.?\b/g, 'santa')
    .replace(/[^a-z0-9ñ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ---------------------------------------------------------------------
   Coverage: does this company serve that place?

   Now a geometric question, because a registered company has a real pin
   and a real radius. The old model was a hand-written list of city names
   per company, which cannot be right for user-registered data - nobody
   is going to type out the forty municipalities inside an 80 km circle,
   and a radius slider that does not actually decide anything is a
   decoration.

   The name list survives as the fallback for the case geometry cannot
   answer: CITY_XY covers the places we have coordinates for, and the
   PSGC list is 1,634 places deep. Asked about a place we cannot locate,
   fall back to matching the company's own base against the query rather
   than claiming coverage we cannot compute.
   --------------------------------------------------------------------- */
function citySearchable(c, city, province){
  const q = normCity(city);
  if (!q) return true;

  /* The company's own base always matches a search for it. */
  if (normCity(c.loc).includes(q) || normCity(c.city || '').includes(q)){
    if (!province) return true;
    if (normCity(c.province || '') === normCity(province)) return true;
  }

  const target = (typeof cityLatLon === 'function') ? cityLatLon(city) : null;
  if (target && typeof c.lat === 'number' && typeof haversineKm === 'function'){
    const km = haversineKm(c.lat, c.lon, target[0], target[1]);
    /* The radius is the promise the owner made about where they will go.
       Honouring it exactly is what makes the slider mean something. */
    return km != null && km <= (Number(c.radius) || 0);
  }

  /* No coordinates for that place - fall back to the stored name list. */
  return (c.serves || []).some(s => {
    const p = splitPlace(s);
    if (!normCity(p.name).includes(q)) return false;
    if (!province || !p.province) return true;
    return normCity(p.province) === normCity(province);
  });
}

/* How many companies actually serve a given place. Drives the coverage
   badge in the location picker. */
function providersIn(city, province){
  return FR_COMPANIES.filter(c => citySearchable(c, city, province)).length;
}

/* ---------------------------------------------------------------------
   Live distance.

   `c.km` used to be a stored number. It cannot be: the distance from a
   renter to a yard depends on where the renter is standing, and that now
   changes the moment they grant location permission. Computed on demand
   from FR_GEO, cached onto the record only so a sort comparator does not
   recompute a haversine per comparison.
   --------------------------------------------------------------------- */
function distanceKm(c){
  if (!c || typeof c.lat !== 'number' || typeof haversineKm !== 'function') return null;
  return haversineKm(FR_GEO.lat, FR_GEO.lon, c.lat, c.lon);
}

/* Refresh the cached distance on every company. Called whenever FR_GEO
   moves - a new fix, or a city chosen by hand. */
function frRedistance(){
  for (const c of FR_COMPANIES){
    const km = distanceKm(c);
    /* Infinity, not 0, when unknown: a company we cannot place must sort
       last under "nearest", not first. */
    c.km = km == null ? Infinity : Math.round(km * 10) / 10;
  }
  return FR_COMPANIES;
}

function filterCompanies(f){
  return FR_COMPANIES.filter(c => {
    if (f.cat      && !catsOf(c).includes(f.cat))         return false;
    /* A multi-service company offers both towing and excavators, but not
       an excavator *as* a towing service - so when a category and a type
       are both set, the type has to belong to that category. */
    if (f.cat && f.type && !(FR_TYPES[f.cat] || []).includes(f.type)) return false;
    if (!citySearchable(c, f.city, f.province))           return false;
    if (f.type     && !(c.types || []).includes(f.type))  return false;
    if (f.company  && !c.name.toLowerCase().includes(f.company.toLowerCase())) return false;
    /* Distance is live now, so read it live: c.km is a cache that is only
       correct after frRedistance(), and a filter that silently used a
       stale value would drop companies the renter is standing next to. */
    if (f.maxKm){
      const km = distanceKm(c);
      if (km != null && km > f.maxKm) return false;
    }
    if (f.availNow && frStatus(c).type !== 'now')         return false;
    if (f.operator && !c.operator)                        return false;
    if (f.delivery && !c.delivery)                        return false;
    if (f.instant  && !c.instant)                         return false;
    return true;
  });
}

function sortCompanies(list, sort){
  const out = list.slice();
  const km = c => { const v = distanceKm(c); return v == null ? Infinity : v; };
  if (sort === 'near')   out.sort((a,b) => km(a) - km(b));
  /* Unrated companies sort last under "rating" rather than first. A new
     listing has rating 0, and 0 beats 4.9 on an ascending comparator -
     which would have put every brand-new company at the top of a
     best-rated list. */
  if (sort === 'rating') out.sort((a,b) =>
    (b.reviews ? b.rating : -1) - (a.reviews ? a.rating : -1));
  if (sort === 'price')  out.sort((a,b) => +String(a.price).replace(/,/g,'') - +String(b.price).replace(/,/g,''));
  if (sort === 'avail')  out.sort((a,b) =>
    (frStatus(a).type === 'now' ? 0 : 1) - (frStatus(b).type === 'now' ? 0 : 1));
  return out;
}

/* ---------- Units --------------------------------------------------
   A company's fleet lives in its own store (`fr.fleet.<id>`, written by
   the admin console) and is read with loadFleet(). This table is the
   fallback for a company that has no store yet, which for a freshly
   registered company is the normal case: an empty yard, until they add
   a unit. It is empty rather than seeded so nobody inherits a fleet
   they never listed.
   ------------------------------------------------------------------- */
const FR_UNITS = {};

/* Add-ons a company sells alongside the unit - pickup, drop-off, an
   operator. Owner-defined, so this starts empty. */
const FR_SERVICES = {};

/* Reviews arrive from completed bookings. Empty until there are any -
   a storefront showing borrowed praise is a lie with a star rating. */
const FR_REVIEWS = [];

/* ---------- Coordinates ------------------------------------------------
   PSGC carries no lat/lon, so these are hand-set per place. They are no
   longer used to place companies - a registered company supplies its own
   pin. They are still what lets the marketplace answer "which companies
   reach Cebu City", and what names a GPS fix (nearestCity in geo.js).

   The gap worth knowing: 40 places here against 1,634 in PSGC. Search by
   a city in this table is answered geometrically and is exact; search by
   any other place falls back to name matching. Production geocodes the
   place list once and this table disappears (ARCHITECTURE.md §2).
   ----------------------------------------------------------------------- */
const CITY_XY = {               // keyed by normCity(), so "Cebu City" -> cebu
  'davao':[7.0731,125.6128],   'panabo':[7.3081,125.6839],  'tagum':[7.4478,125.8078],
  'digos':[6.7497,125.3572],   'manila':[14.5995,120.9842], 'makati':[14.5547,121.0244],
  'pasay':[14.5378,121.0014],  'quezon':[14.6760,121.0437], 'angeles':[15.1450,120.5887],
  'olongapo':[14.8386,120.2842],'baguio':[16.4023,120.5960],'san juan':[16.6759,120.3200],
  'vigan':[17.5747,120.3869],  'tagaytay':[14.1153,120.9621],'batangas':[13.7565,121.0583],
  'legazpi':[13.1391,123.7438],'puerto princesa':[9.7392,118.7353],'el nido':[11.1949,119.4160],
  'coron':[12.0059,120.2041],  'cebu':[10.3157,123.8854],   'mandaue':[10.3236,123.9223],
  'malay':[11.9674,121.9248],  'tagbilaran':[9.6496,123.8547],'panglao':[9.5786,123.7482],
  'iloilo':[10.7202,122.5621], 'bacolod':[10.6407,122.9689],'dumaguete':[9.3068,123.3054],
  'general luna':[9.7909,126.1580],'cagayan de oro':[8.4542,124.6319],
  'general santos':[6.1164,125.1716],'zamboanga':[6.9214,122.0790],'butuan':[8.9475,125.5406],
  'santa cruz':[6.8347,125.4114],'carmen':[7.3453,125.7061],'santo tomas':[7.5286,125.6100],
  'bansalan':[6.7869,125.2136], 'mati':[6.9550,126.2172],   'kidapawan':[7.0083,125.0894],
  'malaybalay':[8.1575,125.1278],'valencia':[7.9064,125.0947]
};

/* Where a named place sits, for centring the map on a chosen city. */
function cityLatLon(city){
  return CITY_XY[normCity(city)] || null;
}

/* Name a coordinate pair, for the geo bar. Only speaks when the nearest
   place we can name is close enough for the claim to be true; otherwise
   the caller says "your location" rather than naming somewhere else. */
function frNameGeo(){
  if (FR_GEO.source !== 'geolocation' || typeof nearestCity !== 'function') return;
  const hit = nearestCity(FR_GEO.lat, FR_GEO.lon, 45);
  if (!hit) { FR_GEO.city = ''; FR_GEO.province = ''; return; }
  /* CITY_XY is keyed by normCity(), which has already dropped the "City"
     suffix, so resolve back to the PSGC spelling for display. */
  const i = (typeof PH_PLACES !== 'undefined')
    ? PH_PLACES.findIndex(p => normCity(p[0]) === hit.key) : -1;
  if (i >= 0 && typeof phPlace === 'function'){
    const p = phPlace(i);
    FR_GEO.city = p.name; FR_GEO.province = p.province;
  } else {
    FR_GEO.city = hit.key.replace(/\b\w/g, ch => ch.toUpperCase());
    FR_GEO.province = '';
  }
  FR_GEO.nearestKm = hit.km;
}

/* ---------------------------------------------------------------------
   Availability, derived.

   A registered company has no `status` field and must not: "Available
   now" is a claim about this minute, and the only honest source for it is
   what is actually in the yard. A brand-new company with an empty fleet
   is "Setting up" - not "Available now", which would send a renter to a
   storefront with nothing on it.
   --------------------------------------------------------------------- */
function frStatus(c){
  const fleet = (typeof loadFleet === 'function' && loadFleet(c.id)) || [];
  if (!fleet.length)  return { label:'Setting up',   type:'new' };
  const avail = fleet.reduce((n, u) => n + (Number(u.avail) || 0), 0);
  if (!avail)         return { label:'Fully booked', type:'busy' };
  if (c.open247)      return { label:'On standby',   type:'now' };
  return { label: avail + (avail === 1 ? ' unit available' : ' units available'),
           type:'now' };
}

/* ---------- Icons -----------------------------------------------------
   SVG, not emoji. ui-ux-pro-max flags "emoji as icons" as a priority-4
   anti-pattern: they render differently per OS, can't inherit colour, and
   read as decoration rather than as interface. All 24x24, stroke-based,
   so they take currentColor and line up with the nav icons.
   ----------------------------------------------------------------------- */
const SVG_ = (d, extra) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ` +
  `stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

const ICONS = {
  car:      SVG_('<path d="M3 17v-4l2.6-4h12.8L21 13v4"/><path d="M3 17h18"/><circle cx="7.5" cy="17" r="1.9"/><circle cx="16.5" cy="17" r="1.9"/><path d="M6 13h12"/>'),
  van:      SVG_('<path d="M2 16V8.5A1.5 1.5 0 0 1 3.5 7h10l4.5 4.5V16"/><path d="M2 16h20"/><circle cx="7" cy="16" r="1.9"/><circle cx="17" cy="16" r="1.9"/><path d="M13.5 7v4.5H18"/>'),
  pickup:   SVG_('<path d="M2 16v-5h9V7h4l3.5 4H22v5"/><path d="M2 16h20"/><circle cx="7" cy="16" r="1.9"/><circle cx="17.5" cy="16" r="1.9"/>'),
  truck:    SVG_('<rect x="2" y="7" width="12" height="9" rx="1.5"/><path d="M14 10h4l3 3.5V16h-7z"/><path d="M2 16h19"/><circle cx="7" cy="16.5" r="1.8"/><circle cx="17.5" cy="16.5" r="1.8"/>'),
  excavator:SVG_('<path d="M3 19h11v-4H3z"/><path d="M6 15V9h5l3 6"/><path d="M14 11l4-5 3 2-3 5"/><circle cx="6.5" cy="19" r="1.5"/><circle cx="11" cy="19" r="1.5"/>'),
  crane:    SVG_('<path d="M4 21h16"/><path d="M7 21V5h10"/><path d="M7 5 3 9h4"/><path d="M17 5v5"/><path d="M15 10h4l-2 3z"/><path d="M7 8h10"/>'),
  backhoe:  SVG_('<path d="M2 19h12v-4H2z"/><path d="M5 15v-5h4l3 5"/><path d="M12 12l5-4 4 3-4 4"/><circle cx="5.5" cy="19" r="1.5"/><circle cx="10.5" cy="19" r="1.5"/>'),
  dump:     SVG_('<path d="M2 17h9V9H2z"/><path d="M11 12h4l3 3v2h-7z"/><path d="M2 17h16"/><path d="M4 9 6 5h6l1 4"/><circle cx="6" cy="17.5" r="1.6"/><circle cx="15" cy="17.5" r="1.6"/>'),
  lift:     SVG_('<path d="M3 20h8v-3H3z"/><path d="M5 17V6l6-2v5"/><path d="M11 9h8v4h-8z"/><path d="M7 6h4"/>'),
  roller:   SVG_('<path d="M3 18h18"/><circle cx="7" cy="14" r="4"/><circle cx="17.5" cy="15" r="2.8"/><path d="M7 10V7h8v5"/>'),
  tow:      SVG_('<path d="M2 17h12v-5H6l-2 3H2z"/><path d="M14 8h4l3 4v5h-7z"/><path d="M14 12l5-6"/><circle cx="6" cy="17.5" r="1.7"/><circle cx="17" cy="17.5" r="1.7"/>'),
  moto:     SVG_('<circle cx="5" cy="16" r="3"/><circle cx="19" cy="16" r="3"/><path d="M8 16h3l4-6h3"/><path d="M12 10h4"/><path d="M15 10 13 6h-2"/>'),
  wrench:   SVG_('<path d="M14.5 5.5a4.5 4.5 0 0 0 5.9 5.9l-8 8a3 3 0 0 1-4.2-4.2z"/><path d="M16.5 3.5 20.5 7.5"/>'),
  cone:     SVG_('<path d="M12 4 7 18h10z"/><path d="M3 21h18"/><path d="M9.5 12h5"/>')
};

/* Match a unit or company to an icon. Keyword-based so new inventory
   picks up a sensible glyph without touching this table. */
function unitIcon(text, cat){
  const s = (text || '').toLowerCase();
  if (/motorcycle|scooter/.test(s))              return ICONS.moto;
  if (/flatbed|wheel-lift|wrecker|tow|winch/.test(s)) return ICONS.tow;
  if (/excavator/.test(s))                       return ICONS.excavator;
  if (/crane|boom/.test(s))                      return ICONS.crane;
  if (/backhoe|loader|bulldozer|grader/.test(s)) return ICONS.backhoe;
  if (/dump|10-?wheel/.test(s))                  return ICONS.dump;
  if (/compactor|roller/.test(s))                return ICONS.roller;
  if (/lift/.test(s))                            return ICONS.lift;
  if (/van|hiace|seater/.test(s))                return ICONS.van;
  if (/pickup|ranger/.test(s))                   return ICONS.pickup;
  if (/truck/.test(s))                           return ICONS.truck;
  if (/sedan|suv|car|vios|fortuner/.test(s))     return ICONS.car;
  return cat === 'equipment' ? ICONS.excavator
       : cat === 'towing'    ? ICONS.tow
       : ICONS.car;
}

/* ---------- Helpers --------------------------------------------------- */
const CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12l6 6L20 6"/></svg>';
const STAR_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';
const PIN_SVG  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';

function peso(n){ return '₱' + Number(n).toLocaleString('en-PH'); }
function byId(id){ return FR_COMPANIES.find(c => c.id === id); }
function inCategory(cat){ return FR_COMPANIES.filter(c => c.cat === cat); }
function qs(key){ return new URLSearchParams(location.search).get(key); }

/* Placeholder photography, one per category. These are the same generated
   originals as the hero panels, reused until a company uploads its own -
   see `company_theme.gallery` in ARCHITECTURE.md §3. Because every vehicle
   company would otherwise show an identical crop, the focal point is
   shifted deterministically per company id. */
const CAT_PHOTO = {
  vehicles:  '/assets/img/hero-vehicles.jpg',
  equipment: '/assets/img/hero-equipment.jpg',
  towing:    '/assets/img/hero-towing.jpg'
};
const PHOTO_POS = ['50% 46%','38% 52%','62% 44%','45% 58%','57% 40%','34% 46%'];
function photoStyle(x){
  const h = [...x.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `background-image:url('${CAT_PHOTO[x.cat]}');` +
         `background-position:${PHOTO_POS[h % PHOTO_POS.length]}`;
}

/* Render a company card. Used on index + company "similar" rail. */
function companyCard(x){
  const st = frStatus(x);
  const km = distanceKm(x);
  /* An unrated company shows "New", not 0.00 stars. A zero rating reads
     as a terrible company rather than an unreviewed one, and it is the
     first thing a renter sees on a listing that just went live. */
  const rating = x.reviews
    ? `<span class="rate-pill">${STAR_SVG}${Number(x.rating).toFixed(2)}</span>`
    : `<span class="rate-pill new">New</span>`;
  return `
  <article class="co v-${x.cat}">
    <div class="cotop" style="${photoStyle(x)}">
      <span class="cocat">${unitIcon((x.types||[]).join(" "), x.cat)}${
        isMultiService(x) ? 'Multi-service' : FR_CATS[x.cat].label}</span>
      ${isMultiService(x) ? `<span class="colines">${catsOf(x).map(c =>
        `<span class="coline v-${c}" title="${FR_CATS[c].label}">${unitIcon('', c)}</span>`).join('')}</span>` : ''}
      <span class="cotag t ${st.type==='now'?'t-now':'t-ok'}">${
        st.type==='now' ? '<i class="statdot"></i>' : CHECK_SVG} ${st.label}</span>
      <button class="cofav" aria-label="Save ${x.name}" data-fav="true">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20.8 8.6c0 5-8.8 9.9-8.8 9.9s-8.8-4.9-8.8-9.9a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7z"/></svg>
      </button>
    </div>
    <div class="cobody">
      <div class="coname">
        <h3><a href="/company?c=${x.id}">${x.name}</a></h3>
        ${rating}
      </div>
      <p class="coloc">${PIN_SVG} ${x.loc}${km == null ? '' : ' · ' + kmLabel(km)}</p>
      <div class="cotags">${(x.tags||[]).map(t=>`<span class="t">${t}</span>`).join('')}</div>
      <div class="cofoot">
        <div class="coprice">${+String(x.price).replace(/,/g,'')
          ? `<span class="p">${peso(String(x.price).replace(/,/g,''))}</span> <span class="u">${FR_CATS[x.cat].unit}</span>`
          : `<span class="u">Rates on enquiry</span>`}</div>
        <a class="btn btn-y btn-sm" href="/company?c=${x.id}">View</a>
      </div>
    </div>
  </article>`;
}

/* Runs last: everything above is `const`, so calling any of this earlier
   hits the temporal dead zone and throws. */
frNameGeo();
frRedistance();
frRecount();

/* Favourite toggle - delegated, works on any page that renders cards. */
document.addEventListener('click', e => {
  const f = e.target.closest('[data-fav]');
  if (f) { f.classList.toggle('on'); e.preventDefault(); }
});
