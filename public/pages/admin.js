
const $ = id => document.getElementById(id);

/* ---------------------------------------------------------------------
   Which company is being administered.

   The old default was a demo company id. With the fixtures gone that
   resolves to nothing, and the console would have rendered a whole
   dashboard - charts, bookings, expense totals - for a company that does
   not exist, which is worse than refusing: every figure on it would be a
   zero presented as a measurement.

   With exactly one registered company, open it. That is the normal case
   here and asking someone to choose from a list of one is a nuisance.
   --------------------------------------------------------------------- */
const ADMIN_WANT = new URLSearchParams(location.search).get('c');
const ADMIN_LIST = (typeof FR_COMPANIES !== 'undefined') ? FR_COMPANIES : [];
const COMPANY_ID = (() => {
  if (ADMIN_WANT && ADMIN_LIST.some(c => c.id === ADMIN_WANT)) return ADMIN_WANT;
  if (!ADMIN_WANT && ADMIN_LIST.length === 1) return ADMIN_LIST[0].id;
  return null;
})();

if (!COMPANY_ID){
  const esc0 = s => String(s == null ? '' : s).replace(/[&<>"]/g, '');
  document.title = 'Choose a company - FR Services';
  document.body.innerHTML =
    '<main style="max-width:640px;margin:12vh auto;padding:0 24px;' +
    'font-family:Inter,system-ui,sans-serif">' +
    '<h1 style="font-family:\'Space Grotesk\',sans-serif;font-size:26px;' +
    'margin:0 0 12px">' +
    (ADMIN_LIST.length ? 'Which company?' : 'No company to administer yet') + '</h1>' +
    '<p style="color:#5b6470;line-height:1.65;margin:0 0 22px">' +
    (ADMIN_WANT
      ? 'Nothing is registered under <b>' + esc0(ADMIN_WANT) + '</b>.'
      : ADMIN_LIST.length
        ? 'Pick the company whose dashboard you want to open.'
        : 'This console manages a registered company - its bookings, expenses, ' +
          'documents and storefront. Register one first and its dashboard ' +
          'appears here.') +
    '</p>' +
    (ADMIN_LIST.length
      ? '<div style="display:grid;gap:10px;margin-bottom:24px">' +
        ADMIN_LIST.map(c =>
          '<a href="/admin?c=' + encodeURIComponent(c.id) + '" ' +
          'style="display:block;padding:14px 16px;border:2px solid #0d1117;' +
          'border-radius:12px;text-decoration:none;color:#0d1117;font-weight:700">' +
          esc0(c.name) + '<span style="display:block;font-weight:500;font-size:13px;' +
          'color:#5b6470;margin-top:3px">' + esc0(c.loc) + '</span></a>').join('') +
        '</div>'
      : '') +
    '<a href="/register" style="display:inline-block;background:#057A2F;color:#fff;' +
    'text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px">' +
    'Register a company</a> ' +
    '<a href="/" style="display:inline-block;margin-left:8px;color:#0d1117;' +
    'text-decoration:none;font-weight:700;padding:11px 20px;border:2px solid #0d1117;' +
    'border-radius:999px">Marketplace</a></main>';
  throw new Error('no company to administer');
}

$('viewLive').href = '/company?c=' + encodeURIComponent(COMPANY_ID);

let theme = loadTheme(COMPANY_ID);

/* preview + "view my page" both follow the company being edited */
$('pvFrame').src = '/company?c=' + encodeURIComponent(COMPANY_ID) + '&preview=1';
$('pvUrl').textContent = 'frservices.ph/' + COMPANY_ID;

/* ---- live preview plumbing ----
   The preview is company.html itself, loaded at a real viewport width and
   scaled to fit the column, so layout and breakpoints match production.
   Edits go across by postMessage; the iframe re-validates every payload,
   so this is a convenience channel, never a trusted one. */
const FRAME = { desktop:{ w:1280, h:1880 }, mobile:{ w:390, h:1560 } };
let device = 'desktop';

function fitFrame(){
  const stage = $('pvStage'), f = $('pvFrame');
  if (!stage || !f) return;
  const { w, h } = FRAME[device];
  const k = stage.clientWidth / w;
  f.style.width  = w + 'px';
  f.style.height = h + 'px';
  f.style.transform = 'scale(' + k + ')';
  stage.style.height = (h * k) + 'px';
}
function pushPreview(){
  const f = $('pvFrame');
  if (f && f.contentWindow) f.contentWindow.postMessage({ type:'fr-theme', theme }, '*');
}

window.addEventListener('message', e => {
  if (e.data && e.data.type === 'fr-preview-ready') pushPreview();
});
$('pvFrame').addEventListener('load', () => { fitFrame(); pushPreview(); });
window.addEventListener('resize', fitFrame);

document.querySelectorAll('.devswitch button').forEach(b =>
  b.addEventListener('click', () => {
    document.querySelectorAll('.devswitch button').forEach(x => x.classList.remove('on'));
    b.classList.add('on');
    device = b.dataset.dev;
    fitFrame();
  }));

$('pvReload').addEventListener('click', () => {
  $('pvFrame').src = '/company?c=' + encodeURIComponent(COMPANY_ID) +
                     '&preview=1&t=' + Date.now();
});

/* ---------- preset backdrops: light through dark, all legible ---------- */
const BG_PRESETS = ['#fbfaf7','#ffffff','#f1f5f9','#eef6ef','#fdf6e8','#f6f1fb',
                    '#1f2430','#12131a','#101c17','#1a1420'];

const COVER_OPTS = [
  { id:'gradient', label:'Gradient' },
  { id:'solid',    label:'Solid'    },
  { id:'stripes',  label:'Stripes'  },
  { id:'image',    label:'Photo'    }
];
/* LAYOUTS comes from assets/theme.js so the admin and the storefront can
   never drift apart on what a valid layout is. */

/* ---------- render the whole editor from `theme` ---------- */
function paint(){
  applyTheme(theme, document.documentElement);
  pushPreview();

  $('brandPick').value  = theme.brand;
  $('brandHex').value   = theme.brand;
  $('accentPick').value = theme.accent;
  $('accentHex').value  = theme.accent;
  $('bgPick').value     = theme.bg;
  $('bgHex').value      = theme.bg;

  /* logo */
  const lb = $('logoBox');
  lb.classList.toggle('has', !!theme.logo);
  lb.innerHTML = theme.logo
    ? '<img alt="Your logo">'
    : '<span>No logo yet</span>';
  if (theme.logo) lb.querySelector('img').src = theme.logo;   // src set as a property, never interpolated
  $('logoClear').hidden = !theme.logo;

  /* cover image */
  const cb = $('coverBox');
  cb.classList.toggle('has', !!theme.coverImg);
  cb.innerHTML = theme.coverImg ? '<img alt="Your cover">' : '<span>No cover image</span>';
  if (theme.coverImg) cb.querySelector('img').src = theme.coverImg;
  $('coverClear').hidden = !theme.coverImg;

  /* harmony suggestions */
  $('harmony').innerHTML = harmonies(theme.brand).map(h =>
    `<button type="button" data-hex="${h.hex}"><i style="background:${h.hex}"></i>${h.name}</button>`
  ).join('');

  /* backdrop swatches */
  $('bgSwatches').innerHTML = BG_PRESETS.map(c =>
    `<button type="button" class="sw" data-bg="${c}" style="background:${c}" aria-label="Backdrop ${c}"></button>`
  ).join('');

  /* cover + layout tiles */
  $('coverTiles').innerHTML = COVER_OPTS.map(o => {
    const preview = o.id === 'image' && !theme.coverImg
      ? 'repeating-linear-gradient(45deg,#E0DDD5 0 8px,#F4F2ED 8px 16px)'
      : coverCss(Object.assign({}, theme, { cover:o.id }));
    return `<button type="button" class="tile-opt ${theme.cover===o.id?'on':''}" data-cover="${o.id}">
      <span class="pv" style="background:${preview}"></span><b>${o.label}</b></button>`;
  }).join('');

  $('layoutTiles').innerHTML = LAYOUTS.map(o => `
    <button type="button" class="laycard lay-${o.id} ${theme.layout===o.id?'on':''}" data-layout="${o.id}">
      ${o.tag ? `<span class="badge">${o.tag}</span>` : ''}
      <span class="thumb">
        <span class="t-cover"><span class="t-logo"></span></span>
        <span class="t-body">
          <span class="t-bar"></span>
          <span class="t-grid"><span class="t-tile"></span><span class="t-tile"></span><span class="t-tile"></span></span>
        </span>
      </span>
      <b>${o.name}</b><span>${o.note}</span>
    </button>`).join('');

  paintUnits();
  paintAudit();
}

/* =====================================================================
   FLEET
   Works for every category - the type list and the capacity label follow
   the company's own category, so a van-hire firm never sees "bucket
   capacity" and an equipment yard never sees "seats".

   On first open the stored fleet is seeded from the demo listings, so an
   owner starts from what is already on their page rather than a blank
   slate, and can then edit or delete any of it.
   ===================================================================== */
const CO      = typeof byId === 'function' ? byId(COMPANY_ID) : null;
const CO_CAT  = CO ? CO.cat : 'vehicles';
/* a company may run several service lines - the type list and the
   capacity label span all of them, and each listing records its own */
const CO_CATS = (CO && typeof catsOf === 'function') ? catsOf(CO) : [CO_CAT];
const MULTI   = CO_CATS.length > 1;

const CAP_LABEL = { vehicles:'Seats / payload', equipment:'Maximum capacity',
                    towing:'Max vehicle weight' };
const CAP_HINT  = { vehicles:'e.g. 15 seats', equipment:'e.g. 20 t / 1.0 cbm',
                    towing:'e.g. 2.5 t' };

const esc = s => String(s == null ? '' : s)
  .replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* Seed once from the demo listings, then it belongs to the owner. */
function seedFleet(){
  const demo = (typeof FR_UNITS !== 'undefined' && FR_UNITS[COMPANY_ID]) || [];
  return demo.map(u => {
    const s = u.specs || {};
    return normaliseUnit({
      id:u.id, cat:u.cat || CO_CAT, name:u.name, price:u.price, unit:u.unit, qty:u.avail,
      model: s.Model || '',
      year:  s.Year  || '',
      capacity: s.Seats || s['Operating weight'] || s['Max capacity'] ||
                s['Max vehicle'] || s.Bucket || s.Capacity || '',
      operator: u.operator ? 'included' : 'none',
      delivery: u.delivery || 0,
      photo: (theme.unitImages && theme.unitImages[u.id]) || null
    });
  }).filter(Boolean);
}

let fleet = loadFleet(COMPANY_ID) || seedFleet();
let editingId = null;

function paintUnits(){
  const host = $('unitPhotos');
  if (!host) return;

  const withPhoto = fleet.filter(u => u.photo).length;
  $('unitCount').textContent = fleet.length
    ? `${fleet.length} listing${fleet.length > 1 ? 's' : ''} · ${withPhoto} with a photo`
    : 'No listings yet';
  $('unitProg').style.width =
    fleet.length ? Math.round((withPhoto / fleet.length) * 100) + '%' : '0%';
  host.classList.toggle('tall', fleet.length > 12);

  const cards = fleet.map(u => {
    const save = bestDiscount(u);
    return `<div class="gcard">
      <div class="gshot"${u.photo ? ` style="background-image:url('${u.photo}')"` : ''}>
        <button type="button" class="gedit" data-edit="${u.id}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
          Edit
        </button>
        <button type="button" class="unitdel" data-unit-del="${u.id}" aria-label="Delete ${esc(u.name)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <div class="gmeta">
        <b>${esc(u.name)}</b>
        <span>${peso(u.price)} / ${esc(u.unit)}${u.qty ? ' · ' + u.qty + ' available' : ' · none free'}</span>
        <div class="gtags">
          ${u.type ? `<span class="gtag">${esc(u.type)}</span>` : ''}
          ${save ? `<span class="gtag save">Save ${save}%</span>` : ''}
          ${u.photo ? '' : '<span class="gtag nophoto">No photo</span>'}
        </div>
      </div>
    </div>`;
  }).join('');

  host.innerHTML = cards + `
    <button type="button" class="gadd" id="addUnit" title="Add a unit">
      <span class="plus" aria-hidden="true">+</span>
      <span class="lbl">Add unit</span>
      <span class="sub">photo, specs &amp; rate</span>
    </button>`;
}

/* ---- the add / edit box ---- */
const uModal = $('uModal');
let draftPhoto = null;

function openUnit(id){
  editingId = id || null;
  const u = id ? fleet.find(x => x.id === id) : null;
  const v = u || normaliseUnit({ name:'placeholder' });

  $('um-title').textContent = u ? 'Edit unit' : 'Add a unit';
  $('umDelete').hidden = !u;
  $('umErr').textContent = '';

  /* Types span every service line the company runs. For a multi-service
     operator they're grouped, so a tow type can't be picked by accident
     when adding a sedan. */
  const cur = v.cat || CO_CAT;
  const optsFor = c => ((typeof FR_TYPES !== 'undefined' && FR_TYPES[c]) || [])
    .map(t => `<option value="${esc(t)}"${t === v.type ? ' selected' : ''}>${esc(t)}</option>`).join('');
  $('um-type').innerHTML = '<option value="">Choose a type</option>' + (MULTI
    ? CO_CATS.map(c => `<optgroup label="${FR_CATS[c].label}">${optsFor(c)}</optgroup>`).join('')
    : optsFor(CO_CAT));

  /* service-line selector, only when there's a choice to make */
  $('um-cat-wrap').hidden = !MULTI;
  if (MULTI){
    $('um-cat').innerHTML = CO_CATS.map(c =>
      `<option value="${c}"${c === cur ? ' selected' : ''}>${FR_CATS[c].label}</option>`).join('');
  }
  const capCat = MULTI ? cur : CO_CAT;
  $('um-cap-lbl').textContent = CAP_LABEL[capCat] || 'Maximum capacity';
  $('um-capacity').placeholder = CAP_HINT[capCat] || '';

  $('um-name').value     = u ? v.name : '';
  $('um-model').value    = v.model;
  $('um-year').value     = v.year;
  $('um-capacity').value = v.capacity;
  $('um-price').value    = u ? v.price : '';
  $('um-unit').value     = v.unit;
  $('um-qty').value      = v.qty;
  $('um-d3').value       = v.d3;
  $('um-d7').value       = v.d7;
  $('um-d30').value      = v.d30;
  $('um-operator').value = v.operator;
  $('um-fuel').value     = v.fuel;
  $('um-mindays').value  = v.minDays;
  $('um-delmode').value  = v.deliveryMode;
  $('um-delivery').value = v.delivery;
  $('um-delkm').value    = v.deliveryKm;
  $('um-delfree').value  = v.deliveryFree;
  $('um-delpreview').value = 25;
  $('um-notes').value    = v.notes;

  draftPhoto = v.photo;
  paintDrop();
  calcPreview();
  paintDelivery();

  uModal.hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('um-name').focus(), 30);
}
function closeUnit(){
  uModal.hidden = true;
  document.body.style.overflow = '';
  editingId = null; draftPhoto = null;
}
function paintDrop(){
  const d = $('umDrop');
  d.classList.toggle('has', !!draftPhoto);
  d.style.backgroundImage = draftPhoto ? `url('${draftPhoto}')` : '';
  $('umClear').hidden = !draftPhoto;
}

/* Live "what a renter actually pays" line - a mistyped discount is far
   easier to spot as a peso figure than as a percentage. */
function calcPreview(){
  const price = Number($('um-price').value) || 0;
  if (!price){ $('umCalc').textContent = 'Enter a rate to preview long-hire pricing.'; return; }
  const u = normaliseUnit({ name:'x', price,
    d3:$('um-d3').value, d7:$('um-d7').value, d30:$('um-d30').value });
  const l = n => { const r = unitRate(u, n);
    return `${n}d → ${peso(r.perDay)}/day` + (r.pct ? ` (−${r.pct}%)` : ''); };
  $('umCalc').innerHTML = `<b>Renter sees:</b> 1d → ${peso(u.price)}/day &nbsp;·&nbsp; ` +
    `${l(3)} &nbsp;·&nbsp; ${l(7)} &nbsp;·&nbsp; ${l(30)}`;
}
['um-price','um-d3','um-d7','um-d30'].forEach(id =>
  $(id).addEventListener('input', calcPreview));

/* ---- delivery mode: show only the fields that mode actually uses ---- */
function paintDelivery(){
  const mode = $('um-delmode').value;
  $('um-delfee-wrap').hidden  = mode === 'quoted';
  $('um-delfree-wrap').hidden = mode !== 'perkm';
  $('um-delkm-row').hidden    = mode !== 'perkm';
  $('um-delfee-lbl').textContent =
    mode === 'perkm' ? 'Base / call-out fee (₱)' : 'Delivery fee (₱)';

  const u = normaliseUnit({
    name:'x',
    deliveryMode: mode,
    delivery:     $('um-delivery').value,
    deliveryKm:   $('um-delkm').value,
    deliveryFree: $('um-delfree').value
  });
  const km = Number($('um-delpreview').value) || 0;
  const cost = deliveryCost(u, km);
  $('umDelCalc').innerHTML = cost === null
    ? '<b>Renter sees:</b> Quoted per site - no figure shown until you send one.'
    : `<b>Renter sees:</b> ${deliveryText(u)}` +
      (mode === 'perkm' ? ` &nbsp;·&nbsp; a ${km} km job costs ${peso(cost)}` : '');
}
['um-delmode','um-delivery','um-delkm','um-delfree','um-delpreview'].forEach(id =>
  $(id).addEventListener('input', paintDelivery));
$('um-delmode').addEventListener('change', paintDelivery);

$('umFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  $('umErr').textContent = '';
  try { draftPhoto = await readImage(file); paintDrop(); }
  catch (ex) { $('umErr').textContent = ex.message; }
  finally { e.target.value = ''; }
});
$('umClear').addEventListener('click', () => { draftPhoto = null; paintDrop(); });

