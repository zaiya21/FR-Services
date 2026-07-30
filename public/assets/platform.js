/* =====================================================================
   PLATFORM - the FR Services side of the marketplace
   ---------------------------------------------------------------------
   The company admin answers "how is my yard doing". This answers "how is
   the marketplace doing, and which sellers can renters trust".

   THE BOUNDARY THIS FILE KEEPS. A platform operator sees marketplace
   activity - bookings, gross value, commission, documents, reports,
   compliance. They do NOT see a company's private books: the expense
   ledger a seller keeps in `fr.expenses.<id>` is theirs, not ours, and
   nothing here reads it. Being the landlord is not the same as being the
   accountant, and a console that quietly blurs the two is one subpoena
   away from being a problem.

   The one thing this side CAN write that the company side cannot is a
   document's `review` state. That asymmetry is the whole point of the
   verification model in ops.js - see ARCHITECTURE.md.

   COST. A full scan regenerates every company's bookings: ~750 ms for 42
   companies. That is fine once per view and far too slow per keystroke,
   so the scan is memoised on (from, to, today) and every filter runs
   against the cached result.
   ===================================================================== */

/* =====================================================================
   HOW FR SERVICES EARNS
   Listing is free - there is no subscription. Income is commission on
   completed bookings, and the rate follows the service line:

     rentals (vehicles and heavy equipment)   8%
     emergency towing                        12%

   Towing carries the higher rate because it is dispatch work: short
   notice, small ticket, and the platform is doing the hard part - finding
   an available truck at 2am is the service being sold. A rental booking
   is planned days ahead and the yard would likely have got it anyway.

   One table, read everywhere. A rate that lives in two places will
   disagree with itself the first time one of them is edited.
   ===================================================================== */
const PLATFORM_SUBSCRIPTION = 0;          // free to list, deliberately
const PLATFORM_RATES = {
  vehicles:  0.08,
  equipment: 0.08,
  towing:    0.12
};
const PLATFORM_RATE_DEFAULT = 0.08;       // anything unclassified

/** The rate that applies to one service line. */
const rateFor = cat => (cat in PLATFORM_RATES) ? PLATFORM_RATES[cat] : PLATFORM_RATE_DEFAULT;

/** Commission on one booking. Cancelled bookings bill nothing. */
function commissionOn(booking){
  if (!booking || booking.status === 'cancelled') return 0;
  return Math.round((booking.total || 0) * rateFor(booking.cat));
}

/* For the panel that states the model on screen. */
const PLATFORM_PRICING = [
  { key:'subscription', label:'Listing subscription', value:'Free',
    note:'No monthly fee, no joining fee. A company pays only when it earns.' },
  { key:'rentals', label:'Vehicle & equipment rental', value:'8% commission',
    note:'Charged on the booking total, on confirmed bookings only.' },
  { key:'towing', label:'Emergency towing', value:'12% commission',
    note:'Higher because dispatch is the service, meaning finding an available truck at short notice.' }
];

const REVIEW_QUEUE_STATES = ['pending', 'verified', 'rejected'];

/* ---------------------------------------------------------------
   Reports raised by renters, from the report modal on a company page.
   --------------------------------------------------------------- */
const REPORT_KEY = 'fr.reports';
const REPORT_REASONS = {
  scam:     'Fraud or scam',
  listing:  'Misleading listing',
  unsafe:   'Unsafe vehicle or equipment',
  conduct:  'Harassment or unsafe conduct',
  reviews:  'Fake reviews or impersonation',
  other:    'Something else'
};
const REPORT_STATES = {
  open:        { label:'Open',         tone:'warn' },
  reviewing:   { label:'Under review', tone:'info' },
  upheld:      { label:'Upheld',       tone:'off'  },
  dismissed:   { label:'Dismissed',    tone:'ok'   }
};
const REPORT_STATE_IDS = Object.keys(REPORT_STATES);
const MAX_REPORTS = 400;

function normaliseReport(raw){
  if (!raw || typeof raw !== 'object') return null;
  const txt = (v, n) => String(v == null ? '' : v)
    .replace(/[\u0000-\u001f\u007f]/g, '').slice(0, n).trim();
  const company = txt(raw.company, 60);
  if (!company) return null;
  return {
    id:      txt(raw.id, 24) || ('r' + Math.random().toString(36).slice(2, 10)),
    company,
    reason:  REPORT_REASONS[raw.reason] ? raw.reason : 'other',
    detail:  txt(raw.detail, 1200),
    ref:     txt(raw.ref, 40),
    anon:    !!raw.anon,
    at:      /^\d{4}-\d{2}-\d{2}$/.test(String(raw.at || '')) ? raw.at : opsToday(),
    state:   REPORT_STATE_IDS.includes(raw.state) ? raw.state : 'open',
    note:    txt(raw.note, 400)
  };
}

