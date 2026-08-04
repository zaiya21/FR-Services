/* =====================================================================
   HOW IT WORKS - an interactive walkthrough of three real flows.

   Every demo widget below calls the SAME shared functions the real pages
   use (providersIn, distanceKm, citySearchable, catsOf, inCategory, peso,
   phSearch/phPlace, FR_COMPANIES/FR_GEO/FR_CATS - all from data.js,
   geo.js, ph-locations.js, registry.js, already loaded before this file)
   rather than fabricated numbers, so nothing here can drift from what the
   marketplace actually does. Every widget also has an honest empty state:
   FR_COMPANIES is genuinely empty until someone registers, and pretending
   otherwise would be exactly the kind of lie a listing page can't recover
   trust from.
   ===================================================================== */
const $ = id => document.getElementById(id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* =====================================================================
   TABS - role="tablist" with roving tabindex and arrow-key activation,
   per the ARIA APG pattern. Picking a tab shows that flow's panel and
   scrolls to whichever step is currently active inside it.
   ===================================================================== */
const tabs = Array.from(document.querySelectorAll('.howtab'));
const panels = Array.from(document.querySelectorAll('.flowpanel'));

function setActiveTab(flow, opts){
  opts = opts || {};
  tabs.forEach(t => {
    const on = t.dataset.flow === flow;
    t.classList.toggle('on', on);
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
  });
  panels.forEach(p => { p.hidden = p.dataset.flow !== flow; });
  if (opts.scroll){
    const visible = document.querySelector(`.flowpanel[data-flow="${flow}"] .stepsec:not([hidden])`);
    if (visible) visible.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'start' });
  }
}

tabs.forEach((t, i) => {
  t.addEventListener('click', () => setActiveTab(t.dataset.flow, { scroll: true }));
  t.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    let next = i;
    if (e.key === 'ArrowLeft')  next = (i - 1 + tabs.length) % tabs.length;
    if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End')  next = tabs.length - 1;
    tabs[next].focus();
    setActiveTab(tabs[next].dataset.flow, { scroll: true });
  });
});

/* =====================================================================
   STEP RAIL - one step visible at a time per flow, switched by clicking
   its number. This never scrolls the page - only .stepsec's own opacity
   changes - and only one step is ever laid out at once (the rest carry
   the `hidden` attribute, not just opacity:0), so nothing shifts height
   or jumps around while switching. The outgoing step fades out FIRST and
   is hidden, then the incoming one is unhidden and faded in - never both
   present at once, which is what a true overlapping crossfade in normal
   document flow would otherwise briefly do (both laid out, page height
   jumping twice).
   ===================================================================== */
const railButtons = Array.from(document.querySelectorAll('.railstep'));
const FADE_MS = 220;

function setActiveStep(stepId){
  railButtons.forEach(b => b.classList.toggle('on', b.dataset.step === stepId));
}

function goToStep(flow, stepId){
  const panel = document.querySelector(`.flowpanel[data-flow="${flow}"]`);
  if (!panel) return;
  const current = panel.querySelector('.stepsec.on');
  const next = document.getElementById('step-' + stepId);
  if (!next || next === current) return;

  setActiveStep(stepId);

  const showNext = () => {
    next.hidden = false;
    next.classList.add('on');
    void next.offsetWidth; // force a reflow so the .in transition actually runs
    requestAnimationFrame(() => next.classList.add('in'));
  };

  if (!current){ showNext(); return; }

  current.classList.remove('in');
  if (reduceMotion()){
    current.hidden = true;
    current.classList.remove('on');
    showNext();
  } else {
    setTimeout(() => {
      current.hidden = true;
      current.classList.remove('on');
      showNext();
    }, FADE_MS);
  }
}

railButtons.forEach(b => b.addEventListener('click', () => {
  const panel = b.closest('.flowpanel');
  if (panel) goToStep(panel.dataset.flow, b.dataset.step);
}));

