/* =====================================================================
   FR SERVICES - shared demo data + helpers
   NOTE: static prototype data. No API calls. Replace with real
   endpoints per ARCHITECTURE.md before this goes anywhere near users.
   ===================================================================== */

/* ---------- Detected location (the "AI geo-match" cascade result) ----- */
const FR_GEO = {
  city: "Davao City",
  province: "Davao del Sur",
  region: "Region XI",
  lat: 7.0731, lon: 125.6128,
  radiusKm: 50,
  confidence: 0.94,
  source: "behavioral"   // explicit | geolocation | ip | behavioral
};

/* ---------- Category metadata ---------------------------------------- */
const FR_CATS = {
  vehicles:  { label:"Vehicles",        units:631, cos:118, color:"var(--c-vehicle)", tint:"var(--c-vehicle-tint)", unit:"/ day" },
  equipment: { label:"Heavy Equipment", units:412, cos:63,  color:"var(--c-equip)",   tint:"var(--c-equip-tint)",   unit:"/ day" },
  towing:    { label:"Towing",          units:165, cos:41,  color:"var(--c-tow)",     tint:"var(--c-tow-tint)",     unit:"/ call-out" }
};

/* ---------- Companies ------------------------------------------------- */
const FR_COMPANIES = [
  /* --- full-coverage test fixture: every service line, every unit type,
         and the complete range of add-on services --- */
  { id:"fleetservice-davao", cat:"vehicles", name:"FleetService Davao",
    loc:"Ecoland, Davao City", km:3.2, rating:4.94, reviews:762, price:"1,800", bg:"#E8F6EC",
    tags:["All three services","Operator available","24/7 dispatch"],
    status:"Available now", statusType:"now", reply:"3 min", radius:80, units:19,
    since:2008, about:"Davao's one-stop fleet partner since 2008. Self-drive and chauffeured vehicles, heavy equipment with certified operators, and round-the-clock towing and recovery - booked, billed and supported from a single account." },

  /* --- vehicles --- */
  { id:"mindanao-auto", cat:"vehicles", name:"Mindanao Auto Rentals",
    loc:"Poblacion, Davao City", km:2.4, rating:4.92, reviews:341, price:"2,800", bg:"#E8F6EC", tags:["Self-drive","32 units","Instant book"],
    status:"Available now", statusType:"now", reply:"4 min", radius:40, units:32,
    since:2018, about:"Family-run self-drive rental serving Davao City since 2018. Sedans, MPVs and 15-seater vans, all under 5 years old and comprehensively insured." },
  { id:"southpoint-van", cat:"vehicles", name:"SouthPoint Van Hire",
    loc:"Matina, Davao City", km:4.1, rating:4.87, reviews:198, price:"3,500", bg:"#E8F6EC", tags:["With driver","15-seater","Airport run"],
    status:"Verified", statusType:"ok", reply:"9 min", radius:60, units:18,
    since:2015, about:"Group transport specialists. Professional drivers, airport transfers, and multi-day tour packages across Region XI." },
  { id:"bagumbayan-motors", cat:"vehicles", name:"Bagumbayan Motors",
    loc:"Buhangin, Davao City", km:6.8, rating:4.74, reviews:126, price:"1,900", bg:"#E8F6EC", tags:["Sedan · SUV","Monthly rate"],
    status:"Available now", statusType:"now", reply:"16 min", radius:35, units:24,
    since:2020, about:"Budget-friendly long-term rentals. Monthly and quarterly rates for businesses and OFW families." },
  { id:"davao-fleet", cat:"vehicles", name:"Davao Fleet Solutions",
    loc:"Toril, Davao City", km:11.2, rating:4.95, reviews:512, price:"4,200", bg:"#E8F6EC", tags:["Corporate","Long-term","GPS tracked"],
    status:"Verified", statusType:"ok", reply:"6 min", radius:80, units:47,
    since:2012, about:"Corporate fleet leasing with GPS tracking, scheduled maintenance and replacement-vehicle guarantees." },

  /* --- heavy equipment --- */
  { id:"davao-heavy-lift", cat:"equipment", name:"Davao Heavy Lift Corp.",
    loc:"Talomo, Davao City", km:3.9, rating:4.90, reviews:218, price:"12,000", bg:"#EEF2F6", tags:["Excavator 20T","Operator incl.","Crane 25T"],
    status:"3 available", statusType:"now", reply:"8 min", radius:50, units:34,
    since:2009, about:"Region XI's largest independent heavy equipment fleet. Certified operators, DOLE-compliant safety program, and mobilization anywhere in Davao Region." },
  { id:"mount-apo-equip", cat:"equipment", name:"Mount Apo Equipment",
    loc:"Calinan, Davao City", km:18.4, rating:4.81, reviews:94, price:"8,400", bg:"#EEF2F6", tags:["Backhoe","Loader 3cbm","Delivery incl."],
    status:"5 available", statusType:"now", reply:"14 min", radius:70, units:21,
    since:2016, about:"Agricultural and light construction equipment. Free delivery within 25 km of Calinan." },
  { id:"sta-ana-builders", cat:"equipment", name:"Sta. Ana Builders Rental",
    loc:"Agdao, Davao City", km:5.2, rating:4.68, reviews:73, price:"6,000", bg:"#EEF2F6", tags:["Bulldozer D6","Compactor","Weekly rate"],
    status:"Verified", statusType:"ok", reply:"22 min", radius:45, units:16,
    since:2014, about:"Earthmoving and road works equipment. Weekly and monthly contracts preferred." },
  { id:"panabo-machinery", cat:"equipment", name:"Panabo Machinery Hub",
    loc:"Panabo, Davao del Norte", km:32.7, rating:4.77, reviews:141, price:"9,800", bg:"#EEF2F6", tags:["Crane 25T","Boom lift","Certified crew"],
    status:"Book 24h ahead", statusType:"ok", reply:"31 min", radius:90, units:29,
    since:2011, about:"Lifting specialists serving the Davao del Norte industrial corridor. TESDA-certified riggers and crane operators." },

  /* --- towing --- */
  { id:"rapid-response", cat:"towing", name:"Rapid Response Towing",
    loc:"Bajada, Davao City", km:1.8, rating:4.96, reviews:604, price:"1,500", bg:"#FDECEC", tags:["24/7","Flatbed","ETA 12 min"],
    status:"On standby", statusType:"now", reply:"2 min", radius:60, units:9,
    since:2017, about:"24/7 emergency towing and roadside assistance. Average dispatch-to-arrival of 18 minutes within Davao City proper." },
  { id:"davao-roadside", cat:"towing", name:"Davao Roadside Assist",
    loc:"Lanang, Davao City", km:5.6, rating:4.83, reviews:287, price:"1,800", bg:"#FDECEC", tags:["Heavy duty","Winch-out","Jumpstart"],
    status:"On standby", statusType:"now", reply:"5 min", radius:55, units:7,
    since:2019, about:"Heavy-duty recovery, winch-outs and battery service. Equipped for trucks up to 15 tons." },
  { id:"bukidnon-tow", cat:"towing", name:"Bukidnon Tow Express",
    loc:"Mintal, Davao City", km:9.3, rating:4.71, reviews:112, price:"2,200", bg:"#FDECEC", tags:["Long-haul","Truck recovery"],
    status:"1 unit busy", statusType:"ok", reply:"11 min", radius:150, units:5,
    since:2021, about:"Inter-city and long-haul recovery between Davao, Bukidnon and CDO." },
  { id:"sasa-wrecker", cat:"towing", name:"Sasa 24H Wrecker",
    loc:"Sasa, Davao City", km:12.1, rating:4.88, reviews:355, price:"1,650", bg:"#FDECEC", tags:["24/7","Light vehicle tow","Port area"],
    status:"On standby", statusType:"now", reply:"7 min", radius:40, units:6,
    since:2016, about:"Port-area specialists. Light vehicle recovery and roadside assistance, 24 hours a day." }
];

