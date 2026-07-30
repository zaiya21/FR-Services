/* =====================================================================
   OPS - the operational side of the company admin
   ---------------------------------------------------------------------
   Everything an owner needs to run the business rather than decorate it:
   bookings, expenses, utilisation, compliance, and the report model that
   Print and Download-PDF both render from.

   Two rules shape this file.

   1. FIGURES MUST BE STABLE. All demo data is generated, not stored - but
      a dashboard that reshuffles on reload is worse than no dashboard, and
      a printed report has to match the screen it was printed from. So every
      value derives from a hash of the company id, never from Math.random().

   2. ONE MODEL, TWO RENDERERS. buildReport() returns plain data. The screen
      preview, the print sheet and the PDF writer all consume that same
      object, so they cannot drift apart on what a number is.

   Owner edits (expense entries, booking status changes) persist to
   localStorage and override the generated baseline. As with theme.js, this
   is a prototype store, not a security boundary - see ARCHITECTURE.md §7.
   ===================================================================== */

/* ---------------------------------------------------------------
   Deterministic pseudo-random: FNV-1a hash into mulberry32.
   --------------------------------------------------------------- */
function opsHash(str){
  const s = String(str);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++){
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function opsRng(seed){
  let a = typeof seed === 'number' ? seed : opsHash(seed);
  return function(){
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length) % arr.length];
const between = (rnd, lo, hi) => lo + Math.floor(rnd() * (hi - lo + 1));

/* ---------------------------------------------------------------
   Dates. Everything is an ISO 'YYYY-MM-DD' string held in UTC, so
   comparison is plain string comparison and no timezone can shift a
   booking into the wrong month on someone else's machine.
   --------------------------------------------------------------- */
const DAY_MS = 86400000;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function isoOf(ms){ return new Date(ms).toISOString().slice(0, 10); }
function msOf(iso){
  const p = String(iso).split('-');
  return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1);
}
function addDays(iso, n){ return isoOf(msOf(iso) + n * DAY_MS); }
/* Calendar-correct, unlike adding 30 days: stepping back 13 months from
   any date must land on 13 distinct months, never skip or repeat one. */
function addMonths(iso, n){
  const p = String(iso).split('-');
  return isoOf(Date.UTC(+p[0], (+p[1] || 1) - 1 + n, +p[2] || 1));
}
function daysBetween(a, b){ return Math.round((msOf(b) - msOf(a)) / DAY_MS); }
function opsToday(){ return isoOf(Date.now()); }

function fmtDate(iso){
  const p = String(iso).split('-');
  return `${+p[2]} ${MONTHS[(+p[1] || 1) - 1]} ${p[0]}`;
}
function fmtDateShort(iso){
  const p = String(iso).split('-');
  return `${+p[2]} ${MONTHS[(+p[1] || 1) - 1]}`;
}
const monthKey   = iso => String(iso).slice(0, 7);
const monthLabel = key => `${MONTHS[(+String(key).slice(5, 7) || 1) - 1]} ${String(key).slice(0, 4)}`;

/* Named windows for the report builder and the dashboard filter. */
function opsRange(id, today){
  const t = today || opsToday();
  const first = t.slice(0, 7) + '-01';
  switch (id){
    case 'today':    return { from: t, to: t, label: 'Today' };
    case 'week':     return { from: addDays(t, -6),  to: t, label: 'Last 7 days' };
    case 'month':    return { from: first,           to: t, label: 'This month' };
    case 'lastmo': {
      const lastEnd   = addDays(first, -1);
      const lastStart = lastEnd.slice(0, 7) + '-01';
      return { from: lastStart, to: lastEnd, label: 'Last month' };
    }
    /* Forward-looking. Pending and confirmed bookings by definition start
       after today, so every backward window shows none of them - the one
       view an operator most needs was the one they could not reach. */
    case 'upcoming': return { from: t, to: addDays(t, 60), label: 'Upcoming' };
    case 'quarter':  return { from: addDays(t, -89), to: t, label: 'Last 90 days' };
    case 'year':     return { from: t.slice(0, 4) + '-01-01', to: t, label: 'Year to date' };
    case 'all':      return { from: addDays(t, -365), to: addDays(t, 60), label: 'All records' };
    default:         return { from: addDays(t, -29), to: t, label: 'Last 30 days' };
  }
}
const RANGE_IDS = ['today','week','month','lastmo','30','quarter','year','all'];
/* The bookings list is the only screen where the future matters. */
const BOOKING_RANGE_IDS = ['upcoming'].concat(RANGE_IDS);

/* ---------------------------------------------------------------
   Reference tables
   --------------------------------------------------------------- */
const BOOK_STATUS = {
  pending:   { label:'Pending',   tone:'warn', note:'Awaiting your confirmation' },
  confirmed: { label:'Confirmed', tone:'info', note:'Accepted, not yet handed over' },
  onhire:    { label:'On hire',   tone:'live', note:'Out with the renter now' },
  completed: { label:'Completed', tone:'ok',   note:'Returned and closed' },
  cancelled: { label:'Cancelled', tone:'off',  note:'Called off before handover' }
};
const BOOK_STATUS_IDS = Object.keys(BOOK_STATUS);

const PAY_STATUS = {
  unpaid:  { label:'Unpaid',   tone:'off'  },
  deposit: { label:'Deposit',  tone:'warn' },
  paid:    { label:'Paid',     tone:'ok'   },
  refund:  { label:'Refunded', tone:'off'  }
};

const EXPENSE_CATS = [
  { id:'fuel',        label:'Fuel' },
  { id:'maintenance', label:'Maintenance & repair' },
  { id:'parts',       label:'Parts & tyres' },
  { id:'wages',       label:'Driver & operator pay' },
  { id:'haulage',     label:'Mobilisation & haulage' },
  { id:'insurance',   label:'Insurance' },
  { id:'permits',     label:'Permits & registration' },
  { id:'admin',       label:'Office & admin' }
];
const EXPENSE_CAT_IDS = EXPENSE_CATS.map(c => c.id);
const expenseCatLabel = id =>
  (EXPENSE_CATS.find(c => c.id === id) || { label:'Other' }).label;

const PAY_METHODS = ['Cash', 'GCash', 'Bank transfer', 'Company card', 'Cheque'];

const CAT_LABEL = { vehicles:'Vehicle rental', equipment:'Heavy equipment', towing:'Towing & recovery' };

/* Demo renter names. Common Philippine surnames with generic given names -
   no real customer data belongs in a prototype fixture. */
const OPS_GIVEN = ['Ramon','Liza','Arnel','Marites','Joel','Cristina','Dante','Aileen',
  'Rico','Grace','Noel','Divina','Edgar','Rosalie','Ferdie','Jocelyn','Allan','Mylene',
  'Bernard','Cherry','Rolly','Imelda','Kevin','Analyn'];
const OPS_FAMILY = ['Dela Cruz','Santos','Reyes','Bautista','Ocampo','Villanueva','Mendoza',
  'Garcia','Aquino','Torres','Ramos','Castillo','Flores','Domingo','Aguilar','Salazar',
  'Padilla','Espinosa','Lim','Tan','Uy','Abad','Rosales','Navarro'];
const OPS_FIRMS = ['Cordillera Builders','Sunrise Agri Corp.','Mindanao Steel Works',
  'Bayview Property Dev.','Golden Harvest Trading','Metro Davao Construction',
  'Pacific Logistics Inc.','Highland Coffee Estates','Southport Aggregates',
  'Verde Homes Realty','Apo Cement Supply','Riverside Engineering'];
const OPS_CHANNELS = ['FR Marketplace','Direct enquiry','Repeat client','Corporate account','Phone-in'];

const OPS_SITES = ['Ecoland','Matina','Toril','Buhangin','Lanang','Bajada','Talomo',
  'Mintal','Calinan','Panabo','Tagum','Digos','Sasa','Agdao','Maa','Catalunan Grande'];

const OPS_VENDORS = {
  fuel:        ['Petron Ecoland','Shell Matina','Caltex Buhangin','Phoenix Toril'],
  maintenance: ['Suarez Auto Works','Davao Diesel Service','Rivera Machine Shop','Apex Hydraulics'],
  parts:       ['Yamamoto Parts Supply','Southern Tyre Center','Mindanao Bearings','JR Auto Supply'],
  wages:       ['Payroll - drivers','Payroll - operators','Overtime settlement','Field crew allowance'],
  haulage:     ['Lowbed hire - Panabo','Lowbed hire - Digos','Escort vehicle','Toll & terminal fees'],
  insurance:   ['Pioneer Insurance','Malayan Insurance','Standard Insurance'],
  permits:     ['LTO registration','Mayor’s permit','DOLE safety filing','LTFRB clearance'],
  admin:       ['Office rent','Internet & telco','Accounting retainer','Yard utilities']
};