/* =====================================================================
   AUTOPLAY - steps through the active flow every few seconds using the
   same goToStep() fade, never a scroll. Off by default (and the control
   hidden) under reduced motion; the interval re-reads whichever step is
   currently marked active rather than tracking its own pointer, so a
   manual rail/tab click is never fought on the next tick.
   ===================================================================== */
let playing = !reduceMotion();
let playTimer = null;
const playBtn = $('howPlay'), playLabel = $('howPlayLabel'), playIcon = $('howPlayIcon');

function stepOrder(flow){
  return Array.from(document.querySelectorAll(`.flowpanel[data-flow="${flow}"] .stepsec`)).map(s => s.dataset.step);
}
function currentFlow(){
  const on = tabs.find(t => t.classList.contains('on'));
  return on ? on.dataset.flow : 'browse';
}
function advanceStep(){
  const flow = currentFlow();
  const order = stepOrder(flow);
  if (!order.length) return;
  const activeBtn = railButtons.find(b => b.classList.contains('on') && order.includes(b.dataset.step));
  const idx = activeBtn ? order.indexOf(activeBtn.dataset.step) : -1;
  goToStep(flow, order[(idx + 1) % order.length]);
}
function schedulePlay(){
  clearInterval(playTimer);
  if (playing) playTimer = setInterval(advanceStep, 4500);
}
function paintPlayBtn(){
  if (!playBtn) return;
  playBtn.setAttribute('aria-pressed', String(playing));
  playLabel.textContent = playing ? 'Pause step autoplay' : 'Play step autoplay';
  playIcon.innerHTML = playing
    ? '<rect x="6" y="5" width="4" height="14" rx="1"></rect><rect x="14" y="5" width="4" height="14" rx="1"></rect>'
    : '<path d="M8 5l11 7-11 7z"></path>';
}
if (playBtn){
  if (reduceMotion()){ playing = false; playBtn.hidden = true; }
  playBtn.addEventListener('click', () => { playing = !playing; paintPlayBtn(); schedulePlay(); });
  paintPlayBtn();
  schedulePlay();
}

/* =====================================================================
   DEMO 1 - city search (browse, step 1). Reuses ph-locations.js's own
   search (phSearch/phPlace) - the same function the real location picker
   calls - and providersIn() for a real per-place company count.
   ===================================================================== */
let demoCity = { name: (typeof FR_GEO !== 'undefined' && FR_GEO.city) || 'Davao City',
                  province: (typeof FR_GEO !== 'undefined' && FR_GEO.province) || '' };

function paintCityChosen(){
  const el = $('demoCityChosen');
  if (el) el.textContent = `Currently searching near: ${demoCity.name}${demoCity.province ? ', ' + demoCity.province : ''}`;
}

const cityInput = $('demoCityInput');
if (cityInput){
  cityInput.addEventListener('input', () => {
    const q = cityInput.value.trim();
    const host = $('demoCityResults');
    if (!q || typeof phSearch !== 'function'){ host.innerHTML = ''; return; }
    const hits = phSearch(q, 5).map(phPlace);
    host.innerHTML = hits.length ? hits.map(p => {
      const n = typeof providersIn === 'function' ? providersIn(p.name, p.province) : 0;
      return `<button type="button" class="demorow" data-name="${esc(p.name)}" data-prov="${esc(p.province)}">
        <span>${esc(p.label)}</span>
        <span class="n">${n} ${n === 1 ? 'company' : 'companies'}</span>
      </button>`;
    }).join('') : `<p class="demoempty">No match for "${esc(q)}".</p>`;
  });
  $('demoCityResults').addEventListener('click', e => {
    const row = e.target.closest('[data-name]');
    if (!row) return;
    demoCity = { name: row.dataset.name, province: row.dataset.prov };
    cityInput.value = '';
    $('demoCityResults').innerHTML = '';
    paintCityChosen();
    paintCatDemo(activeCat());
  });
}
paintCityChosen();