$('umSave').addEventListener('click', () => {
  const name = $('um-name').value.trim();
  if (!name){
    $('umErr').textContent = 'Give the unit a name renters will recognise.';
    $('um-name').focus(); return;
  }
  const next = normaliseUnit({
    id: editingId || '', name,
    cat: MULTI ? $('um-cat').value : CO_CAT,
    type:$('um-type').value, model:$('um-model').value, year:$('um-year').value,
    capacity:$('um-capacity').value, price:$('um-price').value, unit:$('um-unit').value,
    qty:$('um-qty').value, d3:$('um-d3').value, d7:$('um-d7').value, d30:$('um-d30').value,
    operator:$('um-operator').value, fuel:$('um-fuel').value, minDays:$('um-mindays').value,
    deliveryMode:$('um-delmode').value, delivery:$('um-delivery').value,
    deliveryKm:$('um-delkm').value, deliveryFree:$('um-delfree').value,
    notes:$('um-notes').value, photo:draftPhoto
  });
  if (!next){ $('umErr').textContent = 'Could not save - check the fields above.'; return; }

  const i = fleet.findIndex(x => x.id === next.id);
  if (i >= 0) fleet[i] = next; else fleet.push(next);
  saveFleet(COMPANY_ID, fleet);
  closeUnit();
  paint();
});