/* =====================================================================
   THE FLEET THIS DASHBOARD REPORTS ON
   Three sources, in order of authority:
     1. the owner's saved fleet, so a unit added in the admin shows up in
        utilisation straight away;
     2. the curated demo listings, where they exist;
     3. a fleet synthesised from the company's own marketplace record.

   (3) exists because only five of the forty-two demo companies have hand
   written unit lists, and an admin console that is blank for the other
   thirty-seven is not a console. The marketplace card already claims a
   category, a unit count and a headline rate - synthesising from those
   three keeps the dashboard consistent with what a renter is being shown,
   instead of contradicting it with zeroes.
   ===================================================================== */
function fleetFromDemo(companyId){
  const demo = (typeof FR_UNITS !== 'undefined' && FR_UNITS[companyId]) || [];
  /* Single-line companies omit `cat` on every unit and lean on the company
     record. Without this fallback normaliseUnit defaults them to
     "vehicles", and an equipment yard reports fourteen excavators as cars. */
  const co  = (typeof byId === 'function') ? byId(companyId) : null;
  const dflt = (co && co.cat) || 'vehicles';
  return demo.map(u => {
    const s = u.specs || {};
    return normaliseUnit({
      id:u.id, cat:u.cat || dflt, name:u.name, price:u.price, unit:u.unit, qty:u.avail,
      model:s.Model || '', year:s.Year || '',
      deliveryMode:u.deliveryMode, delivery:u.delivery,
      deliveryKm:u.deliveryKm, deliveryFree:u.deliveryFree
    });
  }).filter(Boolean);
}

/* Bigger machines cost more than the headline rate, which is always the
   cheapest thing on the lot. Multipliers are against that rate. */
const TYPE_MULT = {
  Sedan:1, SUV:1.5, Van:1.9, Pickup:1.35, Truck:2.4, Motorcycle:0.45,
  Excavator:1.6, Backhoe:1, Crane:2.2, Bulldozer:1.9, 'Dump Truck':1.15,
  'Boom Lift':1.25, Compactor:0.85, Loader:1.1,
  Flatbed:1, 'Wheel-Lift':0.85, 'Heavy Duty':1.9, 'Long-haul':2.3, 'Winch-out':1.2
};

function synthFleet(co){
  if (typeof FR_TYPES === 'undefined' || typeof normaliseUnit !== 'function') return [];
  const rnd  = opsRng(co.id + ':fleet');
  const cats = (typeof catsOf === 'function') ? catsOf(co) : [co.cat || 'vehicles'];
  const base = Number(String(co.price || '2000').replace(/,/g, '')) || 2000;
  const total = Math.max(3, co.units || 8);
  const out = [];

  cats.forEach((cat, ci) => {
    const types = (FR_TYPES[cat] || []).slice();
    if (!types.length) return;
    /* Enough listings to look like a yard, never more types than exist. */
    const lines = Math.max(2, Math.min(types.length, Math.round(total / cats.length / 2.4)));
    const share = Math.max(lines, Math.round(total / cats.length));

    for (let i = 0; i < lines; i++){
      const type = types[(i + ci) % types.length];
      const mult = (TYPE_MULT[type] || 1) * (0.9 + rnd() * 0.25);
      const perkm = cat !== 'vehicles' && rnd() < 0.5;
      out.push(normaliseUnit({
        id: co.id + '-u' + ci + i,
        cat, name: type,
        type,
        price: Math.max(300, Math.round(base * mult / 50) * 50),
        unit: cat === 'towing' ? 'call-out' : 'day',
        qty: Math.max(1, Math.round(share / lines * (0.7 + rnd() * 0.8))),
        year: 2018 + between(rnd, 0, 7),
        operator: cat === 'equipment' ? 'included' : (rnd() < 0.4 ? 'optional' : 'none'),
        minDays: 1,
        d3: pick(rnd, [0, 0, 5, 5, 8]), d7: pick(rnd, [5, 10, 10, 12]), d30: pick(rnd, [15, 20, 25, 30]),
        deliveryMode: perkm ? 'perkm' : 'flat',
        delivery: perkm ? 0 : Math.round(base * 0.2 / 50) * 50,
        deliveryFree: perkm ? pick(rnd, [5, 10, 15]) : 0,
        deliveryKm: perkm ? pick(rnd, [45, 65, 80, 120, 180]) : 0
      }));
    }
  });
  return out.filter(Boolean);
}

function opsFleet(companyId){
  if (typeof normaliseUnit !== 'function') return [];
  const saved = (typeof loadFleet === 'function') ? loadFleet(companyId) : null;
  if (saved && saved.length) return saved;

  const demo = fleetFromDemo(companyId);
  if (demo.length) return demo;

  const co = (typeof byId === 'function') ? byId(companyId) : null;
  return co ? synthFleet(co) : [];
}

/* =====================================================================
   BOOKINGS
   ===================================================================== */

/* Typical hire length differs so much by service line that one range for
   all three would make utilisation meaningless. */
function hireDays(rnd, unit){
  if (unit.cat === 'towing')    return 1;
  if (unit.cat === 'equipment') return pick(rnd, [2,3,3,5,7,7,10,14,21]);
  return pick(rnd, [1,1,2,3,3,4,5,7,7,10,14]);
}

/* Status is derived from the dates, never drawn independently - otherwise
   you get "completed" bookings that end next week. */
function statusFor(rnd, start, end, today){
  if (start > today) return rnd() < 0.28 ? 'pending' : 'confirmed';
  if (end >= today)  return rnd() < 0.05 ? 'cancelled' : 'onhire';
  return rnd() < 0.07 ? 'cancelled' : 'completed';
}
function payFor(rnd, status){
  if (status === 'cancelled') return rnd() < 0.5 ? 'refund' : 'unpaid';
  if (status === 'pending')   return 'unpaid';
  if (status === 'confirmed') return rnd() < 0.75 ? 'deposit' : 'unpaid';
  if (status === 'onhire')    return rnd() < 0.35 ? 'paid' : 'deposit';
  return rnd() < 0.88 ? 'paid' : 'deposit';
}

const VAT = 0.12;