/* ---------- Filterable attributes -------------------------------------
   Kept as a separate table and merged in, so the company list above stays
   readable. `serves` is the city list each company's radius actually
   reaches - it is what makes location search meaningful rather than
   cosmetic. See ARCHITECTURE.md §2: rank by service area, not by distance.

   Service areas are "City, Province" because bare city names are not
   unique in the Philippines - there are several Carmens, Santa Cruzes and
   San Isidros. Without the province, a Davao provider surfaces for a
   renter in Carmen, Bohol, 700 km away. Production should key these on
   PSGC codes outright (ARCHITECTURE.md §3).
   ----------------------------------------------------------------------- */
const CO_ATTR = {
  /* every type across all three lines - the widest possible fixture */
  "fleetservice-davao": { cats:["vehicles","equipment","towing"],
                        types:["Sedan","SUV","Van","Pickup","Truck","Motorcycle",
                               "Excavator","Backhoe","Crane","Bulldozer","Dump Truck",
                               "Boom Lift","Compactor","Loader",
                               "Flatbed","Wheel-Lift","Heavy Duty","Long-haul","Winch-out"],
                        operator:true, delivery:true, instant:true,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte",
                                "Tagum City, Davao del Norte","Digos City, Davao del Sur",
                                "Santa Cruz, Davao del Sur","Carmen, Davao del Norte",
                                "Santo Tomas, Davao del Norte","Mati City, Davao Oriental",
                                "Bansalan, Davao del Sur"] },
  "mindanao-auto":    { types:["Sedan","SUV","Van","Pickup","Motorcycle"],
                        operator:false, delivery:true,  instant:true,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte",
                                "Santa Cruz, Davao del Sur"] },
  "southpoint-van":   { types:["Van"], operator:true, delivery:true, instant:false,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte",
                                "Tagum City, Davao del Norte","Digos City, Davao del Sur",
                                "Santa Cruz, Davao del Sur"] },
  "bagumbayan-motors":{ types:["Sedan","SUV"], operator:false, delivery:false, instant:false,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte"] },
  /* full-service operator: cars, machines and recovery under one roof */
  "davao-fleet":      { cats:["vehicles","equipment","towing"],
                        types:["SUV","Van","Sedan","Truck","Excavator","Backhoe",
                               "Dump Truck","Flatbed","Heavy Duty"],
                        operator:true, delivery:true, instant:false,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte",
                                "Tagum City, Davao del Norte","Digos City, Davao del Sur",
                                "Mati City, Davao Oriental","Carmen, Davao del Norte"] },

  "davao-heavy-lift": { types:["Excavator","Crane","Backhoe","Dump Truck","Compactor","Boom Lift"],
                        operator:true, delivery:true, instant:false,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte",
                                "Tagum City, Davao del Norte","Digos City, Davao del Sur",
                                "Santa Cruz, Davao del Sur","Carmen, Davao del Norte"] },
  "mount-apo-equip":  { types:["Backhoe","Loader","Excavator"], operator:true, delivery:true, instant:true,
                        serves:["Davao City, Davao del Sur","Digos City, Davao del Sur",
                                "Santa Cruz, Davao del Sur","Bansalan, Davao del Sur"] },
  "sta-ana-builders": { types:["Bulldozer","Compactor","Dump Truck"], operator:true, delivery:false, instant:false,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte"] },
  "panabo-machinery": { types:["Crane","Boom Lift","Excavator"], operator:true, delivery:true, instant:false,
                        serves:["Panabo City, Davao del Norte","Tagum City, Davao del Norte",
                                "Davao City, Davao del Sur","Carmen, Davao del Norte",
                                "Santo Tomas, Davao del Norte"] },

  "rapid-response":   { types:["Flatbed","Wheel-Lift","Heavy Duty"], operator:true, delivery:false, instant:true,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte"] },
  "davao-roadside":   { types:["Flatbed","Heavy Duty","Winch-out"], operator:true, delivery:false, instant:true,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte",
                                "Tagum City, Davao del Norte"] },
  "bukidnon-tow":     { types:["Heavy Duty","Long-haul"], operator:true, delivery:false, instant:false,
                        serves:["Davao City, Davao del Sur","Digos City, Davao del Sur",
                                "Kidapawan City, Cotabato","Malaybalay City, Bukidnon",
                                "Valencia City, Bukidnon","Cagayan de Oro City, Misamis Oriental"] },
  "sasa-wrecker":     { types:["Flatbed","Wheel-Lift","Winch-out"], operator:true, delivery:false, instant:true,
                        serves:["Davao City, Davao del Sur","Panabo City, Davao del Norte"] }
};
FR_COMPANIES.forEach(c => Object.assign(c, CO_ATTR[c.id] || {}));

/* Unit types offered per category - drives the "Unit type" dropdown. */
const FR_TYPES = {
  /* Motorcycle is a thing you rent, so it lives here - not under towing,
     where it only ever described what was being recovered. */
  vehicles:  ["Sedan","SUV","Van","Pickup","Truck","Motorcycle"],
  equipment: ["Excavator","Backhoe","Crane","Bulldozer","Dump Truck","Boom Lift","Compactor","Loader"],
  towing:    ["Flatbed","Wheel-Lift","Heavy Duty","Long-haul","Winch-out"]
};

/* ---------- Nationwide coverage ---------------------------------------
   The Davao set above stays long-form because company.html and
   booking.html read its richer fields. The rest are seeded from compact
   tuples - enough to make national search real, and to cover the places
   people actually search for: Boracay, Siargao, El Nido, Coron, Panglao.

   `km` is distance from the centre of that company's own service area,
   not from the viewer - a Manila company is not 900 km from a Manila
   renter. Real distances need coordinates (ARCHITECTURE.md §2).
   ----------------------------------------------------------------------- */
const CAT_BG = { vehicles:'#E8F6EC', equipment:'#EEF2F6', towing:'#FDECEC' };