/* =====================================================================
   DEMO 2 - category chips + live results (browse, step 2), feeding
   DEMO 3 - the compare cards (browse, step 3). Both real FR_COMPANIES
   data, filtered/sorted exactly like the marketplace's own filter chain
   (citySearchable + catsOf + distanceKm).
   ===================================================================== */
let lastCatResults = [];
function activeCat(){
  const on = document.querySelector('#demoCatChips .catchip.on');
  return on ? on.dataset.cat : null;
}

function paintCatDemo(cat){
  const host = $('demoCatResults');
  if (!host) return;
  const all = typeof FR_COMPANIES !== 'undefined' ? FR_COMPANIES : [];
  let list = all.filter(c => typeof citySearchable !== 'function' || citySearchable(c, demoCity.name, demoCity.province));
  if (cat) list = list.filter(c => typeof catsOf !== 'function' || catsOf(c).includes(cat));
  list = list.slice().sort((a, b) => {
    const ka = typeof distanceKm === 'function' ? distanceKm(a) : null;
    const kb = typeof distanceKm === 'function' ? distanceKm(b) : null;
    return (ka == null ? Infinity : ka) - (kb == null ? Infinity : kb);
  }).slice(0, 3);
  lastCatResults = list;

  host.innerHTML = list.length ? list.map(c => {
    const km = typeof distanceKm === 'function' ? distanceKm(c) : null;
    return `<div class="demorow" style="cursor:default">
      <span><b>${esc(c.name)}</b> · ${esc(c.city || demoCity.name)}</span>
      <span class="n">${km == null ? '—' : (typeof kmLabel === 'function' ? kmLabel(km) : Math.round(km) + ' km')}</span>
    </div>`;
  }).join('') : `<p class="demoempty">No companies${cat ? ' in that category' : ''} serve ${esc(demoCity.name)} yet. Once one registers and is approved, it appears here automatically.</p>`;

  paintCompareDemo();
}

document.querySelectorAll('#demoCatChips .catchip').forEach(chip => {
  chip.addEventListener('click', () => {
    const already = chip.classList.contains('on');
    document.querySelectorAll('#demoCatChips .catchip').forEach(c => c.classList.remove('on'));
    if (!already) chip.classList.add('on');
    paintCatDemo(already ? null : chip.dataset.cat);
  });
});
paintCatDemo(null);

function paintCompareDemo(){
  const host = $('demoCompare');
  if (!host) return;
  const list = lastCatResults.slice(0, 2);
  if (list.length < 2){
    host.innerHTML =
      '<div class="comparecard"><span class="cctag">Example</span><b>Company A</b>' +
        '<dl><div><dt>Price</dt><dd>₱3,500 / day</dd></div><div><dt>Rating</dt><dd>New</dd></div><div><dt>Distance</dt><dd>4.2 km</dd></div></dl></div>' +
      '<div class="comparecard"><span class="cctag">Example</span><b>Company B</b>' +
        '<dl><div><dt>Price</dt><dd>₱2,900 / day</dd></div><div><dt>Rating</dt><dd>4.6 (12)</dd></div><div><dt>Distance</dt><dd>7.8 km</dd></div></dl></div>';
    return;
  }
  host.innerHTML = list.map(c => {
    const km = typeof distanceKm === 'function' ? distanceKm(c) : null;
    const priceLabel = c.price ? (typeof peso === 'function' ? peso(c.price) : c.price) + ' / day' : 'Not set yet';
    return `<div class="comparecard"><span class="cctag">${esc(demoCity.name)}</span><b>${esc(c.name)}</b>
      <dl>
        <div><dt>Price</dt><dd>${priceLabel}</dd></div>
        <div><dt>Rating</dt><dd>${c.reviews ? c.rating.toFixed(1) + ' (' + c.reviews + ')' : 'New'}</dd></div>
        <div><dt>Distance</dt><dd>${km == null ? '—' : (typeof kmLabel === 'function' ? kmLabel(km) : Math.round(km) + ' km')}</dd></div>
      </dl></div>`;
  }).join('');
}