function genBookings(companyId, today){
  const units = opsFleet(companyId);
  if (!units.length) return [];

  const rnd  = opsRng(companyId + ':bookings');
  const svc  = (typeof FR_SERVICES !== 'undefined' && FR_SERVICES[companyId]) || [];
  const t    = today || opsToday();
  const WINDOW_BACK = 365, WINDOW_FWD = 24;

  /* Volume is derived from a TARGET UTILISATION rather than picked as a
     booking count, because utilisation is the number an owner judges the
     dashboard by. Counting bookings instead produced a 71-unit yard
     running at 3.6% - arithmetically fine and obviously fictional.
     Generate until the fleet is busy enough, then stop. */
  const fleetQty  = units.reduce((n, u) => n + Math.max(1, u.qty || 1), 0);
  const span      = WINDOW_BACK + WINDOW_FWD;
  const targetUtil = 0.36 + rnd() * 0.26;               // 36–62% - a healthy yard
  const targetDays = fleetQty * span * targetUtil;
  const MAX_BOOKINGS = 3000, MAX_TRIES = 20000;

  /* You cannot rent out four excavators when you own two. Without this the
     generator happily overlaps bookings on the same unit, per-unit
     utilisation runs past 100%, and every figure downstream inherits the
     lie. Day counters per unit; a candidate that would exceed the physical
     count on any of its days is dropped and another drawn. */
  const busy = {};
  units.forEach(u => busy[u.id] = {});
  function canTake(unit, start, days){
    const cap = Math.max(1, unit.qty || 1);
    for (let d = 0; d < days; d++)
      if ((busy[unit.id][addDays(start, d)] || 0) >= cap) return false;
    return true;
  }
  function take(unit, start, days){
    for (let d = 0; d < days; d++){
      const k = addDays(start, d);
      busy[unit.id][k] = (busy[unit.id][k] || 0) + 1;
    }
  }

  const out = [];
  let booked = 0, tries = 0;

  while (booked < targetDays && out.length < MAX_BOOKINGS && tries++ < MAX_TRIES){
    const i     = out.length;
    const unit  = units[Math.floor(rnd() * units.length)];
    const days  = hireDays(rnd, unit);
    const start = addDays(t, -WINDOW_BACK + Math.floor(rnd() * (WINDOW_BACK + WINDOW_FWD)));
    const end   = addDays(start, days - 1);
    if (!canTake(unit, start, days)) continue;
    take(unit, start, days);
    booked += days;

    const rate  = (typeof unitRate === 'function')
      ? unitRate(unit, days) : { perDay: unit.price, pct: 0, total: unit.price * days };

    const km = between(rnd, 3, 70);
    let deliv = (typeof deliveryCost === 'function') ? deliveryCost(unit, km) : (unit.delivery || 0);
    if (deliv === null) deliv = Math.round((900 + km * 120) / 50) * 50;   // quoted → the figure actually sent

    /* Nought to two add-ons from the company's own service list. */
    const pool = svc.filter(s => s.cat === unit.cat && s.price > 0);
    const addons = [];
    const nAdd = pool.length ? between(rnd, 0, 2) : 0;
    for (let a = 0; a < nAdd; a++){
      const s = pool[Math.floor(rnd() * pool.length)];
      if (addons.some(x => x.id === s.id)) continue;
      addons.push({ id:s.id, name:s.name,
                    amount: s.unit === 'day' ? s.price * days : s.price });
    }
    const addTotal = addons.reduce((n, a) => n + a.amount, 0);

    const net    = rate.total + deliv + addTotal;
    const vat    = Math.round(net * VAT);
    const status = statusFor(rnd, start, end, t);
    const pay    = payFor(rnd, status);
    const gross  = status === 'cancelled' ? 0 : net + vat;

    const corporate = rnd() < 0.3;
    out.push({
      ref: 'FR-' + start.slice(0, 4) + '-' + String(1000 + i).slice(-4),
      unitId: unit.id, unitName: unit.name, cat: unit.cat,
      customer: corporate ? pick(rnd, OPS_FIRMS)
                          : pick(rnd, OPS_GIVEN) + ' ' + pick(rnd, OPS_FAMILY),
      corporate,
      channel: pick(rnd, OPS_CHANNELS),
      site: pick(rnd, OPS_SITES),
      km, start, end, days,
      perDay: rate.perDay, discountPct: rate.pct,
      hire: rate.total, delivery: deliv, addons, addonTotal: addTotal,
      net, vat, total: gross,
      status, pay,
      balance: pay === 'paid' || pay === 'refund' ? 0
             : pay === 'deposit' ? gross - Math.round(gross * 0.3) : gross,
      placed: addDays(start, -between(rnd, 1, 12))
    });
  }
  return out.sort((a, b) => b.start.localeCompare(a.start) || a.ref.localeCompare(b.ref));
}

/* ---- owner overrides -------------------------------------------------
   Only the status is owner-editable: accepting a booking is a decision,
   whereas the amounts came from rates the owner already set. Stored as a
   ref → status map so the generated baseline stays the source of truth
   for everything else. */
const bookKey = id => 'fr.bookings.' + String(id).replace(/[^a-z0-9-]/gi, '');

function loadBookingOverrides(companyId){
  try {
    const raw = JSON.parse(localStorage.getItem(bookKey(companyId)));
    if (!raw || typeof raw !== 'object') return {};
    const out = {};
    Object.keys(raw).forEach(k => {
      if (BOOK_STATUS_IDS.includes(raw[k])) out[String(k).slice(0, 24)] = raw[k];
    });
    return out;
  } catch { return {}; }
}
function setBookingStatus(companyId, ref, status){
  if (!BOOK_STATUS_IDS.includes(status)) return false;
  try {
    const map = loadBookingOverrides(companyId);
    map[String(ref).slice(0, 24)] = status;
    localStorage.setItem(bookKey(companyId), JSON.stringify(map));
    return true;
  } catch { return false; }
}

let _bookCache = { id:null, day:null, rows:null };

function opsBookings(companyId, today){
  const t = today || opsToday();
  if (_bookCache.id !== companyId || _bookCache.day !== t){
    _bookCache = { id: companyId, day: t, rows: genBookings(companyId, t) };
  }
  const over = loadBookingOverrides(companyId);
  return _bookCache.rows.map(b => {
    if (!over[b.ref] || over[b.ref] === b.status) return b;
    const status = over[b.ref];
    return Object.assign({}, b, {
      status,
      total: status === 'cancelled' ? 0 : b.net + b.vat,
      balance: status === 'cancelled' ? 0 : b.balance
    });
  });
}
function opsBookingsClearCache(){ _bookCache = { id:null, day:null, rows:null }; }

/* =====================================================================
   EXPENSES
   Generated once, then owned by the operator: additions and deletions
   persist, so the ledger is something you keep rather than something you
   only read.
   ===================================================================== */
const expKey = id => 'fr.expenses.' + String(id).replace(/[^a-z0-9-]/gi, '');
const MAX_EXPENSES = 600;

/* Cost structure as a share of the revenue it supports, with how many
   entries a month each one arrives in. Fixed peso constants were the first
   attempt and they don't survive contact with a fleet of a different size:
   ₱140k of payroll is a whole business for a three-truck outfit and a
   rounding error for a forty-unit lessor. Shares sum to ~0.71, which puts
   net margin in the high twenties - about right for plant hire. */
const COST_MIX = [
  { id:'wages',       share:0.20, per:2, unit:false, note:'' },
  { id:'fuel',        share:0.15, per:9, unit:true,  note:'' },
  { id:'maintenance', share:0.11, per:4, unit:true,  note:'' },
  { id:'parts',       share:0.06, per:3, unit:true,  note:'' },
  { id:'haulage',     share:0.07, per:4, unit:true,  note:'' },
  { id:'insurance',   share:0.03, per:1, unit:false, every:3, note:'Quarterly premium' },
  { id:'permits',     share:0.02, per:1, unit:false, every:6, note:'Renewal' },
  { id:'admin',       share:0.07, per:2, unit:false, note:'' }
];

function genExpenses(companyId, today){
  const units = opsFleet(companyId);
  const rnd = opsRng(companyId + ':expenses');
  const t   = today || opsToday();
  const out = [];

  /* Each month's spend is drawn against that month's revenue, so the
     ledger tracks the business instead of floating beside it. */
  const revenue = {};
  opsBookings(companyId, t)
    .filter(b => b.status !== 'cancelled')
    .forEach(b => revenue[monthKey(b.start)] = (revenue[monthKey(b.start)] || 0) + b.total);

  /* A yard with no bookings still pays wages and rent. */
  const fleetQty = units.reduce((n, u) => n + Math.max(1, u.qty || 1), 0) || 1;
  const floor = fleetQty * 9000;

  /* Which month a quarterly or annual charge falls in. Without a phase,
     `m % every === 0` is true at m = 0 for every cycle length, so the
     CURRENT month always absorbs both the quarterly premium and the annual
     renewal - and the dashboard's default 30-day view always showed the
     worst margin of the year. The phase is per company and stable. */
  const phase = {};
  COST_MIX.forEach(mix => { if (mix.every) phase[mix.id] = between(rnd, 0, mix.every - 1); });

  /* The current month is only part-run. Charging a full month of fuel and
     payroll against 28 days of revenue made every window that ended
     mid-month look like a loss-making one. Scale the pot to the part of
     the month that has actually happened. */
  const dayOfMonth  = Number(t.slice(8, 10));
  const daysInMonth = Number(addDays(addMonths(t.slice(0, 7) + '-01', 1), -1).slice(8, 10));
  const elapsed = dayOfMonth / daysInMonth;

  for (let m = 12; m >= 0; m--){
    const month = addMonths(t.slice(0, 7) + '-01', -m).slice(0, 7);
    const base  = Math.max(floor, revenue[month] || 0) * (m === 0 ? elapsed : 1);

    COST_MIX.forEach(mix => {
      /* Lumpy overheads land in one month and skip the rest, which is what
         makes a monthly expense chart look like a real one. */
      if (mix.every && (m + phase[mix.id]) % mix.every !== 0) return;
      const pot = base * mix.share * (mix.every || 1) * (0.82 + rnd() * 0.36);
      const n   = Math.max(1, mix.per);
      for (let i = 0; i < n; i++){
        const amount = Math.round(pot / n * (0.7 + rnd() * 0.6) / 50) * 50;
        if (amount < 100) continue;
        /* Spread across the whole month, but never past today. */
        const last = m === 0 ? Math.max(1, dayOfMonth) : 28;
        const day  = String(between(rnd, 1, last)).padStart(2, '0');
        const unit = mix.unit && units.length ? units[Math.floor(rnd() * units.length)] : null;
        out.push(mkExp(rnd, month + '-' + day, mix.id,
                       pick(rnd, OPS_VENDORS[mix.id]), amount, mix.note, unit));
      }
    });
  }

  /* Two identical payments in one month are perfectly normal, but they must
     not share an id or deleting one would delete both. */
  const seen = {};
  out.forEach(e => { while (seen[e.id]) e.id += 'z'; seen[e.id] = 1; });

  return out
    .filter(e => e.date <= t)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
function mkExp(rnd, date, cat, vendor, amount, note, unit){
  return {
    id: 'x' + opsHash(date + cat + vendor + amount + (unit ? unit.id : '')).toString(36),
    date, cat, vendor, amount,
    method: pick(rnd, PAY_METHODS),
    unitId: unit ? unit.id : '', unitName: unit ? unit.name : '',
    note: note || '', seeded: true
  };
}

/** Coerce an owner-entered expense into range. Same contract as normaliseUnit. */
function normaliseExpense(raw){
  if (!raw || typeof raw !== 'object') return null;
  const amount = Math.round(Number(raw.amount) || 0);
  if (!(amount > 0)) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw.date || '')) ? raw.date : opsToday();
  const txt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n).trim();
  return {
    id: txt(raw.id, 24) || ('x' + Math.random().toString(36).slice(2, 10)),
    date,
    cat: EXPENSE_CAT_IDS.includes(raw.cat) ? raw.cat : 'admin',
    vendor: txt(raw.vendor, 60) || 'Unrecorded payee',
    amount: Math.min(amount, 50000000),
    method: PAY_METHODS.includes(raw.method) ? raw.method : 'Cash',
    unitId: txt(raw.unitId, 40), unitName: txt(raw.unitName, 80),
    note: txt(raw.note, 200),
    seeded: !!raw.seeded
  };
}