const SEED = [
// id, name, cat, city, province, km, rating, revs, price, types, alsoServes, tags
['manila-kalayaan','Kalayaan Car Rental','vehicles','Manila City','Metro Manila',3.1,4.81,412,'2,600',
  ['Sedan','SUV','Van'],['Makati City, Metro Manila','Quezon City, Metro Manila','Pasay City, Metro Manila'],['Self-drive','Instant book']],
['makati-ayala','Ayala Fleet Services','vehicles','Makati City','Metro Manila',2.2,4.93,689,'4,100',
  ['Sedan','SUV','Van'],['Manila City, Metro Manila','Taguig City, Metro Manila','Pasig City, Metro Manila'],['Corporate','With driver']],
['naia-transfers','NAIA Airport Rentals','vehicles','Pasay City','Metro Manila',1.6,4.77,538,'3,200',
  ['Van','SUV'],['Manila City, Metro Manila','Makati City, Metro Manila','Muntinlupa City, Metro Manila'],['Airport pickup','24/7']],
['edsa-tow','EDSA 24H Towing','towing','Quezon City','Metro Manila',4.4,4.86,921,'1,900',
  ['Flatbed','Wheel-Lift','Heavy Duty'],['Manila City, Metro Manila','Makati City, Metro Manila','Pasig City, Metro Manila','Caloocan City, Metro Manila'],['24/7','ETA 15 min']],
['clark-corridor','Clark Corridor Rentals','vehicles','Angeles City','Pampanga',5.8,4.72,203,'2,900',
  ['Sedan','SUV','Van'],['Mabalacat City, Pampanga','San Fernando City, Pampanga','Olongapo City, Zambales'],['Airport pickup','Self-drive']],
['subic-bay','Subic Bay Equipment','equipment','Olongapo City','Zambales',7.2,4.64,118,'9,200',
  ['Excavator','Crane','Boom Lift'],['Subic, Zambales','Angeles City, Pampanga','Iba, Zambales'],['Operator incl.','Port works']],
['summit-baguio','Summit Highland Rentals','vehicles','Baguio City','Benguet',3.9,4.88,367,'3,400',
  ['SUV','Van','Pickup'],['La Trinidad, Benguet','Sagada, Mountain Province','San Fernando City, La Union'],['Mountain routes','With driver']],
['elyu-surf','Elyu Surf Vans','vehicles','San Juan','La Union',2.4,4.79,241,'2,800',
  ['Van','SUV'],['San Fernando City, La Union','Bauang, La Union','Baguio City, Benguet'],['Surf trips','Self-drive']],
['heritage-vigan','Heritage Coast Rentals','vehicles','Vigan City','Ilocos Sur',2.9,4.83,176,'2,500',
  ['Sedan','Van'],['Laoag City, Ilocos Norte','Pagudpud, Ilocos Norte','Candon City, Ilocos Sur'],['Heritage tours','With driver']],
['ridge-tagaytay','Ridge View Rentals','vehicles','Tagaytay City','Cavite',3.3,4.75,294,'3,000',
  ['Sedan','SUV','Van'],['Dasmariñas City, Cavite','Batangas City, Batangas','Nasugbu, Batangas'],['Day trips','Self-drive']],
['batangas-port','Batangas Port Equipment','equipment','Batangas City','Batangas',6.1,4.69,152,'10,400',
  ['Excavator','Crane','Dump Truck'],['Lipa City, Batangas','Bauan, Batangas','Calamba City, Laguna'],['Operator incl.','Port works']],
['mayon-legazpi','Mayon View Transport','vehicles','Legazpi City','Albay',4.2,4.8,198,'2,700',
  ['Van','SUV'],['Daraga, Albay','Tabaco City, Albay','Naga City, Camarines Sur'],['Volcano tours','With driver']],
['palawan-island','Palawan Island Rentals','vehicles','Puerto Princesa City','Palawan',3.7,4.9,455,'3,100',
  ['SUV','Van','Pickup'],['El Nido, Palawan','Coron, Palawan','Roxas, Palawan'],['Island transfers','Self-drive']],
['elnido-vans','El Nido Van Hire','vehicles','El Nido','Palawan',1.9,4.85,312,'3,600',
  ['Van'],['Puerto Princesa City, Palawan','Taytay, Palawan'],['Island transfers','With driver']],
['coron-bay','Coron Bay Transport','vehicles','Coron','Palawan',2.1,4.74,187,'3,300',
  ['Van','SUV'],['Busuanga, Palawan','Culion, Palawan'],['Island transfers','Airport pickup']],
['cebu-queen','Queen City Auto Rentals','vehicles','Cebu City','Cebu',2.8,4.87,724,'2,900',
  ['Sedan','SUV','Van','Pickup'],['Mandaue City, Cebu','Lapu-Lapu City, Cebu','Talisay City, Cebu'],['Self-drive','Instant book']],
['cebu-metro-tow','Cebu Metro Towing','towing','Cebu City','Cebu',3.5,4.82,506,'1,750',
  ['Flatbed','Wheel-Lift','Heavy Duty'],['Mandaue City, Cebu','Lapu-Lapu City, Cebu','Talisay City, Cebu'],['24/7','ETA 18 min']],
['mactan-heavy','Mactan Heavy Equipment','equipment','Mandaue City','Cebu',5.4,4.71,164,'11,200',
  ['Excavator','Crane','Backhoe','Boom Lift'],['Cebu City, Cebu','Lapu-Lapu City, Cebu','Danao City, Cebu'],['Operator incl.','Certified crew']],
['boracay-transport','Boracay Island Transport','vehicles','Malay','Aklan',2.3,4.84,398,'2,400',
  ['Van','SUV'],['Kalibo, Aklan','Nabas, Aklan','Ibajay, Aklan'],['Island transfers','Airport pickup']],
['bohol-countryside','Bohol Countryside Rentals','vehicles','Tagbilaran City','Bohol',3.2,4.86,341,'2,600',
  ['Sedan','SUV','Van'],['Panglao, Bohol','Dauis, Bohol','Carmen, Bohol','Loboc, Bohol'],['Countryside tours','Self-drive']],
['panglao-beach','Panglao Beach Rentals','vehicles','Panglao','Bohol',1.8,4.79,226,'2,300',
  ['SUV','Van'],['Tagbilaran City, Bohol','Dauis, Bohol'],['Beach transfers','Self-drive']],
['ilonggo-fleet','Ilonggo Fleet Rentals','vehicles','Iloilo City','Iloilo',3.6,4.78,289,'2,500',
  ['Sedan','SUV','Van'],['Oton, Iloilo','Pavia, Iloilo','Roxas City, Capiz'],['Self-drive','With driver']],
['negros-sugar','Negros Sugar Equipment','equipment','Bacolod City','Negros Occidental',6.7,4.66,131,'8,900',
  ['Excavator','Backhoe','Dump Truck','Loader'],['Talisay City, Negros Occidental','Silay City, Negros Occidental','Kabankalan City, Negros Occidental'],['Operator incl.','Agri works']],
['dumaguete-rides','Dumaguete City Rentals','vehicles','Dumaguete City','Negros Oriental',2.7,4.81,204,'2,400',
  ['Sedan','SUV','Van'],['Valencia, Negros Oriental','Dauin, Negros Oriental','Bais City, Negros Oriental'],['Self-drive','Dive trips']],
['siargao-rides','Siargao Island Rides','vehicles','General Luna','Surigao del Norte',2.0,4.89,376,'2,700',
  ['SUV','Van','Pickup'],['Dapa, Surigao del Norte','Del Carmen, Surigao del Norte','Surigao City, Surigao del Norte'],['Surf trips','Airport pickup']],
['cdo-fleet','CDO Fleet Hub','vehicles','Cagayan de Oro City','Misamis Oriental',4.1,4.76,318,'2,800',
  ['Sedan','SUV','Van','Truck'],['Iligan City, Lanao del Norte','Malaybalay City, Bukidnon','Gingoog City, Misamis Oriental'],['Self-drive','Corporate']],
['gensan-machinery','GenSan Machinery','equipment','General Santos City','South Cotabato',5.9,4.7,143,'9,600',
  ['Excavator','Crane','Dump Truck','Compactor'],['Koronadal City, South Cotabato','Polomolok, South Cotabato','Digos City, Davao del Sur'],['Operator incl.','Delivery incl.']],
['zambo-peninsula','Zamboanga Peninsula Rentals','vehicles','Zamboanga City','Zamboanga del Sur',3.8,4.68,157,'2,600',
  ['Sedan','SUV','Van'],['Pagadian City, Zamboanga del Sur','Dipolog City, Zamboanga del Norte'],['Self-drive','With driver']],
['caraga-rescue','Caraga Roadside Rescue','towing','Butuan City','Agusan del Norte',4.6,4.74,212,'1,850',
  ['Flatbed','Heavy Duty','Winch-out'],['Cabadbaran City, Agusan del Norte','Surigao City, Surigao del Norte','Bayugan City, Agusan del Sur'],['24/7','Long-haul']]
];

