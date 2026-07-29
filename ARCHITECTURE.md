# FR Services — Fleet Rental Services PH

**Brand.** Name: *Fleet Rental Services*, short form *FR Services*. Mark: `logo.png` (FR monogram in a green ring).

**Palette is sampled from the logo, not invented.** `#057A2F` is the most frequent pixel in the mark; `#2E9A33` and `#024A1E` are the two ends of its gradient. Paired with harvest gold `#F2B705` — the "Earth green + harvest gold" combination validated in the ui-ux-pro-max colour DB (#50 Agriculture/Farm Tech). Full provenance and the measured contrast ratios are at the top of `assets/fr.css`.

Category coding is green / steel / red — go, industrial, emergency — and runs consistently through the hero panels, cards and storefronts.

**No emoji.** ui-ux-pro-max flags emoji-as-icons as a priority-4 anti-pattern: they render differently per OS, can't inherit `currentColor`, and read as decoration rather than interface. Every glyph is now an inline SVG from the `ICONS` table in `assets/data.js`, matched to a unit by keyword via `unitIcon()`. The only exceptions are the `←` / `→` on the registration wizard's Back/Continue buttons, which are navigation.

---

## 0. Product & architecture suggestion

Multi-vendor rental marketplace for the Philippines. Three categories: **Vehicles**, **Heavy Equipment**, **Towing Services**. Companies self-register and get a customizable storefront; renters are matched to companies that actually serve their location.

---

## 1. What this product actually is

It's **three different businesses sharing one platform**, and that matters more than it sounds:

| Category | Rental model | Booking urgency | Price driver | Key filter |
|---|---|---|---|---|
| Vehicles | Self-drive or with driver, per day | Planned, days ahead | Day rate | Vehicle class, seats, transmission |
| Heavy Equipment | Almost always **with operator**, per day/week, often + mobilization fee | Planned, weeks ahead | Day rate + delivery + fuel | Capacity (tons, cbm), attachment, cert |
| Towing | **Emergency dispatch**, per call-out | Right now, minutes | Base + per-km | Distance, ETA, tow type |

Towing is not a rental — it's dispatch. Don't force it into the same booking flow. Recommendation: vehicles + equipment share a "request → quote → confirm → handover" flow; towing gets a separate one-tap **"Tow me now"** flow that broadcasts to the nearest available units and takes the first accept.

---

## 2. The location matching (your "AI detects where the user is")

You described it as AI. Realistically it's a **ranked cascade**, and only the last layer needs ML. Build it in this order:

1. **Explicit choice** — user picked a city before. Always wins. Store it.
2. **Browser Geolocation API** — precise, but requires a permission prompt. Don't fire it on first paint (it kills trust); trigger it on first search or on a "Use my location" tap.
3. **IP geolocation** — instant, no prompt, city-level accuracy. Good enough to pick a region. Use MaxMind GeoLite2 or ipapi.
4. **Behavioral inference** — the actual "AI" part: past bookings, saved companies, search terms ("Panabo", "Toril"), delivery addresses. A simple weighted score over past location signals beats a model here for a long time.

Then **rank by service area, not by straight-line distance.** Each company sets a `service_radius_km` and a list of served cities. A Davao company with a 50 km radius should appear for a Tagum renter; a Cebu company should never appear at all. This is the single most important rule in the whole system — it's what makes a 1,900-company directory feel like a local one.

Store coordinates as PostGIS `geography(Point)` and query with `ST_DWithin`. Do not do distance math in application code.

**Always show the detected location and always let them change it** — the geo banner in all three templates does exactly this. Silent geo-filtering that guesses wrong is the #1 way to lose a user on their first visit.

---

## 3. Data model (core tables)

```
users            id, role(renter|company_admin|platform_admin), phone, email
companies        id, owner_user_id, legal_name, slug, category[], 
                 city, province, region, location(geography), service_radius_km,
                 verification_status, dti_sec_no, permits[], rating, response_time_mins
company_theme    company_id, primary_color, accent_color, logo_url, cover_url,
                 layout_preset, sections(jsonb), custom_domain
units            id, company_id, category, type, specs(jsonb), 
                 day_rate, hourly_rate, with_operator, delivery_fee, images[]
availability     unit_id, date_range(tstzrange), status   -- EXCLUDE constraint prevents double-booking
bookings         id, unit_id, renter_id, company_id, range, status, total, payment_ref
tow_requests     id, renter_id, pickup(geography), dropoff, vehicle_type, 
                 status, assigned_company_id, accepted_at
reviews          booking_id, rating, body, company_reply
payouts          company_id, period, gross, commission, net
```

`specs` as `jsonb` is deliberate — an excavator has `bucket_cbm` and `operating_weight_t`, a van has `seats` and `transmission`. One table, per-category schema validated in the app layer.

Use an **`EXCLUDE` constraint with `tstzrange`** on availability. It makes double-booking impossible at the database level, which application-level checks will eventually fail to do.

---

## 4. Company storefront customization

Give owners **constrained freedom** — not a page builder. A free-form builder means 1,900 broken pages and no consistent trust signals.

Let them control:
- Logo, cover image, gallery
- Brand color (primary + accent), picked from a **pre-validated palette set** so contrast stays WCAG-compliant
- Layout preset (Gallery-first / List-first / Compact)
- Section order and which optional sections show (About, Team, Certifications, Service areas, FAQ)
- Their own slug: `yoursite.ph/davao-heavy-lift`

Keep locked (platform-owned):
- Verified badge, rating, review count, response time
- Booking widget and payment flow
- Report/dispute link

That split is what makes the marketplace trustworthy: the branding is theirs, the trust signals are yours.

---

## 5. Recommended stack

- **Next.js (App Router) + TypeScript** — SSR matters here. Every company storefront and every city landing page needs to rank on Google ("backhoe rental davao"). A pure SPA gives that up.
- **PostgreSQL + PostGIS** — non-negotiable for radius queries.
- **Supabase** or plain Postgres + Prisma. Supabase gets you auth, storage and row-level security cheaply, which suits a solo owner.
- **Tailwind + shadcn/ui** — the tokens in these templates map to it directly.
- **Mapbox GL JS** or MapLibre + a free tile source. Google Maps is the safest for PH address search but the most expensive at scale.
- **Payments: PayMongo or Xendit** — both handle GCash, Maya, GrabPay, cards and bank transfer. Stripe does not support GCash. This is the single most important PH-specific choice.
- **SMS/OTP: Semaphore or Twilio.** Phone-number login beats email in PH — most users will not have an email they check.

---

## 6. Build order

**Phase 1 — Prove supply exists.** Company registration, manual verification by you, storefront pages, unit listings, city-based browse, and "Contact company" (no payments yet). A marketplace with no companies is worthless; get 30 real companies in one city first.

**Phase 2 — Close the loop.** Availability calendar, booking requests, in-app messaging, reviews, payment via PayMongo, commission split.

**Phase 3 — Location intelligence.** IP + geolocation cascade, service-radius matching, "near me" ranking, city landing pages for SEO.

**Phase 4 — Towing dispatch.** Real-time unit status, broadcast-to-nearest, live ETA. This one needs websockets and a driver-side app; don't start here.

Start in **one city**, all three categories. Davao is a good pick — enough construction and rental activity to be real, small enough to saturate.

---

## 7. Things that will bite you

- **Verification is the whole business.** One scam listing kills a marketplace. Verify DTI/SEC, LTO registration and insurance manually until you have volume to automate.
- **Companies will try to take bookings off-platform.** Expected. Fight it with value (calendar, payments, reviews, leads), not with policing.
- **Heavy equipment rarely has a fixed price.** Rates depend on distance, duration, fuel and operator. Show "from ₱X" and route to a quote — don't promise instant booking you can't honor.
- **Towing SLAs are legally sensitive.** If you show "ETA 12 min" you own that promise. Show a range and mark it as an estimate.
- **Offline reality.** Many operators run on mobile data. Every page must work on a slow 4G connection — that's why all three templates use SVG and CSS instead of heavy imagery in structural areas.

---

## Design system used (from ui-ux-pro-max)

Product profile is a blend of three database entries:
- **#31 Hyperlocal Services** → must-haves: `map-integration`, `booking-system`. Anti-pattern: no map, hidden reviews.
- **#48 Marketplace (P2P)** → must-haves: `seller-profiles`, `secure-payment`. Anti-pattern: low trust signals.
- **#51 Construction/Architecture** → industrial grey + safety orange, spec-driven presentation.

All three templates satisfy every must-have and avoid every listed anti-pattern.

| | Template A — Kalsada | Template B — Dispatch | **Template C — FR Services (chosen)** |
|---|---|---|---|
| Style | Minimalism, photo-first | Dark Mode (OLED) + Flat | **Vibrant & Block-based / Bento** |
| Primary | `#059669` | `#F97316` on `#0A0E13` | **`#4F46E5` + `#FACC15`** |
| Type | Plus Jakarta Sans | Inter + JetBrains Mono | **Space Grotesk + Inter** |
| Density | Spacious | Dense | **Medium, large touch targets** |
| Audience | Mass-market renters | Contractors, procurement | **Mobile-first PH growth** |

Templates A and B remain in the repo as reference only (`template-a-kalsada.html`, `template-b-dispatch.html`). `template-c-bayanihan.html` is the original single-page concept, superseded by the built app below.

---

## 9. What's built (FR Services)

| File | Page | Notes |
|---|---|---|
| `assets/FR Services.css` | Design system | All tokens, buttons, cards, nav, footer. Single source of truth. |
| `assets/data.js` | Demo data + helpers | 12 companies, unit inventories, reviews, `companyCard()` renderer. |
| `index.html` | Home / browse | Category switching, 4 sort modes, geo override, map, vendor CTA. |
| `company.html` | Company storefront | `?c=<id>`. 4 tabs, fleet with specs, coverage radius map, reviews. **Live theme customizer panel** shows exactly what an owner controls. |
| `booking.html` | Booking request | `?c=<id>&u=<unit>`. Live cost estimate (days × rate + mobilization + add-ons + VAT), then confirmation state. |
| `tow.html` | Emergency dispatch | Deliberately a different flow: one screen, broadcast-to-nearest, then matched-driver state. Dark UI to separate it from rental. |
| `register.html` | Vendor onboarding | 4-step wizard with live storefront preview that updates as you type and pick colors. |

**Theming contract** — in `company.html` only three CSS variables are owner-controlled: `--co-primary`, `--co-accent`, `--co-hero`. The verified badge, rating, review counts and report link deliberately do **not** consume them. That split is the whole trust model; keep it when you port to React.

**Still static.** Every page is demo data with no backend. The geo banner, availability counts, ETAs and map pins are hard-coded. Nothing persists between page loads.

**Next to wire, in order:** company registration + manual verification → storefront persistence → unit inventory + availability (`EXCLUDE` constraint) → booking requests → PayMongo → geo cascade → towing realtime.

---

## 10. Hero imagery

Three AI-generated originals in `assets/img/` (1280×2293 JPEG q82, ~918KB total). Generated, not stock — no licence to track, no attribution, and they're yours outright.

**Trademark note.** The first sedan generation came back as a recognisable Mercedes S-Class despite an explicit "unbranded" instruction, and was discarded — that grille is a registered design. The shipped version resembles a generic smooth-front EV sedan (a shape now shared across BYD, Hyundai Ioniq, Xpeng, Zeekr) with no badge or emblem anywhere. Image models are trained on real cars, so "wholly generic" is not reliably achievable; the practical bar is **no marks, and a silhouette that isn't one manufacturer's signature.**

**Known limitation.** All three were prompted with overcast/stormy skies for text contrast. That fights the brand — FR Services is high-energy yellow and indigo, and heavy grey cloud reads as bad weather to a PH audience, not as premium. It's currently corrected in CSS (`--grade` / `--grade-hi` on `.panel`) via sepia + hue-rotate + brightness, which warms grey cloud toward golden hour. **This is a patch, not a fix** — the clouds are still in the pixels.

### Card photography is a placeholder, by design

Company cards on the browse page show a **photo, not an icon**. Until a company uploads its own gallery, they reuse the three category heroes from `assets/img/`, with the focal point shifted deterministically per company id (`photoStyle()` in `data.js`) so twenty vehicle companies don't all show an identical crop.

To switch to real imagery, point `CAT_PHOTO` at `company_theme.gallery[0]` (ARCHITECTURE.md §3) and fall back to the category photo when a company has uploaded nothing. Nothing else changes — the card markup, scrim and category chip stay as they are.

**Be aware when demoing:** every vehicle company currently shows the same sedan. That reads as real fleet photography to anyone who doesn't know it's stock. Worth saying out loud in a pitch, or worth adding a small "sample photo" marker before showing it to prospective vendors.

**To reshoot properly** (needs credits; the account is on the free plan). Keep 9:16, 2K, and keep the empty sky in the top third — the headline sits there:

- **Vehicles** — "Modern unbranded sedan on a coastal highway, bright tropical late afternoon, clear blue sky with soft white clouds, warm golden sunlight, palm trees blurred in the background. No badges, emblems, logos or text. Vibrant, optimistic, clean. Large area of open sky at the top of frame."
- **Equipment** — "Yellow excavator and tower crane on an active construction site, bright sunny day, clear blue sky, warm golden-hour sunlight raking across the machinery, dust motes in the light. No logos or signage. Energetic and productive, not derelict. Large area of open sky at the top of frame."
- **Towing** — keep the existing moodier treatment. A dark wet highway genuinely suits emergency recovery, which is when the category gets used.

Consider swapping the sedan for a **van, SUV or pickup** — closer to real PH rental demand (Hiace, Fortuner, pickups) *and* those silhouettes are far more generic, which retires the trademark question entirely.

---

## 11. Location data

`assets/ph-locations.js` — **1,634 cities and municipalities** (146 cities, 1,488 municipalities), 84 provinces, 17 regions. 34KB. Source: **PSGC** (Philippine Standard Geographic Code, PSA) via `psgc.gitlab.io`, fetched and transformed by a build script; not hand-typed.

Stored index-referenced (`PH_PLACES: [name, provinceIdx, isCity]`) so province and region strings aren't repeated 1,600 times.

**Barangays are excluded** — 42,000+ of them, and they belong in the job-site address field on `booking.html`, not in a marketplace location search.

Three transforms applied to the raw register:
- **`City of Davao` → `Davao City`.** PSGC's register form for 136 of 146 cities; nobody types it. Names that merely *contain* "City of" — *Island Garden City of Samal*, *Science City of Muñoz* — are genuine and untouched.
- **Particle case.** `Davao Del Sur` → `Davao del Sur`, across 11 provinces and their cities.
- **`PH_ALIASES`.** 24 destinations, districts and nicknames that aren't LGUs: Boracay→Malay, Siargao→General Luna, BGC→Taguig, CDO, gensan, QC, Alabang, Clark. Without these the most common vacation searches return nothing. The build script fails loudly if an alias points at a place that doesn't exist.

**Three naming systems have to agree**: PSGC says "City of Davao", the picker shows "Davao City", company records say "Davao". `normCity()` in `data.js` folds all three and expands `Sto.`/`Sta.` → `Santo`/`Santa`.

### Service areas must carry a province

`serves` entries are `"City, Province"`, not bare city names. **Philippine city names are not unique** — there are several Carmens, Santa Cruzes and San Isidros. With bare names, a renter in Carmen, *Bohol* was shown six Davao providers 700 km away. `citySearchable(c, city, province)` only matches when the province agrees; `FILTERS.province` carries the picked place's province through the UI.

Production should key service areas on **PSGC codes** outright rather than name strings — the codes are already in the source data.

### Demo coverage is nationwide

41 companies: the original 12 Davao ones in long form (company.html and booking.html read their richer fields) plus 29 seeded from compact tuples in `data.js`. They span Metro Manila, Clark/Subic, Baguio, La Union, Vigan, Tagaytay, Batangas, Legazpi, Palawan (Puerto Princesa/El Nido/Coron), Cebu, Boracay, Bohol/Panglao, Iloilo, Bacolod, Dumaguete, Siargao, CDO, GenSan, Zamboanga and Butuan — **96 served places** in total.

`km` on a seeded company is distance from the centre of *its own* service area, not from the viewer: a Manila company is not 900 km from a Manila renter. Real cross-city distances need coordinates, which PSGC doesn't carry — see §2.

`FR Services_POPULAR` puts twelve destinations at the top of the picker before anything is typed, because "Boracay" and "Siargao" are the searches that actually happen. The row leads with the name people use and shows the LGU underneath — *Boracay* over *Malay, Aklan*.

### The map on the home page is live

`index.html` renders a real slippy map — **Leaflet 1.9.4 + OpenStreetMap tiles**, both from CDN. Markers are `L.divIcon`s containing a plain `<a class="gpin">`, so every price bubble is a genuine link: keyboard-reachable, middle-clickable, and it survives a change of map provider untouched.

`syncMap()` is called from `render()`, so the pins read the **same `FILTERS` object** as the results grid and the two can never disagree. Pins are capped at 24 so a nationwide search doesn't drop forty overlapping bubbles on one screen.

**Scroll-wheel zoom is on**, at Leaflet's stock sensitivity — one level per notch, the same feel as Google Maps.

Do not "smooth" it by raising `wheelPxPerZoomLevel` and lowering `zoomSnap`. That was tried and measured: Leaflet snaps with `Math.ceil`, so `zoomSnap: 0.5` rounds *up* to the next half-level and a single gesture jumped **2.5 levels** instead of one. The defaults are better.

The known cost of wheel zoom is the page-scroll trap: scrolling down the page with the cursor over the map zooms instead of scrolling past. If that becomes a complaint, the standard fix is `scrollWheelZoom: false` at construction plus `map.scrollWheelZoom.enable()` on the map's first click and `.disable()` on `mouseout` — click-to-activate.

**Why not Google Maps.** The Maps JavaScript API needs an API key and an active billing account; without one it renders a grey panel and a console error, so it could not be verified working here. The keyless `maps.google.com/…&output=embed` iframe does render, but it accepts no custom markers — which kills the clickable price pins entirely.

**To switch to Google** once a key exists, `syncMap()` keeps its shape:
1. Swap the two CDN tags for `https://maps.googleapis.com/maps/api/js?key=…&libraries=marker`.
2. `L.map(host, …)` → `new google.maps.Map(host, { center, zoom, mapId })`.
3. `L.marker(…, { icon: L.divIcon({ html }) })` → `new google.maps.marker.AdvancedMarkerElement({ position, content })`. `AdvancedMarkerElement` takes an arbitrary DOM node, so the existing `.gpin` element and its CSS carry over verbatim.
4. `MAP.fitBounds(pts)` → `new google.maps.LatLngBounds()` + `map.fitBounds(bounds)`.

Budget for it: Google bills per map load beyond the free tier, OSM does not.

### Coordinates are hand-set, and shouldn't stay that way

PSGC carries no lat/lon, so `DISTRICT_XY` / `CITY_XY` in `data.js` pin ~40 places by hand, plus a deterministic ±2 km jitter per company id so same-city providers don't stack on one point.

Production should **geocode each company's registered address once at signup** and store a PostGIS point (§2), not resolve names at runtime. That also retires the jitter, fixes the `km` figures that are currently service-area-relative (§10), and makes real radius queries possible.

Dense cities still overlap at low zoom. The real fix is marker clustering (`Leaflet.markercluster`, or Google's `MarkerClusterer`) — deliberately skipped here to keep the prototype dependency-light.

---

## 13. Company admin, theming and trust &amp; safety

`admin.html` is the owner's editing surface; `assets/theme.js` is the engine both it and `company.html` share.

### What the owner controls, and what they never will

Editable: logo, cover image, cover style, **brand / accent / page backdrop as free colour pickers** (not a fixed palette), and fleet layout. The backdrop themes the entire storefront — body, cards, tiles, unit panels, tabs, rules.

Locked, in every theme: the **verified badge**, star rating, review count, the **report** control, and the FR Services nav and footer. A seller must not be able to restyle the one cluster a buyer uses to judge them, and the platform chrome has to stay recognisable so a renter always knows whose site they are on. Enforced by a block of exempt selectors at the end of `company.html`'s stylesheet.

> Ordering matters: the theme rules restate selectors that already exist above them (`.unit`, `.statstrip .tile`) at equal specificity, so they are deliberately **last** in the file. Placed earlier, every card stayed on the platform's light surface while the backdrop went dark.

### Ten profile layouts

A company picks a **structural skin** independently of its colours. Nine of the ten deliberately do *not* look like the FR Services marketplace; the tenth is the house style and the default, so a company that changes nothing keeps the current design.

| Layout | Direction (ui-ux-pro-max style DB) | Character |
|---|---|---|
| **FR Block** *(default)* | Vibrant & Block-based / Neubrutalism | Thick outlines, offset shadows |
| Swiss | Minimalism & Swiss Style | Hairline rules, no shadow, square, generous air |
| Soft | Soft UI Evolution | 26px radii, layered soft shadow, no borders |
| Glass | Glassmorphism | Frosted translucent panels over a tall cover |
| Industrial | Data-Dense Dashboard | Square, 1px gaps, monospaced spec labels |
| Editorial | Storytelling-Driven | 340px cover, rule-topped cards, magazine spacing |
| Bento | Bento Box Grid | Modular tiles, lead unit spans two columns |
| Paper | E-Ink / Paper | Flat, ruled, single-column rows, no shadow |
| Showcase | Hero-Centric Design | 420px cover, centred identity, circular logo |
| Console | HUD / Sci-Fi FUI | Thin brand-tinted lines, glow on hover, mono |

**Every layout keeps a product photo slot.** `--lay-utop` is never zero and no layout sets `.utop{display:none}` — a test asserts both, so a future layout cannot quietly drop the slot. The slot adapts to the structure rather than being bolted on: 210px in Showcase, 190px in Editorial, 74px in Industrial, and in Paper it becomes a 132px catalogue thumbnail on the left of a single-column row.

**Large fleets.** The demo company carries 14 units precisely so the >10 case is exercised rather than assumed. Past 12 the admin grid becomes its own scroll region so it can't push the rest of the page below the fold, and it carries a progress bar (*"3 of 14 have your own photo"*) plus a **show only units still missing a photo** filter — with a hundred units, finding the gaps is the actual job. The `MAX_UNIT_IMAGES` cap of 40 still applies.

### A company can run more than one service line

Plenty of Philippine operators rent vehicles, hire out equipment **and** run a tow truck. `cat` stays the primary line (it drives the card photo and default icon); `cats` is the full set, and `catsOf()` reads either shape so single-line companies need no change.

- **Search** — a multi-service company appears under every line it runs.
- **One coherence rule.** Filtering `towing` + `Excavator` must return nothing. A company that offers both does not offer an excavator *as* a tow service, so when a category and a type are both set, the type has to belong to that category.
- **Cards** show a "Multi-service" chip plus one coloured pip per line.
- **Storefront** groups the fleet under a heading per line — a renter after a tow truck shouldn't scan past sedans. Single-line companies keep the plain grid.
- **Admin** — each listing records its own `cat`. A service-line selector appears only when there's a choice, and the type dropdown is grouped by line so a tow type can't be picked by accident while adding a sedan.

### Add-on services

`FR_SERVICES` holds what a company sells alongside the unit. Vehicle rental in particular lives on these — **pickup and drop-off are the difference between a booking and a lost enquiry**. Davao Fleet's vehicle line carries airport pickup and drop-off, hotel/home delivery, door-to-door return pickup, professional driver, child seat, empty-tank return and a damage-waiver upgrade; the towing sample carries impound storage, priority dispatch and a night surcharge. Each is tagged with its service line so it renders in that line's colour, and a zero price shows as **Quoted** rather than free.

### Sample profiles

**`fleetservice-davao` — "FleetService Davao" is the full-coverage test fixture.** It runs all three service lines and deliberately exercises *every* type and add-on the platform models, so a regression in grouping, icons, filtering, pricing or the booking hand-off surfaces there first:

- **19 units** — 6 vehicles (all six types incl. motorcycle), 8 equipment (all eight types), 5 towing (all five types)
- **24 add-on services** — 13 vehicle, 6 equipment, 5 towing
- Vehicle add-ons cover every pickup/drop-off variant: airport pickup, airport drop-off, hotel or residence delivery, office or job-site delivery, door-to-door return pickup, out-of-town delivery (quoted), plus driver, additional driver, child seat, GPS/dashcam, empty-tank return, damage-waiver upgrade and included roadside assistance
- Serves 9 cities, so it appears in most location searches

A dedicated check (`fixture.js`) asserts it covers **all** types in each line, that every service names its line, that zero-price services are marked *quoted* or *included* rather than looking free, and that it's findable under each of its three categories.

The other three, one per shape:
- **Mindanao Auto Rentals** — vehicles, 8 units, 8 add-on services
- **Rapid Response Towing** — towing, 7 units including winch-out, jumpstart, lockout and fuel delivery

**Motorcycle is a vehicle type, not a towing one.** It sat under `towing` only because it described what was being *recovered*, which conflated a rentable class with a recovery capability. It now lives under `vehicles`, Mindanao Auto rents three (Click 160, ADV 160, XR150 trail), and `towing + Motorcycle` correctly returns nothing. The towing companies still recover light vehicles — that capability is described in their copy rather than typed as a rental class.
- **Davao Fleet Solutions** — multi-service, 9 units across all three lines

### Listings, not just photos

`+` in the admin opens a full **add-a-listing** box, not a file picker. One dialog captures everything a rental needs to quote a job:

- Photo, listing name, **type**, make & model, year, **maximum capacity**
- Rate, charged per day / hour / call-out, units available
- **Long-hire discounts** at 3+, 7+ and 30+ days, each a percentage the owner sets
- Operator (none / on request / included), fuel policy, minimum hire, renter notes
- **Delivery & mobilisation** — flat fee, per-kilometre, or quoted per site

**It adapts to the company's category.** A van-hire firm sees *Seats / payload* and Sedan/SUV/Van/Pickup/Truck; an equipment yard sees *Maximum capacity* and Excavator/Crane/Backhoe; a towing operator sees *Max vehicle weight* and Flatbed/Wheel-Lift/Winch-out. Nothing is heavy-equipment-specific any more.

A live line under the discounts shows **what a renter actually pays** — `1d → ₱2,800/day · 3d → ₱2,660 (−5%) · 7d → ₱2,380 (−15%) · 30d → ₱1,960 (−30%)`. A mistyped percentage is far easier to catch as a peso figure.

### Three ways to charge for getting there

A flat delivery fee only works when jobs are local. A yard in Davao quoting the same ₱2,500 to Toril and to Mati is either losing money or losing the booking, so `deliveryMode` offers three shapes:

| Mode | Owner enters | Renter sees |
|---|---|---|
| `flat` | one fee | `₱2,500`, or `Free` when zero |
| `perkm` | optional base fee, free radius, rate per km | `Free within 10 km, then ₱180 / km` |
| `quoted` | nothing | `Quoted per site` |

`deliveryCost(u, km)` is the single implementation: it subtracts the free radius, never letting the billable distance go negative, multiplies by the rate and adds the base. Quoted returns **`null`, not `0`** — the distinction matters, because a page that prints "Free" for a job the owner meant to price by hand is a mispriced booking, and `null` forces every caller to handle "no figure yet" deliberately.

The same function drives all three surfaces. The admin shows a live line — *Renter sees: Free within 10 km, then ₱180 / km · a 25 km job costs ₱2,700* — because a per-km rate is much harder to sanity-check than a flat fee until you see one real job costed. `company.html` prints the terms in the spec table. `booking.html` reveals a **distance-to-site** field only in `perkm` mode and folds the result into the estimate.

`normaliseUnit()` clamps the rate to 0–100,000/km and the free radius to 0–500 km, and falls back to `flat` for an unknown mode or for `perkm` with no rate set — a mode that would otherwise quote every job at zero. Seeded demo units without a `deliveryMode` keep reading as flat, so the field is additive.

**Storage.** `fr.fleet.<companyId>` holds the owner's units, separate from the theme because appearance and inventory are different concerns. It seeds from the demo listings on first open so an owner starts from what's already on their page. Both `company.html` and `booking.html` prefer it over `FR_UNITS`, so a unit created in the admin is browsable *and* bookable.

**Everything is coerced into range on write** — `normaliseUnit()` rejects a nameless listing, clamps rates to 0–10,000,000, discounts to 0–90%, years to 1950–2035, quantities to 0–999, and forces operator/fuel/rate-unit onto known enums. A negative rate or a 900% discount is not storable; the fleet is capped at 60 units. Both pages read the same `unitRate()`, so the price a renter is quoted always matches the tiers the owner configured.

**The admin does not preview the stock fallback.** An empty unit shows a dashed **+ Add photo** target, not the category placeholder. Repeating one stock crane down a 14-unit fleet reads as clutter and, worse, implies those already are the owner's photos. The whole empty tile is the file input's label, so adding a photo is one click; a filled tile shows the image with a corner remove button and a *Replace photo* link. The stock fallback still appears on the public storefront — that's where it's doing a job.

Owners upload one photo per unit from **Fleet photos** in the admin, stored as `theme.unitImages[unitId]`. Until then the slot shows the category placeholder, offset per unit so a fleet of six doesn't display six identical crops — and the admin badges each slot **Stock** or **Your photo** so it is never ambiguous which a renter is seeing. Keys are constrained to the id charset, values must be an allow-listed raster data URL, and the map is capped at 40 entries so one company cannot push megabytes of base64 into a single record.

**They change shape, never colour.** Each layout sets only the `--lay-*` contract — radius, border, shadow, cover height, grid gap, column width, padding, label font — which the shared component rules consume. Colour comes entirely from the owner's theme, so all ten work with any palette. A test asserts no layout block contains a hardcoded hex.

Adding an eleventh means adding one variable block plus a thumbnail rule, not touching the page. `LAYOUTS` lives in `theme.js` so the admin picker and the storefront can't drift apart on what a valid layout is, and `normaliseTheme()` rejects anything outside that list.

The admin renders each option as a **miniature built from the owner's own colours** — cover bar, logo chip, stat rule, unit grid — so the choice is judged on shape rather than a written label.

### The preview is the real page

`admin.html` does not draw a mock-up of the storefront. It embeds **`company.html` itself** in an iframe at `?preview=1`, rendered at a true viewport width (1280 desktop / 390 mobile) and CSS-scaled to fit the column — so layout, type sizes and breakpoints are the ones a visitor actually gets, not an approximation that drifts as the page changes.

Edits travel by `postMessage`. Two guards: the listener is only attached when the URL explicitly says `preview=1`, and the payload still passes through `normaliseTheme()`, so a message from any origin can only ever produce a valid theme — never CSS or markup. The iframe posts `fr-preview-ready` back so the first push isn't lost to a race with load.

In preview the owner-only chrome (the "Edit my page" button, the "Owner-editable cover" tag) is hidden via an `.is-preview` class. A preview that shows controls only the owner can see is lying about what renters get.

### Any colour, still readable

"All colours available" and "accessible" only coexist if foregrounds are *derived* rather than chosen. `bestOn()` measures WCAG luminance and returns black or white per surface, so text contrast holds whatever the owner picks — verified across yellow, magenta, cyan, mid-grey and near-black backdrops, worst case 4.63:1.

`themeWarnings()` then audits the result and reports it in the admin UI. Two calibration notes:
- Brand is checked at **3:1** against the backdrop because it also paints bare elements like the active-tab underline, which have no border of their own (WCAG 1.4.11).
- Accent is **not** checked at 3:1. It only ever appears as a filled control, and every control here carries a 2.5px near-black border, which satisfies 1.4.11 through the boundary. Holding it to 3:1 flagged gold-on-cream — 1.78:1 and perfectly legible. It is instead checked at 1.5:1, purely to catch a fill that vanishes into the page.

The audit advises; it never blocks publishing. Owners get told, not overruled.

### Security

Every theme value is attacker-controlled input. Three defences, all tested:

1. **Colours are pattern-validated before touching the DOM.** `safeColor()` accepts `#rgb` / `#rrggbb` and nothing else — `red;}body{display:none}`, `url(javascript:…)` and `expression(…)` all fall back to the default. Values are written with `style.setProperty()`; no code path builds a CSS string, so there is nothing to break out of.
2. **SVG uploads are refused.** An `.svg` is an XML document that can carry `<script>`; accepting one as a "logo" and rendering it from your own origin is stored XSS. Only PNG / JPEG / WebP, 2 MB cap. `normaliseTheme()` re-checks the data URL prefix on read, so a hand-edited record cannot smuggle one back in — verified: an SVG-with-script payload written straight into storage is dropped, and the page renders zero inline scripts.
3. **Image `src` is assigned as a property, never interpolated into markup.**

**This file is not a security boundary.** It runs on the client and can be bypassed entirely. The server must repeat every check on write, and additionally:

| Concern | Requirement |
|---|---|
| Theme writes | Authenticated as that company's owner; re-validate colours and reject anything non-conforming rather than coercing silently |
| Uploads | Re-sniff the MIME by magic bytes (not the declared type), strip EXIF, re-encode to a known-safe raster, serve from a separate origin or a CDN with `Content-Disposition` and a restrictive CSP |
| Verified badge | Derived from the verification record server-side. Never a field a company can set |
| Reports | Rate-limit per account **and** per IP; store the reporter's identity but never expose it to the reported company; queue for human moderation; log an immutable audit trail |
| Retaliation | A company must not be able to see who reported it, and reporting must not be visible in their admin at all |
| Storage | `localStorage` here stands in for a `company_theme` table. It is per-browser and visitor-editable — fine for a prototype, unacceptable in production |

### The admin is a console, not just a theme editor

The storefront editor became one tab of five. The other four are the part an owner actually opens every morning: **Overview**, **Bookings**, **Expenses**, **Reports**. Everything operational lives in `assets/ops.js`; the storefront editor is untouched under **Storefront**.

**Overview** — eight KPIs (revenue, expenses, net, bookings, utilisation, average hire, outstanding, repeat rate), each compared against the immediately preceding window of the same length, because "revenue: ₱7.2M" means nothing without a direction. Then a revenue-against-costs chart, a cost split by category, per-unit performance, and document expiry. Above all of it sits an **attention list**: unanswered requests, overdue returns, uncollected balances, lapsed paperwork, listings with no photo, units idle 60 days.

**Bookings** — the register, filterable by status, payment, service line and free text. Accept / Decline / Hand over / Mark returned are the only controls in the whole console that change what a renter sees; they persist to `fr.bookings.<id>` as a ref → status map, so the generated baseline stays authoritative for every amount.

**Expenses** — a real ledger. Owner entries persist to `fr.expenses.<id>` and survive reload; the seeded rows can be deleted individually. `normaliseExpense()` applies the same discipline as `normaliseUnit()`: amount must be positive and is capped, category and payment method are forced onto known enums, a bad date falls back to today.

### Numbers that are generated but not arbitrary

Every figure derives from a hash of the company id, never `Math.random()`. Two reasons, and the second is the important one: a dashboard that reshuffles on reload is untrustworthy, and **a printed report must match the screen it was printed from**.

Beyond stability, the model has to be *defensible*. Four things were wrong on the first pass and each one was visible rather than theoretical:

- **Volume was a booking count.** A 71-unit yard came out at 3.6% utilisation — arithmetically fine, obviously fictional. Volume is now derived from a target utilisation of 36–62%; the generator emits bookings until the fleet is that busy.
- **Nothing stopped overbooking.** Bookings overlapped freely on the same unit, so per-unit utilisation ran past 100% and the clamp hid it. There is now a per-unit day counter: a candidate that would exceed the physical count on any of its days is dropped and another drawn.
- **Costs were peso constants.** ₱140k of payroll is a whole business for a three-truck outfit and a rounding error for a forty-unit lessor. Costs are now shares of the revenue they support (`COST_MIX`, summing to ~0.71), which lands net margin in the high twenties across every company.
- **`m % every === 0` is true at `m = 0` for every cycle length**, so the current month always absorbed both the quarterly premium and the annual renewal — and the dashboard's default view always showed the worst margin of the year. Each lumpy charge now carries a per-company phase. The current month's pot is also scaled by the fraction of it that has elapsed; charging a full month of fuel against 28 days of revenue made every mid-month window look loss-making.

Revenue is recognised on the booking's **start** date. That is a choice, not a law — but it has to be *one* choice applied everywhere, or the monthly chart and the P&L will disagree.

Two smaller decisions worth recording. The trend chart buckets by day under 16 days, by week under 120, by month beyond — monthly buckets inside a 30-day window produce two bars, one covering two days. And the bookings list has an **Upcoming** window that the other screens don't: pending and confirmed bookings by definition start after today, so every backward-looking window showed none of them, and the alert that said "9 requests waiting" linked to an empty list.

### The charts, and why these colours

**Revenue against costs** is a grouped column chart with a real value axis: nice-number ticks (1 / 2 / 2.5 / 5 × a power of ten), solid hairline gridlines one shade off the surface, and abbreviated tick labels (`₱1.5M`, `₱500k`). Exact figures come from the hover tooltip and a **Show the values as a table** toggle, never from a number printed on every bar. One tooltip element is moved and refilled rather than one per mark.

**Where the money goes** is a pie. Each slice carries its value and share *inside* where the slice is wide enough to hold them — the test is geometric, not a guess: the chord at the label radius has to exceed the widest label line plus padding, and the slice must span at least 26°. Slices that fail it get a leader line to a callout outside the circle, so nothing is ever clipped or crammed. Slice text is white or near-black by `bestOn()`, so it stays legible on any of the six fills. Slices are separated by a 2px stroke in the surface colour — a gap, not a border on the mark.

A pie stops being readable past about six slices, and the expense model has eight categories. The tail folds into a single grey **Other** — grey because a remainder is not an identity. The key beside the pie still itemises every category with its peso value and share, and doubles as the table view.

**The palette was computed, not chosen.** Candidate orderings of the FR hue families were enumerated and run through the OKLab validator; this order was the best of the 384 that cleared every gate:

| Slot | Hue | Hex |
|---|---|---|
| 1 | green (brand) | `#057A2F` |
| 2 | blue | `#1D4ED8` |
| 3 | gold | `#B8860B` |
| 4 | teal | `#0891B2` |
| 5 | rust | `#C2410C` |
| 6 | violet | `#7C3AED` |

Worst adjacent pair: **CVD ΔE 19.0** under protanopia/deuteranopia (target ≥ 8), **normal-vision ΔE 23.3** (floor ≥ 15), every slot inside the OKLCH lightness band, above the chroma floor, and ≥ 3:1 on the white card.

The palette this replaced failed on all four counts and had shipped: violet `#7C3AED` against blue `#1D4ED8` measured **ΔE 3.4** under protanopia and **13.0 even with full colour vision** — two adjacent slices that a large minority of readers could not tell apart. Teal `#0E7490` also sat below the chroma floor, reading as grey.

Two deliberate exceptions. The accent gold used on buttons (`#F2B705`) is **not** a chart colour — it measures 1.82:1 on white and sits outside the lightness band; chart marks take the stepped-down gold above. And the grey `Other` fails the chroma floor on purpose, which is the point of it.

Chart colours are fixed and never follow the owner's theme. Owner theming stops at the storefront: an expense chart that recoloured with the brand palette would be decorating the data rather than encoding it.

### Every company gets a working console

Only five of the forty-two demo companies have hand-written unit lists. An admin that is blank for the other thirty-seven is not an admin, so `opsFleet()` falls back through three sources: the owner's saved fleet, the curated demo listings, then a fleet **synthesised from the company's own marketplace record** — its categories, unit count and headline rate, with per-type price multipliers. The marketplace card already claims those things; synthesising from them keeps the console consistent with what a renter is being shown instead of contradicting it with zeroes.

A related bug fell out of this: single-line companies omit `cat` on every unit and lean on the company record. Without a fallback, `normaliseUnit()` defaults them to `vehicles`, and an equipment yard reports fourteen excavators as cars.

### Print and Download PDF

Both render from one `buildReport()` model — a plain object of KPIs, tables and notes. Six reports: business summary, booking register, expense ledger, fleet utilisation, profit & loss, VAT summary. Adding a seventh means adding a case to the builder, not touching a renderer.

**Print** goes through the browser, so paper size and margins stay the operator's. `@media print` removes the nav, admin bar, tab strip, all five panes and the footer, and reveals `#printRoot` — which is populated at click time from the same model, so the printed copy's text matches the on-screen sheet exactly (asserted).

**Download PDF** writes a real `.pdf`. A CDN library was not an option — this prototype runs from `file://` — so `assets/pdf.js` is PDF 1.4 written by hand against the base-14 fonts every reader has built in. It carries the standard Helvetica advance-width tables, which is what makes right-aligned money columns and mid-cell truncation possible. Wide reports (six or more columns) switch to landscape; a seven-column booking register squeezed into A4 portrait is unreadable, and unreadable is the same as broken.

One real limitation, stated in the UI rather than hidden: **base-14 Helvetica is WinAnsiEncoding and has no peso sign.** Embedding a font that has one would add ~300 KB. Every string is transliterated to ASCII on the way in and ₱ becomes `PHP`. A report saying "PHP 43,344" is unambiguous; a mojibake glyph where the currency should be is not. The transliteration also guarantees one character equals one byte, which is what makes the xref byte offsets correct.

Verified three ways: structural (every indirect reference resolves, every `/Length` matches its stream, `/Count` matches `/Kids`, BT/ET balanced), semantic (the drawn text is read back out of the content streams and checked for expected values, in-page geometry, repeated table headers on continuation pages, and no cell overrunning the one beside it), and by round-tripping a generated file through Chrome's own PDFium, which parsed and re-printed it.

---

### Company documents, and the publish switch

An owner adds permits, registrations, insurance and accreditations under **Documents** in the admin: type, issuer, document number, issue and expiry dates, an attached PDF or scan, and a note. Each row carries a switch that puts it on the public page or takes it off. Everything persists to `fr.docs.<companyId>`.

On the storefront a **Documents** tab answers the question a renter is actually asking — *is this company real?* — with a summary line (`9 published · 9 checked by us · 8 still valid`), a card per published document, and a plain-English key to what the badges mean. The About sidebar's credential list reads from the same store; it used to be a hardcoded five-item list, which is a lie with a tick beside it the moment a permit lapses.

**Three things the publish switch deliberately does not control.** The switch decides *whether* a document is shown, never *how it reads*:

- **Who says it's genuine.** `review` is platform-owned. `normaliseDoc(raw)` discards any review state coming from the form; only `normaliseDoc(raw, trusted)` honours it, and the seed is the only caller that passes `trusted`. Owner-added documents start at `pending` and are labelled **Company-submitted** wherever they appear. A test asserts this, and it caught the hole: the first implementation accepted `review` straight off the object while the comment above it claimed otherwise.
- **Whether it has expired.** Expiry is derived from the date every time it is rendered, never stored as a status. An owner cannot publish a lapsed permit as current — it renders "Expired 4 days ago" on their own public page.
- **Editing away a tick.** Carrying a review across an edit is right for a publish toggle and wrong for a date change, so `upsertDoc` compares the *material* fields (type, name, issuer, number, issue date, expiry, file bytes). Change any of them and the document drops back to `pending`. Otherwise an owner could get a permit checked, then quietly move its expiry a year out and keep the tick.

**What publishing exposes is narrower than what is stored.** `publishedDocs()` is the only function the public page calls, and it re-shapes each row rather than passing it through: the number arrives masked to its last four alphanumerics unless the owner ticked *show the full number*, and the file is `null` unless they separately ticked *let renters open the file*. The page is told `hasFile: true` so it can say a scan exists without shipping it. A permit number sitting in plain text on a public page is enough for someone to pose as the company, and a scan can carry a signature, a home address or an ID number — so both are opt-in, each with the reason written next to the checkbox.

The admin shows the consequence before it is saved: a live line reading *"Renters see: the document name, issuer and validity dates, the number as ••••4471. It will read as Current. Marked Awaiting review until our team confirms it."*

**Uploads.** PDF, PNG, JPG and WebP; SVG refused for the same stored-XSS reason as logos. Capped at 1.5 MB and 30 documents, because base64 in `localStorage` is a ~5 MB budget for the whole origin — a couple of phone photos would fill it, so the save path reports the quota failure instead of silently dropping the file. A stored file is re-validated on read: anything whose MIME type is not on the list, or whose payload is not a `data:` URL, is dropped rather than rendered.

Document text is owner-supplied and lands in `innerHTML`, so `company.html` escapes it on the way out — verified by feeding `<img src=x onerror=…>` through a document name and asserting no element is created.

### The platform console

`platform.html` is FR Services' own console, over all 42 registered companies. Five tabs — **Overview**, **Document review**, **Companies**, **Reports**, **Monitoring** — backed by `assets/platform.js`. A dark bar and a distinct accent separate it visually from the company admin: the screen that can approve a document should not look like the screen a seller uses.

### What FR Services verifies, and what it does not

Verification is limited to **three documents**: **DTI registration**, the **mayor's permit**, and **BIR 2303**. Those establish that a business exists and is registered to trade — which is the question a renter is actually asking when they look at the badge.

Everything else — insurance policies, vehicle OR/CRs, PCAB, TESDA, DOLE — is the owner's own call on what to publish. It is still shown to renters, but as the company's own claim rather than something the platform stands behind. Reviewing a fleet's worth of OR/CRs would be a promise the platform cannot keep, and a badge that quietly covers "we glanced at 47 registration papers" is worth less than one that covers three things properly.

The distinction is enforced in the data layer rather than the UI. `DOC_TYPES` carries a `reviewable` flag; `reviewFor()` holds the invariant that a document's review state is `exempt` **if and only if** its type is one we do not check. `normaliseDoc` applies it on every read and write, so the queue, the counts and the badge can never disagree about what is reviewable. `setDocReview()` refuses a verdict on an exempt document outright — the UI never offers it, but the model does not rely on the UI to be right.

Renters see `exempt` and `pending` with the same wording, **Company-submitted**, because from their side both mean the same thing: we have not vouched for this. The difference is internal — one is in our queue, the other never will be.

**The badge now means something precise:** all three registration documents on file, all three approved, none expired. An expired *insurance* policy no longer costs a badge, because the platform never checked it — it was never ours to withdraw. That change is asserted by a test which finds a company holding its badge with an expired extra document on file.

### Registration cannot complete without the three files

The three verified documents are **required to register**, and required means a **file**, not a typed number. A permit number in a text box gives a reviewer nothing to check with the issuing office, which is the entire point of asking for it.

Step 2 of the wizard is a gate rather than a page. It renders the required rows from `DOC_TYPES` (so "what we verify" has one definition, not two), counts them `n / 3`, and refuses to advance until all three carry a file. Three ways past it are all closed: **Continue** blocks and names what is missing; the **step strip** is a shortcut, not a bypass; and an **optional upload does not satisfy the gate**. Removing a file after passing re-locks it. All six behaviours are asserted in a browser.

Everything else moved under **"If you have them"** and is labelled *Optional*, which is the honest description — insurance and OR/CRs are useful to a renter but the platform never checks them, so demanding them at registration would be theatre. The previous step marked LTO, insurance and a government ID as "Required" and enforced none of it.

`registrationStatus(companyId)` applies the same rule after the fact, since a registration can lapse — an owner deleting a permit file leaves the company registered but incomplete. The company admin shows that as a loud banner above the documents table, and the add-document modal refuses to save one of the three without a file attached.

**Complete is not the same as verified.** Completeness means a reviewer has something to work with; verification means they have finished. Registration should not sit in a queue waiting on us, so the two are separate fields.

Seeded companies now carry a stand-in file on each of the three — a one-byte PDF header, because the fixture needs the file to *exist*, not to be readable, and real scans across 42 companies would exhaust the storage budget. Without it every seeded company would model a state the product does not allow.

The seller-facing **"What it costs you"** panel on the registration page now reads from `PLATFORM_RATES` as well. It was hardcoded at 8% / 12% and happened to be correct; the next rate change would have made it a lie.

**Document review is the point of it.** This is the *only* place a `review` verdict is written — which is what makes `normaliseDoc`'s `trusted` gate in ops.js meaningful rather than decorative. Each row says plainly when a document has no file attached, because approving a typed claim is not verification.

**The queue groups by company, not by document.** One box per company, collapsed, showing a tally (`3 awaiting · 1 expired`); clicking it opens every document that company has waiting. The first cut listed each document as its own card — 48 cards for 31 companies, so Palawan Island Rentals appeared twice and Davao Fleet Solutions three times. An operator works a company at a time (same issuer, same envelope, often the same phone call), so the repetition bought nothing but scrolling.

Three details that make the grouping usable rather than just tidier:
- Companies with outstanding work sort first, then by how much.
- **Expansion state lives outside the render.** A verdict repaints the list, and without that the group would slam shut under the operator's cursor mid-review.
- A filter matching exactly one company auto-expands it, because that is almost always a deliberate jump from the Companies or Monitoring tab rather than browsing.

There is no "approve all". Bulk-approving is precisely the action a verdict is supposed to rule out.

### Verdicts carry remarks

Approve / Reject / Return open a dialog rather than firing on the click. Each one names the document and company, states plainly what the verdict will do to the public page, and takes a remark. A set of one-tap suggested reasons sits under the box — the common cases are the same half-dozen sentences every time, and typing them out is how reviewers end up writing nothing.

**A remark is required to reject, optional otherwise.** Telling a company "no" without saying why leaves them nothing to act on; an approval or a return can stand on its own. `setDocReview()` enforces it server-side-equivalent rather than only in the form, and now returns `{ok, error}` instead of a bare save result.

Every verdict appends to a **`reviewLog`** on the document — verdict, date, remark — capped at 12 entries. The dialog shows the trail when reopening a document, so a reviewer can see what was decided before and why. A company editing a reviewed detail appends an automatic entry saying so, which is more useful than the document silently reappearing in the queue.

**The remark is internal.** `reviewNote` and `reviewLog` are platform-owned (same `trusted` gate as `review` — a company that could write its own rejection reason could write *"approved, all good"* into it), and `publishedDocs()` deliberately omits both. A reviewer's note can name a suspicion, an unfinished check or a person; none of that belongs on a public page where it would read as a published accusation. A test asserts the wording never appears in what `publishedDocs()` returns.

The company **does** see it: the rejection reason shows under the review pill in their own Documents tab, which is the whole point of writing one.

The seeded fixture now produces a realistic mix — roughly 70% approved, 25% awaiting, 5% rejected — instead of a clean sweep. A platform console whose queue is permanently empty demonstrates nothing, and every real marketplace has a backlog at any given moment. Rejected documents are never seeded as published.

**A badge that can be lost.** `badgeOk` holds only while a company has at least one approved document and nothing expired or rejected on its public page. Monitoring lists the ones that fail, and rejecting a document moves the count immediately.

### The sign-in gate

`platform.html` opens behind a sign-in box — a modal over the console, not a separate landing page. Three steps live in the same card: **sign in**, **request a reset code**, **choose a new password**. `assets/auth.js` holds the logic.

Shipped account, printed in the box itself because a demo nobody can enter is not a demo:

```
admin@frservices.ph
FRadmin2026!
```

While locked, the console is blurred *and* unpainted — `showTab()` never runs without a session, so no marketplace data sits in the DOM behind the blur. Locking a page whose data is already rendered is theatre.

**This is a gate, not a lock, and the UI says so.** There is no server: the thing checking the password is the same thing asking for it, and anyone can open devtools and write a session object. A warning to that effect sits under the form. What is still worth doing, and is done:

- **The password is never stored in any form.** Only a salted SHA-256 digest, via `crypto.subtle` (Chrome treats `file://` as a secure context). If `subtle` is missing the fallback digest labels itself `weak-` so nobody mistakes it for one. A test asserts the plaintext appears nowhere in `localStorage`, on both paths — because operators reuse passwords, and leaking one here leaks it elsewhere.
- **Failed attempts lock the account** for 60 seconds after 5 tries, so the shape of rate limiting is in the prototype.
- **The failure message is identical** whether the account is unknown or the password is wrong, and a reset request for an unregistered address reports success without issuing a code. Otherwise either form doubles as a way to enumerate who has an account.
- **Comparison is constant-time-ish** (`safeEqual` xors the whole string rather than exiting early).
- **Sessions expire** — 12 hours, or 14 days behind an explicit "keep me signed in". Changing a password ends every session.
- **Reset codes are six digits, single-use, and expire in 10 minutes.**

There is no mail server, so the reset code is **displayed** with a line saying exactly why. Pretending an email went out would leave the operator waiting for one that never arrives.

The console shows a **"Still on the shipped password"** badge next to the operator name until the password is changed, and the badge clears on change.

**The migration to a real server** is the whole of this: password over TLS only, stored under a slow KDF (argon2id or bcrypt — *not* SHA-256, which is far too fast to resist an offline attack), session as an opaque httpOnly cookie, rate limiting per-account *and* per-IP, reset tokens emailed and single-use. None of that can be prototyped client-side, which is exactly why the warning is on the form rather than in a comment.

### How FR Services earns

Stated on the Overview tab in a panel rather than buried in a constant, because it is the commercial model rather than a setting:

| | |
|---|---|
| Listing subscription | **Free** — no monthly fee, no joining fee |
| Vehicle & equipment rental | **8%** commission on the booking total |
| Emergency towing | **12%** commission on the booking total |

Towing carries the higher rate because it is dispatch work: short notice, small ticket, and the platform is doing the hard part — finding an available truck at 2am is the service being sold. A rental booking is planned days ahead and the yard would probably have won it anyway.

**Commission is summed per booking, never taken off a company's total.** A multi-service company earns at two different rates, so one multiplication against combined revenue would be wrong for every company doing both towing and rental. FleetService Davao runs all three lines and comes out at a blended **8.2%**; a rental-only company lands on exactly 8%, a towing-only one on exactly 12%. All three are asserted, as is the identity that the platform total equals the sum of `commissionOn()` over every booking.

`PLATFORM_RATES` is the single table the rate is read from. Cancelled bookings bill nothing, and the panel shows what each line actually earned in the selected period alongside its headline rate.

**Still to build:** this is reporting, not billing. Nothing invoices a company, nothing settles, and there are no payouts. The console tells you what you earned; collecting it is the next real piece of work.

### Saving a company requires an account

The **Save** button on a company page is rendered only for a signed-in visitor. Showing it to everyone and bouncing them to a login when they press it is the pattern that trains people to stop pressing things.

**The rule lives in the store, not the button.** `toggleFavourite()` refuses when there is no session and returns an error saying so; `loadFavourites()` returns an empty list. Hiding a control is a courtesy to the person using the page — it is not enforcement, and anything that writes has to refuse on its own. A test forces the button visible while signed out, clicks it, and asserts nothing was written to storage at all.

Favourites are keyed on the account (`fr.saved.<user>`), so they survive sign-out, come back on sign-in, and a second account starts with its own empty list. Capped at 200; anything that is not an array in storage is ignored rather than trusted.

The nav grew a matching state: `paintAuthNav()` swaps the **Sign in** button for the signed-in name plus **Sign out**. It lives in `auth.js` rather than in each page, because five copies is how five pages end up slightly different. Without it the button appearing and disappearing would be unexplained — the visitor has no other way to tell which state they are in.

**Not yet built:** there is no renter sign-up, and no page that lists what you have saved. Today the only account is the platform administrator, so "signed in" means that one account. A renter-facing account system is the next piece if saved companies are meant to be a real feature rather than a demonstrated one.

### The boundary between platform and seller

A platform operator sees **marketplace activity** — bookings, gross booking value, commission at an 8% take rate, documents, reports, compliance. They do not see a seller's **private books**. The expense ledger in `fr.expenses.<companyId>` is the company's own, and nothing in `platform.js` reads it; a test asserts the file contains no reference to it once comments are stripped. Being the landlord is not the same as being the accountant.

This constraint had a concrete consequence. The trend chart needed adaptive bucketing (day / week / month by window width, same rule as everywhere else), and `opsSeries()` was the obvious reuse — but it folds in expenses. So the platform buckets from bookings only, inside the scan loop where the company's bookings are already generated.

**Renter reports close the loop.** The report modal on a company page now writes to `fr.reports`, so a submission turns up in the platform queue with reason, detail, booking reference and whether the reporter asked to stay anonymous to the company. An operator can take it for review, uphold, dismiss or reopen.

### The scan, and why it is memoised

One pass over 42 companies regenerates every company's bookings: **~750 ms**. That is fine once per view and hopeless per keystroke, so `platformScan()` memoises on `(from, to, today)` and every filter, sort and search runs against the cached result. Actions that change standing — approving a document, resolving a report — call `platformScanClear()` explicitly.

Memory stays flat because `_bookCache` in ops.js holds one company at a time: the loop regenerates rather than accumulating, so peak usage is one company's bookings, not forty-two.

### Ranked bars, not a pie

The regional breakdown is 13 places. A pie caps at six readable slices, so folding the tail into "Other" would have hidden two thirds of the map behind a 30% grey wedge. Ranked horizontal bars in a single hue are the right form for many ordered magnitudes — every region stays visible, and the categories carry no identity beyond their size.

One bug worth recording: the sub-label class was originally `.co`, which `fr.css` already owns as the marketplace company card. Every region label rendered inside a full card border. Same failure mode as the earlier `.empty` collision — in a shared stylesheet, a two-letter class name is a landmine.

### Reporting a company

Six categories modelled on Lazada/Shopee: fraud or scam, misleading listing, unsafe vehicle or equipment, harassment, fake reviews or impersonation, other. Free-text detail capped at 1,200 characters, optional booking reference, and an anonymity toggle that is honest about its limits — the platform still retains identity internally so it can follow up and detect abuse of the report system itself.

The form states plainly that it is not monitored in real time and that emergencies go to 911, and warns against pasting passwords, OTPs or card numbers. Submission is client-side only in this prototype; nothing leaves the browser.

The verified badge is also now a button. It opens an explainer listing exactly what was checked (SEC/DTI, mayor's permit, LTO registration, insurance, owner ID) **and what it does not mean** — no vehicle inspection, no guarantee of condition, pricing or punctuality. A badge that overstates itself is worse than no badge.

---

### Manual override is a first-class path

Auto-detection is a convenience, never a cage: someone in Manila planning a Boracay trip needs Aklan providers, not the ones outside their office. The geo bar's "Change location" opens the same picker as a modal (it was a `prompt()`, which browsers suppress in many contexts — it looked broken). Both instances share one `makeLocPicker()` factory and one `setCity()`, so the geo bar, hero field and results can't drift apart.: closer to real PH rental demand (Hiace, Fortuner, pickups) *and* those silhouettes are far more generic, which retires the trademark question entirely.