function opsExpenses(companyId, today){
  try {
    const raw = JSON.parse(localStorage.getItem(expKey(companyId)));
    if (Array.isArray(raw)) return raw.slice(0, MAX_EXPENSES).map(normaliseExpense).filter(Boolean);
  } catch { /* fall through to the seed */ }
  return genExpenses(companyId, today);
}
function saveExpenses(companyId, rows){
  try {
    const clean = (Array.isArray(rows) ? rows : [])
      .slice(0, MAX_EXPENSES).map(normaliseExpense).filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date));
    localStorage.setItem(expKey(companyId), JSON.stringify(clean));
    return clean;
  } catch { return null; }
}
function addExpense(companyId, entry){
  const row = normaliseExpense(Object.assign({ seeded:false }, entry));
  if (!row) return null;
  const rows = opsExpenses(companyId);
  if (rows.length >= MAX_EXPENSES) return null;
  return saveExpenses(companyId, [row].concat(rows));
}
function removeExpense(companyId, id){
  const rows = opsExpenses(companyId).filter(e => e.id !== id);
  return saveExpenses(companyId, rows);
}

/* =====================================================================
   COMPANY DOCUMENTS
   The paperwork that stops a fleet trading if it lapses - and, once the
   owner publishes it, the evidence a renter uses to decide the business is
   real.

   THE TRUST LINE THIS FILE HAS TO HOLD. A document here is uploaded by the
   seller. That is not the same thing as the platform having checked it, and
   a renter who confuses the two has been misled by us, not by the seller.
   So `review` is platform-owned and an owner can never set it: anything
   they add starts at 'pending' and says so wherever it is shown.

   Two further rules the publish toggle does NOT get to override:
     - expiry is computed from the date, never asserted, so a lapsed permit
       cannot be published as current;
     - the document number is masked unless the owner explicitly opts in,
       because a permit or TIN in plain sight on a public page is a gift to
       whoever wants to impersonate the company.
   ===================================================================== */
/* WHAT FR SERVICES ACTUALLY CHECKS, AND WHAT IT DOES NOT.
   Verification is limited to the three documents that establish a business
   exists and is registered to trade: DTI, the mayor's permit, and BIR 2303.
   Those are the ones a platform can confirm with an issuing office and the
   ones a renter is really asking about - "is this a real company?"

   Everything else - insurance policies, OR/CR for individual vehicles,
   PCAB, TESDA, DOLE - is the owner's own call on what to publish. It is
   still useful to a renter, and still shown, but it is presented as the
   company's own claim rather than something we stand behind. Reviewing a
   fleet's worth of OR/CRs would be a promise we cannot keep. */
const DOC_TYPES = [
  /* --- the three FR Services verifies --- */
  { id:'dti',       label:'DTI registration',               issuer:'Department of Trade and Industry', reviewable:true },
  { id:'permit',    label:'Mayor’s / business permit',      issuer:'City or municipal hall',           reviewable:true },
  { id:'bir',       label:'BIR registration (Form 2303)',   issuer:'Bureau of Internal Revenue',       reviewable:true },
  /* --- the owner's discretion --- */
  { id:'insurance', label:'Insurance policy',               issuer:'Insurer',                          reviewable:false },
  { id:'lto',       label:'LTO registration (OR/CR)',       issuer:'Land Transportation Office',       reviewable:false },
  { id:'ltfrb',     label:'Tow operator accreditation',     issuer:'LTFRB',                            reviewable:false },
  { id:'pcab',      label:'PCAB contractor licence',        issuer:'Philippine Contractors Accreditation Board', reviewable:false },
  { id:'tesda',     label:'Operator certification (TESDA)', issuer:'TESDA',                            reviewable:false },
  { id:'dole',      label:'DOLE safety compliance',         issuer:'Department of Labor and Employment', reviewable:false },
  { id:'other',     label:'Other document',                 issuer:'',                                 reviewable:false }
];
const DOC_TYPE_IDS = DOC_TYPES.map(d => d.id);
const docTypeLabel = id => (DOC_TYPES.find(d => d.id === id) || { label:'Document' }).label;

/** The three the platform will put its name to. */
const REVIEWABLE_TYPES = DOC_TYPES.filter(d => d.reviewable).map(d => d.id);
const isReviewableType = type => REVIEWABLE_TYPES.includes(type);

/* Platform review state. Owner-writable fields never include this one. */
const DOC_REVIEW = {
  verified: { label:'Checked by FR Services', tone:'ok',
              blurb:'FR Services has seen the original and confirmed it with the issuing office.' },
  pending:  { label:'Awaiting review',        tone:'warn',
              blurb:'Submitted by the company. FR Services has not checked it yet.' },
  rejected: { label:'Not accepted',           tone:'off',
              blurb:'FR Services could not confirm this document.' },
  /* Not a verdict - a statement that no verdict applies. Renters see the
     same wording as `pending` ("Company-submitted"), because from their
     side both mean the same thing: we have not vouched for this. */
  exempt:   { label:'Not reviewed',           tone:'off',
              blurb:'A supporting document the company chose to publish. FR Services verifies business registration only.' }
};
const DOC_REVIEW_IDS = Object.keys(DOC_REVIEW);

const DOC_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];
/* Deliberately small. These are base64 in localStorage, which is a ~5 MB
   budget for the whole origin - a couple of phone photos would fill it. */
const MAX_DOC_BYTES = 1.5 * 1024 * 1024;
const MAX_DOCS = 30;

function docFileProblem(file){
  if (!file) return 'No file selected.';
  if (!DOC_FILE_TYPES.includes(file.type))
    return 'Upload a PDF, PNG, JPG or WebP. SVG is not accepted - it can carry scripts.';
  if (file.size > MAX_DOC_BYTES)
    return 'That file is ' + (file.size / 1048576).toFixed(1) + ' MB. Maximum is 1.5 MB - ' +
           'scan at a lower resolution or save the PDF as “reduced size”.';
  return null;
}
function readDocFile(file){
  return new Promise((resolve, reject) => {
    const problem = docFileProblem(file);
    if (problem) return reject(new Error(problem));
    const fr = new FileReader();
    fr.onload  = () => resolve({ name:String(file.name).slice(0, 90), type:file.type,
                                 size:file.size, data:String(fr.result) });
    fr.onerror = () => reject(new Error('Could not read that file.'));
    fr.readAsDataURL(file);
  });
}

/** Show enough to match against the real thing, not enough to copy it.
    The tail is the last four ALPHANUMERICS, not the last four characters -
    on "123-456-789-000" the latter yields "-000", which tells a renter
    holding the paper almost nothing. */
function maskNumber(s){
  const v = String(s || '').trim();
  if (!v) return '';
  const tail = v.replace(/[^0-9a-z]/gi, '').slice(-4);
  return tail.length < 4 ? '••••' : '••••' + tail;
}

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Coerces a review state to the one its type allows. */
function reviewFor(type, wanted){
  if (!isReviewableType(type)) return 'exempt';
  return wanted === 'exempt' ? 'pending' : wanted;
}