/* A demo backlog, so the queue is not empty on first open. Deterministic,
   for the same reason every other figure here is. */
function seedReports(today){
  const t = today || opsToday();
  const rnd = opsRng('fr:reports');
  const cos = (typeof FR_COMPANIES !== 'undefined' ? FR_COMPANIES : []);
  if (!cos.length) return [];
  const reasons = Object.keys(REPORT_REASONS);
  const detail = {
    scam:    'Asked me to send the deposit by GCash to a personal number instead of through the platform.',
    listing: 'The unit that turned up was an older model than the photos on the listing.',
    unsafe:  'Tyres were bald and the spare was missing. I refused the handover.',
    conduct: 'Repeated calls after I cancelled, well outside business hours.',
    reviews: 'Several five-star reviews posted the same day with near-identical wording.',
    other:   'Company would not provide an official receipt after payment.'
  };
  const out = [];
  const n = 14;
  for (let i = 0; i < n; i++){
    const co = cos[Math.floor(rnd() * cos.length)];
    const reason = reasons[Math.floor(rnd() * reasons.length)];
    const age = Math.floor(rnd() * 60);
    out.push(normaliseReport({
      id: 'seed-r' + i,
      company: co.id,
      reason,
      detail: detail[reason],
      ref: rnd() < 0.5 ? 'FR-2026-' + (1000 + Math.floor(rnd() * 8999)) : '',
      anon: rnd() < 0.4,
      at: addDays(t, -age),
      state: age > 30 ? (rnd() < 0.5 ? 'upheld' : 'dismissed')
           : age > 7  ? 'reviewing' : 'open'
    }));
  }
  return out.filter(Boolean).sort((a, b) => b.at.localeCompare(a.at));
}

function loadReports(today){
  try {
    const raw = JSON.parse(localStorage.getItem(REPORT_KEY));
    if (Array.isArray(raw)) return raw.slice(0, MAX_REPORTS).map(normaliseReport).filter(Boolean);
  } catch { /* fall through to the seed */ }
  return seedReports(today);
}
function saveReports(rows){
  try {
    const clean = (Array.isArray(rows) ? rows : [])
      .slice(0, MAX_REPORTS).map(normaliseReport).filter(Boolean)
      .sort((a, b) => b.at.localeCompare(a.at));
    localStorage.setItem(REPORT_KEY, JSON.stringify(clean));
    return clean;
  } catch { return null; }
}
/** Called from the public company page when a renter submits the form. */
function addReport(entry){
  const row = normaliseReport(Object.assign({ state:'open' }, entry));
  if (!row) return null;
  return saveReports([row].concat(loadReports()));
}
function setReportState(id, state, note){
  if (!REPORT_STATE_IDS.includes(state)) return null;
  const rows = loadReports();
  const r = rows.find(x => x.id === id);
  if (!r) return null;
  r.state = state;
  if (note !== undefined) r.note = note;
  return saveReports(rows);
}

/* =====================================================================
   DOCUMENT REVIEW
   The queue the platform works through, and the only place a review
   verdict is written.
   ===================================================================== */

/* A rejection with no reason is useless to the company receiving it - they
   cannot fix what they have not been told. Approvals and returns can stand
   on their own, so the remark is optional there. */
const REVIEW_NOTE_REQUIRED = ['rejected'];
const MAX_REVIEW_NOTE = 400;

/**
 * Platform-only. The company admin has no path to this function.
 * @returns {{ok:boolean, error?:string}}
 */