$('umDelete').addEventListener('click', () => {
  fleet = fleet.filter(x => x.id !== editingId);
  saveFleet(COMPANY_ID, fleet);
  closeUnit();
  paint();
});

uModal.addEventListener('click', e => { if (e.target.closest('[data-um-close]')) closeUnit(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !uModal.hidden) closeUnit(); });

/* Delegated, because the fleet grid is re-rendered on every change - but
   bound to the grid, NOT to document. Listening on document meant a
   `data-edit` button anywhere else on the page opened the unit modal:
   editing a company document popped "Add a unit" on top of it. */
$('unitPhotos').addEventListener('click', e => {
  if (e.target.closest('#addUnit')){ openUnit(null); return; }
  const ed = e.target.closest('[data-edit]');
  if (ed){ openUnit(ed.dataset.edit); return; }
  const del = e.target.closest('[data-unit-del]');
  if (del){
    fleet = fleet.filter(x => x.id !== del.dataset.unitDel);
    saveFleet(COMPANY_ID, fleet);
    paint();
  }
});


function paintAudit(){
  const w = themeWarnings(theme);
  const box = $('audit');
  box.classList.toggle('has', w.length > 0);
  box.classList.toggle('bad', w.some(x => x.level === 'bad'));
  if (!w.length){
    box.innerHTML = `<h3>${okIcon()} Everything is readable</h3>
      <p>All colour pairings clear the WCAG thresholds. Your page will be legible for renters with low vision and on dim phone screens in daylight.</p>`;
    return;
  }
  box.innerHTML = `<h3>${warnIcon()} ${w.length} thing${w.length>1?'s':''} to look at</h3>
    <p>These combinations may be hard to read. You can still publish - but renters on a bright street may not see them.</p>
    <ul>${w.map(x => `<li><b>${x.label}</b> - contrast ${x.ratio}:1, needs ${x.need}:1</li>`).join('')}</ul>`;
}
const okIcon = () => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6L20 6"/></svg>';
const warnIcon = () => '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>';

/* ---------- colour inputs ---------- */
function bindColour(pickId, hexId, key){
  const pick = $(pickId), hex = $(hexId);
  pick.addEventListener('input', () => { theme[key] = safeColor(pick.value, theme[key]); paint(); });
  hex.addEventListener('input', () => {
    const v = hex.value.trim();
    if (HEX_RE.test(v)){ theme[key] = v.toLowerCase(); paint(); }
  });
  hex.addEventListener('blur', () => { hex.value = theme[key]; });   // snap back if invalid
}
bindColour('brandPick','brandHex','brand');
bindColour('accentPick','accentHex','accent');
bindColour('bgPick','bgHex','bg');

/* ---------- delegated clicks for generated controls ---------- */
document.addEventListener('click', e => {
  const h = e.target.closest('[data-hex]');
  if (h){ theme.accent = safeColor(h.dataset.hex, theme.accent); paint(); return; }
  const b = e.target.closest('[data-bg]');
  if (b){ theme.bg = safeColor(b.dataset.bg, theme.bg); paint(); return; }
  const c = e.target.closest('[data-cover]');
  if (c){
    if (c.dataset.cover === 'image' && !theme.coverImg){
      $('coverErr').textContent = 'Upload a cover image first, then pick Photo.';
      return;
    }
    theme.cover = c.dataset.cover; paint(); return;
  }
  const l = e.target.closest('[data-layout]');
  if (l){ theme.layout = l.dataset.layout; paint(); }
});

/* ---------- uploads ---------- */
function bindUpload(inputId, errId, key, onDone){
  $(inputId).addEventListener('change', async e => {
    const err = $(errId);
    err.textContent = '';
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      theme[key] = await readImage(file);      // validates type + size, rejects SVG
      if (onDone) onDone();
      paint();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      e.target.value = '';                     // allow re-picking the same file
    }
  });
}
bindUpload('logoFile',  'logoErr',  'logo');
bindUpload('coverFile', 'coverErr', 'coverImg', () => { theme.cover = 'image'; });

$('logoClear').addEventListener('click', () => { theme.logo = null; paint(); });
$('coverClear').addEventListener('click', () => {
  theme.coverImg = null;
  if (theme.cover === 'image') theme.cover = 'gradient';
  paint();
});

/* ---------- save / reset ---------- */
$('saveBtn').addEventListener('click', () => {
  const ok = saveTheme(COMPANY_ID, theme);
  const note = $('savedNote');
  note.textContent = ok ? 'Published - open your page to see it live.'
                        : 'Could not save (browser storage is full or blocked).';
  note.style.color = ok ? 'var(--ok)' : 'var(--danger)';
  setTimeout(() => { note.textContent = ''; }, 6000);
});
$('resetBtn').addEventListener('click', () => {
  theme = normaliseTheme(null);
  saveTheme(COMPANY_ID, theme);
  paint();
});

paint();
fitFrame();

/* =====================================================================
   CONSOLE
   Four operational tabs plus the storefront editor above. Each tab paints
   lazily and only when its own data changed - the storefront preview is an
   iframe, and repainting it on every tab switch would flash.
   ===================================================================== */
$('ab-name').textContent = (CO && CO.name) || COMPANY_ID;

const PANES = ['overview','bookings','expenses','docs','reports','storefront'];
let activeTab = 'overview';

function showTab(id){
  if (!PANES.includes(id)) id = 'overview';
  activeTab = id;
  PANES.forEach(p => { $('pane-' + p).hidden = p !== id; });
  document.querySelectorAll('#tabBar .tabbtn').forEach(b =>
    b.classList.toggle('on', b.dataset.tab === id));
  if (id === 'overview') paintOverview();
  if (id === 'bookings') paintBookings();
  if (id === 'expenses') paintExpenses();
  if (id === 'docs')     paintDocs();
  if (id === 'reports')  paintReport();
  if (id === 'storefront') fitFrame();
  /* Keep the tab in the URL so a reload lands back where the operator was.
     Wrapped because a file:// document has an opaque origin and Chrome
     throws a SecurityError on replaceState there - the console still works,
     it just cannot remember the tab. */
  try {
    history.replaceState(null, '', '?c=' + encodeURIComponent(COMPANY_ID) + '#' + id);
  } catch { /* file:// - no history rewriting available */ }
  window.scrollTo(0, 0);
}