/* =====================================================================
   DEMO 4 - company name search (company flow, step 1), feeding
   DEMO 5 - the mock storefront preview (company flow, step 2).
   ===================================================================== */
const coInput = $('demoCoInput');
if (coInput){
  coInput.addEventListener('input', () => {
    const q = coInput.value.trim().toLowerCase();
    const host = $('demoCoResults');
    const all = typeof FR_COMPANIES !== 'undefined' ? FR_COMPANIES : [];
    if (!q){ host.innerHTML = ''; return; }
    const hits = all.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5);
    host.innerHTML = hits.length ? hits.map(c => `
      <button type="button" class="demorow" data-name="${esc(c.name)}" data-city="${esc(c.city || c.loc || '')}">
        <span><b>${esc(c.name)}</b></span><span class="n">${esc(c.city || c.loc || '')}</span>
      </button>`).join('') : `<p class="demoempty">No registered company matches "${esc(coInput.value.trim())}" yet.</p>`;
  });
  $('demoCoResults').addEventListener('click', e => {
    const row = e.target.closest('[data-name]');
    if (!row) return;
    coInput.value = row.dataset.name;
    $('demoCoResults').innerHTML = '';
    const nameEl = $('demoSfName'), subEl = $('demoSfSub');
    if (nameEl) nameEl.textContent = row.dataset.name;
    if (subEl) subEl.textContent = (row.dataset.city || 'Their city') + ' · their rating · their theme';
  });
}

/* =====================================================================
   DEMO 6 - live cost calculator (company flow, step 3). Same formula the
   real booking page runs (public/pages/booking.js: price × days + delivery
   + addons, +12% VAT) against a clearly-labelled example rate, since this
   page has no single real unit selected to price.
   ===================================================================== */
const EXAMPLE_RATE = 3500;
function calcDays(){
  const a = new Date($('demoStart').value);
  const b = new Date($('demoEnd').value);
  const n = Math.round((b - a) / 86400000) + 1;
  return (isNaN(n) || n < 1) ? 1 : n;
}
function recalcDemo(){
  const n = calcDays();
  const base = EXAMPLE_RATE * n;
  const delivBtn = document.querySelector('#demoDeliv .calcopt.on');
  const deliv = delivBtn ? Number(delivBtn.dataset.price) : 0;
  let addons = 0;
  const lines = [];
  [$('demoAddon1'), $('demoAddon2')].forEach(cb => {
    if (cb && cb.checked){
      const amt = Number(cb.dataset.add) * n;
      addons += amt;
      lines.push([cb.parentElement.textContent.trim().replace(/\s*\(\+.*\)$/, ''), amt]);
    }
  });
  const sub = base + deliv + addons;
  const vat = Math.round(sub * 0.12);
  const total = sub + vat;
  const P = v => typeof peso === 'function' ? peso(v) : ('₱' + Number(v).toLocaleString('en-PH'));
  const rows = [
    [`${P(EXAMPLE_RATE)} × ${n} ${n === 1 ? 'day' : 'days'}`, base],
    ...(deliv ? [['Delivery', deliv]] : []),
    ...lines,
    ['VAT (12%)', vat]
  ];
  $('demoCostLines').innerHTML = rows.map(([l, v]) =>
    `<li><span>${esc(l)}</span><span class="v">${P(v)}</span></li>`).join('');
  $('demoCostTotal').textContent = P(total);
}
if ($('demoStart')){
  const today = new Date();
  const in2 = new Date(today.getTime() + 2 * 86400000);
  $('demoStart').value = today.toISOString().slice(0, 10);
  $('demoEnd').value = in2.toISOString().slice(0, 10);
  document.querySelectorAll('#demoDeliv .calcopt').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('#demoDeliv .calcopt').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    recalcDemo();
  }));
  [$('demoStart'), $('demoEnd'), $('demoAddon1'), $('demoAddon2')].forEach(el =>
    el && el.addEventListener('change', recalcDemo));
  recalcDemo();
}