function setDocReview(companyId, docId, review, note){
  if (!REVIEW_QUEUE_STATES.includes(review))
    return { ok:false, error:'Unknown verdict.' };

  const remark = String(note == null ? '' : note)
    .replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, MAX_REVIEW_NOTE);
  if (REVIEW_NOTE_REQUIRED.includes(review) && !remark)
    return { ok:false, error:'Say why it was rejected, because the company needs something to act on.' };

  const rows = loadDocs(companyId);
  const d = rows.find(x => x.id === docId);
  if (!d) return { ok:false, error:'That document no longer exists.' };

  /* FR Services verifies business registration only. Putting a verdict on
     an insurance policy or an OR/CR would be claiming a check we do not
     carry out. */
  if (!isReviewableType(d.type))
    return { ok:false,
      error:'FR Services only verifies DTI, mayor’s permit and BIR 2303. This one is the company’s own to publish.' };

  d.review = review;
  d.reviewNote = remark;
  d.reviewLog = (d.reviewLog || []).concat({
    at: opsToday(), review, note: remark, auto: false
  }).slice(-12);

  /* saveDocs is the trusted writer, so the verdict and its remark survive
     the normalise pass on the way back in. */
  return saveDocs(companyId, rows) ? { ok:true } : { ok:false, error:'Could not save.' };
}

/** Every document across every company, flattened for the review queue. */
function allDocuments(today){
  const t = today || opsToday();
  const cos = (typeof FR_COMPANIES !== 'undefined' ? FR_COMPANIES : []);
  const out = [];
  cos.forEach(co => {
    loadDocs(co.id, t).forEach(d => {
      out.push(Object.assign({}, d, docState(d, t), {
        companyId: co.id, companyName: co.name, companyLoc: co.loc,
        reviewable: isReviewableType(d.type)
      }));
    });
  });
  /* Oldest unreviewed first - a queue is worked front to back. */
  const rank = { pending: 0, rejected: 1, verified: 2, exempt: 3 };
  return out.sort((a, b) =>
    (rank[a.review] - rank[b.review]) ||
    (a.expires || '9999').localeCompare(b.expires || '9999'));
}

/** Only what the platform will actually rule on. */
function reviewableDocuments(today){
  return allDocuments(today).filter(d => d.reviewable);
}

/* =====================================================================
   THE SCAN
   One pass over every company. Memoised, because it is expensive and
   every filter on the page reads from it.
   ===================================================================== */
let _scan = { key:null, data:null };

