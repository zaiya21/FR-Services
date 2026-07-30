
const B_DATA={
  equipment:[
    {n:"Davao Heavy Lift Corp.",loc:"Talomo, Davao City",km:"3.9 km",r:4.90,c:218,p:"12,000",em:"🏗️",bg:"linear-gradient(135deg,#78350F,#F59E0B)",specs:["EXCAVATOR 20T","CRANE 25T","OPERATOR INCL"],st:"3 AVAILABLE NOW",resp:"8 min"},
    {n:"Mount Apo Equipment",loc:"Calinan, Davao City",km:"18.4 km",r:4.81,c:94,p:"8,400",em:"🚜",bg:"linear-gradient(135deg,#3F3F46,#A1A1AA)",specs:["BACKHOE","LOADER 3CBM","DELIVERY INCL"],st:"5 AVAILABLE NOW",resp:"14 min"},
    {n:"Sta. Ana Builders Rental",loc:"Agdao, Davao City",km:"5.2 km",r:4.68,c:73,p:"6,000",em:"⛏️",bg:"linear-gradient(135deg,#713F12,#CA8A04)",specs:["BULLDOZER D6","COMPACTOR","WEEKLY RATE"],st:"2 AVAILABLE NOW",resp:"22 min"},
    {n:"Panabo Machinery Hub",loc:"Panabo, Davao del Norte",km:"32.7 km",r:4.77,c:141,p:"9,800",em:"🏗️",bg:"linear-gradient(135deg,#164E63,#0891B2)",specs:["CRANE 25T","BOOM LIFT","CERTIFIED CREW"],st:"BOOK 24H AHEAD",resp:"31 min"},
    {n:"Tagum Aggregate Works",loc:"Tagum City, Davao del Norte",km:"55.1 km",r:4.62,c:58,p:"7,200",em:"🚧",bg:"linear-gradient(135deg,#374151,#6B7280)",specs:["DUMP TRUCK 10W","GRADER","FUEL INCL"],st:"6 AVAILABLE NOW",resp:"19 min"}
  ],
  vehicles:[
    {n:"Mindanao Auto Rentals",loc:"Poblacion, Davao City",km:"2.4 km",r:4.92,c:341,p:"2,800",em:"🚐",bg:"linear-gradient(135deg,#334155,#64748B)",specs:["SELF-DRIVE","32 UNITS","INSTANT BOOK"],st:"12 AVAILABLE NOW",resp:"4 min"},
    {n:"SouthPoint Van Hire",loc:"Matina, Davao City",km:"4.1 km",r:4.87,c:198,p:"3,500",em:"🚌",bg:"linear-gradient(135deg,#0F766E,#14B8A6)",specs:["WITH DRIVER","15-SEATER","AIRPORT RUN"],st:"7 AVAILABLE NOW",resp:"9 min"},
    {n:"Bagumbayan Motors",loc:"Buhangin, Davao City",km:"6.8 km",r:4.74,c:126,p:"1,900",em:"🚗",bg:"linear-gradient(135deg,#1E3A8A,#3B82F6)",specs:["SEDAN · SUV","MONTHLY RATE","LTO VERIFIED"],st:"9 AVAILABLE NOW",resp:"16 min"},
    {n:"Davao Fleet Solutions",loc:"Toril, Davao City",km:"11.2 km",r:4.95,c:512,p:"4,200",em:"🚙",bg:"linear-gradient(135deg,#7C2D12,#EA580C)",specs:["CORPORATE","LONG-TERM","GPS TRACKED"],st:"4 AVAILABLE NOW",resp:"6 min"}
  ],
  towing:[
    {n:"Rapid Response Towing",loc:"Bajada, Davao City",km:"1.8 km",r:4.96,c:604,p:"1,500",em:"🛻",bg:"linear-gradient(135deg,#7F1D1D,#EF4444)",specs:["24/7 DISPATCH","FLATBED","ETA 12 MIN"],st:"ON STANDBY",resp:"2 min"},
    {n:"Davao Roadside Assist",loc:"Lanang, Davao City",km:"5.6 km",r:4.83,c:287,p:"1,800",em:"🚨",bg:"linear-gradient(135deg,#1E293B,#475569)",specs:["HEAVY DUTY","WINCH-OUT","JUMPSTART"],st:"ON STANDBY",resp:"5 min"},
    {n:"Bukidnon Tow Express",loc:"Mintal, Davao City",km:"9.3 km",r:4.71,c:112,p:"2,200",em:"🛞",bg:"linear-gradient(135deg,#0C4A6E,#0EA5E9)",specs:["LONG-HAUL","TRUCK RECOVERY","INTER-CITY"],st:"1 UNIT BUSY",resp:"11 min"},
    {n:"Sasa 24H Wrecker",loc:"Sasa, Davao City",km:"12.1 km",r:4.88,c:355,p:"1,650",em:"🔧",bg:"linear-gradient(135deg,#4C1D95,#8B5CF6)",specs:["24/7 DISPATCH","MOTORCYCLE TOW","PORT AREA"],st:"ON STANDBY",resp:"7 min"}
  ]
};
const B_TITLES={equipment:["Heavy Equipment providers","412 units across 63 companies"],vehicles:["Vehicle rental providers","631 units across 118 companies"],towing:["Towing &amp; Recovery services","165 units across 41 companies"]};