/* Keep the sticky tab strip parked directly under the nav at any width. */
function measureNav(){
  const nav = document.querySelector('nav.top');
  if (nav) document.documentElement.style.setProperty('--navh', nav.offsetHeight + 'px');
}
measureNav();
window.addEventListener('resize', measureNav);
$('tabBar').addEventListener('click', e => {
  const b = e.target.closest('.tabbtn');
  if (b) showTab(b.dataset.tab);
});

/* ---------- shared bits ---------- */
const TODAY = opsToday();
const RANGE_LABELS = {
  upcoming:'Upcoming', today:'Today', week:'7 days', month:'This month',
  lastmo:'Last month', '30':'30 days', quarter:'90 days', year:'Year to date', all:'All'
};
const pct = n => (Math.round(n * 10) / 10) + '%';

/** One chipset implementation for all four period pickers. */
function buildChips(hostId, ids, current, onPick){
  const host = $(hostId);
  host.innerHTML = ids.map(id =>
    `<button type="button" data-r="${id}" class="${id === current ? 'on' : ''}">${esc(RANGE_LABELS[id])}</button>`
  ).join('');
  host.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    host.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    onPick(b.dataset.r);
  });
}
function kpiCard(k){
  return `<div class="kpi"><span class="k-lbl">${esc(k.label)}</span>` +
         `<span class="k-val">${esc(k.value)}</span>` +
         (k.note ? `<span class="k-note">${k.note}</span>` : '') + '</div>';
}
function statusPill(id){
  const s = BOOK_STATUS[id];
  return `<span class="st st-${s.tone}">${esc(s.label)}</span>`;
}
function payPill(id){
  const p = PAY_STATUS[id];
  return `<span class="st st-${p.tone}">${esc(p.label)}</span>`;
}

/* =====================================================================
   CHARTS
   Owner theming stops at the storefront: these palettes are fixed, because
   an expense chart that recolours with the brand would be decorating the
   data rather than encoding it.
   ===================================================================== */
const SPLIT_HUES = ['#057A2F','#1D4ED8','#B8860B','#0891B2','#C2410C','#7C3AED'];
const OTHER_HUE  = '#6B7280';
/* A pie stays readable to about six slices, so the tail folds into a single
   grey remainder - grey because "Other" is not an identity, it is what is
   left. The key beside the pie still itemises every category. */
const PIE_MAX = 6;

/** Axis ticks a person would have chosen: 1, 2, 2.5 or 5 × a power of ten. */
function niceScale(max, steps){
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const raw  = max / steps;
  const mag  = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top  = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return { max: top, ticks };
}
/** Axis labels have to be short or they collide; the tooltip carries exact. */
function shortMoney(n){
  const v = Number(n) || 0;
  if (v >= 1e9) return '₱' + (v / 1e9).toFixed(v >= 1e10 ? 0 : 1) + 'B';
  if (v >= 1e6) return '₱' + (v / 1e6).toFixed(v >= 1e7 ? 0 : 1) + 'M';
  if (v >= 1e3) return '₱' + Math.round(v / 1e3) + 'k';
  return '₱' + v;
}

/* ---- one shared tooltip ---- */
const tip = document.createElement('div');
tip.className = 'c-tip';
tip.hidden = true;
document.body.appendChild(tip);
function showTip(html, ev){
  tip.innerHTML = html;
  tip.hidden = false;
  const r = tip.getBoundingClientRect();
  let x = ev.clientX + 14, y = ev.clientY - r.height - 12;
  if (x + r.width > innerWidth - 8)  x = ev.clientX - r.width - 14;
  if (y < 8) y = ev.clientY + 18;
  tip.style.left = x + 'px';
  tip.style.top  = y + 'px';
}
const hideTip = () => { tip.hidden = true; };
addEventListener('scroll', hideTip, true);

/* ---------------------------------------------------------------
   Grouped column chart with a real value axis
   --------------------------------------------------------------- */
function paintColumns(buckets){
  const yHost = $('ovY'), plot = $('ovPlot'), xHost = $('ovX');
  const peak  = Math.max(0, ...buckets.map(b => Math.max(b.revenue, b.expenses)));
  const { max, ticks } = niceScale(peak, 4);

  yHost.innerHTML = ticks.map(v =>
    `<span style="bottom:${(v / max * 100).toFixed(2)}%">${esc(shortMoney(v))}</span>`).join('');

  plot.innerHTML =
    ticks.filter(v => v > 0).map(v =>
      `<div class="gl" style="bottom:${(v / max * 100).toFixed(2)}%"></div>`).join('') +
    '<div class="c-cols">' + buckets.map((b, i) => `
      <div class="c-col" data-i="${i}">
        <i class="rev" style="height:${(b.revenue / max * 100).toFixed(2)}%"></i>
        <i class="exp" style="height:${(b.expenses / max * 100).toFixed(2)}%"></i>
      </div>`).join('') + '</div>';

  xHost.innerHTML = buckets.map(b => `<span>${esc(b.label)}</span>`).join('');

  plot.onmousemove = e => {
    const col = e.target.closest('.c-col');
    if (!col) return hideTip();
    const b = buckets[+col.dataset.i];
    showTip(
      `<b>${esc(b.label)}</b>` +
      `<s style="background:var(--c1)"></s>Revenue<em>${esc(money(b.revenue))}</em><br>` +
      `<s style="background:var(--c3)"></s>Expenses<em>${esc(money(b.expenses))}</em><br>` +
      `<s style="background:transparent"></s>Net<em>${esc(money(b.revenue - b.expenses))}</em>`, e);
  };
  plot.onmouseleave = hideTip;

  $('ovBarsTbl').innerHTML = buckets.map(b => `
    <tr><td>${esc(b.label)}</td><td class="num">${b.bookings}</td>
      <td class="num">${esc(money(b.revenue))}</td>
      <td class="num">${esc(money(b.expenses))}</td>
      <td class="num strong">${esc(money(b.revenue - b.expenses))}</td></tr>`).join('');
}
$('ovBarsTblBtn').addEventListener('click', () => {
  const w = $('ovBarsTblWrap'), open = w.hidden;
  w.hidden = !open;
  $('ovBarsTblBtn').setAttribute('aria-expanded', String(open));
  $('ovBarsTblBtn').textContent = open ? 'Hide the table' : 'Show the values as a table';
});

/* ---------------------------------------------------------------
   Pie
   --------------------------------------------------------------- */
