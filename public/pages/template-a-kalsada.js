
const A_DATA = {
  vehicles:[
    {n:"Mindanao Auto Rentals",loc:"Poblacion, Davao City",d:"2.4 km away",r:4.92,c:341,p:"2,800",u:"day",tags:["Instant book","Self-drive","32 units"],img:"linear-gradient(135deg,#334155,#64748B)",em:"🚐"},
    {n:"SouthPoint Van Hire",loc:"Matina, Davao City",d:"4.1 km away",r:4.87,c:198,p:"3,500",u:"day",tags:["With driver","Airport pickup"],img:"linear-gradient(135deg,#0F766E,#14B8A6)",em:"🚌"},
    {n:"Bagumbayan Motors",loc:"Buhangin, Davao City",d:"6.8 km away",r:4.74,c:126,p:"1,900",u:"day",tags:["Monthly rates","Sedan · SUV"],img:"linear-gradient(135deg,#1E3A8A,#3B82F6)",em:"🚗"},
    {n:"Davao Fleet Solutions",loc:"Toril, Davao City",d:"11.2 km away",r:4.95,c:512,p:"4,200",u:"day",tags:["Corporate","Long-term"],img:"linear-gradient(135deg,#7C2D12,#EA580C)",em:"🚙"}
  ],
  equipment:[
    {n:"Davao Heavy Lift Corp.",loc:"Talomo, Davao City",d:"3.9 km away",r:4.90,c:218,p:"12,000",u:"day",tags:["Operator incl.","Excavator · Crane"],img:"linear-gradient(135deg,#78350F,#F59E0B)",em:"🏗️"},
    {n:"Mount Apo Equipment",loc:"Calinan, Davao City",d:"18.4 km away",r:4.81,c:94,p:"8,400",u:"day",tags:["Backhoe","Delivery incl."],img:"linear-gradient(135deg,#3F3F46,#A1A1AA)",em:"🚜"},
    {n:"Sta. Ana Builders Rental",loc:"Agdao, Davao City",d:"5.2 km away",r:4.68,c:73,p:"6,000",u:"day",tags:["Bulldozer","Weekly rate"],img:"linear-gradient(135deg,#713F12,#CA8A04)",em:"⛏️"},
    {n:"Panabo Machinery Hub",loc:"Panabo, Davao del Norte",d:"32.7 km away",r:4.77,c:141,p:"9,800",u:"day",tags:["Crane 25T","Certified crew"],img:"linear-gradient(135deg,#164E63,#0891B2)",em:"🏗️"}
  ],
  towing:[
    {n:"Rapid Response Towing",loc:"Bajada, Davao City",d:"1.8 km away",r:4.96,c:604,p:"1,500",u:"call-out",tags:["24/7","ETA 12 min"],img:"linear-gradient(135deg,#7F1D1D,#EF4444)",em:"🛻"},
    {n:"Davao Roadside Assist",loc:"Lanang, Davao City",d:"5.6 km away",r:4.83,c:287,p:"1,800",u:"call-out",tags:["Flatbed","Heavy duty"],img:"linear-gradient(135deg,#1E293B,#475569)",em:"🚨"},
    {n:"Bukidnon Tow Express",loc:"Mintal, Davao City",d:"9.3 km away",r:4.71,c:112,p:"2,200",u:"call-out",tags:["Long-haul","Truck recovery"],img:"linear-gradient(135deg,#0C4A6E,#0EA5E9)",em:"🛞"},
    {n:"Sasa 24H Wrecker",loc:"Sasa, Davao City",d:"12.1 km away",r:4.88,c:355,p:"1,650",u:"call-out",tags:["24/7","Motorcycle tow"],img:"linear-gradient(135deg,#4C1D95,#8B5CF6)",em:"🔧"}
  ]
};

const star = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>';

function aRender(cat){
  const list = cat==='all' ? [].concat(A_DATA.vehicles,A_DATA.equipment,A_DATA.towing) : A_DATA[cat];
  document.getElementById('a-grid').innerHTML = list.map((x,i)=>`
    <article class="card" tabindex="0">
      <div class="thumb">
        <div style="width:100%;height:100%;background:${x.img};display:grid;place-items:center;font-size:52px">${x.em}</div>
        <span class="badge verified">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1.2 2.8 1.2 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9L3.2 15.8 4.4 13 3.2 10.2l2.5-1.7.9-2.9 3 .2z"/></svg>
          Verified
        </span>
        <button class="heart" aria-label="Save ${x.n}">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="rgba(0,0,0,.32)" stroke="currentColor" stroke-width="2"><path d="M20.8 8.6c0 5-8.8 9.9-8.8 9.9s-8.8-4.9-8.8-9.9a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7z"/></svg>
        </button>
      </div>
      <div class="ctitle">
        <h3>${x.n}</h3>
        <span class="rate">${star}${x.r.toFixed(2)}<span class="n">(${x.c})</span></span>
      </div>
      <p class="cmeta">${x.loc} · ${x.d}</p>
      <p class="cprice"><b>₱${x.p}</b> <span>/ ${x.u}</span></p>
      <div class="cfleet">${x.tags.map((t,j)=>`<span class="pill ${j===0?(cat==='towing'?'urgent':'live'):''}">${t}</span>`).join('')}</div>
    </article>`).join('');
}
aRender('vehicles');

document.querySelectorAll('.cat').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.cat').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  aRender(b.dataset.cat);
  const h=document.querySelector('.rhead h1');
  const names={vehicles:'Rental companies',equipment:'Heavy equipment providers',towing:'Towing &amp; recovery services',all:'All fleet providers'};
  h.innerHTML = names[b.dataset.cat]+' in Davao City';
}));
document.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>c.classList.toggle('on')));
document.querySelectorAll('.mappin:not(.you)').forEach(p=>p.addEventListener('click',()=>{
  document.querySelectorAll('.mappin').forEach(x=>x.classList.remove('on')); p.classList.add('on');
}));