SEED.forEach(([id, name, cat, city, prov, km, rating, reviews, price, types, extra, tags], i) => {
  const availNow = i % 3 !== 2;                    // ~2 in 3 bookable today
  FR_COMPANIES.push({
    id, cat, name, loc: `${city}, ${prov}`, km, rating, reviews, price, bg: CAT_BG[cat], tags,
    status: cat === 'towing' ? 'On standby' : (availNow ? 'Available now' : 'Book 24h ahead'),
    statusType: (cat === 'towing' || availNow) ? 'now' : 'ok',
    reply: (3 + (i % 17)) + ' min',
    radius: 40 + (i % 5) * 15,
    units: 6 + (reviews % 26),
    since: 2011 + (i % 12),
    about: `${name} operates out of ${city} and serves ${extra.length + 1} `
         + `cities across ${prov}. Rates exclude fuel unless stated.`,
    types,
    operator: cat !== 'vehicles' || tags.includes('With driver'),
    delivery: cat !== 'towing',
    instant:  tags.includes('Instant book'),
    serves: [`${city}, ${prov}`, ...extra]
  });
});

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

/* Province is optional but decisive: given one, a company only matches if
   it serves that city IN that province. Without it we'd tell someone in
   Carmen, Bohol that six Davao companies cover them. */