const pol = (cx, cy, r, deg) => {
  const a = (deg - 90) * Math.PI / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
function slicePath(cx, cy, r, a0, a1){
  if (a1 - a0 >= 359.999)              // one category: a whole circle
    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`;
  const [x0, y0] = pol(cx, cy, r, a0), [x1, y1] = pol(cx, cy, r, a1);
  return `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1} Z`;
}

function paintPie(hostId, keyId, rows, total){
  const host = $(hostId), key = $(keyId);
  if (!rows.length || !total){
    host.innerHTML = '';
    key.innerHTML = '<span class="muted">Nothing recorded in this period.</span>';
    return;
  }

  /* Fold the tail so the pie never carries more than six slices. */
  const head = rows.slice(0, PIE_MAX);
  const tail = rows.slice(PIE_MAX);
  const slices = head.map((r, i) => ({ ...r, hue: SPLIT_HUES[i] }));
  if (tail.length)
    slices.push({ label:'Other', hue:OTHER_HUE,
                  amount: tail.reduce((n, r) => n + r.amount, 0),
                  parts: tail.map(r => r.label) });

  const S = 260, cx = S / 2, cy = S / 2, r = 104;
  let a = 0;
  const arcs = [], inside = [], outside = [];

  slices.forEach((s, i) => {
    const span = s.amount / total * 360;
    const mid  = a + span / 2;
    const share = s.amount / total * 100;
    /* One decimal everywhere. Rounding to a whole number inside the slice
       and to a decimal in the key beside it makes the same slice read as
       two different figures. */
    const pctTxt = (Math.round(share * 10) / 10) + '%';
    const valTxt = shortMoney(s.amount);

    /* stroke in the surface colour is the 2px gap, not a border on the mark */
    arcs.push(`<path d="${slicePath(cx, cy, r, a, a + span)}" fill="${s.hue}"
       stroke="#fff" stroke-width="2" data-i="${i}"></path>`);

    /* Only label inside when it genuinely fits: the chord at the label
       radius has to hold the widest of the two lines, with padding. */
    const lr    = r * 0.64;
    const chord = 2 * lr * Math.sin(Math.min(span, 180) * Math.PI / 360);
    const need  = Math.max(valTxt.length, pctTxt.length) * 5.9 + 10;
    const [lx, ly] = pol(cx, cy, lr, mid);

    if (chord >= need && span >= 26){
      const ink = bestOn(s.hue) === '#ffffff' ? '' : ' dark';
      inside.push(`<text class="pie-in${ink}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}">
        <tspan class="v" x="${lx.toFixed(1)}" dy="-1">${esc(valTxt)}</tspan>
        <tspan class="p" x="${lx.toFixed(1)}" dy="11">${esc(pctTxt)}</tspan></text>`);
    } else {
      /* leader line out to a label that has room */
      const [ex, ey] = pol(cx, cy, r + 6, mid);
      const [fx, fy] = pol(cx, cy, r + 18, mid);
      const right = fx >= cx;
      const tx = right ? fx + 4 : fx - 4;
      outside.push(
        `<path class="pie-lead" d="M ${ex.toFixed(1)} ${ey.toFixed(1)} L ${fx.toFixed(1)} ${fy.toFixed(1)} ` +
        `L ${(tx + (right ? 6 : -6)).toFixed(1)} ${fy.toFixed(1)}"></path>` +
        `<text class="pie-out" x="${(tx + (right ? 9 : -9)).toFixed(1)}" y="${(fy + 3.5).toFixed(1)}" ` +
        `text-anchor="${right ? 'start' : 'end'}">${esc(valTxt)} · ${esc(pctTxt)}</text>`);
    }
    a += span;
  });

  /* The viewBox carries side room for the leader labels - a callout for a
     small slice on the left extends well past the circle. */
  host.innerHTML =
    `<svg class="pie" viewBox="-78 -8 ${S + 156} ${S + 16}" role="img"
          aria-label="Operating costs by category">
       ${arcs.join('')}${inside.join('')}${outside.join('')}
     </svg>`;

  host.querySelector('svg').addEventListener('mousemove', e => {
    const p = e.target.closest('path[data-i]');
    if (!p) return hideTip();
    const s = slices[+p.dataset.i];
    showTip(`<b><s style="background:${s.hue}"></s>${esc(s.label)}</b>` +
      `${esc(money(s.amount))} &nbsp;·&nbsp; ${(s.amount / total * 100).toFixed(1)}% of spend` +
      (s.parts ? `<br><span style="opacity:.75">${esc(s.parts.join(', '))}</span>` : ''), e);
  });
  host.querySelector('svg').addEventListener('mouseleave', hideTip);

  /* The key is the table view: every category, never folded. */
  key.innerHTML = rows.map((r, i) => {
    const hue = i < PIE_MAX ? SPLIT_HUES[i] : OTHER_HUE;
    return `<span><i style="background:${hue}"></i>${esc(r.label)}` +
           `<b>${esc(money(r.amount))}</b><u>${(r.amount / total * 100).toFixed(1)}%</u></span>`;
  }).join('') +
  `<span class="tot"><i style="background:transparent"></i>Total` +
  `<b>${esc(money(total))}</b><u>100%</u></span>`;
}

/* =====================================================================
   OVERVIEW
   ===================================================================== */
let ovRangeId = '30';

function paintOverview(){
  const r = opsRange(ovRangeId, TODAY);
  const s = opsStats(COMPANY_ID, r.from, r.to, TODAY);
  $('ovRangeLbl').textContent = fmtDate(r.from) + ' – ' + fmtDate(r.to);

  /* Compare against the immediately preceding window of the same length,
     because "revenue: ₱2.4M" means nothing without a direction. */
  const back = opsStats(COMPANY_ID,
    addDays(r.from, -s.spanDays), addDays(r.from, -1), TODAY);
  const delta = (now, was) => {
    if (!was) return '';
    const d = Math.round((now - was) / was * 1000) / 10;
    if (!isFinite(d) || Math.abs(d) < 0.1) return ' <b>level</b> on the previous period';
    return ` <b class="${d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${d}%</b> on the previous period`;
  };

  $('ovKpis').innerHTML = [
    { label:'Revenue',     value:money(s.revenue),  note:delta(s.revenue, back.revenue) },
    { label:'Expenses',    value:money(s.expenses), note:delta(s.expenses, back.expenses) },
    { label:'Net',         value:money(s.net),      note:`${pct(s.margin)} margin` },
    { label:'Bookings',    value:String(s.bookings),note:`${s.pendingNow} awaiting your reply` },
    { label:'Utilisation', value:pct(s.utilisation),note:`${s.hiredDays} of ${s.capacity} unit-days` },
    { label:'Average hire',value:money(s.avgValue), note:`${s.avgDays} days typical` },
    { label:'Outstanding', value:money(s.outstanding), note:'uncollected across all bookings' },
    { label:'Repeat clients', value:pct(s.repeatRate), note:`${s.customers} customers this period` }
  ].map(kpiCard).join('');

  /* --- alerts --- */
  const alerts = opsAlerts(COMPANY_ID, TODAY);
  $('ovAlerts').innerHTML = alerts.length ? alerts.map(a =>
    `<div class="alert ${a.level}"><div><b>${esc(a.title)}</b><p>${esc(a.body)}</p></div>` +
    `<button class="btn btn-w" data-go="${esc(a.go)}"${a.range ? ` data-range="${esc(a.range)}"` : ''}>Open</button></div>`
  ).join('') : '<div class="alert info"><div><b>Nothing needs your attention</b>' +
    '<p>No overdue returns, unanswered requests or lapsed documents.</p></div></div>';

  /* --- trend columns, bucketed to suit the window --- */
  const series = opsSeries(COMPANY_ID, r.from, r.to, TODAY);
  $('ovBarsNote').textContent = series.note;
  paintColumns(series.buckets);

  paintPie('ovPie', 'ovSplitKey', s.byExpCat, s.expenses);

  /* --- per-unit table --- */
  $('ovUnits').innerHTML = s.byUnit.length ? s.byUnit.map(u => `
    <tr>
      <td class="strong">${esc(u.name)}${u.qty > 1 ? `<span class="sub">${u.qty} units</span>` : ''}</td>
      <td>${esc(CAT_LABEL[u.cat] || u.cat)}</td>
      <td class="num">${u.bookings}</td>
      <td class="num">${u.days}</td>
      <td class="num strong">${esc(money(u.revenue))}</td>
      <td class="num"><span class="miniprog"><i style="width:${u.utilisation}%"></i></span>
          &nbsp;${pct(u.utilisation)}</td>
    </tr>`).join('')
    : '<tr><td colspan="6" class="emptyrow">No units listed yet - add them under Storefront.</td></tr>';

  /* --- compliance --- */
  const docs = opsCompliance(COMPANY_ID, TODAY);
  $('ovDocs').innerHTML = docs.length ? docs.map(d => {
    const tone = d.state === 'expired' ? 'off' : d.state === 'soon' ? 'warn'
               : d.state === 'none' ? 'off' : 'ok';
    return `<tr><td class="strong">${esc(d.name)}` +
           `<span class="sub">${d.published ? 'On your public page' : 'Not published'}</span></td>` +
           `<td>${esc(d.issuer || '-')}</td>` +
           `<td class="nowrap">${d.expires ? esc(fmtDate(d.expires)) : '-'}</td>` +
           `<td class="num"><span class="st st-${tone}">${esc(d.label)}</span></td></tr>`;
  }).join('')
   : '<tr><td colspan="4" class="emptyrow">No documents on file yet.</td></tr>';
}
/* An alert that opens a screen showing none of what it warned about is
   worse than no alert, so each one carries the window that contains it. */
$('ovAlerts').addEventListener('click', e => {
  const b = e.target.closest('[data-go]');
  if (!b) return;
  if (b.dataset.go === 'bookings' && b.dataset.range){
    bkRangeId = b.dataset.range;
    bkShown = BK_PAGE;
    $('bkRange').querySelectorAll('button').forEach(x =>
      x.classList.toggle('on', x.dataset.r === bkRangeId));
  }
  showTab(b.dataset.go);
});
buildChips('ovRange', RANGE_IDS, ovRangeId, id => { ovRangeId = id; paintOverview(); });

/* =====================================================================
   BOOKINGS
   ===================================================================== */
let bkRangeId = 'upcoming';
const BK_PAGE = 60;
let bkShown = BK_PAGE;

$('bkStatus').innerHTML += Object.keys(BOOK_STATUS)
  .map(id => `<option value="${id}">${esc(BOOK_STATUS[id].label)}</option>`).join('');