/* `trusted` is the seed's door, and only the seed's. Every owner-facing
   path calls this without it, so a `review:'verified'` posted from the
   client is discarded rather than believed. */
function normaliseDoc(raw, trusted){
  if (!raw || typeof raw !== 'object') return null;
  const txt = (v, n) => String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n).trim();

  const type = DOC_TYPE_IDS.includes(raw.type) ? raw.type : 'other';
  const name = txt(raw.name, 90) || docTypeLabel(type);

  /* A stored file is only kept if it still looks like one we accepted. */
  let file = null;
  if (raw.file && typeof raw.file === 'object' &&
      DOC_FILE_TYPES.includes(raw.file.type) &&
      typeof raw.file.data === 'string' && raw.file.data.startsWith('data:')){
    file = { name: txt(raw.file.name, 90) || 'document',
             type: raw.file.type,
             size: Math.max(0, Math.round(Number(raw.file.size) || 0)),
             data: raw.file.data.slice(0, 3_000_000) };
  }

  return {
    id: txt(raw.id, 24) || ('d' + Math.random().toString(36).slice(2, 10)),
    type, name,
    issuer: txt(raw.issuer, 90),
    number: txt(raw.number, 60),
    issued:  ISO_RE.test(String(raw.issued  || '')) ? raw.issued  : '',
    expires: ISO_RE.test(String(raw.expires || '')) ? raw.expires : '',
    note: txt(raw.note, 240),
    file,
    published:    !!raw.published,
    showNumber:   !!raw.showNumber,
    showFile:     !!raw.showFile,
    /* platform-owned; see the note above normaliseDoc.
       The invariant enforced here: a document is 'exempt' if and only if
       its type is one we do not verify. That keeps the queue, the counts
       and the badge from ever disagreeing about what is reviewable. */
    review: reviewFor(type, trusted && DOC_REVIEW_IDS.includes(raw.review) ? raw.review : 'pending'),
    /* The reviewer's remark on the current verdict, and the trail behind
       it. Also platform-owned - a company that could write its own
       rejection reason could write "approved, all good" into it. */
    reviewNote: trusted ? txt(raw.reviewNote, 400) : '',
    reviewLog:  trusted && Array.isArray(raw.reviewLog)
      ? raw.reviewLog.slice(-MAX_REVIEW_LOG).map(e => ({
          at:     ISO_RE.test(String(e && e.at || '')) ? e.at : opsToday(),
          review: DOC_REVIEW_IDS.includes(e && e.review) ? e.review : 'pending',
          note:   txt(e && e.note, 400),
          auto:   !!(e && e.auto)
        })) : []
  };
}
const MAX_REVIEW_LOG = 12;

/* The fields a platform reviewer would have actually looked at. Change any
   of them and the previous review no longer describes this document. */
const DOC_MATERIAL = ['type', 'name', 'issuer', 'number', 'issued', 'expires'];
function docMateriallyChanged(a, b){
  if (DOC_MATERIAL.some(k => (a[k] || '') !== (b[k] || ''))) return true;
  const fa = a.file ? a.file.data : '', fb = b.file ? b.file.data : '';
  return fa !== fb;
}

/** Derived, never stored: an expiry is a date, not a claim. */
function docState(doc, today){
  const t = today || opsToday();
  if (!doc.expires) return { state:'none', daysLeft:null, label:'No expiry' };
  const left = daysBetween(t, doc.expires);
  return {
    daysLeft: left,
    state: left < 0 ? 'expired' : left <= 30 ? 'soon' : 'ok',
    label: left < 0 ? `Expired ${-left} day${left === -1 ? '' : 's'} ago`
         : left <= 30 ? `${left} day${left === 1 ? '' : 's'} left`
         : 'Current'
  };
}

const docKey = id => 'fr.docs.' + String(id).replace(/[^a-z0-9-]/gi, '');

/* The starting set: what a company of this shape would actually hold. */
function seedDocs(companyId, today){
  const t   = today || opsToday();
  const rnd = opsRng(companyId + ':docs');
  const co  = (typeof byId === 'function') ? byId(companyId) : null;
  const cats = co && typeof catsOf === 'function' ? catsOf(co) : ['vehicles'];
  /* A mayor's permit is issued by a city or municipality, never a province.
     `loc` is "locality, province", but which half holds the city varies:
     "Ecoland, Davao City" puts it second, "Puerto Princesa City, Palawan"
     first. Prefer whichever segment actually says City; otherwise the
     locality, which is the municipality ("Panabo, Davao del Norte").
     Taking the last segment gave "City of Palawan", which is a province. */
  const parts = String((co && co.loc) || 'Davao City')
    .split(',').map(s => s.trim()).filter(Boolean);
  const seat = parts.find(p => /\bcity$/i.test(p)) || parts[0] || 'Davao City';
  /* Coron and El Nido are municipalities; their permits come from a
     municipal hall, not a city hall. */
  const isCity = /\bcity$/i.test(seat) || /^City of\s/i.test(seat);
  const city = seat.replace(/^City of\s+/i, '').replace(/\s+City$/i, '');
  const permitIssuer = (isCity ? 'City of ' : 'Municipality of ') + city;

  const rows = [
    /* the three FR Services verifies - every trading company holds them */
    { type:'dti',       name:'DTI registration', issuer:'Department of Trade and Industry' },
    { type:'permit',    name:'Mayor’s permit', issuer:permitIssuer },
    { type:'bir',       name:'BIR registration (Form 2303)', issuer:'Bureau of Internal Revenue' },
    /* everything below is the owner's own choice to publish */
    { type:'insurance', name:'Comprehensive insurance', issuer:'Pioneer Insurance' },
    { type:'insurance', name:'Fleet third-party liability', issuer:'Malayan Insurance' }
  ];
  if (cats.includes('vehicles'))
    rows.push({ type:'lto', name:'LTO registration - fleet', issuer:'Land Transportation Office' });
  if (cats.includes('equipment')){
    rows.push({ type:'pcab',  name:'PCAB licence', issuer:'Philippine Contractors Accreditation Board' });
    rows.push({ type:'tesda', name:'Operator certification (TESDA NC II)', issuer:'TESDA' });
    rows.push({ type:'dole',  name:'DOLE safety compliance', issuer:'Department of Labor and Employment' });
  }
  if (cats.includes('towing'))
    rows.push({ type:'ltfrb', name:'Tow operator accreditation', issuer:'LTFRB' });

  return rows.map((d, i) => {
    const expires = addDays(t, between(rnd, -20, 320));
    /* A mix, not a clean sweep. Every marketplace has a review backlog at
       any moment, and a platform console whose queue is permanently empty
       is demonstrating nothing. */
    const roll = rnd();
    const review = roll < 0.70 ? 'verified' : roll < 0.95 ? 'pending' : 'rejected';
    /* The three we verify always carry a file - a registered company could
       not have completed registration otherwise, so a seed without one
       would be modelling a state the product does not allow. A one-byte
       stand-in: the fixture needs a file to EXIST, not to be readable, and
       real scans in every seed would blow the storage budget. */
    const needsFile = isReviewableType(d.type);
    return normaliseDoc(Object.assign({}, d, {
      id: 'seed' + i,
      number: String(between(rnd, 100000, 999999)) + '-' + String(between(rnd, 10, 99)),
      issued: addDays(expires, -365),
      expires,
      published: review !== 'rejected',
      review,
      file: needsFile ? {
        name: d.type + '-' + (co ? co.id : 'company') + '.pdf',
        type: 'application/pdf', size: between(rnd, 180, 1400) * 1024,
        data: 'data:application/pdf;base64,JVBERi0xLjQK'
      } : null
    }), true);
  }).sort((a, b) => a.expires.localeCompare(b.expires));
}

function loadDocs(companyId, today){
  try {
    const raw = JSON.parse(localStorage.getItem(docKey(companyId)));
    /* Trusted on read: whatever review state is in the store was put there
       by upsertDoc or the seed, never by the form. */
    if (Array.isArray(raw)) return raw.slice(0, MAX_DOCS).map(r => normaliseDoc(r, true)).filter(Boolean);
  } catch { /* fall through to the seed */ }
  return seedDocs(companyId, today);
}
/* Writes back rows that were already normalised and already carry a
   platform-assigned review, so this pass is trusted. Nothing reaches it
   without having gone through upsertDoc first. */
function saveDocs(companyId, rows){
  const clean = (Array.isArray(rows) ? rows : [])
    .slice(0, MAX_DOCS).map(r => normaliseDoc(r, true)).filter(Boolean);
  try {
    localStorage.setItem(docKey(companyId), JSON.stringify(clean));
    return clean;
  } catch {
    return null;   // almost always the storage quota, with a file attached
  }
}