function bRender(cat){
  document.getElementById('b-rows').innerHTML=B_DATA[cat].map((x,i)=>`
    <article class="row ${i===0?'on':''}" tabindex="0">
      <div class="rlogo" style="background:${x.bg}">${x.em}</div>
      <div class="rmain">
        <div class="rtop">
          <h3>${x.n}</h3>
          <span class="vbadge"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 1.8 3-.2.9 2.9 2.5 1.7-1.2 2.8 1.2 2.8-2.5 1.7-.9 2.9-3-.2L12 22l-2.4-1.8-3 .2-.9-2.9-2.5-1.7L4.4 13 3.2 10.2l2.5-1.7.9-2.9 3 .2z"/></svg>Verified</span>
          <span class="rstar"><b>★</b> ${x.r.toFixed(2)} <span style="color:var(--ink-3)">(${x.c})</span></span>
        </div>
        <div class="rmeta">
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>${x.loc} · ${x.km}</span>
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>Replies in ${x.resp}</span>
        </div>
        <div class="rspecs">
          <span class="spec ${x.st.includes('AVAILABLE')||x.st.includes('STANDBY')?'ok':'hot'}">${x.st}</span>
          ${x.specs.map(s=>`<span class="spec">${s}</span>`).join('')}
        </div>
      </div>
      <div class="rright">
        <div class="rprice">₱${x.p}<small>per day</small></div>
        <button class="rbtn">Request quote</button>
      </div>
    </article>`).join('');
  document.querySelectorAll('.row').forEach(r=>r.addEventListener('click',()=>{
    document.querySelectorAll('.row').forEach(z=>z.classList.remove('on')); r.classList.add('on');
  }));
}
bRender('equipment');

document.querySelectorAll('.navitem').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.navitem').forEach(x=>x.classList.remove('on'));
  b.classList.add('on');
  const c=b.dataset.cat; bRender(c);
  document.getElementById('b-title').innerHTML=B_TITLES[c][0];
  document.getElementById('b-sub').textContent='Davao Region XI · '+B_TITLES[c][1]+' · index refreshed 00:04:12 ago';
}));
document.querySelectorAll('.frow').forEach(f=>f.addEventListener('click',()=>{
  f.classList.toggle('on');
  f.querySelector('.cbx').innerHTML=f.classList.contains('on')?'<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#0A0E13" stroke-width="4" stroke-linecap="round"><path d="M4 12l6 6L20 6"/></svg>':'';
}));
document.querySelectorAll('.toggle').forEach(t=>t.addEventListener('click',()=>t.classList.toggle('on')));
document.querySelectorAll('.viewtoggle button').forEach(v=>v.addEventListener('click',()=>{
  document.querySelectorAll('.viewtoggle button').forEach(z=>z.classList.remove('on')); v.classList.add('on');
}));