$('bkPay').innerHTML += Object.keys(PAY_STATUS)
  .map(id => `<option value="${id}">${esc(PAY_STATUS[id].label)}</option>`).join('');

function bookingRows(){
  const r = opsRange(bkRangeId, TODAY);
  const q = $('bkSearch').value.trim().toLowerCase();
  const st = $('bkStatus').value, pv = $('bkPay').value, ct = $('bkCat').value;
  const rows = opsBookings(COMPANY_ID, TODAY).filter(b => {
    if (b.start < r.from || b.start > r.to) return false;
    if (st && b.status !== st) return false;
    if (pv && b.pay !== pv) return false;
    if (ct && b.cat !== ct) return false;
    if (q && !(b.ref + ' ' + b.customer + ' ' + b.unitName).toLowerCase().includes(q)) return false;
    return true;
  });
  /* History reads newest-first; a queue of work reads soonest-first. The
     upcoming list is a queue - showing September before tomorrow buries
     the requests that actually need answering. */
  return bkRangeId === 'upcoming'
    ? rows.slice().sort((a, b) => a.start.localeCompare(b.start) || a.ref.localeCompare(b.ref))
    : rows;
}

function paintBookings(){
  const r = opsRange(bkRangeId, TODAY);
  const s = opsStats(COMPANY_ID, r.from, r.to, TODAY);

  $('bkKpis').innerHTML = s.byStatus.map(x => kpiCard({
    label:x.label, value:String(x.count),
    note: x.amount ? money(x.amount) : BOOK_STATUS[x.id].note
  })).join('');

  const rows = bookingRows();
  $('bkCount').textContent = `${rows.length} booking${rows.length === 1 ? '' : 's'} · ${fmtDate(r.from)} – ${fmtDate(r.to)}`;

  const page = rows.slice(0, bkShown);
  $('bkRows').innerHTML = page.length ? page.map(b => {
    const acts = b.status === 'pending'
      ? `<button class="btn btn-y btn-sm" data-act="confirmed" data-ref="${esc(b.ref)}">Accept</button>
         <button class="btn btn-w btn-sm" data-act="cancelled" data-ref="${esc(b.ref)}">Decline</button>`
      : b.status === 'confirmed'
      ? `<button class="btn btn-w btn-sm" data-act="onhire" data-ref="${esc(b.ref)}">Hand over</button>`
      : b.status === 'onhire'
      ? `<button class="btn btn-w btn-sm" data-act="completed" data-ref="${esc(b.ref)}">Mark returned</button>`
      : '';
    return `<tr>
      <td class="strong">${esc(b.ref)}<span class="sub">${esc(b.channel)}</span></td>
      <td>${esc(b.customer)}${b.corporate ? '<span class="sub">Corporate account</span>' : ''}</td>
      <td>${esc(b.unitName)}<span class="sub">${esc(b.site)} · ${b.km} km</span></td>
      <td class="nowrap">${esc(fmtDateShort(b.start))} – ${esc(fmtDateShort(b.end))}<span class="sub">${b.days} day${b.days === 1 ? '' : 's'}</span></td>
      <td>${statusPill(b.status)}</td>
      <td>${payPill(b.pay)}${b.balance ? `<span class="sub">${esc(money(b.balance))} due</span>` : ''}</td>
      <td class="num strong">${esc(money(b.total))}</td>
      <td class="num">${acts}</td>
    </tr>`;
  }).join('')
   : '<tr><td colspan="8" class="emptyrow">No bookings match these filters.</td></tr>';

  $('bkMore').innerHTML = rows.length > bkShown
    ? `Showing ${bkShown} of ${rows.length}. <button class="linkbtn" id="bkMoreBtn" style="color:var(--ink)">Show more</button>`
    : '';
  if ($('bkMoreBtn'))
    $('bkMoreBtn').addEventListener('click', () => { bkShown += BK_PAGE; paintBookings(); });

  const pending = opsBookings(COMPANY_ID, TODAY).filter(b => b.status === 'pending').length;
  $('tabPending').hidden = !pending;
  $('tabPending').textContent = pending;
}

$('bkRows').addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  setBookingStatus(COMPANY_ID, b.dataset.ref, b.dataset.act);
  paintBookings();
});
['bkSearch','bkStatus','bkPay','bkCat'].forEach(id =>
  $(id).addEventListener('input', () => { bkShown = BK_PAGE; paintBookings(); }));
buildChips('bkRange', BOOKING_RANGE_IDS, bkRangeId, id => { bkRangeId = id; bkShown = BK_PAGE; paintBookings(); });

/* =====================================================================
   EXPENSES
   ===================================================================== */
let exRangeId = '30';
const EX_PAGE = 60;
let exShown = EX_PAGE;

$('ex-cat').innerHTML = EXPENSE_CATS
  .map(c => `<option value="${c.id}">${esc(c.label)}</option>`).join('');
$('ex-method').innerHTML = PAY_METHODS
  .map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
$('ex-date').value = TODAY;

function paintExpenseUnits(){
  $('ex-unit').innerHTML = '<option value="">Not unit-specific</option>' +
    opsFleet(COMPANY_ID).map(u =>
      `<option value="${esc(u.id)}">${esc(u.name)}</option>`).join('');
}

function paintExpenses(){
  paintExpenseUnits();
  const r = opsRange(exRangeId, TODAY);
  const s = opsStats(COMPANY_ID, r.from, r.to, TODAY);
  const rows = opsExpenses(COMPANY_ID, TODAY)
    .filter(e => e.date >= r.from && e.date <= r.to);

  $('exCount').textContent = `${rows.length} entr${rows.length === 1 ? 'y' : 'ies'} · ${fmtDate(r.from)} – ${fmtDate(r.to)}`;
  $('exKpis').innerHTML = [
    { label:'Total spend', value:money(s.expenses), note:`${rows.length} entries` },
    { label:'Largest category', value:s.byExpCat.length ? s.byExpCat[0].label : '-',
      note:s.byExpCat.length ? pct(s.byExpCat[0].pct) + ' of spend' : '' },
    { label:'Against revenue', value:s.revenue ? pct(Math.round(s.expenses / s.revenue * 1000) / 10) : '-',
      note:'cost ratio for the period' },
    { label:'Net after costs', value:money(s.net), note:`${pct(s.margin)} margin` }
  ].map(kpiCard).join('');

  paintPie('exPie', 'exSplitKey', s.byExpCat, s.expenses);

  const page = rows.slice(0, exShown);
  $('exRows').innerHTML = page.length ? page.map(e => `
    <tr>
      <td>${esc(fmtDate(e.date))}</td>
      <td>${esc(expenseCatLabel(e.cat))}</td>
      <td class="strong">${esc(e.vendor)}${e.note ? `<span class="sub">${esc(e.note)}</span>` : ''}</td>
      <td>${esc(e.unitName || '-')}</td>
      <td>${esc(e.method)}</td>
      <td class="num strong">${esc(money(e.amount))}</td>
      <td class="num"><button class="linkbtn" data-del="${esc(e.id)}">Delete</button></td>
    </tr>`).join('')
   : '<tr><td colspan="7" class="emptyrow">No expenses recorded in this period.</td></tr>';

  $('exMore').innerHTML = rows.length > exShown
    ? `Showing ${exShown} of ${rows.length}. <button class="linkbtn" id="exMoreBtn" style="color:var(--ink)">Show more</button>`
    : '';
  if ($('exMoreBtn'))
    $('exMoreBtn').addEventListener('click', () => { exShown += EX_PAGE; paintExpenses(); });
}

$('exRows').addEventListener('click', e => {
  const b = e.target.closest('[data-del]');
  if (!b) return;
  removeExpense(COMPANY_ID, b.dataset.del);
  paintExpenses();
});

$('exAdd').addEventListener('click', () => {
  const err = $('exErr'), note = $('exSaved');
  err.textContent = ''; note.textContent = '';
  const amount = Number($('ex-amount').value);
  if (!(amount > 0)){ err.textContent = 'Enter an amount above zero.'; return; }
  const unitId = $('ex-unit').value;
  const unit = opsFleet(COMPANY_ID).find(u => u.id === unitId);
  const saved = addExpense(COMPANY_ID, {
    date:   $('ex-date').value || TODAY,
    cat:    $('ex-cat').value,
    vendor: $('ex-vendor').value,
    amount,
    method: $('ex-method').value,
    unitId, unitName: unit ? unit.name : '',
    note:   $('ex-note').value
  });
  if (!saved){ err.textContent = 'Could not save - the ledger is full or storage is blocked.'; return; }
  $('ex-amount').value = ''; $('ex-vendor').value = ''; $('ex-note').value = '';
  note.textContent = 'Recorded.';
  setTimeout(() => { note.textContent = ''; }, 4000);
  exShown = EX_PAGE;
  paintExpenses();
});
buildChips('exRange', RANGE_IDS, exRangeId, id => { exRangeId = id; exShown = EX_PAGE; paintExpenses(); });

