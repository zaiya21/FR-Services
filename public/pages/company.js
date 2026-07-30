
const starRow = n => Array.from({length:5}, (_, i) =>
  i < n ? '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>').join('');

/* ---- load company from ?c= ----
   There is no fallback company any more. The old `|| FR_COMPANIES[4]` was
   safe only while a seeded list guaranteed a fifth entry; against a
   registry that starts empty it hands `undefined` to every line below and
   the page dies on the first property read. Say what happened instead. */
const co = byId(qs('c'));
if (!co){
  const asked = qs('c');
  document.title = 'Company not found on FR Services';
  document.body.innerHTML =
    '<main style="max-width:620px;margin:14vh auto;padding:0 24px;' +
    'font-family:Inter,system-ui,sans-serif;text-align:center">' +
    '<h1 style="font-family:\'Space Grotesk\',sans-serif;font-size:26px;' +
    'margin:0 0 12px">This company page is not here</h1>' +
    '<p style="color:#5b6470;line-height:1.6;margin:0 0 22px">' +
    (asked
      ? 'Nothing is registered under <b>' + String(asked).replace(/[<>&]/g, '') +
        '</b>. It may have been removed, or the link may be mistyped.'
      : 'No company was named in the link.') +
    '</p><p style="color:#5b6470;line-height:1.6;margin:0 0 22px">' +
    'Companies appear here once they have completed registration.</p>' +
    '<a href="/" style="display:inline-block;background:#057A2F;color:#fff;' +
    'text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px">' +
    'Back to the marketplace</a> ' +
    '<a href="/register" style="display:inline-block;margin-left:8px;' +
    'color:#0d1117;text-decoration:none;font-weight:700;padding:11px 20px;' +
    'border:2px solid #0d1117;border-radius:999px">List a company</a></main>';
  /* Stop the rest of this script: everything after here dereferences `co`. */
  throw new Error('company not found: ' + asked);
}

/* ---- owner theme ----
   Declared BEFORE anything renders: the fleet markup reads
   theme.unitImages, and a `let` used above its declaration hits the
   temporal dead zone and takes the whole script down with it.
   Loaded from storage and normalised before it touches the DOM, so a
   tampered record can only ever produce the default theme, never CSS. */
function renderTheme(raw){
  const t = applyTheme(raw, document.documentElement);
  /* the owner's uploaded logo replaces the category glyph when present */
  const box = document.getElementById('co-logo');
  if (t.logo){
    box.innerHTML = '<img alt="">';
    box.querySelector('img').src = t.logo;        // property, not markup
    box.classList.add('haslogo');
  } else {
    box.classList.remove('haslogo');
    box.innerHTML = unitIcon((co.types || []).join(' '), co.cat);
  }
  return t;
}
let theme = renderTheme(loadTheme(co.id));

/* The owner's own fleet wins once they've edited it in the admin;
   otherwise fall back to the seeded demo listings. */
const units = loadFleet(co.id) || FR_UNITS[co.id] || [];

document.title = co.name + ' on FR Services';
document.getElementById('co-name').textContent = co.name;
/* co-logo is owned by renderTheme() - it must not be overwritten here or
   an uploaded logo is wiped a few lines after it is applied */
document.getElementById('co-loc').textContent = co.loc;
document.getElementById('co-since').textContent = 'Operating since ' + co.since;
document.getElementById('co-about').textContent =
  co.about || (co.name + ' has not written a description yet.');
/* "New" rather than 0.00 - see companyCard() in data.js for why a zero
   rating on an unreviewed listing is worse than no rating at all. */
document.getElementById('co-rating').innerHTML = co.reviews
  ? STAR_SVG + Number(co.rating).toFixed(2) + ' (' + co.reviews + ')'
  : 'New company';
document.getElementById('cb-cat').textContent = FR_CATS[co.cat].label;
document.getElementById('cb-city').textContent = FR_GEO.city || 'your area';
document.getElementById('st-units').textContent   = units.length;
document.getElementById('st-reply').textContent   = co.reply || 'Not set';
document.getElementById('st-radius').textContent  = co.radius + ' km';
document.getElementById('st-reviews').textContent = co.reviews;
/* Distance from wherever the renter actually is, which is unknown until
   they share a location - so it says so rather than printing a stale
   number or a bare "0 km". */