function platformScan(from, to, today){
  const t   = today || opsToday();
  const key = from + '|' + to + '|' + t;
  if (_scan.key === key) return _scan.data;

  const cos   = (typeof FR_COMPANIES !== 'undefined' ? FR_COMPANIES : []);
  const docs  = allDocuments(t);
  const reps  = loadReports(t);

  const byCompanyDocs = {};
  docs.forEach(d => {
    const b = byCompanyDocs[d.companyId] = byCompanyDocs[d.companyId] ||
      { total:0, published:0, verified:0, pending:0, rejected:0, expired:0,
        /* reviewable counts sit alongside the totals: `total` is "documents
           on file", `reviewable` is "documents we rule on". Conflating them
           is how a company with nine insurance scans looked better verified
           than one with all three permits approved. */
        reviewable:0, reviewableExpired:0, withFile:0 };
    b.total++;
    if (d.published) b.published++;
    if (d.reviewable){
      b.reviewable++;
      if (d.file) b.withFile++;
      if (d.state === 'expired') b.reviewableExpired++;
    }
    if (d.review === 'verified') b.verified++;
    if (d.review === 'pending')  b.pending++;
    if (d.review === 'rejected') b.rejected++;
    if (d.state === 'expired')   b.expired++;
  });

  const openReports = {};
  reps.filter(r => r.state === 'open' || r.state === 'reviewing')
      .forEach(r => openReports[r.company] = (openReports[r.company] || 0) + 1);

  /* The trend bucket follows the window, for the same reason it does in
     the company console: month buckets inside a 30-day view produce two
     bars, one of which covers a single day. Buckets are built here from
     BOOKINGS ONLY - opsSeries would have been the obvious reuse, but it
     folds in the company's expense ledger, which this side must not read. */
  const span = daysBetween(from, to) + 1;
  const mode = span <= 16 ? 'day' : span <= 120 ? 'week' : 'month';
  const buckets = [];
  const index = {};
  if (mode === 'month'){
    let k = monthKey(from);
    while (k <= monthKey(to)){
      index[k] = buckets.length;
      buckets.push({ key:k, label:monthLabel(k), gmv:0, bookings:0, commission:0 });
      k = monthKey(addMonths(k + '-01', 1));
    }
  } else {
    const step = mode === 'day' ? 1 : 7;
    for (let d = from; d <= to; d = addDays(d, step))
      buckets.push({ key:d, label:fmtDateShort(d), gmv:0, bookings:0, commission:0 });
  }
  const slotFor = date => {
    if (mode === 'month') return buckets[index[monthKey(date)]];
    for (let i = buckets.length - 1; i >= 0; i--)
      if (date >= buckets[i].key) return buckets[i];
    return null;
  };

  const rows = cos.map(co => {
    /* opsStats regenerates this company's bookings; the cache in ops.js
       holds one company at a time, so peak memory stays flat. The
       opsBookings call below is a cache hit on that same company. */
    const s = opsStats(co.id, from, to, t);
    /* Commission is summed per booking, not taken off the company total.
       A multi-service company earns at two different rates, so one
       multiplication against its combined revenue would be wrong for
       every company that does both towing and rental. */
    let coCommission = 0;
    const coByCat = { vehicles:0, equipment:0, towing:0 };
    opsBookings(co.id, t).forEach(b => {
      if (b.status === 'cancelled' || b.start < from || b.start > to) return;
      const fee = commissionOn(b);
      coCommission += fee;
      if (b.cat in coByCat) coByCat[b.cat] += fee;
      const slot = slotFor(b.start);
      if (!slot) return;
      slot.gmv += b.total;
      slot.bookings++;
      slot.commission += fee;
    });

    const place = (typeof splitPlace === 'function') ? splitPlace(co.loc) : { province:'' };
    const d = byCompanyDocs[co.id] ||
      { total:0, published:0, verified:0, pending:0, rejected:0, expired:0,
        reviewable:0, reviewableExpired:0, withFile:0 };

    return {
      id: co.id, name: co.name, loc: co.loc,
      region: place.province || place.name || '-',
      cats: (typeof catsOf === 'function') ? catsOf(co) : [co.cat],
      rating: co.rating, reviews: co.reviews, since: co.since,
      fleetSize: s.fleetSize, fleetQty: s.fleetQty,
      bookings: s.bookings, liveBookings: s.liveBookings,
      gmv: s.revenue,
      commission: coCommission,
      commissionByCat: coByCat,
      /* what this company's blended rate actually works out at */
      effectiveRate: s.revenue ? Math.round(coCommission / s.revenue * 1000) / 10 : 0,
      avgValue: s.avgValue,
      utilisation: s.utilisation,
      pendingBookings: s.pendingNow,
      docs: d,
      /* A badge is only worth anything if it can be lost. It now means
         something precise: all three registration documents on file, all
         three approved, none of them expired. Insurance and OR/CRs do not
         enter into it - the platform never checked those, so they cannot
         earn or forfeit a badge. */
      badgeOk: d.verified === REVIEWABLE_TYPES.length &&
               d.reviewable === REVIEWABLE_TYPES.length &&
               d.reviewableExpired === 0,
      badgeGap: REVIEWABLE_TYPES.length - d.verified,
      openReports: openReports[co.id] || 0
    };
  });

  const sum = (k) => rows.reduce((n, r) => n + (r[k] || 0), 0);
  const active = rows.filter(r => r.bookings > 0);

  const data = {
    from, to, today: t,
    companies: rows,
    counts: {
      companies: rows.length,
      active: active.length,
      badged: rows.filter(r => r.badgeOk).length,
      atRisk: rows.filter(r => !r.badgeOk).length
    },
    totals: {
      gmv: sum('gmv'),
      commission: sum('commission'),
      bookings: sum('bookings'),
      liveBookings: sum('liveBookings'),
      fleet: sum('fleetQty'),
      listings: sum('fleetSize'),
      avgValue: sum('liveBookings') ? Math.round(sum('gmv') / sum('liveBookings')) : 0,
      /* the blended rate across every line - what the marketplace actually
         takes, as opposed to either headline number */
      effectiveRate: sum('gmv')
        ? Math.round(sum('commission') / sum('gmv') * 1000) / 10 : 0,
      subscription: PLATFORM_SUBSCRIPTION * rows.length,
      utilisation: rows.length
        ? Math.round(rows.reduce((n, r) => n + r.utilisation, 0) / rows.length * 10) / 10 : 0,
      rating: rows.length
        ? Math.round(rows.reduce((n, r) => n + (r.rating || 0), 0) / rows.length * 100) / 100 : 0
    },
    docs: {
      total: docs.length,
      /* verdict counts are over the reviewable three only - an exempt
         document has no verdict to count */
      reviewable: docs.filter(d => d.reviewable).length,
      pending: docs.filter(d => d.review === 'pending').length,
      verified: docs.filter(d => d.review === 'verified').length,
      rejected: docs.filter(d => d.review === 'rejected').length,
      exempt: docs.filter(d => d.review === 'exempt').length,
      expired: docs.filter(d => d.state === 'expired').length,
      published: docs.filter(d => d.published).length
    },
    reports: {
      total: reps.length,
      open: reps.filter(r => r.state === 'open').length,
      reviewing: reps.filter(r => r.state === 'reviewing').length,
      upheld: reps.filter(r => r.state === 'upheld').length
    },
    series: buckets,
    seriesNote: mode === 'day' ? 'by day' : mode === 'week' ? 'by week' : 'by month',
    byRegion: groupBy(rows, r => r.region),
    byCat: ['vehicles','equipment','towing'].map(cat => {
      const set = rows.filter(r => r.cats.includes(cat));
      return { cat, label: CAT_LABEL[cat], companies: set.length,
               rate: rateFor(cat),
               /* commission earned FROM this line, which is not the same as
                  commission earned by companies that happen to offer it */
               commission: rows.reduce((n, r) => n + (r.commissionByCat[cat] || 0), 0),
               gmv: set.reduce((n, r) => n + r.gmv, 0),
               bookings: set.reduce((n, r) => n + r.bookings, 0) };
    }).filter(r => r.companies)
  };

  _scan = { key, data };
  return data;
}
function platformScanClear(){ _scan = { key:null, data:null }; }