/* =====================================================================
   DOCUMENTS
   The owner controls what is listed and what is published. They do not
   control whether it reads as verified, whether it has expired, or whether
   the number is legible - see ops.js.
   ===================================================================== */
let dcEditing = null;
let dmFile = null;          // pending upload for the open modal

/* Grouped so the three FR Services checks are visibly a different thing
   from the ones you may add at your own discretion. */
$('dm-type').innerHTML =
  `<optgroup label="Checked by FR Services">` +
  DOC_TYPES.filter(t => t.reviewable)
    .map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('') +
  `</optgroup><optgroup label="Yours to publish - not reviewed">` +
  DOC_TYPES.filter(t => !t.reviewable)
    .map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('') +
  `</optgroup>`;

const docStatePill = d => {
  const tone = d.state === 'expired' ? 'off' : d.state === 'soon' ? 'warn'
             : d.state === 'none' ? 'off' : 'ok';
  return `<span class="st st-${tone}">${esc(d.label)}</span>`;
};
const docReviewPill = r => {
  const v = DOC_REVIEW[r] || DOC_REVIEW.pending;
  return `<span class="st st-${v.tone}" title="${esc(v.blurb)}">${esc(v.label)}</span>`;
};
const FILE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h7l4 4v14a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M16 3v5h4"/></svg>';

function paintDocs(){
  const rows = opsCompliance(COMPANY_ID, TODAY);

  /* --- registration completeness --- */
  const reg = registrationStatus(COMPANY_ID, TODAY);
  const bar = $('dcReg');
  bar.className = 'regbar ' + (reg.complete ? 'ok' : 'no');
  bar.innerHTML =
    `<span class="cnt">${reg.have} / ${reg.need}</span>` +
    `<span class="msg">` +
      (reg.complete
        ? `<b>Registration complete</b>DTI, mayor's permit and BIR 2303 are all on file with a document attached. ` +
          (reg.verified
            ? 'All three are checked and current.'
            : 'FR Services will confirm each one with the issuing office.')
        : `<b>Registration incomplete</b>` +
          `You cannot be verified until <b style="display:inline">${reg.missing.map(m => m.label).join(', ')}</b> ` +
          `${reg.missing.length > 1 ? 'have' : 'has'} a file attached. A typed number is not a document - there would be nothing for us to check.`) +
    `</span>` +
    `<span class="chips">${reg.items.map(i =>
      `<span class="st st-${i.done ? 'ok' : 'off'}">${esc(i.label.replace(/\s*\(.*\)$/, ''))}${i.done ? '' : ' - no file'}</span>`
    ).join('')}</span>`;
  const lapsed = rows.filter(d => d.state === 'expired').length;
  const soon   = rows.filter(d => d.state === 'soon').length;
  const live   = rows.filter(d => d.published).length;
  const pend   = rows.filter(d => d.review === 'pending').length;

  $('dcKpis').innerHTML = [
    { label:'On file',        value:String(rows.length), note:`${rows.length ? Math.round(live / rows.length * 100) : 0}% published` },
    { label:'Published',      value:String(live), note:'visible to renters' },
    { label:'Need renewal',   value:String(lapsed + soon),
      note: lapsed ? `${lapsed} already expired` : soon ? `${soon} within 30 days` : 'all current' },
    { label:'Awaiting review',value:String(pend), note:'not yet checked by FR Services' }
  ].map(kpiCard).join('');

  $('dcRows').innerHTML = rows.length ? rows.map(d => `
    <tr>
      <td class="strong">${esc(d.name)}
        ${d.file ? `<span class="sub docfile">${FILE_SVG}${esc(d.file.name)}</span>` : '<span class="sub">No file attached</span>'}</td>
      <td>${esc(d.issuer || '-')}</td>
      <td class="nowrap">${d.number ? esc(d.showNumber ? d.number : maskNumber(d.number)) : '-'}
        ${d.number && !d.showNumber ? '<span class="sub">masked on your page</span>' : ''}</td>
      <td class="nowrap">${d.expires ? esc(fmtDate(d.expires)) : '-'}</td>
      <td>${docStatePill(d)}</td>
      <td>${docReviewPill(d.review)}
        ${d.reviewNote ? `<span class="sub revnote">${esc(d.reviewNote)}</span>` : ''}</td>
      <td class="num">
        <label class="swi"><input type="checkbox" data-pub="${esc(d.id)}" ${d.published ? 'checked' : ''}
          aria-label="Publish ${esc(d.name)}"><i></i></label>
        <span class="swilbl">${d.published ? 'Public' : 'Private'}</span></td>
      <td class="num"><button class="btn btn-w btn-sm" data-doc-edit="${esc(d.id)}">Edit</button></td>
    </tr>`).join('')
   : '<tr><td colspan="8" class="emptyrow">No documents yet. Add your business permit to start.</td></tr>';

  $('tabDocs').hidden = !(lapsed + pend);
  $('tabDocs').textContent = lapsed + pend;
}

$('dcRows').addEventListener('change', e => {
  const t = e.target.closest('[data-pub]');
  if (!t) return;
  const saved = setDocPublished(COMPANY_ID, t.dataset.pub, t.checked);
  $('dcErr').textContent = saved ? '' : 'Could not save - browser storage is full or blocked.';
  paintDocs();
});
$('dcRows').addEventListener('click', e => {
  const b = e.target.closest('[data-doc-edit]');
  if (b) openDoc(b.dataset.docEdit);
});
$('dcAdd').addEventListener('click', () => openDoc(null));

/* ---- the modal ---- */
function openDoc(id){
  const rows = opsCompliance(COMPANY_ID, TODAY);
  const d = id ? rows.find(x => x.id === id) : null;
  dcEditing = d ? d.id : null;
  dmFile = d ? d.file : null;

  $('dm-title').textContent = d ? 'Edit document' : 'Add a document';
  $('dm-type').value     = d ? d.type : 'permit';
  $('dm-name').value     = d ? d.name : '';
  $('dm-issuer').value   = d ? d.issuer : '';
  $('dm-number').value   = d ? d.number : '';
  $('dm-issued').value   = d ? d.issued : '';
  $('dm-expires').value  = d ? d.expires : '';
  $('dm-note').value     = d ? d.note : '';
  $('dm-published').checked = d ? d.published : false;
  $('dm-shownum').checked   = d ? d.showNumber : false;
  $('dm-showfile').checked  = d ? d.showFile : false;
  $('dmDelete').hidden   = !d;
  $('dmErr').textContent = '';
  if (!d) prefillDoc();
  paintDocFile();
  paintDocPreview();
  $('dModal').hidden = false;
}
function closeDoc(){ $('dModal').hidden = true; dmFile = null; }
document.querySelectorAll('[data-dm-close]').forEach(b => b.addEventListener('click', closeDoc));
/* The form is taller than the viewport, so the corner button can scroll out
   of reach - Escape and the backdrop are the ways back regardless. */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('dModal').hidden) closeDoc();
});

/* Choosing a type fills the obvious answers so the form is three fields,
   not seven, for the documents everybody has. */
function prefillDoc(){
  const t = DOC_TYPES.find(x => x.id === $('dm-type').value);
  if (!t) return;
  if (!$('dm-name').value)   $('dm-name').value   = t.id === 'other' ? '' : t.label;
  if (!$('dm-issuer').value) $('dm-issuer').value = t.issuer;
}
$('dm-type').addEventListener('change', () => { prefillDoc(); paintDocFile(); paintDocPreview(); });

function paintDocFile(){
  const drop = $('dmDrop');
  const mustHave = isReviewableType($('dm-type').value);
  drop.querySelector('.lbl').textContent =
    dmFile ? dmFile.name : (mustHave ? 'Attach the file - required' : 'Attach the file');
  drop.querySelector('.sub').textContent = dmFile
    ? (dmFile.type === 'application/pdf' ? 'PDF' : 'Image') +
      ' · ' + (dmFile.size / 1024).toFixed(0) + ' KB'
    : 'PDF, PNG, JPG or WebP · max 1.5 MB';
  drop.classList.toggle('has', !!dmFile);
  $('dmClear').hidden = !dmFile;
  $('dm-showfile').disabled = !dmFile;
  if (!dmFile) $('dm-showfile').checked = false;
}
$('dmFile').addEventListener('change', async e => {
  const f = e.target.files && e.target.files[0];
  e.target.value = '';
  const problem = docFileProblem(f);
  if (problem){ $('dmErr').textContent = problem; return; }
  $('dmErr').textContent = '';
  try { dmFile = await readDocFile(f); }
  catch (ex){ $('dmErr').textContent = ex.message; return; }
  paintDocFile();
  paintDocPreview();
});
$('dmClear').addEventListener('click', () => { dmFile = null; paintDocFile(); paintDocPreview(); });