(() => {
  const km = (typeof distanceKm === 'function') ? distanceKm(co) : null;
  document.getElementById('st-km').textContent =
    km == null ? 'Unknown' : (typeof kmLabel === 'function' ? kmLabel(km) : km.toFixed(1) + ' km');
})();
document.getElementById('cov-radius').textContent = co.radius + ' km';
document.getElementById('cov-base').textContent   = co.loc;
document.getElementById('rev-avg').textContent    = co.reviews ? Number(co.rating).toFixed(2) : 'None yet';
document.getElementById('rev-count').textContent  =
  co.reviews ? co.reviews + ' reviews' : 'No reviews yet';


/* Every unit gets a photo slot in every layout. The owner's own upload
   wins; otherwise it falls back to the category placeholder, offset per
   unit so a fleet of six doesn't show six identical crops. */
function unitPhoto(u){
  const own = u.photo || (theme.unitImages && theme.unitImages[u.id]);
  if (own) return `background-image:url('${own}')`;
  const h = [...u.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `background-image:url('${CAT_PHOTO[co.cat]}');` +
         `background-position:${PHOTO_POS[h % PHOTO_POS.length]}`;
}

/* Two shapes reach this page: the seeded demo listings, which carry a
   free-form `specs` object, and units the owner created in the admin,
   which carry typed fields. Normalise both into the same spec rows. */
function specRows(u){
  const rows = u.specs
    ? Object.entries(u.specs)
    : [['Type', u.type], ['Model', u.model], ['Year', u.year],
       ['Capacity', u.capacity]].filter(([, v]) => v);

  const operator = typeof u.operator === 'string'
    ? { included:'Included', optional:'On request', none:'Not included' }[u.operator]
    : (u.operator ? 'Included' : 'Not included');

  rows.push(['Operator', operator]);
  /* owner-created units carry a delivery mode; seeded ones are a flat fee */
  rows.push(['Delivery', u.deliveryMode
    ? deliveryText(u)
    : (u.delivery ? peso(u.delivery) : 'Free')]);
  if (u.fuel)    rows.push(['Fuel', u.fuel === 'included' ? 'Included' : 'Client-supplied']);
  if (u.minDays > 1) rows.push(['Minimum hire', u.minDays + ' days']);
  return rows.map(([k, v]) =>
    `<li><span class="k">${k}</span><span class="v">${v}</span></li>`).join('');
}

const avail = u => (u.qty !== undefined ? u.qty : u.avail) || 0;

/* ---- fleet ----
   A company may run several service lines. When it does, the fleet is
   grouped under a heading per line rather than mixed into one grid - a
   renter looking for a tow truck should not have to scan past sedans. */
const unitCat = u => u.cat || co.cat;

function unitCard(u){
  const save = typeof bestDiscount === 'function' ? bestDiscount(u) : 0;
  const n = avail(u);
  return `
  <article class="unit">
    <div class="utop${(u.photo || (theme.unitImages||{})[u.id]) ? ' hasphoto' : ''}" style="${unitPhoto(u)}">
      <span class="uicon">${unitIcon(u.type || u.name, unitCat(u))}</span>
      <span class="uavail t ${n > 0 ? 't-ok' : 't-mute'}">${n > 0 ? n + ' available' : 'Fully booked'}</span>
      ${save ? `<span class="usave">Save ${save}% on long hire</span>` : ''}
    </div>
    <div class="ubody">
      <h3>${u.name}</h3>
      <ul class="uspecs">${specRows(u)}</ul>
      ${u.notes ? `<p class="unote">${u.notes}</p>` : ''}
      <div class="ufoot">
        <div class="uprice">${peso(u.price)}<small> / ${u.unit}</small></div>
        <a class="ubtn" href="/booking?c=${co.id}&u=${u.id}">Book</a>
      </div>
    </div>
  </article>`;
}

const lines = catsOf(co);
const groupsHost = document.getElementById('fleet-groups');

if (!units.length){
  groupsHost.innerHTML = `<div class="fleet"><p class="unitnone">This company hasn't listed any units yet.</p></div>`;
} else if (lines.length === 1){
  groupsHost.innerHTML = `<div class="fleet">${units.map(unitCard).join('')}</div>`;
} else {
  groupsHost.innerHTML = lines.map(cat => {
    const inLine = units.filter(u => unitCat(u) === cat);
    if (!inLine.length) return '';
    return `
      <div class="fleetline">
        <h3 class="linehead">
          <span class="lineic v-${cat}">${unitIcon('', cat)}</span>
          ${FR_CATS[cat].label}
          <span class="linecount">${inLine.length} unit${inLine.length > 1 ? 's' : ''}</span>
        </h3>
        <div class="fleet">${inLine.map(unitCard).join('')}</div>
      </div>`;
  }).join('');
}

/* ---- services & add-ons ---- */
const services = (typeof FR_SERVICES !== 'undefined' && FR_SERVICES[co.id]) || [];
if (services.length){
  document.getElementById('svc-block').hidden = false;
  document.getElementById('svc-list').innerHTML = services.map(s => `
    <div class="svc">
      <span class="svcic v-${s.cat || co.cat}">${unitIcon('', s.cat || co.cat)}</span>
      <div class="svcmain">
        <b>${s.name}</b>
        <p>${s.note || ''}</p>
      </div>
      <span class="svcprice">${s.price ? peso(s.price) : 'Quoted'}<small>${
        s.price ? ' / ' + s.unit : ''}</small></span>
    </div>`).join('');
}

/* =====================================================================
   PUBLISHED DOCUMENTS
   Only what the owner published, and only in the form ops.js releases it -
   masked numbers stay masked, withheld files stay withheld. Nothing here
   reaches back into the owner's private store.
   ===================================================================== */
/* Document text is owner-supplied and lands in innerHTML, so it is escaped
   on the way out. The rest of this page renders platform fixtures. */
const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const DOC_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h7l4 4v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M16 3v5h4"/></svg>';
const TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6L20 6"/></svg>';

function reviewPill(r){
  if (r === 'verified') return `<span class="dpill dp-ok">${TICK}Checked by FR Services</span>`;
  if (r === 'rejected') return '<span class="dpill dp-off">Not accepted</span>';
  return '<span class="dpill dp-warn">Company-submitted</span>';
}
function statePill(d){
  if (d.state === 'expired') return `<span class="dpill dp-off">${esc(d.label)}</span>`;
  if (d.state === 'soon')    return `<span class="dpill dp-soon">${esc(d.label)}</span>`;
  if (d.state === 'none')    return '<span class="dpill dp-off">No expiry date</span>';
  return '<span class="dpill dp-cur">Current</span>';
}

function paintDocuments(){
  const host = document.getElementById('doc-list');
  const bar  = document.getElementById('auth-summary');
  if (!host || typeof publishedDocs !== 'function') return;

  const docs = publishedDocs(co.id);
  const checked = docs.filter(d => d.review === 'verified').length;
  const live    = docs.filter(d => d.state !== 'expired').length;

  if (!docs.length){
    bar.innerHTML = '<div class="msg"><b>This company has not published any documents.</b><br>' +
      'That is not proof of anything either way, but you can ask them for their business permit ' +
      'before you pay a deposit, and a company that will not show it is telling you something.</div>';
    host.innerHTML = '<div class="docempty"><b>Nothing published yet</b>' +
      'Documents the company chooses to show would appear here.</div>';
    return;
  }

  bar.innerHTML =
    `<div><div class="big">${docs.length}</div><div class="lbl">published</div></div>
     <div class="sep"></div>
     <div><div class="big">${checked}</div><div class="lbl">checked by us</div></div>
     <div class="sep"></div>
     <div><div class="big">${live}</div><div class="lbl">still valid</div></div>
     <div class="msg">${
       checked === docs.length
         ? 'Every document below has been confirmed with the office that issued it.'
         : checked
         ? `${checked} of ${docs.length} have been confirmed with the issuing office. The rest are the company's own word for now.`
         : 'None of these have been checked by FR Services yet, and they are the company\'s own submissions.'
     }</div>`;

  host.innerHTML = docs.map(d => `
    <article class="doccard">
      <div>
        <h4>${esc(d.name)}</h4>
        ${d.issuer ? `<p class="iss">Issued by ${esc(d.issuer)}</p>` : ''}
      </div>
      <dl>
        ${d.number ? `<div><dt>Number</dt><dd>${esc(d.number)}${
          d.numberMasked ? '<span class="small muted" style="font-weight:500"> (shortened)</span>' : ''}</dd></div>` : ''}
        ${d.issued  ? `<div><dt>Issued</dt><dd>${esc(fmtDate(d.issued))}</dd></div>` : ''}
        ${d.expires ? `<div><dt>Valid until</dt><dd>${esc(fmtDate(d.expires))}</dd></div>` : ''}
      </dl>
      ${d.note ? `<p class="note">${esc(d.note)}</p>` : ''}
      ${d.file
        ? `<a class="open" href="${d.file.data}" target="_blank" rel="noopener noreferrer"
              download="${esc(d.file.name)}">${DOC_ICON}Open the document</a>`
        : d.hasFile
        ? '<p class="note">A scan is on file but the company has not made it public.</p>'
        : ''}
      <div class="pills">${statePill(d)}${reviewPill(d.review)}</div>
    </article>`).join('');
}
paintDocuments();

/* The About sidebar summarises the same store rather than a hardcoded list
   - a static "Verified credentials" block goes stale the moment a permit
   lapses, and a stale credential list is a lie with a tick beside it. */
function paintCredSummary(){
  const host = document.getElementById('cred-list');
  if (!host || typeof publishedDocs !== 'function') return;
  const docs = publishedDocs(co.id);
  if (!docs.length){
    host.innerHTML = '<li class="small muted" style="display:block">This company has not published any documents yet.</li>';
    return;
  }
  const checked  = docs.filter(d => d.review === 'verified').length;
  const claimed  = docs.length - checked;
  const expired  = docs.filter(d => d.state === 'expired').length;

  /* Checked ones lead - this is a credentials list. But a truncated list
     could show six ticks while an unverified or lapsed document sits just
     out of sight, so the tally below always states the whole picture. */
  const order = docs.slice().sort((a, b) =>
    (a.review === 'verified' ? 0 : 1) - (b.review === 'verified' ? 0 : 1));

  host.innerHTML = order.slice(0, 5).map(d => `
    <li><span class="ck">${d.review === 'verified' ? TICK : '?'}</span>
      <div><b>${esc(d.name)}</b><br><span class="small muted">${
        d.expires ? esc(d.state === 'expired' ? d.label : 'Valid until ' + fmtDate(d.expires))
                  : esc(d.issuer || '')
      }${d.review === 'verified' ? '' : ' · company-submitted'}</span></div></li>`).join('') +
    `<li style="display:block;padding-top:var(--s3)"><span class="small muted">` +
    `${docs.length} published · ${checked} checked by FR Services` +
    (claimed ? ` · <b>${claimed} company-submitted</b>` : '') +
    (expired ? ` · <b>${expired} expired</b>` : '') + '</span></li>';
}
paintCredSummary();

/* =====================================================================
   SAVING A COMPANY
   The button exists only for a signed-in visitor. Showing it signed out
   and then bouncing them to a login when they press it is the pattern
   that trains people to stop pressing things.
   ===================================================================== */
function paintFavourite(){
  const btn = document.getElementById('favBtn');
  if (!btn || typeof authSession !== 'function') return;
  const signedIn = !!authSession();
  btn.hidden = !signedIn;
  if (!signedIn) return;

  const on = isFavourite(co.id);
  btn.classList.toggle('is-on', on);
  btn.querySelector('svg').setAttribute('fill', on ? 'currentColor' : 'none');
  document.getElementById('favLbl').textContent = on ? 'Saved' : 'Save';
  btn.setAttribute('aria-pressed', String(on));
  btn.setAttribute('aria-label', (on ? 'Remove ' : 'Save ') + co.name);
}
const favBtn = document.getElementById('favBtn');
if (favBtn) favBtn.addEventListener('click', () => {
  const out = toggleFavourite(co.id);
  /* The store refuses when signed out even though the button is hidden -
     belt and braces, because "hidden" is a CSS attribute, not a rule. */
  if (!out.ok){ paintFavourite(); return; }
  paintFavourite();
});
paintAuthNav('authNav');
paintFavourite();

/* "See all documents" jumps to the pane rather than duplicating it. */
document.querySelectorAll('[data-pane-link]').forEach(b => b.addEventListener('click', () => {
  const t = document.querySelector(`.cotab[data-pane="${b.dataset.paneLink}"]`);
  if (t) t.click();
}));

/* ---- reviews ---- */
document.getElementById('rev-list').innerHTML = FR_REVIEWS.map(r => `
  <div class="rev">
    <div class="revhead">
      <span class="revav">${r.who.split(' ').map(s=>s[0]).join('')}</span>
      <span class="revwho"><b>${r.who}</b><span>${r.when} · rented ${r.unit}</span></span>
      <span class="revstars">${starRow(r.r)}</span>
    </div>
    <p>${r.body}</p>
  </div>`).join('');

/* ---- mobile book bar ---- */
const cheapest = units.reduce((a,b) => a.price < b.price ? a : b);
document.querySelector('.bookbar .p').innerHTML =
  `${peso(cheapest.price)} <small>from / ${cheapest.unit}</small>`;
document.querySelector('.bookbar .btn').href = `booking.html?c=${co.id}&u=${cheapest.id}`;

/* ---- tabs ---- */
document.querySelectorAll('.cotab').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('.cotab').forEach(x => x.classList.remove('on'));
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('on'));
  t.classList.add('on');
  document.getElementById('pane-' + t.dataset.pane).classList.add('on');
}));

document.getElementById('ownerEdit').href = '/admin?c=' + encodeURIComponent(co.id);

/* ---- preview mode ----
   admin.html embeds this page in an iframe so the owner sees the real
   storefront rather than a mock-up, and pushes each edit across with
   postMessage. Two guards on that: it is only wired up when the URL
   explicitly says preview=1, and the payload still goes through
   normaliseTheme() inside applyTheme(), so a message from anywhere can
   only ever produce a valid theme - never CSS or markup. */
const PREVIEW = new URLSearchParams(location.search).get('preview') === '1';
if (PREVIEW){
  document.documentElement.classList.add('is-preview');
  window.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'fr-theme') return;
    theme = renderTheme(e.data.theme);
  });
  /* tell the parent we are ready for the first push */
  if (window.parent !== window) window.parent.postMessage({ type:'fr-preview-ready' }, '*');
}

/* ---- verified explainer ---- */
const vBtn = document.getElementById('vBtn'), vPop = document.getElementById('vPop');
vBtn.addEventListener('click', e => {
  e.stopPropagation();
  const open = vPop.hidden;
  vPop.hidden = !open;
  vBtn.setAttribute('aria-expanded', String(open));
});
document.addEventListener('click', e => {
  if (!vPop.hidden && !e.target.closest('#vPop') && !e.target.closest('#vBtn')){
    vPop.hidden = true; vBtn.setAttribute('aria-expanded','false');
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') vPop.hidden = true; });

/* ---- report company ---- */
const rModal = document.getElementById('rModal');
function openReport(){
  rModal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => rModal.querySelector('input[name=reason]').focus(), 30);
}
function closeReport(){
  rModal.hidden = true;
  document.body.style.overflow = '';
  document.getElementById('rForm').hidden = false;
  document.getElementById('rm-done').hidden = true;
  document.getElementById('rForm').reset();
  document.getElementById('rm-count').textContent = '0 / 1200';
}
document.getElementById('reportBtn').addEventListener('click', openReport);
document.querySelectorAll('[data-report-open]').forEach(b => b.addEventListener('click', openReport));
rModal.addEventListener('click', e => { if (e.target.closest('[data-rm-close]')) closeReport(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !rModal.hidden) closeReport(); });

document.getElementById('rm-detail').addEventListener('input', e => {
  document.getElementById('rm-count').textContent = e.target.value.length + ' / 1200';
});

document.getElementById('rm-send').addEventListener('click', () => {
  const reason = rModal.querySelector('input[name=reason]:checked');
  if (!reason){
    rModal.querySelector('.rm-reasons legend').style.color = 'var(--danger)';
    rModal.querySelector('input[name=reason]').focus();
    return;
  }
  /* Prototype: this writes to browser storage so the report turns up in
     the FR Services platform queue, which is the flow worth demonstrating.
     A real submission must be server-side - authenticated, rate-limited
     per account and per IP, with the reporter's identity stored but never
     returned to the company. See ARCHITECTURE.md §13. */
  const ref = 'FR-R-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  if (typeof addReport === 'function'){
    addReport({
      id: ref,
      company: co.id,
      reason: reason.value,
      detail: document.getElementById('rm-detail').value,
      ref: document.getElementById('rm-booking').value,
      anon: document.getElementById('rm-anon').checked,
      at: (typeof opsToday === 'function') ? opsToday() : ''
    });
  }
  document.getElementById('rm-ref').textContent = ref;
  document.getElementById('rForm').hidden = true;
  document.getElementById('rm-done').hidden = false;
});