function groupBy(rows, keyOf){
  const m = {};
  rows.forEach(r => {
    const k = keyOf(r) || '-';
    const g = m[k] = m[k] || { key:k, companies:0, gmv:0, bookings:0, commission:0 };
    g.companies++; g.gmv += r.gmv; g.bookings += r.bookings; g.commission += r.commission;
  });
  return Object.values(m).sort((a, b) => b.gmv - a.gmv);
}

/* =====================================================================
   MONITORING - what a platform operator should act on today
   ===================================================================== */
function platformAlerts(from, to, today){
  const t = today || opsToday();
  const s = platformScan(from, to, t);
  const out = [];

  if (s.docs.pending)
    out.push({ level: s.docs.pending > 10 ? 'urgent' : 'warn',
      title: `${s.docs.pending} document${s.docs.pending > 1 ? 's' : ''} waiting for review`,
      body: 'Until these are checked they show to renters as company-submitted, which is worth much less than a verified badge.',
      go: 'review' });

  /* An expired insurance scan is the company's problem; an expired permit
     we approved is ours, because our tick is still next to it. */
  const pubExpired = allDocuments(t)
    .filter(d => d.published && d.state === 'expired' && d.review === 'verified');
  if (pubExpired.length)
    out.push({ level:'urgent',
      title: `${pubExpired.length} approved document${pubExpired.length > 1 ? 's have' : ' has'} expired while still published`,
      body: pubExpired.slice(0, 3).map(d => d.companyName + ', ' + d.name).join('; ') +
            (pubExpired.length > 3 ? '…' : ''),
      go: 'review' });

  if (s.reports.open)
    out.push({ level: s.reports.open > 5 ? 'urgent' : 'warn',
      title: `${s.reports.open} unopened report${s.reports.open > 1 ? 's' : ''} from renters`,
      body: 'Reports are the only signal that arrives before the refunds do.',
      go: 'reports' });

  const noDocs = s.companies.filter(c => !c.docs.reviewable);
  if (noDocs.length)
    out.push({ level:'info',
      title: `${noDocs.length} compan${noDocs.length > 1 ? 'ies have' : 'y has'} no registration documents on file`,
      body: noDocs.slice(0, 3).map(c => c.name).join(', ') + (noDocs.length > 3 ? '…' : ''),
      go: 'companies' });

  const badged = s.companies.filter(c => !c.badgeOk && c.docs.reviewable);
  if (badged.length)
    out.push({ level:'warn',
      title: `${badged.length} verified badge${badged.length > 1 ? 's' : ''} no longer justified`,
      body: 'A badge needs DTI, mayor’s permit and BIR 2303 all approved and current.',
      go: 'companies' });

  const idle = s.companies.filter(c => !c.bookings);
  if (idle.length)
    out.push({ level:'info',
      title: `${idle.length} compan${idle.length > 1 ? 'ies took' : 'y took'} no bookings this period`,
      body: 'Worth a look before they churn.',
      go: 'companies' });

  return out;
}