function upsertDoc(companyId, entry){
  const row = normaliseDoc(entry);          // untrusted: review := 'pending'
  if (!row) return null;
  const rows = loadDocs(companyId);
  const at   = rows.findIndex(d => d.id === row.id);

  if (at >= 0){
    const prev = rows[at];
    /* Carry the existing review across an edit - but only while the edit
       leaves the reviewed facts alone. Otherwise an owner could get a
       permit checked, then move its expiry date and keep the tick. */
    const changed = docMateriallyChanged(prev, row);
    row.review     = reviewFor(row.type, changed ? 'pending' : prev.review);
    row.reviewLog  = (prev.reviewLog || []).slice();
    row.reviewNote = changed ? '' : (prev.reviewNote || '');
    if (changed && isReviewableType(row.type))
      row.reviewLog.push({ at: opsToday(), review:'pending', auto:true,
        note:'Returned to the queue automatically - the company changed a reviewed detail.' });
    row.reviewLog = row.reviewLog.slice(-MAX_REVIEW_LOG);
    rows[at] = row;
  } else if (rows.length >= MAX_DOCS){
    return null;
  } else {
    rows.push(row);
  }
  return saveDocs(companyId, rows);
}
function removeDoc(companyId, id){
  return saveDocs(companyId, loadDocs(companyId).filter(d => d.id !== id));
}
function setDocPublished(companyId, id, on){
  const rows = loadDocs(companyId);
  const d = rows.find(x => x.id === id);
  if (!d) return null;
  d.published = !!on;
  return saveDocs(companyId, rows);
}

/** Owner's full list, expiry resolved. Sorted soonest-to-expire first. */
function opsCompliance(companyId, today){
  const t = today || opsToday();
  return loadDocs(companyId, t)
    .map(d => Object.assign({}, d, docState(d, t)))
    .sort((a, b) => (a.expires || '9999').localeCompare(b.expires || '9999'));
}

/* =====================================================================
   REGISTRATION COMPLETENESS
   A company is only registrable once all three verified documents are on
   file WITH A FILE ATTACHED. A typed permit number is not a document -
   there would be nothing for a reviewer to check against the issuing
   office, which is the entire point of requiring them.
   ===================================================================== */
function registrationStatus(companyId, today){
  const t = today || opsToday();
  const rows = loadDocs(companyId, t);
  const items = DOC_TYPES.filter(d => d.reviewable).map(d => {
    const doc = rows.find(r => r.type === d.id);
    return {
      type: d.id, label: d.label,
      present: !!doc,
      hasFile: !!(doc && doc.file),
      review:  doc ? doc.review : null,
      state:   doc ? docState(doc, t).state : null,
      /* "done" means a reviewer has something to work with, not that the
         verdict has landed - registration should not wait on our queue. */
      done: !!(doc && doc.file)
    };
  });
  const missing = items.filter(i => !i.done);
  return {
    items, missing,
    complete: missing.length === 0,
    have: items.length - missing.length,
    need: items.length,
    /* separate from completeness: all three checked and current */
    verified: items.every(i => i.review === 'verified' && i.state !== 'expired')
  };
}

/** What the public page may show - and only ever this. */
function publishedDocs(companyId, today){
  const t = today || opsToday();
  return opsCompliance(companyId, t)
    .filter(d => d.published)
    .map(d => ({
      id:d.id, type:d.type, name:d.name, issuer:d.issuer,
      number: d.showNumber ? d.number : maskNumber(d.number),
      numberMasked: !d.showNumber && !!d.number,
      issued:d.issued, expires:d.expires,
      state:d.state, daysLeft:d.daysLeft, label:d.label,
      review:d.review, note:d.note,
      /* reviewNote and reviewLog are deliberately absent. A reviewer's
         remark is written for the company and for us - it can name a
         suspicion, an unfinished check, or a person. None of that belongs
         on a public page, where it would read as a published accusation. */
      /* the scan itself travels only when the owner ticked that box too */
      file: (d.showFile && d.file) ? d.file : null,
      hasFile: !!d.file
    }));
}

/* =====================================================================
   STATISTICS
   Revenue is recognised on the booking's START date. That is a choice, not
   a law - but it has to be one choice, applied everywhere, or the monthly
   chart and the P&L will disagree with each other.
   ===================================================================== */
const inRange = (d, from, to) => d >= from && d <= to;

function opsStats(companyId, from, to, today){
  const t     = today || opsToday();
  const all   = opsBookings(companyId, t);
  const exAll = opsExpenses(companyId, t);
  const units = opsFleet(companyId);

  const books = all.filter(b => inRange(b.start, from, to));
  const exps  = exAll.filter(e => inRange(e.date, from, to));

  const live      = books.filter(b => b.status !== 'cancelled');
  const revenue   = live.reduce((n, b) => n + b.total, 0);
  const expenses  = exps.reduce((n, e) => n + e.amount, 0);
  const spanDays  = Math.max(1, daysBetween(from, to) + 1);

  /* Utilisation: hired unit-days that fall inside the window, over the
     unit-days the fleet could theoretically have sold in it. Clipping to
     the window matters - a 21-day hire straddling the month boundary must
     not book 21 days into a 30-day month. */
  let hiredDays = 0;
  live.forEach(b => {
    const s = b.start > from ? b.start : from;
    const e = b.end   < to   ? b.end   : to;
    if (e >= s) hiredDays += daysBetween(s, e) + 1;
  });
  const fleetQty  = units.reduce((n, u) => n + Math.max(1, u.qty || 1), 0) || 1;
  const capacity  = fleetQty * spanDays;
  const utilisation = Math.min(100, Math.round(hiredDays / capacity * 1000) / 10);

  /* By month, across the window - the shape of the business over time. */
  const mMap = {};
  const touch = k => (mMap[k] = mMap[k] || { key:k, label:monthLabel(k), revenue:0, expenses:0, bookings:0 });
  live.forEach(b => { const m = touch(monthKey(b.start)); m.revenue += b.total; m.bookings++; });
  exps.forEach(e => { touch(monthKey(e.date)).expenses += e.amount; });
  const byMonth = Object.values(mMap).sort((a, b) => a.key.localeCompare(b.key));

  /* Per unit - the table that answers "what should I sell or buy more of". */
  const uMap = {};
  units.forEach(u => uMap[u.id] = {
    id:u.id, name:u.name, cat:u.cat, qty:Math.max(1, u.qty || 1),
    bookings:0, days:0, revenue:0
  });
  live.forEach(b => {
    const r = uMap[b.unitId]; if (!r) return;
    const s = b.start > from ? b.start : from;
    const e = b.end   < to   ? b.end   : to;
    r.bookings++;
    if (e >= s) r.days += daysBetween(s, e) + 1;
    r.revenue += b.total;
  });
  const byUnit = Object.values(uMap).map(r => Object.assign(r, {
    utilisation: Math.min(100, Math.round(r.days / (r.qty * spanDays) * 1000) / 10),
    perDay: r.days ? Math.round(r.revenue / r.days) : 0
  })).sort((a, b) => b.revenue - a.revenue);

  const byStatus = BOOK_STATUS_IDS.map(id => {
    const rows = books.filter(b => b.status === id);
    return { id, label:BOOK_STATUS[id].label, tone:BOOK_STATUS[id].tone,
             count:rows.length, amount:rows.reduce((n, b) => n + b.total, 0) };
  });

  const byCat = ['vehicles','equipment','towing'].map(cat => {
    const rows = live.filter(b => b.cat === cat);
    return { cat, label:CAT_LABEL[cat], bookings:rows.length,
             revenue:rows.reduce((n, b) => n + b.total, 0) };
  }).filter(r => r.bookings);

  const byExpCat = EXPENSE_CATS.map(c => {
    const amount = exps.filter(e => e.cat === c.id).reduce((n, e) => n + e.amount, 0);
    return { id:c.id, label:c.label, amount,
             pct: expenses ? Math.round(amount / expenses * 1000) / 10 : 0 };
  }).filter(r => r.amount).sort((a, b) => b.amount - a.amount);

  const customers = {};
  live.forEach(b => customers[b.customer] = (customers[b.customer] || 0) + 1);
  const names  = Object.keys(customers);
  const repeat = names.filter(n => customers[n] > 1).length;

  const net = revenue - expenses;
  return {
    from, to, spanDays, label: fmtDate(from) + ' – ' + fmtDate(to),
    revenue, expenses, net,
    margin: revenue ? Math.round(net / revenue * 1000) / 10 : 0,
    vat: live.reduce((n, b) => n + b.vat, 0),
    bookings: books.length, liveBookings: live.length,
    avgValue: live.length ? Math.round(revenue / live.length) : 0,
    avgDays: live.length ? Math.round(live.reduce((n, b) => n + b.days, 0) / live.length * 10) / 10 : 0,
    hiredDays, capacity, fleetQty, fleetSize: units.length, utilisation,
    outstanding: all.filter(b => b.status !== 'cancelled').reduce((n, b) => n + b.balance, 0),
    pendingNow: all.filter(b => b.status === 'pending').length,
    onhireNow:  all.filter(b => b.status === 'onhire').length,
    customers: names.length, repeatCustomers: repeat,
    repeatRate: names.length ? Math.round(repeat / names.length * 1000) / 10 : 0,
    byMonth, byUnit, byStatus, byCat, byExpCat
  };
}