/* Say plainly what a renter will end up seeing, before it is saved. */
function paintDocPreview(){
  const pub  = $('dm-published').checked;
  const num  = $('dm-number').value.trim();
  const box  = $('dmPreview');
  if (!pub){
    box.innerHTML = '<b>Renters see: nothing.</b>This stays on your side of the wall until you publish it.';
    return;
  }
  const bits = [];
  bits.push('the document name, issuer and validity dates');
  if (num) bits.push($('dm-shownum').checked
    ? `the full number <b style="display:inline">${esc(num)}</b>`
    : `the number as <b style="display:inline">${esc(maskNumber(num))}</b>`);
  if (dmFile && $('dm-showfile').checked) bits.push('a link to open the file itself');
  const exp = $('dm-expires').value;
  const st  = exp ? docState({ expires: exp }, TODAY) : null;
  const reviewed = isReviewableType($('dm-type').value);
  box.innerHTML = '<b>Renters see:</b>' + bits.join(', ') + '.' +
    (st ? ` It will read as <b style="display:inline">${esc(st.label)}</b>.` : '') +
    (reviewed
      ? (dcEditing ? '' : ' Marked <b style="display:inline">Awaiting review</b> until our team confirms it.')
      : ' Shown as <b style="display:inline">Company-submitted</b> - FR Services does not review this type.');
}
['dm-published','dm-shownum','dm-showfile','dm-number','dm-expires']
  .forEach(id => $(id).addEventListener('input', paintDocPreview));
['dm-published','dm-shownum','dm-showfile']
  .forEach(id => $(id).addEventListener('change', paintDocPreview));

$('dmSave').addEventListener('click', () => {
  const err = $('dmErr');
  err.textContent = '';
  if (!$('dm-name').value.trim() && $('dm-type').value === 'other'){
    err.textContent = 'Give the document a name.'; return;
  }
  const issued = $('dm-issued').value, expires = $('dm-expires').value;
  if (issued && expires && issued > expires){
    err.textContent = 'The issue date is after the expiry date.'; return;
  }
  /* The three we verify need something to verify against. */
  if (isReviewableType($('dm-type').value) && !dmFile){
    err.textContent = 'Attach the document. ' + docTypeLabel($('dm-type').value) +
      ' is one of the three FR Services checks, and we cannot check a number typed into a box.';
    return;
  }
  const saved = upsertDoc(COMPANY_ID, {
    id: dcEditing || undefined,
    type:   $('dm-type').value,
    name:   $('dm-name').value,
    issuer: $('dm-issuer').value,
    number: $('dm-number').value,
    issued, expires,
    note:   $('dm-note').value,
    file:   dmFile,
    published:  $('dm-published').checked,
    showNumber: $('dm-shownum').checked,
    showFile:   $('dm-showfile').checked && !!dmFile
  });
  if (!saved){
    err.textContent = dmFile
      ? 'Could not save - browser storage is full. Try a smaller scan, or remove the file from an older document.'
      : 'Could not save - you have reached the ' + MAX_DOCS + '-document limit.';
    return;
  }
  closeDoc();
  paintDocs();
  paintOverview();
  const n = $('dcSaved');
  n.textContent = 'Saved.';
  setTimeout(() => { n.textContent = ''; }, 4000);
});
$('dmDelete').addEventListener('click', () => {
  if (!dcEditing) return;
  removeDoc(COMPANY_ID, dcEditing);
  closeDoc();
  paintDocs();
  paintOverview();
});

/* =====================================================================
   REPORTS
   The sheet, the printed page and the PDF all render buildReport()'s
   output. Change a figure once and all three follow.
   ===================================================================== */
let rpKind = 'summary';
let rpRangeId = 'month';

$('rpKinds').innerHTML = REPORT_KINDS.map(k =>
  `<button type="button" class="rkind ${k.id === rpKind ? 'on' : ''}" data-k="${k.id}">
     <b>${esc(k.name)}</b><span>${esc(k.note)}</span></button>`).join('');
$('rpKinds').addEventListener('click', e => {
  const b = e.target.closest('.rkind'); if (!b) return;
  rpKind = b.dataset.k;
  $('rpKinds').querySelectorAll('.rkind').forEach(x => x.classList.toggle('on', x === b));
  paintReport();
});

function setRangeInputs(id){
  const r = opsRange(id, TODAY);
  $('rp-from').value = r.from;
  $('rp-to').value   = r.to;
}
setRangeInputs(rpRangeId);
buildChips('rpRange', RANGE_IDS, rpRangeId, id => { rpRangeId = id; setRangeInputs(id); paintReport(); });
['rp-from','rp-to'].forEach(id => $(id).addEventListener('change', () => {
  /* A hand-typed range is no longer any of the presets. */
  $('rpRange').querySelectorAll('button').forEach(b => b.classList.remove('on'));
  paintReport();
}));

/** The report currently on screen. Print and PDF both use exactly this. */
function currentReport(){
  let from = $('rp-from').value, to = $('rp-to').value;
  if (!from || !to){ const r = opsRange('month', TODAY); from = from || r.from; to = to || r.to; }
  if (from > to){ const s = from; from = to; to = s; }
  return buildReport(rpKind, COMPANY_ID, from, to, TODAY);
}

function sheetHTML(m){
  const kpis = m.kpis.length
    ? `<div class="sh-kpis">${m.kpis.map(k =>
        `<div class="sh-kpi"><u>${esc(k.label)}</u><b>${esc(k.value)}</b>` +
        (k.note ? `<i>${esc(k.note)}</i>` : '') + '</div>').join('')}</div>`
    : '';
  const tables = m.tables.map(t => {
    const head = t.cols.map(c =>
      `<th class="${c.align === 'right' ? 'r' : ''}">${esc(c.label)}</th>`).join('');
    const body = t.rows.length
      ? t.rows.map(r => '<tr>' + r.map((c, i) =>
          `<td class="${t.cols[i].align === 'right' ? 'r' : ''}">${esc(c)}</td>`).join('') + '</tr>').join('')
      : `<tr><td colspan="${t.cols.length}" style="text-align:center;padding:16px;color:#6b7280">Nothing in this period.</td></tr>`;
    const foot = t.total
      ? '<tfoot><tr>' + t.total.map((c, i) =>
          `<td class="${t.cols[i].align === 'right' ? 'r' : ''}">${esc(c)}</td>`).join('') + '</tr></tfoot>'
      : '';
    return `<h3>${esc(t.title)}</h3><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table>`;
  }).join('');
  return `
    <div class="sh-top">
      <div><div class="sh-co">${esc(m.company)}</div>
        ${m.companyLoc ? `<div class="sh-loc">${esc(m.companyLoc)}</div>` : ''}</div>
      <div class="sh-brand">FR SERVICES<small>Company admin report</small></div>
    </div>
    <h2>${esc(m.title)}</h2>
    <p class="sh-per">${esc(m.period)} &middot; generated ${esc(m.generated)}</p>
    ${kpis}${tables}
    <div class="sh-notes">${m.notes.map(n => `<p>${esc(n)}</p>`).join('')}</div>`;
}

function paintReport(){
  $('rpSheet').innerHTML = sheetHTML(currentReport());
}

$('rpPrint').addEventListener('click', () => {
  /* Build the printable copy at click time, not on every keystroke - the
     print stylesheet is the only thing that will ever look at it. */
  $('printRoot').innerHTML = '<div class="sheet">' + sheetHTML(currentReport()) + '</div>';
  window.print();
});

$('rpPdf').addEventListener('click', () => {
  const err = $('rpErr');
  err.textContent = '';
  try {
    const name = downloadReportPDF(currentReport());
    err.style.color = 'var(--ok)';
    err.textContent = 'Saved ' + name;
    setTimeout(() => { err.textContent = ''; err.style.color = ''; }, 6000);
  } catch (ex){
    err.style.color = '';
    err.textContent = 'Could not build the PDF in this browser. Use Print and choose "Save as PDF".';
  }
});

/* ---------- boot ---------- */
showTab((location.hash || '').replace('#', '') || 'overview');
