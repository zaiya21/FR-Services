
/* No fallback company or fallback fleet. Both used to be guaranteed by
   seeded data; against a registry that starts empty they resolve to
   undefined and this page throws on `unit.name` before rendering
   anything. A booking form for a unit that does not exist is worse than a
   page saying so - it would take a name, a date and a deposit for it. */
const co   = byId(qs('c'));
const list = co ? (loadFleet(co.id) || FR_UNITS[co.id] || []) : [];
const unit = list.find(u => u.id === qs('u')) || list[0];

if (!co || !unit){
  const why = !co
    ? 'That company is not registered on FR Services.'
    : co.name + ' has not listed any units yet, so there is nothing to book.';
  document.title = 'Nothing to book - FR Services';
  document.body.innerHTML =
    '<main style="max-width:620px;margin:14vh auto;padding:0 24px;' +
    'font-family:Inter,system-ui,sans-serif;text-align:center">' +
    '<h1 style="font-family:\'Space Grotesk\',sans-serif;font-size:26px;' +
    'margin:0 0 12px">This unit cannot be booked</h1>' +
    '<p style="color:#5b6470;line-height:1.6;margin:0 0 22px">' + why + '</p>' +
    '<a href="/" style="display:inline-block;background:#057A2F;color:#fff;' +
    'text-decoration:none;font-weight:700;padding:11px 20px;border-radius:999px">' +
    'Back to the marketplace</a>' +
    (co ? ' <a href="/company?c=' + encodeURIComponent(co.id) + '" ' +
          'style="display:inline-block;margin-left:8px;color:#0d1117;' +
          'text-decoration:none;font-weight:700;padding:11px 20px;' +
          'border:2px solid #0d1117;border-radius:999px">View the company</a>' : '') +
    '</main>';
  throw new Error('nothing bookable');
}
/* owner units store operator as a mode string, seeded ones as a boolean */
const hasOperator = typeof unit.operator === 'string'
  ? unit.operator === 'included' : !!unit.operator;

/* header */
document.title = 'Book ' + unit.name + ' - FR Services';
document.getElementById('bk-em').innerHTML     = unitIcon(unit.name, co.cat);
document.getElementById('bk-name').textContent = unit.name;
/* seeded units call it `avail`, owner-created ones `qty` */
const unitAvail = (unit.qty !== undefined ? unit.qty : unit.avail) || 0;
document.getElementById('bk-avail').textContent = unitAvail + ' available';
document.getElementById('sum-em').innerHTML     = unitIcon(unit.name, co.cat);
document.getElementById('sum-name').textContent = unit.name;
['bk-co','sum-co','done-co'].forEach(id => document.getElementById(id).textContent = co.name);
document.getElementById('bk-co').href      = '/company?c=' + co.id;
document.getElementById('bk-co-link').href = '/company?c=' + co.id;
document.getElementById('bk-co-link').textContent = co.name;
document.getElementById('done-back').href  = '/company?c=' + co.id;
document.getElementById('done-reply').textContent = co.reply;
/* Delivery may be a flat fee, billed per km, or quoted per site. Only the
   per-km case needs a distance from the renter. */
const delMode = unit.deliveryMode || 'flat';
if (delMode === 'perkm'){
  document.getElementById('deliv-km-wrap').hidden = false;
  document.getElementById('deliv-terms').textContent = deliveryText(unit);
}
function delivFee(){
  if (delMode === 'quoted') return 0;             // billed after the company quotes
  const km = Number((document.getElementById('d-km') || {}).value) || 0;
  return deliveryCost(unit, km) || 0;
}
function paintDelivPrice(){
  document.getElementById('deliv-price').textContent =
    delMode === 'quoted' ? 'Quoted'
    : (delivFee() ? peso(delivFee()) : 'Free');
}
paintDelivPrice();

/* ---- live cost estimate ---- */
function days(){
  const a = new Date(document.getElementById('d-start').value);
  const b = new Date(document.getElementById('d-end').value);
  const n = Math.round((b - a) / 86400000) + 1;
  return (isNaN(n) || n < 1) ? 1 : n;
}
function recalc(){
  const n = days();
  const base = unit.price * n;

  const delivSel = document.querySelector('#deliv-opts .opt.on');
  const selfHaul = delivSel && delivSel.dataset.price === 'pickup';
  const deliv = selfHaul ? 0 : delivFee();
  paintDelivPrice();

  let addons = 0;
  const addonLines = [];
  document.querySelectorAll('.addon.on').forEach(a => {
    if (a.dataset.locked) return;               // operator is bundled, not extra
    const amt = +a.dataset.add * n;
    addons += amt;
    addonLines.push([a.querySelector('b').textContent, amt]);
  });

  const sub = base + deliv + addons;
  const vat = Math.round(sub * 0.12);
  const total = sub + vat;

  const rows = [
    [`${peso(unit.price)} × ${n} ${n === 1 ? 'day' : 'days'}`, base],
    ...(deliv ? [['Mobilization / delivery', deliv]] : []),
    ...addonLines,
    ['VAT (12%)', vat]
  ];
  document.getElementById('sum-lines').innerHTML = rows.map(([l, v]) =>
    `<li><span>${l}</span><span class="v">${peso(v)}</span></li>`).join('');
  document.getElementById('sum-total').textContent = peso(total);
}

/* delivery radio */
document.querySelectorAll('#deliv-opts .opt').forEach(o => o.addEventListener('click', () => {
  document.querySelectorAll('#deliv-opts .opt').forEach(x => x.classList.remove('on'));
  o.classList.add('on'); recalc();
}));
/* addon checkboxes - the locked operator row is informational only */
document.querySelectorAll('.addon').forEach(a => a.addEventListener('click', e => {
  e.preventDefault();
  if (a.dataset.locked) return;
  a.classList.toggle('on');
  a.querySelector('.box').innerHTML = a.classList.contains('on')
    ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>'
    : '';
  recalc();
}));
['d-start','d-end'].forEach(id =>
  document.getElementById(id).addEventListener('change', recalc));
const kmField = document.getElementById('d-km');
if (kmField) kmField.addEventListener('input', recalc);
recalc();

/* submit */
document.getElementById('bk-submit').addEventListener('click', () => {
  const ref = 'ARK-2026-' + Math.random().toString(36).slice(2, 7).toUpperCase();
  document.getElementById('done-ref').textContent = ref;
  document.getElementById('bk-form').style.display = 'none';
  document.getElementById('bk-done').classList.add('on');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