function citySearchable(c, city, province){
  const q = normCity(city);
  if (!q) return true;
  if (!province && normCity(c.loc).includes(q)) return true;
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

function filterCompanies(f){
  return FR_COMPANIES.filter(c => {
    if (f.cat      && !catsOf(c).includes(f.cat))         return false;
    /* A multi-service company offers both towing and excavators, but not
       an excavator *as* a towing service - so when a category and a type
       are both set, the type has to belong to that category. */
    if (f.cat && f.type && !(FR_TYPES[f.cat] || []).includes(f.type)) return false;
    if (!citySearchable(c, f.city, f.province))           return false;
    if (f.type     && !(c.types || []).includes(f.type))  return false;
    if (f.maxKm    && c.km > f.maxKm)                     return false;
    if (f.availNow && c.statusType !== 'now')             return false;
    if (f.operator && !c.operator)                        return false;
    if (f.delivery && !c.delivery)                        return false;
    if (f.instant  && !c.instant)                         return false;
    return true;
  });
}

function sortCompanies(list, sort){
  const out = list.slice();
  if (sort === 'near')   out.sort((a,b) => a.km - b.km);
  if (sort === 'rating') out.sort((a,b) => b.rating - a.rating);
  if (sort === 'price')  out.sort((a,b) => +a.price.replace(/,/g,'') - +b.price.replace(/,/g,''));
  if (sort === 'avail')  out.sort((a,b) => (a.statusType === 'now' ? 0 : 1) - (b.statusType === 'now' ? 0 : 1));
  return out;
}

/* ---------- Units (fleet inventory for storefront/booking) ------------ */
const FR_UNITS = {
  /* ================= FULL-COVERAGE TEST FIXTURE =================
     19 units spanning every type in all three service lines. If a change
     breaks grouping, icons, filtering or the booking hand-off, it shows
     up here first. */
  "fleetservice-davao":[
    /* --- vehicle rental --- */
    { id:"fs-sedan", name:"Toyota Vios Sedan", cat:"vehicles", price:1800, unit:"day",
      specs:{ "Seats":"5", "Transmission":"Automatic", "Fuel":"Gasoline", "Year":"2024" },
      operator:false, delivery:400, avail:9 },
    { id:"fs-suv", name:"Toyota Fortuner SUV", cat:"vehicles", price:3300, unit:"day",
      specs:{ "Seats":"7", "Transmission":"Automatic", "Fuel":"Diesel", "Year":"2024" },
      operator:false, delivery:500, avail:6 },
    /* free inside the city, then per km - typical for out-of-town drops */
    { id:"fs-van", name:"Toyota Hiace 15-Seater", cat:"vehicles", price:3800, unit:"day",
      specs:{ "Seats":"15", "Transmission":"Manual", "Fuel":"Diesel", "Year":"2023" },
      operator:true, deliveryMode:"perkm", delivery:0, deliveryFree:15, deliveryKm:45, avail:5 },
    { id:"fs-pickup", name:"Ford Ranger Pickup", cat:"vehicles", price:2900, unit:"day",
      specs:{ "Seats":"5", "Payload":"1 t", "Fuel":"Diesel", "Year":"2023" },
      operator:false, delivery:500, avail:4 },
    { id:"fs-truck", name:"Isuzu Elf Closed Van", cat:"vehicles", price:4600, unit:"day",
      specs:{ "Payload":"3.5 t", "Body":"Closed van", "Fuel":"Diesel", "Year":"2022" },
      operator:true, delivery:900, avail:3 },
    { id:"fs-moto", name:"Honda ADV 160 Scooter", cat:"vehicles", price:950, unit:"day",
      specs:{ "Seats":"2", "Engine":"160 cc", "Transmission":"Automatic", "Year":"2024" },
      operator:false, delivery:300, avail:7 },

    /* --- heavy equipment rental --- */
    /* mobilisation billed by distance - the common case for heavy plant */
    { id:"fs-exc", name:"Excavator 20-Ton", cat:"equipment", price:12000, unit:"day",
      specs:{ "Operating weight":"20.5 t", "Bucket":"1.0 cbm", "Model":"Komatsu PC200-8", "Fuel":"Client-supplied" },
      operator:true, deliveryMode:"perkm", delivery:0, deliveryFree:10, deliveryKm:180, avail:3 },
    { id:"fs-bh", name:"Backhoe Loader", cat:"equipment", price:7500, unit:"day",
      specs:{ "Bucket":"0.28 cbm", "Dig depth":"4.3 m", "Model":"JCB 3DX", "Fuel":"Client-supplied" },
      operator:true, delivery:1800, avail:4 },
    /* crane access varies too much to price sight-unseen */
    { id:"fs-crane", name:"Mobile Crane 25-Ton", cat:"equipment", price:18000, unit:"day",
      specs:{ "Max capacity":"25 t", "Boom length":"31 m", "Model":"Kato NK-250E", "Crew":"Operator + rigger" },
      operator:true, deliveryMode:"quoted", avail:2 },
    { id:"fs-dozer", name:"Bulldozer D6", cat:"equipment", price:11500, unit:"day",
      specs:{ "Blade":"3.2 m", "Weight":"18 t", "Model":"Caterpillar D6R", "Fuel":"Client-supplied" },
      operator:true, delivery:4200, avail:1 },
    { id:"fs-dump", name:"Dump Truck 10-Wheeler", cat:"equipment", price:6800, unit:"day",
      specs:{ "Capacity":"12 cbm", "Payload":"15 t", "Model":"Isuzu CYZ", "Fuel":"Client-supplied" },
      operator:true, delivery:0, avail:6 },
    { id:"fs-boom", name:"Boom Lift 18m", cat:"equipment", price:6000, unit:"day",
      specs:{ "Working height":"18 m", "Platform cap.":"230 kg", "Model":"Genie Z-60", "Power":"Diesel" },
      operator:false, delivery:2200, avail:2 },
    { id:"fs-comp", name:"Road Compactor", cat:"equipment", price:5200, unit:"day",
      specs:{ "Drum width":"1.7 m", "Weight":"10 t", "Model":"Sakai SV512", "Type":"Vibratory" },
      operator:true, delivery:2000, avail:3 },
    { id:"fs-loader", name:"Wheel Loader 3.0cbm", cat:"equipment", price:8200, unit:"day",
      specs:{ "Bucket":"3.0 cbm", "Payload":"5 t", "Model":"Komatsu WA380", "Fuel":"Client-supplied" },
      operator:true, delivery:2400, avail:2 },

    /* --- towing & recovery --- */
    { id:"fs-flat", name:"Flatbed Tow - Light Vehicle", cat:"towing", price:1500, unit:"call-out",
      specs:{ "Max vehicle":"2.5 t", "Base coverage":"12 km", "Per extra km":"₱65", "ETA":"12–20 min" },
      operator:true, delivery:0, avail:4 },
    { id:"fs-wheel", name:"Wheel-Lift Tow", cat:"towing", price:1200, unit:"call-out",
      specs:{ "Max vehicle":"1.8 t", "Base coverage":"12 km", "Per extra km":"₱55", "ETA":"10–18 min" },
      operator:true, delivery:0, avail:3 },
    { id:"fs-hd", name:"Heavy Duty Recovery", cat:"towing", price:5200, unit:"call-out",
      specs:{ "Max vehicle":"18 t", "Base coverage":"20 km", "Per extra km":"₱140", "ETA":"30–50 min" },
      operator:true, delivery:0, avail:2 },
    { id:"fs-long", name:"Long-Haul Inter-City Transport", cat:"towing", price:7800, unit:"call-out",
      specs:{ "Max vehicle":"6 t", "Covers":"Region XI &amp; XII", "Billing":"Per km beyond 50 km", "ETA":"Scheduled" },
      operator:true, delivery:0, avail:2 },
    { id:"fs-winch", name:"Winch-Out / Ditch Recovery", cat:"towing", price:2200, unit:"call-out",
      specs:{ "Winch line":"25 m", "Pull rating":"8 t", "Includes":"Rigging crew", "ETA":"20–35 min" },
      operator:true, delivery:0, avail:3 }
  ],

  "davao-heavy-lift":[
    { id:"dhl-ex20", name:"Excavator 20-Ton", price:12000, unit:"day",
      specs:{ "Operating weight":"20.5 t", "Bucket":"1.0 cbm", "Max dig depth":"6.5 m", "Model":"Komatsu PC200-8" },
      operator:true, delivery:2500, avail:3 },
    { id:"dhl-cr25", name:"Mobile Crane 25-Ton", price:18000, unit:"day",
      specs:{ "Max capacity":"25 t", "Boom length":"31 m", "Model":"Kato NK-250E", "Crew":"Operator + rigger" },
      operator:true, delivery:4000, avail:2 },
    { id:"dhl-bh", name:"Backhoe Loader", price:7500, unit:"day",
      specs:{ "Bucket":"0.28 cbm", "Dig depth":"4.3 m", "Model":"JCB 3DX", "Fuel":"Client-supplied" },
      operator:true, delivery:1800, avail:4 },
    { id:"dhl-dt10", name:"Dump Truck 10-Wheeler", price:6800, unit:"day",
      specs:{ "Capacity":"12 cbm", "Payload":"15 t", "Model":"Isuzu CYZ", "Fuel":"Client-supplied" },
      operator:true, delivery:0, avail:6 },
    { id:"dhl-cp", name:"Road Compactor", price:5200, unit:"day",
      specs:{ "Drum width":"1.7 m", "Weight":"10 t", "Model":"Sakai SV512", "Type":"Vibratory" },
      operator:true, delivery:2000, avail:2 },
    { id:"dhl-bl", name:"Boom Lift 18m", price:6000, unit:"day",
      specs:{ "Working height":"18 m", "Platform cap.":"230 kg", "Model":"Genie Z-60", "Power":"Diesel" },
      operator:false, delivery:2200, avail:1 },
    /* --- fleet beyond ten units: exercises the admin photo grid and the
           storefront layouts at realistic scale --- */
    { id:"dhl-wl", name:"Wheel Loader 3.0cbm", price:8200, unit:"day",
      specs:{ "Bucket":"3.0 cbm", "Payload":"5 t", "Model":"Komatsu WA380", "Fuel":"Client-supplied" },
      operator:true, delivery:2400, avail:3 },
    { id:"dhl-gr", name:"Motor Grader", price:9400, unit:"day",
      specs:{ "Blade width":"3.7 m", "Weight":"15 t", "Model":"Caterpillar 120K", "Fuel":"Client-supplied" },
      operator:true, delivery:3200, avail:2 },
    { id:"dhl-mx", name:"Concrete Mixer Truck", price:7600, unit:"day",
      specs:{ "Drum":"5 cbm", "Model":"Isuzu Giga", "Discharge":"Rear chute", "Fuel":"Client-supplied" },
      operator:true, delivery:1600, avail:4 },
    { id:"dhl-bd", name:"Bulldozer D6", price:11500, unit:"day",
      specs:{ "Blade":"3.2 m", "Weight":"18 t", "Model":"Caterpillar D6R", "Fuel":"Client-supplied" },
      operator:true, delivery:4200, avail:1 },
    { id:"dhl-th", name:"Telehandler 4T", price:6900, unit:"day",
      specs:{ "Lift capacity":"4 t", "Reach":"17 m", "Model":"JCB 540-170", "Attachments":"Fork / bucket" },
      operator:true, delivery:2000, avail:2 },
    { id:"dhl-gs", name:"Generator Set 250kVA", price:4800, unit:"day",
      specs:{ "Output":"250 kVA", "Voltage":"230/400 V", "Model":"Cummins C250", "Fuel":"Client-supplied" },
      operator:false, delivery:1500, avail:5 },
    { id:"dhl-wt", name:"Water Truck 10,000L", price:5400, unit:"day",
      specs:{ "Tank":"10,000 L", "Pump":"Rear spray bar", "Model":"Isuzu Forward", "Fuel":"Client-supplied" },
      operator:true, delivery:1400, avail:3 },
    { id:"dhl-ss", name:"Skid Steer Loader", price:4600, unit:"day",
      specs:{ "Bucket":"0.5 cbm", "Weight":"3.2 t", "Model":"Bobcat S570", "Attachments":"Bucket / breaker" },
      operator:true, delivery:1200, avail:4 }
  ],
  "mindanao-auto":[
    { id:"ma-van15", name:"Toyota Hiace 15-Seater", price:3800, unit:"day",
      specs:{ "Seats":"15", "Transmission":"Manual", "Fuel":"Diesel", "Year":"2022" },
      operator:false, delivery:500, avail:4 },
    { id:"ma-suv", name:"Toyota Fortuner SUV", price:3200, unit:"day",
      specs:{ "Seats":"7", "Transmission":"Automatic", "Fuel":"Diesel", "Year":"2023" },
      operator:false, delivery:500, avail:3 },
    { id:"ma-sedan", name:"Toyota Vios Sedan", price:1800, unit:"day",
      specs:{ "Seats":"5", "Transmission":"Automatic", "Fuel":"Gasoline", "Year":"2023" },
      operator:false, delivery:400, avail:8 },
    { id:"ma-pickup", name:"Ford Ranger Pickup", price:2900, unit:"day",
      specs:{ "Seats":"5", "Transmission":"Manual", "Fuel":"Diesel", "Year":"2022" },
      operator:false, delivery:500, avail:2 },
    { id:"ma-mpv", name:"Toyota Innova MPV", price:2600, unit:"day",
      specs:{ "Seats":"7", "Transmission":"Automatic", "Fuel":"Diesel", "Year":"2023" },
      operator:false, delivery:500, avail:5 },
    { id:"ma-hatch", name:"Toyota Wigo Hatchback", price:1500, unit:"day",
      specs:{ "Seats":"5", "Transmission":"Automatic", "Fuel":"Gasoline", "Year":"2024" },
      operator:false, delivery:400, avail:6 },
    { id:"ma-van12", name:"Nissan Urvan 12-Seater", price:3400, unit:"day",
      specs:{ "Seats":"12", "Transmission":"Manual", "Fuel":"Diesel", "Year":"2022" },
      operator:false, delivery:600, avail:3 },
    { id:"ma-suv7", name:"Mitsubishi Montero SUV", price:3100, unit:"day",
      specs:{ "Seats":"7", "Transmission":"Automatic", "Fuel":"Diesel", "Year":"2023" },
      operator:false, delivery:500, avail:2 },
    /* --- motorcycles: a vehicle you rent, not a towing service --- */
    { id:"ma-moto150", name:"Honda Click 160 Scooter", cat:"vehicles", price:750, unit:"day",
      specs:{ "Seats":"2", "Engine":"160 cc", "Transmission":"Automatic", "Year":"2024" },
      operator:false, delivery:300, avail:8 },
    { id:"ma-moto-adv", name:"Honda ADV 160 Scooter", cat:"vehicles", price:950, unit:"day",
      specs:{ "Seats":"2", "Engine":"160 cc", "Transmission":"Automatic", "Year":"2024" },
      operator:false, delivery:300, avail:4 },
    { id:"ma-moto-trail", name:"Honda XR150 Trail Bike", cat:"vehicles", price:1100, unit:"day",
      specs:{ "Seats":"2", "Engine":"150 cc", "Transmission":"5-speed manual", "Year":"2023" },
      operator:false, delivery:400, avail:3 }
  ],
  /* --- sample TOWING company, fully fleshed out --- */
  "rapid-response":[
    { id:"rr-flat", name:"Flatbed Tow - Light Vehicle", cat:"towing", price:1500, unit:"call-out",
      specs:{ "Max vehicle":"2.5 t", "Base coverage":"10 km", "Per extra km":"₱65", "ETA":"12–20 min" },
      operator:true, delivery:0, avail:3 },
    { id:"rr-wheel", name:"Wheel-Lift Tow", cat:"towing", price:1200, unit:"call-out",
      specs:{ "Max vehicle":"1.8 t", "Base coverage":"10 km", "Per extra km":"₱55", "ETA":"10–18 min" },
      operator:true, delivery:0, avail:2 },
    { id:"rr-heavy", name:"Heavy Duty Recovery", cat:"towing", price:4500, unit:"call-out",
      specs:{ "Max vehicle":"15 t", "Base coverage":"15 km", "Per extra km":"₱120", "ETA":"25–40 min" },
      operator:true, delivery:0, avail:1 },
    { id:"rr-winch", name:"Winch-Out / Ditch Recovery", cat:"towing", price:2200, unit:"call-out",
      specs:{ "Winch line":"25 m", "Pull rating":"8 t", "Includes":"Rigging crew", "ETA":"20–35 min" },
      operator:true, delivery:0, avail:2 },
    { id:"rr-jump", name:"Roadside Battery &amp; Jumpstart", cat:"towing", price:650, unit:"call-out",
      specs:{ "Covers":"12 V / 24 V", "Base coverage":"12 km", "Includes":"Boost + test", "ETA":"10–20 min" },
      operator:true, delivery:0, avail:5 },
    { id:"rr-lock", name:"Lockout Assistance", cat:"towing", price:750, unit:"call-out",
      specs:{ "Covers":"Cars &amp; vans", "Base coverage":"12 km", "Includes":"Non-damage entry", "ETA":"15–25 min" },
      operator:true, delivery:0, avail:3 },
    { id:"rr-fuel", name:"Emergency Fuel Delivery", cat:"towing", price:800, unit:"call-out",
      specs:{ "Delivers":"Up to 10 L", "Fuel cost":"Billed separately", "Base coverage":"12 km", "ETA":"15–25 min" },
      operator:true, delivery:0, avail:4 }
  ],

  /* --- MULTI-SERVICE company: vehicles + equipment + towing --- */
  "davao-fleet":[
    { id:"df-suv", name:"Toyota Fortuner SUV", cat:"vehicles", price:3400, unit:"day",
      specs:{ "Seats":"7", "Transmission":"Automatic", "Fuel":"Diesel", "Year":"2023" },
      operator:false, delivery:600, avail:6 },
    { id:"df-van", name:"Toyota Hiace Commuter", cat:"vehicles", price:3900, unit:"day",
      specs:{ "Seats":"15", "Transmission":"Manual", "Fuel":"Diesel", "Year":"2023" },
      operator:true, delivery:600, avail:4 },
    { id:"df-sedan", name:"Toyota Corolla Altis", cat:"vehicles", price:2300, unit:"day",
      specs:{ "Seats":"5", "Transmission":"Automatic", "Fuel":"Gasoline", "Year":"2024" },
      operator:false, delivery:500, avail:5 },
    { id:"df-truck", name:"Isuzu Elf Closed Van", cat:"vehicles", price:4600, unit:"day",
      specs:{ "Payload":"3.5 t", "Body":"Closed van", "Fuel":"Diesel", "Year":"2022" },
      operator:true, delivery:900, avail:3 },
    { id:"df-exc", name:"Excavator 12-Ton", cat:"equipment", price:9200, unit:"day",
      specs:{ "Operating weight":"12.5 t", "Bucket":"0.5 cbm", "Model":"Kobelco SK130", "Fuel":"Client-supplied" },
      operator:true, delivery:2600, avail:2 },
    { id:"df-bh", name:"Backhoe Loader", cat:"equipment", price:7400, unit:"day",
      specs:{ "Bucket":"0.28 cbm", "Dig depth":"4.3 m", "Model":"JCB 3DX", "Fuel":"Client-supplied" },
      operator:true, delivery:1800, avail:3 },
    { id:"df-dump", name:"Dump Truck 6-Wheeler", cat:"equipment", price:5800, unit:"day",
      specs:{ "Capacity":"6 cbm", "Payload":"8 t", "Model":"Isuzu Forward", "Fuel":"Client-supplied" },
      operator:true, delivery:0, avail:4 },
    { id:"df-tow", name:"Flatbed Recovery Truck", cat:"towing", price:1700, unit:"call-out",
      specs:{ "Max vehicle":"3 t", "Base coverage":"15 km", "Per extra km":"₱70", "ETA":"20–30 min" },
      operator:true, delivery:0, avail:2 },
    { id:"df-tow-hd", name:"Heavy Duty Tow - Trucks", cat:"towing", price:5200, unit:"call-out",
      specs:{ "Max vehicle":"18 t", "Base coverage":"20 km", "Per extra km":"₱140", "ETA":"35–60 min" },
      operator:true, delivery:0, avail:1 }
  ]
};

/* ---------- Add-on services ------------------------------------------
   Things a company sells alongside the unit itself. Vehicle rental in
   particular lives on these - pickup and drop-off are the difference
   between a booking and a lost enquiry.
   ----------------------------------------------------------------------- */
const FR_SERVICES = {
  /* ===== FULL-COVERAGE FIXTURE: every add-on we model, per line ===== */
  "fleetservice-davao":[
    /* --- vehicle rental: pickup and drop-off in every variant --- */
    { id:"fs-svc-appu", name:"Airport pickup", price:600, unit:"trip", cat:"vehicles",
      note:"We meet you at Davao International arrivals with the keys and the contract." },
    { id:"fs-svc-apdo", name:"Airport drop-off", price:600, unit:"trip", cat:"vehicles",
      note:"Leave the unit at departures - no detour back to the yard." },
    { id:"fs-svc-hotel", name:"Hotel or residence delivery", price:500, unit:"trip", cat:"vehicles",
      note:"Anywhere inside Davao City. We hand over at your door." },
    { id:"fs-svc-office", name:"Office or job-site delivery", price:500, unit:"trip", cat:"vehicles",
      note:"Useful for corporate accounts running a shift changeover." },
    { id:"fs-svc-return", name:"Door-to-door return pickup", price:500, unit:"trip", cat:"vehicles",
      note:"We collect the unit wherever you finish - home, hotel or site." },
    { id:"fs-svc-outoftown", name:"Out-of-town delivery", price:0, unit:"quoted", cat:"vehicles",
      note:"Panabo, Tagum, Digos and beyond. Quoted by distance." },
    { id:"fs-svc-driver", name:"Professional driver", price:1200, unit:"day", cat:"vehicles",
      note:"Licensed, 10-hour shift. Meals and lodging on client account." },
    { id:"fs-svc-driver2", name:"Additional authorised driver", price:300, unit:"booking", cat:"vehicles",
      note:"Adds a second named driver to the insurance." },
    { id:"fs-svc-seat", name:"Child seat", price:250, unit:"day", cat:"vehicles",
      note:"Forward-facing, suits 9 months to 4 years." },
    { id:"fs-svc-gps", name:"GPS and dashcam", price:200, unit:"day", cat:"vehicles",
      note:"Useful for company policy or long inter-city trips." },
    { id:"fs-svc-fuel", name:"Return with empty tank", price:1800, unit:"booking", cat:"vehicles",
      note:"Skip refuelling. Flat fee, no per-litre surprise on return." },
    { id:"fs-svc-cdw", name:"Damage waiver upgrade", price:450, unit:"day", cat:"vehicles",
      note:"Drops your liability cap from ₱75,000 to ₱15,000." },
    { id:"fs-svc-road", name:"24/7 roadside assistance", price:0, unit:"included", cat:"vehicles",
      note:"Jumpstart, tyre change and towing on every self-drive booking." },

    /* --- heavy equipment --- */
    { id:"fs-svc-mob", name:"Mobilisation and demobilisation", price:0, unit:"quoted", cat:"equipment",
      note:"Lowbed haulage to and from site, quoted by distance and access." },
    { id:"fs-svc-op", name:"Certified operator", price:1600, unit:"day", cat:"equipment",
      note:"TESDA NC II holder. Included on most machines by default." },
    { id:"fs-svc-fuelsup", name:"Fuel supplied by us", price:0, unit:"quoted", cat:"equipment",
      note:"Billed at the prevailing pump rate plus delivery." },
    { id:"fs-svc-safety", name:"On-site safety officer", price:1200, unit:"day", cat:"equipment",
      note:"DOLE-compliant cover for sites with more than ten workers." },
    { id:"fs-svc-mech", name:"Standby mechanic", price:1800, unit:"day", cat:"equipment",
      note:"On-site for multi-machine deployments. Cuts downtime on long pours." },
    { id:"fs-svc-night", name:"Night-shift operation", price:2200, unit:"shift", cat:"equipment",
      note:"6pm–2am crew, including lighting tower." },

    /* --- towing and recovery --- */
    { id:"fs-svc-prio", name:"Priority dispatch", price:400, unit:"call-out", cat:"towing",
      note:"Next available truck, ahead of the queue." },
    { id:"fs-svc-store", name:"Secure storage", price:350, unit:"day", cat:"towing",
      note:"Fenced, CCTV-monitored yard while you arrange repairs." },
    { id:"fs-svc-nightt", name:"Night surcharge (10pm–5am)", price:300, unit:"call-out", cat:"towing",
      note:"Applied automatically and always shown before you confirm." },
    { id:"fs-svc-doc", name:"Accident documentation", price:500, unit:"call-out", cat:"towing",
      note:"Photos, scene notes and a report pack for your insurer." },
    { id:"fs-svc-fleet", name:"Fleet standby cover", price:2500, unit:"month", cat:"towing",
      note:"Priority 24/7 dispatch for your whole fleet, capped at four call-outs." }
  ],

  "mindanao-auto":[
    { id:"ma-svc-pickup", name:"Airport pickup", price:600, unit:"trip", cat:"vehicles",
      note:"We meet you at Davao International arrivals with the keys." },
    { id:"ma-svc-drop",   name:"Airport drop-off", price:600, unit:"trip", cat:"vehicles",
      note:"Leave the unit at departures - no need to return to the yard." },
    { id:"ma-svc-hotel",  name:"Hotel or home delivery", price:500, unit:"trip", cat:"vehicles",
      note:"Within Davao City. Outside the city is quoted by distance." },
    { id:"ma-svc-return", name:"Door-to-door return pickup", price:500, unit:"trip", cat:"vehicles",
      note:"We collect the unit from wherever you finish." },
    { id:"ma-svc-driver", name:"Professional driver", price:1200, unit:"day", cat:"vehicles",
      note:"Licensed driver, 10 hours. Meals and lodging on client account." },
    { id:"ma-svc-seat",   name:"Child seat", price:250, unit:"day", cat:"vehicles",
      note:"Forward-facing, suits 9 months to 4 years." },
    { id:"ma-svc-fuel",   name:"Return with empty tank", price:1800, unit:"booking", cat:"vehicles",
      note:"Skip refuelling - we handle it. Flat fee, no per-litre surprise." },
    { id:"ma-svc-cdw",    name:"Damage waiver upgrade", price:450, unit:"day", cat:"vehicles",
      note:"Drops your liability cap from ₱75,000 to ₱15,000." }
  ],
  "davao-fleet":[
    { id:"df-svc-pickup", name:"Airport pickup", price:700, unit:"trip", cat:"vehicles",
      note:"Meet-and-greet at Davao International arrivals." },
    { id:"df-svc-drop",   name:"Airport drop-off", price:700, unit:"trip", cat:"vehicles",
      note:"Leave the unit at departures." },
    { id:"df-svc-deliver",name:"Site delivery", price:0, unit:"quoted", cat:"equipment",
      note:"Mobilisation quoted per site by distance and access." },
    { id:"df-svc-driver", name:"Professional driver", price:1300, unit:"day", cat:"vehicles",
      note:"Licensed driver, 10 hours." },
    { id:"df-svc-standby",name:"Standby recovery cover", price:2500, unit:"month", cat:"towing",
      note:"Priority dispatch for your fleet, 24/7, capped at 4 call-outs." }
  ],
  "rapid-response":[
    { id:"rr-svc-storage", name:"Impound / secure storage", price:350, unit:"day", cat:"towing",
      note:"Fenced, CCTV-monitored yard in Bajada." },
    { id:"rr-svc-priority",name:"Priority dispatch", price:400, unit:"call-out", cat:"towing",
      note:"Next available truck, ahead of the queue." },
    { id:"rr-svc-night",   name:"Night surcharge (10pm–5am)", price:300, unit:"call-out", cat:"towing",
      note:"Applied automatically, shown before you confirm." }
  ]
};

/* ---------- Reviews --------------------------------------------------- */
const FR_REVIEWS = [
  { who:"Rico M.", when:"2 weeks ago", r:5, unit:"Excavator 20-Ton",
    body:"Dumating on time sa site sa Toril, operator was experienced and hindi nag-reklamo kahit umuulan. Second time kong mag-rent sa kanila." },
  { who:"Jen T.", when:"1 month ago", r:5, unit:"Mobile Crane 25-Ton",
    body:"Booked for a 3-day warehouse installation. Rigger was TESDA-certified as advertised. Billing was exactly as quoted - no surprise charges." },
  { who:"Arnel D.", when:"1 month ago", r:4, unit:"Backhoe Loader",
    body:"Good unit and fair pricing. Minor delay sa delivery (about 2 hours) pero they called ahead to inform. Would rent again." },
  { who:"Maricel S.", when:"2 months ago", r:5, unit:"Dump Truck 10-Wheeler",
    body:"Rented 3 trucks for a subdivision project. Consistent daily availability for 2 weeks straight. Very reliable." }
];

/* ---------- Coordinates ------------------------------------------------
   PSGC carries no lat/lon, so these are hand-set per place. Precise enough
   to put a pin on the right barangay; production should geocode the
   company's registered address once, at signup, and store a PostGIS point
   (ARCHITECTURE.md §2) rather than resolving names at runtime.
   ----------------------------------------------------------------------- */
const DISTRICT_XY = {           // the 12 long-form Davao companies
  'poblacion, davao city':[7.0644,125.6087], 'matina, davao city':[7.0596,125.5772],
  'buhangin, davao city':[7.1097,125.6224],  'toril, davao city':[7.0139,125.4996],
  'talomo, davao city':[7.0511,125.5461],    'calinan, davao city':[7.1867,125.4547],
  'agdao, davao city':[7.0842,125.6236],     'bajada, davao city':[7.0919,125.6128],
  'lanang, davao city':[7.1094,125.6456],    'mintal, davao city':[7.0839,125.4936],
  'sasa, davao city':[7.1244,125.6533],      'panabo, davao del norte':[7.3081,125.6839],
  'ecoland, davao city':[7.0658,125.5978]
};
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

/* Companies in one city would stack on a single point, so nudge each by a
   small deterministic amount derived from its id - stable across reloads. */
function attachCoords(c){
  const hit = DISTRICT_XY[c.loc.toLowerCase()] || CITY_XY[normCity(splitPlace(c.loc).name)];
  if (!hit) return;
  /* ~±2 km of spread: enough that same-city companies stay legible as
     separate bubbles at city zoom, small enough to stay in the right town.
     Real coordinates make this moot. */
  const h = [...c.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
  c.lat = hit[0] + (((h % 37) - 18) / 1000);
  c.lon = hit[1] + ((((h * 7) % 37) - 18) / 1000);
}

/* Where a named place sits, for centring the map on a chosen city. */
function cityLatLon(city){
  return CITY_XY[normCity(city)] || null;
}

/* run once the company list is fully assembled (see below) */
function attachAllCoords(){ FR_COMPANIES.forEach(attachCoords); }

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
  vehicles:  'assets/img/hero-vehicles.jpg',
  equipment: 'assets/img/hero-equipment.jpg',
  towing:    'assets/img/hero-towing.jpg'
};
const PHOTO_POS = ['50% 46%','38% 52%','62% 44%','45% 58%','57% 40%','34% 46%'];
function photoStyle(x){
  const h = [...x.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return `background-image:url('${CAT_PHOTO[x.cat]}');` +
         `background-position:${PHOTO_POS[h % PHOTO_POS.length]}`;
}

/* Render a company card. Used on index + company "similar" rail. */
function companyCard(x){
  return `
  <article class="co v-${x.cat}">
    <div class="cotop" style="${photoStyle(x)}">
      <span class="cocat">${unitIcon((x.types||[]).join(" "), x.cat)}${
        isMultiService(x) ? 'Multi-service' : FR_CATS[x.cat].label}</span>
      ${isMultiService(x) ? `<span class="colines">${catsOf(x).map(c =>
        `<span class="coline v-${c}" title="${FR_CATS[c].label}">${unitIcon('', c)}</span>`).join('')}</span>` : ''}
      <span class="cotag t ${x.statusType==='ok'?'t-ok':'t-now'}">${x.statusType==='ok' ? CHECK_SVG : '<i class="statdot"></i>'} ${x.status}</span>
      <button class="cofav" aria-label="Save ${x.name}" data-fav>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20.8 8.6c0 5-8.8 9.9-8.8 9.9s-8.8-4.9-8.8-9.9a4.8 4.8 0 0 1 8.8-2.7 4.8 4.8 0 0 1 8.8 2.7z"/></svg>
      </button>
    </div>
    <div class="cobody">
      <div class="coname">
        <h3><a href="company.html?c=${x.id}">${x.name}</a></h3>
        <span class="rate-pill">${STAR_SVG}${x.rating.toFixed(2)}</span>
      </div>
      <p class="coloc">${PIN_SVG} ${x.loc} · ${x.km} km</p>
      <div class="cotags">${x.tags.map(t=>`<span class="t">${t}</span>`).join('')}</div>
      <div class="cofoot">
        <div class="coprice"><span class="p">${peso(x.price.replace(/,/g,''))}</span> <span class="u">${FR_CATS[x.cat].unit}</span></div>
        <a class="btn btn-y btn-sm" href="company.html?c=${x.id}">View</a>
      </div>
    </div>
  </article>`;
}

/* Runs last: the coordinate tables below the company list are `const`, so
   calling this any earlier hits the temporal dead zone and throws. */
attachAllCoords();

/* Favourite toggle - delegated, works on any page that renders cards. */
document.addEventListener('click', e => {
  const f = e.target.closest('[data-fav]');
  if (f) { f.classList.toggle('on'); e.preventDefault(); }
});
