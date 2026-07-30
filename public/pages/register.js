
/* ---------- wizard navigation ---------- */
let step = 1;
const LAST = 4;
function goto(n){
  step = n;
  document.querySelectorAll('.wpane').forEach(p => p.classList.remove('on'));
  document.getElementById('p' + n).classList.add('on');
  document.querySelectorAll('.wstep').forEach(s => {
    const i = +s.dataset.s;
    s.classList.toggle('on',   i === n);
    s.classList.toggle('done', i <  n);
    s.classList.toggle('todo', i >  n);
  });
  document.getElementById('w-back').style.display = n === 1 ? 'none' : 'inline-flex';
  document.getElementById('w-next').textContent =
    n === LAST ? 'Submit for verification' : 'Continue →';
  window.scrollTo({ top: document.getElementById('start').offsetTop - 90, behavior:'smooth' });
}
document.getElementById('w-next').addEventListener('click', () => {
  /* Step 2 is a gate, not a page. A company without DTI, a mayor's permit
     and BIR 2303 on file is not a registrable business, and letting the
     wizard run past it only moves the rejection to somewhere less useful. */
  if (step === 2 && !docsComplete()){
    showDocError();
    return;
  }
  if (step < LAST) { goto(step + 1); return; }
  document.getElementById('done-ref').textContent =
    Math.random().toString(36).slice(2, 6).toUpperCase();
  const ph = document.getElementById('r-phone').value.trim();
  if (ph) document.getElementById('done-phone').textContent = ph;
  document.getElementById('wiz').style.display = 'none';
  document.getElementById('r-done').classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
document.getElementById('w-back').addEventListener('click', () => goto(step - 1));
document.querySelectorAll('.wstep').forEach(s =>
  s.addEventListener('click', () => {
    /* The step strip is a shortcut, not a bypass. */
    const want = +s.dataset.s;
    if (want > 2 && step <= 2 && !docsComplete()){ goto(2); showDocError(); return; }
    goto(want);
  }));

/* =====================================================================
   STEP 2 — VERIFICATION DOCUMENTS
   Three required, with a file each. Everything else is optional and says
   so. The list is built from DOC_TYPES in ops.js rather than typed here,
   so "what FR Services verifies" has exactly one definition.
   ===================================================================== */
const REQ_HINT = {
  dti:    'Certificate of business name registration.',
  permit: 'Current year, from your city or municipal hall.',
  bir:    'Certificate of registration — Form 2303.'
};
const OPT_TYPES = [
  { id:'insurance', label:'Insurance certificate',        hint:'Comprehensive or CTPL cover.' },
  { id:'lto',       label:'LTO registration (OR/CR)',     hint:'For vehicles you list. One file is fine to start.' },
  { id:'ltfrb',     label:'Tow operator accreditation',   hint:'If you offer emergency towing.' },
  { id:'pcab',      label:'PCAB contractor licence',      hint:'If you rent out heavy equipment.' },
  { id:'tesda',     label:'Operator certifications',      hint:'TESDA NC II for machine operators.' },
  { id:'other',     label:'Anything else',                hint:'Awards, accreditations, safety records.' }
];

/* id -> { name, size, type }. Files are held in memory only; this wizard
   does not persist anything until a real backend exists. */
const regFiles = {};

const UP_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';
const OK_SVG  = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>';
const escR = s => String(s == null ? '' : s)
  .replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

function uploadRow(id, label, hint, required){
  const f = regFiles[id];
  const cls = f ? 'done' : (required && docTouched ? 'missing' : '');
  return `<label class="upl ${cls}" data-doc="${id}">
    <span class="ic">${f ? OK_SVG : UP_SVG}</span>
    <span><b>${escR(label)}<span class="${required ? 'req' : 'opt'}">${required ? 'Required' : 'Optional'}</span></b>
      <span>${f ? escR(f.name) + ' · ' + (f.size / 1024).toFixed(0) + ' KB' : escR(hint)}</span></span>
    <span class="drop">
      ${f ? `<button type="button" class="clr" data-clr="${id}">Remove</button>` : ''}
      <span class="act">${f ? 'Replace' : 'Upload'}</span>
    </span>
    <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" data-file="${id}">
  </label>`;
}

/* Has the operator tried to move on yet? Before that, an empty required
   row is just an empty row — flagging it red on arrival is nagging. */
let docTouched = false;

function requiredTypes(){
  /* REVIEWABLE_TYPES is the same list the platform reviews against. */
  return (typeof DOC_TYPES !== 'undefined' ? DOC_TYPES.filter(t => t.reviewable) : [])
    .map(t => ({ id:t.id, label:t.label, hint:REQ_HINT[t.id] || '' }));
}
const missingRequired = () => requiredTypes().filter(t => !regFiles[t.id]);
const docsComplete = () => missingRequired().length === 0;

function paintDocs(){
  const req = requiredTypes();
  document.getElementById('reqUploads').innerHTML =
    req.map(t => uploadRow(t.id, t.label, t.hint, true)).join('');
  document.getElementById('optUploads').innerHTML =
    OPT_TYPES.map(t => uploadRow(t.id, t.label, t.hint, false)).join('');

  const have = req.length - missingRequired().length;
  const bar  = document.getElementById('reqBar');
  bar.className = 'reqbar ' + (docsComplete() ? 'ok' : docTouched ? 'no' : '');
  bar.innerHTML =
    `<span class="cnt">${have} / ${req.length}</span>` +
    `<span class="msg">${docsComplete()
      ? '<b>All three are attached.</b>You can continue. We will check each one with the office that issued it.'
      : `<b>${missingRequired().map(t => t.label).join(', ')} still needed.</b>` +
        'Registration cannot be completed until all three have a file attached.'}</span>`;

  /* The button stays clickable and explains itself. A disabled button that
     never says why is the most common way to strand someone in a form. */
  const next = document.getElementById('w-next');
  if (step === 2) next.textContent = docsComplete() ? 'Continue →' : 'Continue →';
}

function showDocError(){
  docTouched = true;
  paintDocs();
  const err = document.getElementById('docErr');
  err.textContent =
    'Attach a file for ' + missingRequired().map(t => t.label).join(', ') +
    ' before continuing. These three are what we verify — without them there is nothing to check.';
  document.getElementById('reqBar').scrollIntoView({ block:'center', behavior:'smooth' });
}

document.getElementById('p2').addEventListener('change', e => {
  const input = e.target.closest('[data-file]');
  if (!input) return;
  const f = input.files && input.files[0];
  input.value = '';
  if (!f) return;
  const problem = (typeof docFileProblem === 'function') ? docFileProblem(f) : null;
  if (problem){ document.getElementById('docErr').textContent = problem; return; }
  regFiles[input.dataset.file] = { name:f.name, size:f.size, type:f.type };
  document.getElementById('docErr').textContent = '';
  paintDocs();
});
document.getElementById('p2').addEventListener('click', e => {
  const b = e.target.closest('[data-clr]');
  if (!b) return;
  e.preventDefault();
  delete regFiles[b.dataset.clr];
  paintDocs();
});
paintDocs();

/* ---------- what it costs, from the one rate table ---------- */
(() => {
  const host = document.getElementById('costTiles');
  if (!host || typeof PLATFORM_RATES === 'undefined') return;
  const pc = n => Math.round(n * 100) + '%';
  const tile = (k, v, last) =>
    `<div class="tile"${last ? ' style="margin-bottom:0"' : ''}>` +
    `<span class="small muted">${escR(k)}</span><b>${escR(v)}</b></div>`;
  host.innerHTML =
    tile('Listing your company', PLATFORM_SUBSCRIPTION ? '₱' + PLATFORM_SUBSCRIPTION : 'Free') +
    tile('Monthly fee', '₱' + PLATFORM_SUBSCRIPTION) +
    tile('Commission per completed booking', pc(PLATFORM_RATES.vehicles)) +
    tile('Emergency tow dispatch', pc(PLATFORM_RATES.towing), true);
})();

/* ---------- step 1: categories ---------- */
const TICK = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>';
function syncCats(){
  const on = [...document.querySelectorAll('.cpick.on')]
    .map(c => FR_CATS[c.dataset.c].label);
  document.getElementById('pv-cats').innerHTML =
    (on.length ? on : ['Select a category']).map(l => `<span class="t">${l}</span>`).join('');
}
document.querySelectorAll('.cpick').forEach(c => c.addEventListener('click', () => {
  c.classList.toggle('on');
  c.querySelector('.tick').innerHTML = c.classList.contains('on') ? TICK : '';
  syncCats();
}));
syncCats();

document.getElementById('r-name').addEventListener('input', e => {
  document.getElementById('pv-name').textContent = e.target.value.trim() || 'Your Company Name';
});
document.getElementById('r-city').addEventListener('input', syncLoc);

/* ---------- step 2: uploads ---------- */
document.querySelectorAll('.upl').forEach(u => u.addEventListener('click', e => {
  e.preventDefault();
  u.classList.toggle('done');
  const done = u.classList.contains('done');
  u.querySelector('.act').textContent = done ? 'Uploaded' : 'Upload';
  u.querySelector('.ic').innerHTML = done
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>';
}));

/* ---------- step 3: radius ---------- */
const CITY_TIERS = [
  [15,  ['Davao City']],
  [35,  ['Davao City','Panabo','Sta. Cruz']],
  [60,  ['Davao City','Panabo','Sta. Cruz','Tagum','Digos','Carmen','Sto. Tomas']],
  [110, ['Davao City','Panabo','Tagum','Digos','Carmen','Mati','Nabunturan','Kidapawan','Malita']],
  [999, ['Davao City','Tagum','Digos','Mati','Kidapawan','Gen. Santos','Butuan','Cagayan de Oro','Bukidnon','+8 more']]
];
function syncRadius(){
  const km = +document.getElementById('rad').value;
  const tier = CITY_TIERS.find(t => km <= t[0])[1];
  document.getElementById('rad-v').textContent = km + ' km';
  document.getElementById('rad-r').textContent =
    `reaches ~${tier.length} cities · est. ${(km * 248).toLocaleString('en-PH')} renters`;
  document.getElementById('rad-cities').innerHTML =
    tier.map(c => `<span class="t">${c}</span>`).join('');
  document.getElementById('pv-rad').textContent = km + 'km';
  syncLoc();
}
function syncLoc(){
  const city = document.getElementById('r-city').value.trim() || 'Your city';
  const km = document.getElementById('rad').value;
  document.getElementById('pv-loc').textContent = `${city} · ${km} km radius`;
}
document.getElementById('rad').addEventListener('input', syncRadius);
syncRadius();

/* ---------- step 4: theme ---------- */
let brand = '#057A2F', accent = '#F2B705';
function paint(){
  document.getElementById('pv-hero').style.background =
    `linear-gradient(115deg,${brand},${accent})`;
  document.getElementById('pv-logo').style.background = accent;
  document.getElementById('pv-btn').style.background = brand;
}
function group(id, fn){
  document.querySelectorAll('#' + id + ' .swatch, #' + id + ' .lay')
    .forEach(s => s.addEventListener('click', () => {
      document.querySelectorAll('#' + id + ' .swatch, #' + id + ' .lay')
        .forEach(x => x.classList.remove('on'));
      s.classList.add('on');
      fn(s.dataset.c || s.dataset.l);
    }));
}
group('sw-p', v => { brand = v;  paint(); });
group('sw-a', v => { accent = v; paint(); });
group('sw-l', () => {});
document.getElementById('r-slug').addEventListener('input', e => {
  const s = e.target.value.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-') || 'your-company';
  document.getElementById('pv-slug').textContent = s;
});
paint();