/* =====================================================================
   TREND SERIES
   The bucket has to follow the window. Monthly buckets inside a 30-day
   period produce two bars, one of which covers two days - arithmetically
   correct and visually meaningless. Days for a fortnight, weeks for a
   quarter, months beyond that.
   ===================================================================== */
function opsSeries(companyId, from, to, today){
  const t    = today || opsToday();
  const span = daysBetween(from, to) + 1;
  const mode = span <= 16 ? 'day' : span <= 120 ? 'week' : 'month';

  const buckets = [];
  const index = {};
  if (mode === 'month'){
    let k = monthKey(from);
    while (k <= monthKey(to)){
      index[k] = buckets.length;
      buckets.push({ key:k, label:monthLabel(k), revenue:0, expenses:0, bookings:0 });
      k = monthKey(addMonths(k + '-01', 1));
    }
  } else {
    const step = mode === 'day' ? 1 : 7;
    for (let d = from; d <= to; d = addDays(d, step)){
      const end = addDays(d, step - 1) > to ? to : addDays(d, step - 1);
      buckets.push({ key:d, end,
        label: mode === 'day' ? fmtDateShort(d) : fmtDateShort(d),
        revenue:0, expenses:0, bookings:0 });
    }
  }
  const slot = date => {
    if (mode === 'month') return buckets[index[monthKey(date)]];
    for (let i = buckets.length - 1; i >= 0; i--)
      if (date >= buckets[i].key) return buckets[i];
    return null;
  };

  opsBookings(companyId, t).forEach(b => {
    if (b.status === 'cancelled' || !inRange(b.start, from, to)) return;
    const s = slot(b.start); if (!s) return;
    s.revenue += b.total; s.bookings++;
  });
  opsExpenses(companyId, t).forEach(e => {
    if (!inRange(e.date, from, to)) return;
    const s = slot(e.date); if (s) s.expenses += e.amount;
  });

  return { mode, buckets,
           note: mode === 'day' ? 'by day' : mode === 'week' ? 'by week' : 'by month' };
}

/* =====================================================================
   ATTENTION - the short list an owner should act on today
   ===================================================================== */
function opsAlerts(companyId, today){
  const t = today || opsToday();
  const books = opsBookings(companyId, t);
  const units = opsFleet(companyId);
  const out = [];

  const stale = books.filter(b => b.status === 'pending' && daysBetween(b.placed, t) >= 2);
  if (stale.length)
    out.push({ level:'urgent', title:`${stale.length} booking request${stale.length > 1 ? 's' : ''} waiting over 48 hours`,
               body:'Renters who wait usually book elsewhere. Accept or decline to keep your response time.', go:'bookings', range:'upcoming' });

  const overdue = books.filter(b => b.status === 'onhire' && b.end < t);
  if (overdue.length)
    out.push({ level:'urgent', title:`${overdue.length} unit${overdue.length > 1 ? 's are' : ' is'} past the return date`,
               body:'Still marked on hire after the agreed end date. Confirm the return or extend the contract.', go:'bookings', range:'quarter' });

  const owed = books.filter(b => b.status === 'completed' && b.balance > 0);
  if (owed.length)
    out.push({ level:'warn', title:`${(typeof money === 'function' ? money(owed.reduce((n, b) => n + b.balance, 0)) : '')} uncollected on closed bookings`,
               body:`${owed.length} completed hire${owed.length > 1 ? 's' : ''} still carry a balance.`, go:'bookings', range:'year' });

  const docs = opsCompliance(companyId, t).filter(d => d.state !== 'ok');
  if (docs.length)
    out.push({ level: docs.some(d => d.state === 'expired') ? 'urgent' : 'warn',
               title:`${docs.length} document${docs.length > 1 ? 's need' : ' needs'} renewal`,
               body: docs.slice(0, 3).map(d => d.name).join(', ') + (docs.length > 3 ? '…' : ''), go:'overview' });

  const noPhoto = units.filter(u => !u.photo).length;
  if (noPhoto)
    out.push({ level:'info', title:`${noPhoto} listing${noPhoto > 1 ? 's have' : ' has'} no photo of its own`,
               body:'Those fall back to a stock image renters can tell is not yours.', go:'storefront' });

  const idle = opsStats(companyId, addDays(t, -60), t, t).byUnit.filter(u => !u.bookings);
  if (idle.length)
    out.push({ level:'info', title:`${idle.length} unit${idle.length > 1 ? 's have' : ' has'} not been hired in 60 days`,
               body: idle.slice(0, 3).map(u => u.name).join(', ') + (idle.length > 3 ? '…' : ''), go:'overview' });

  return out;
}

/* =====================================================================
   REPORT MODEL
   One plain object; the screen preview, the print sheet and the PDF writer
   all render from it. Adding a report means adding a case here - no
   renderer changes.
   ===================================================================== */
const REPORT_KINDS = [
  { id:'summary',  name:'Business summary',  note:'Headline figures, monthly trend and best performers.' },
  { id:'bookings', name:'Booking register',  note:'Every booking in the period, with payment status.' },
  { id:'expenses', name:'Expense ledger',    note:'Itemised spend with category subtotals.' },
  { id:'fleet',    name:'Fleet utilisation', note:'Days hired, revenue and idle time per unit.' },
  { id:'pnl',      name:'Profit & loss',     note:'Revenue against costs, with net margin.' },
  { id:'tax',      name:'VAT summary',       note:'Output VAT by month for BIR filing.' }
];
const REPORT_KIND_IDS = REPORT_KINDS.map(k => k.id);

const rMoney = n => (typeof money === 'function' ? money(n) : '₱' + Number(n || 0).toLocaleString('en-PH'));
const rPct   = n => (Math.round(n * 10) / 10) + '%';