/* =====================================================================
   DEMO 7 - send request + reference number (company flow, step 4). Same
   reference-number shape booking.js's real submit handler generates.
   ===================================================================== */
const sendBtn = $('demoSendBtn');
if (sendBtn){
  sendBtn.addEventListener('click', () => {
    const ref = 'ARK-2026-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    $('demoRef').textContent = ref;
    $('demoConfirm').hidden = false;
    sendBtn.disabled = true;
  });
}

/* =====================================================================
   DEMO 8 - vehicle/problem pickers (tow flow, step 1), feeding
   DEMO 9 - the dispatch broadcast simulation (tow flow, step 2), which
   replays the exact staggered-ping mechanism public/pages/tow.js uses,
   against real inCategory('towing') companies when any are registered
   near the default location.
   ===================================================================== */
let towV = null, towP = null;
function paintTowSummary(){
  const el = $('demoTowSummary');
  if (!el) return;
  el.textContent = (towV && towP) ? `Requesting help for a ${towV} - ${towP}.` : 'Pick a vehicle and a problem above.';
}
document.querySelectorAll('#demoVtype .catchip').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#demoVtype .catchip').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); towV = b.dataset.v; paintTowSummary();
}));
document.querySelectorAll('#demoProb .catchip').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('#demoProb .catchip').forEach(x => x.classList.remove('on'));
  b.classList.add('on'); towP = b.dataset.p; paintTowSummary();
}));

const dispatchBtn = $('demoDispatchBtn');
if (dispatchBtn){
  dispatchBtn.addEventListener('click', () => {
    dispatchBtn.disabled = true;
    const list = $('demoPingList'), result = $('demoTowResult');
    list.innerHTML = '';
    result.hidden = true;
    const tows = (typeof inCategory === 'function' ? inCategory('towing') : []).slice()
      .sort((a, b) => {
        const ka = typeof distanceKm === 'function' ? distanceKm(a) : null;
        const kb = typeof distanceKm === 'function' ? distanceKm(b) : null;
        return (ka == null ? Infinity : ka) - (kb == null ? Infinity : kb);
      }).slice(0, 4);

    if (!tows.length){
      list.innerHTML = '<p class="demoempty">No towing companies registered near the default location yet - once one is, this replays with them for real.</p>';
      dispatchBtn.disabled = false;
      return;
    }
    tows.forEach((t, i) => {
      setTimeout(() => {
        const km = typeof distanceKm === 'function' ? distanceKm(t) : null;
        const row = document.createElement('div');
        row.className = 'ping';
        row.innerHTML = `<span class="d"></span><span>Pinged <b>${esc(t.name)}</b></span><span class="s">${km == null ? '' : (typeof kmLabel === 'function' ? kmLabel(km) : Math.round(km) + ' km')} away</span>`;
        list.appendChild(row);
      }, 350 + i * 550);
    });
    setTimeout(() => {
      const winner = tows[0];
      const km = typeof distanceKm === 'function' ? distanceKm(winner) : null;
      const eta = km == null ? null : Math.round(km * 2.4 + 6);
      result.hidden = false;
      result.innerHTML = `
        <span class="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6L20 6"/></svg></span>
        <span><b>Driver on the way!</b>${esc(winner.name)} accepted first</span>
        <span class="eta"><b>${eta == null ? '—' : eta + ' min'}</b><span>est. arrival</span></span>`;
      dispatchBtn.disabled = false;
    }, 350 + tows.length * 550 + 900);
  });
}

/* =====================================================================
   FAQ ACCORDION
   ===================================================================== */
document.querySelectorAll('.faqq').forEach(btn => {
  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!open));
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    if (panel) panel.hidden = open;
  });
});

/* Shows who is signed in, or the sign-in button when nobody is - same
   call every other public page makes (see public/assets/company-auth.js). */
if (typeof paintRealAuthNav === 'function') paintRealAuthNav('authNav');