function buildReport(kind, companyId, from, to, today){
  const t  = today || opsToday();
  const k  = REPORT_KIND_IDS.includes(kind) ? kind : 'summary';
  const co = (typeof byId === 'function' && byId(companyId)) || { name: companyId, loc: '' };
  const s  = opsStats(companyId, from, to, t);
  const meta = REPORT_KINDS.find(r => r.id === k);

  const model = {
    kind: k,
    title: meta.name,
    company: co.name,
    companyLoc: co.loc || '',
    period: fmtDate(from) + ' – ' + fmtDate(to),
    generated: fmtDate(t),
    subtitle: meta.note,
    kpis: [], tables: [], notes: []
  };

  if (k === 'summary'){
    model.kpis = [
      { label:'Revenue',        value:rMoney(s.revenue), note:`${s.liveBookings} confirmed bookings` },
      { label:'Expenses',       value:rMoney(s.expenses), note:`across ${s.byExpCat.length} categories` },
      { label:'Net',            value:rMoney(s.net), note:`${rPct(s.margin)} margin` },
      { label:'Utilisation',    value:rPct(s.utilisation), note:`${s.hiredDays} of ${s.capacity} unit-days` },
      { label:'Average booking',value:rMoney(s.avgValue), note:`${s.avgDays} days typical` },
      { label:'Outstanding',    value:rMoney(s.outstanding), note:'uncollected balances' }
    ];
    model.tables.push({
      title:'Month by month',
      cols:[ {label:'Month',w:3}, {label:'Bookings',w:2,align:'right'},
             {label:'Revenue',w:3,align:'right'}, {label:'Expenses',w:3,align:'right'},
             {label:'Net',w:3,align:'right'} ],
      rows: s.byMonth.map(m => [m.label, String(m.bookings), rMoney(m.revenue),
                                rMoney(m.expenses), rMoney(m.revenue - m.expenses)]),
      total: ['Total', String(s.liveBookings), rMoney(s.revenue), rMoney(s.expenses), rMoney(s.net)]
    });
    model.tables.push({
      title:'Best performing units',
      cols:[ {label:'Unit',w:6}, {label:'Bookings',w:2,align:'right'},
             {label:'Days hired',w:2,align:'right'}, {label:'Revenue',w:3,align:'right'},
             {label:'Utilisation',w:2,align:'right'} ],
      rows: s.byUnit.slice(0, 12).map(u => [u.name, String(u.bookings), String(u.days),
                                            rMoney(u.revenue), rPct(u.utilisation)])
    });
    if (s.byCat.length > 1)
      model.tables.push({
        title:'By service line',
        cols:[ {label:'Service line',w:6}, {label:'Bookings',w:2,align:'right'}, {label:'Revenue',w:3,align:'right'} ],
        rows: s.byCat.map(c => [c.label, String(c.bookings), rMoney(c.revenue)])
      });
  }

  if (k === 'bookings'){
    const rows = opsBookings(companyId, t).filter(b => inRange(b.start, from, to));
    model.kpis = [
      { label:'Bookings',   value:String(rows.length), note:`${s.liveBookings} not cancelled` },
      { label:'Revenue',    value:rMoney(s.revenue) },
      { label:'Average',    value:rMoney(s.avgValue) },
      { label:'Outstanding',value:rMoney(s.outstanding), note:'across all open bookings' }
    ];
    model.tables.push({
      title:'Bookings',
      cols:[ {label:'Ref',w:3}, {label:'Dates',w:4}, {label:'Customer',w:5},
             {label:'Unit',w:5}, {label:'Status',w:2}, {label:'Paid',w:2},
             {label:'Total',w:3,align:'right'} ],
      rows: rows.map(b => [b.ref, fmtDateShort(b.start) + ' – ' + fmtDateShort(b.end),
                           b.customer, b.unitName, BOOK_STATUS[b.status].label,
                           PAY_STATUS[b.pay].label, rMoney(b.total)]),
      total: ['', '', '', '', '', 'Total', rMoney(rows.reduce((n, b) => n + b.total, 0))]
    });
    model.notes.push('Cancelled bookings are listed for completeness and carry a zero total.');
  }

  if (k === 'expenses'){
    const rows = opsExpenses(companyId, t).filter(e => inRange(e.date, from, to));
    model.kpis = [
      { label:'Total spend', value:rMoney(s.expenses), note:`${rows.length} entries` },
      { label:'Largest category', value:s.byExpCat.length ? s.byExpCat[0].label : '-',
        note:s.byExpCat.length ? rPct(s.byExpCat[0].pct) + ' of spend' : '' },
      { label:'Against revenue', value:s.revenue ? rPct(Math.round(s.expenses / s.revenue * 1000) / 10) : '-' }
    ];
    model.tables.push({
      title:'By category',
      cols:[ {label:'Category',w:6}, {label:'Share',w:2,align:'right'}, {label:'Amount',w:3,align:'right'} ],
      rows: s.byExpCat.map(c => [c.label, rPct(c.pct), rMoney(c.amount)]),
      total: ['Total', '100%', rMoney(s.expenses)]
    });
    model.tables.push({
      title:'Ledger',
      cols:[ {label:'Date',w:3}, {label:'Category',w:4}, {label:'Payee',w:5},
             {label:'Unit',w:4}, {label:'Method',w:3}, {label:'Amount',w:3,align:'right'} ],
      rows: rows.map(e => [fmtDateShort(e.date), expenseCatLabel(e.cat), e.vendor,
                           e.unitName || '-', e.method, rMoney(e.amount)]),
      total: ['', '', '', '', 'Total', rMoney(rows.reduce((n, e) => n + e.amount, 0))]
    });
  }

  if (k === 'fleet'){
    model.kpis = [
      { label:'Units listed',  value:String(s.fleetSize), note:`${s.fleetQty} physical units` },
      { label:'Utilisation',   value:rPct(s.utilisation), note:`${s.hiredDays} of ${s.capacity} unit-days` },
      { label:'Idle units',    value:String(s.byUnit.filter(u => !u.bookings).length), note:'no bookings this period' },
      { label:'Revenue / unit',value:rMoney(s.fleetSize ? Math.round(s.revenue / s.fleetSize) : 0) }
    ];
    model.tables.push({
      title:'Every unit',
      cols:[ {label:'Unit',w:6}, {label:'Line',w:3}, {label:'Qty',w:1,align:'right'},
             {label:'Bookings',w:2,align:'right'}, {label:'Days hired',w:2,align:'right'},
             {label:'Idle days',w:2,align:'right'}, {label:'Revenue',w:3,align:'right'},
             {label:'Util.',w:2,align:'right'} ],
      rows: s.byUnit.map(u => [u.name, CAT_LABEL[u.cat] || u.cat, String(u.qty),
                               String(u.bookings), String(u.days),
                               String(Math.max(0, u.qty * s.spanDays - u.days)),
                               rMoney(u.revenue), rPct(u.utilisation)]),
      total: ['Total', '', String(s.fleetQty), String(s.liveBookings), String(s.hiredDays),
              String(Math.max(0, s.capacity - s.hiredDays)), rMoney(s.revenue), rPct(s.utilisation)]
    });
    model.notes.push('Utilisation counts only the hire days that fall inside the reporting period, so a booking that straddles the end date is not double-counted.');
  }

  if (k === 'pnl'){
    const gross = s.revenue - s.vat;
    model.kpis = [
      { label:'Revenue (incl. VAT)', value:rMoney(s.revenue) },
      { label:'Operating costs',     value:rMoney(s.expenses) },
      { label:'Net',                 value:rMoney(s.net), note:rPct(s.margin) + ' margin' }
    ];
    model.tables.push({
      title:'Revenue',
      cols:[ {label:'Line',w:7}, {label:'Bookings',w:2,align:'right'}, {label:'Amount',w:3,align:'right'} ],
      rows: s.byCat.map(c => [c.label, String(c.bookings), rMoney(c.revenue)])
             .concat([['Output VAT included above', '', '(' + rMoney(s.vat) + ')']]),
      total: ['Gross revenue', String(s.liveBookings), rMoney(s.revenue)]
    });
    model.tables.push({
      title:'Costs',
      cols:[ {label:'Category',w:7}, {label:'Share',w:2,align:'right'}, {label:'Amount',w:3,align:'right'} ],
      rows: s.byExpCat.map(c => [c.label, rPct(c.pct), rMoney(c.amount)]),
      total: ['Total costs', '100%', rMoney(s.expenses)]
    });
    model.tables.push({
      title:'Result',
      cols:[ {label:'',w:7}, {label:'',w:2}, {label:'Amount',w:3,align:'right'} ],
      rows: [
        ['Revenue net of VAT', '', rMoney(gross)],
        ['Operating costs',    '', '(' + rMoney(s.expenses) + ')']
      ],
      total: ['Net for the period', '', rMoney(s.net)]
    });
    model.notes.push('Prepared on a booking-start basis: a hire is recognised on the day it begins, not the day it is invoiced or paid.');
  }

  if (k === 'tax'){
    const rows = opsBookings(companyId, t)
      .filter(b => inRange(b.start, from, to) && b.status !== 'cancelled');
    const mMap = {};
    rows.forEach(b => {
      const m = mMap[monthKey(b.start)] = mMap[monthKey(b.start)] ||
        { key:monthKey(b.start), net:0, vat:0, n:0 };
      m.net += b.net; m.vat += b.vat; m.n++;
    });
    const months = Object.values(mMap).sort((a, b) => a.key.localeCompare(b.key));
    model.kpis = [
      { label:'Net of VAT', value:rMoney(s.revenue - s.vat) },
      { label:'Output VAT', value:rMoney(s.vat), note:'12% standard rate' },
      { label:'Gross',      value:rMoney(s.revenue) }
    ];
    model.tables.push({
      title:'Output VAT by month',
      cols:[ {label:'Month',w:4}, {label:'Invoices',w:2,align:'right'},
             {label:'Net of VAT',w:3,align:'right'}, {label:'Output VAT',w:3,align:'right'},
             {label:'Gross',w:3,align:'right'} ],
      rows: months.map(m => [monthLabel(m.key), String(m.n), rMoney(m.net), rMoney(m.vat), rMoney(m.net + m.vat)]),
      total: ['Total', String(rows.length), rMoney(s.revenue - s.vat), rMoney(s.vat), rMoney(s.revenue)]
    });
    model.notes.push('Indicative only. Figures follow the booking date and have not been reconciled against issued official receipts - check with your accountant before filing.');
  }

  model.notes.push('Generated from FR Services company admin on ' + fmtDate(t) + '. Prototype data.');
  return model;
}
