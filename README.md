# FR Services

A multi-vendor fleet rental marketplace for the Philippines - vehicle hire,
heavy equipment and 24/7 emergency towing - with a storefront each company
controls, a company admin console, and a platform console for FR Services.

A **Next.js 15 app** (App Router), at the repository root.

```bash
npm install
npm run dev        # http://localhost:3000
```

The platform console (`/platform`) needs a Supabase project - see
[Platform console setup](#platform-console-setup) below. Every other route
runs with no configuration.

Platform console sign-in: `admin@frservices.ph` / `FRadmin2026!`
A demo account, but a real one - see
[Platform console setup](#platform-console-setup) to create it, and the
"The sign-in gate" section of ARCHITECTURE.md for how it's secured.

## Deploying

Import the repository in Vercel and press Deploy. **Leave Root Directory
empty** - `package.json` is at the root, so framework detection finds
Next.js on its own. Nine of the ten routes need no configuration and
prerender as static; `/platform` needs the three Supabase environment
variables below set in the Vercel project (Settings -> Environment
Variables) or its sign-in gate has nothing to check a password against.

## Platform console setup

Everything except `/platform` runs with zero configuration - demo data in
`public/assets/data.js`, nothing server-side. The platform console's
sign-in gate is real, server-checked auth (see "The sign-in gate" in
ARCHITECTURE.md), which means it needs an actual Supabase project before
you can sign in.

1. **Create a Supabase project** at [supabase.com](https://supabase.com) if
   you don't have one, then copy `.env.example` to `.env.local` and fill in
   the three values from Project Settings -> API:
   ```
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   SUPABASE_SERVICE_ROLE_KEY=
   ```
   `.env.local` is gitignored - these never get committed.

2. **Run the migrations** against your project:
   ```bash
   npm i -g supabase
   supabase login
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```
   (Project ref is in your Supabase project's URL and its Settings page.)
   If you'd rather not install the CLI, paste the files in
   `supabase/migrations/` into the Supabase dashboard's SQL Editor, in
   filename order - they're numbered for exactly that.

3. **Switch the "Reset Password" email template to a code, not a link.**
   Authentication -> Email Templates -> Reset Password, in the Supabase
   dashboard. Replace the body with something that includes `{{ .Token }}`
   instead of `{{ .ConfirmationURL }}`, e.g.:
   ```html
   <h2>Reset your FR Services platform password</h2>
   <p>Enter this code in the sign-in box. It expires in 10 minutes:</p>
   <h1>{{ .Token }}</h1>
   ```
   Without this, Supabase sends its default magic-link email instead, and
   the code field in the app will never receive anything to check.

4. **Create the shipped platform account.** This is a one-time step - the
   first platform operator can't grant themselves the role (see
   ARCHITECTURE.md), so it's done directly with the service-role key:
   ```bash
   node --env-file=.env.local scripts/seed-platform-admin.mjs
   ```
   Creates `admin@frservices.ph` / `FRadmin2026!` in Supabase Auth and
   marks it `role='platform'` in `public.profiles`. Safe to re-run.

5. `npm run dev` and sign in at `/platform` with those credentials.

## Routes

| Route | What it is |
|---|---|
| `/` | the marketplace - search over registered companies, matched by real distance |
| `/company?c=<id>` | a company's storefront, themed by its owner |
| `/admin?c=<id>` | the company console - bookings, expenses, documents, printable reports, storefront editor |
| `/platform` | the FR Services console - document approval, companies, renter reports, monitoring |
| `/register` | company registration |
| `/booking?c=<id>&u=<unit>` | booking request |
| `/tow` | emergency tow dispatch |
| `/template-a-kalsada`, `-b-dispatch`, `-c-bayanihan` | the three original design templates |

## Layout

```
app/                  routes; one folder per page
  layout.jsx          <html>, <body>, fonts, globals.css
  globals.css         the shared stylesheet
  _LegacyScripts.jsx  loads the classic scripts in order after mount
  api/auth/            the platform console's real sign-in - Route Handlers
                        backed by Supabase Auth, see ARCHITECTURE.md
public/
  assets/geo.js       geolocation, distance, coordinate parsing
  assets/registry.js  the company store - empty until someone registers
  assets/platform-auth.js  the platform console's client-side half of
                            api/auth/ - fetch calls, nothing else
  assets/*.js         the rest of the logic - theme, data, ops, platform,
                      auth (marketplace nav/favourites, still demo-only),
                      pdf, locations
  pages/*.js          each page's former inline script
lib/supabase/          Supabase client helpers shared by api/auth/ and
                        middleware.js
middleware.js          keeps the platform console's session cookie fresh
scripts/                one-off setup scripts, run by hand (not at deploy)
supabase/
  migrations/         schema and row-level security
legacy/               the static build this was converted from
```

The application logic was never ported to React. `public/assets/*.js` runs
as classic scripts against the same DOM ids, with the same globals and the
same load order; React renders the markup and gets out of the way. That is
what made an identical DOM achievable - see [CONVERSION.md](CONVERSION.md)
for how that was verified and the four bugs it caught.

## Documentation

| | |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | why the thing is built this way: the location model, verification and trust design, the money model, the security boundaries, and the bugs worth remembering |
| [CONVERSION.md](CONVERSION.md) | the static-to-Next conversion, what changed, and how "the UI is unchanged" was checked |
| [supabase/README.md](supabase/README.md) | the database schema, the RLS model, and the three places a row policy is not enough |

## `legacy/`

The static build the Next app was converted from. Not needed to run
anything - it is kept because the conversion's claim, that the UI did not
change, was verified by rendering both versions and comparing the resulting
DOM node by node, and that check needs both sides. Safe to delete once
you no longer care to re-run it.

## The marketplace starts empty

There is no demo company set. `public/assets/registry.js` holds the list of
companies, it begins empty, and the only way in is completing the
registration wizard - which now genuinely writes a record rather than
showing a reference number and discarding the form.

That means a fresh install shows an empty marketplace, zero units, and no
average rating. It is meant to. Every headline figure is derived from the
registry, so there is nothing left that can claim inventory the platform
does not have. Register a company and it appears on the cards, on the map,
in the platform review queue and in its own dashboard.

Two synthesisers were deleted along with the fixtures, and it is worth
knowing why. `ops.js` used to invent a fleet for any company without one,
and `loadDocs()` used to invent a document set **including verified
permits** - so a company thirty seconds old opened onto bookings it never
took and compliance FR Services never checked. Over a demo dataset that
was scaffolding. Over real registrations it would be fabrication, and the
verified badge is the entire product.

## Location

Distance is computed, not stored. Renters get a **Use my exact location**
button in the geo bar which asks for browser geolocation on an explicit
click - never on load, because a prompt that fires by itself gets denied
once and then silently fails at the moment it matters. Grant it and the
map centres on the real fix with an accuracy circle drawn to scale, and
every distance is measured from where you are standing.

Companies supply their own coordinates during registration, which is what
makes the matching possible at all. Step 3 accepts a pasted pair, a
Google Maps link, degrees-minutes-seconds, an **I am at the yard now**
button, or a draggable pin on a map - and it catches the mistakes that
actually happen, including a reversed latitude/longitude pair, which in
the Philippines is unambiguous and gets swapped with a note saying so.
There is a built-in guide covering Google Maps on desktop, Android and
iPhone, plus Apple Maps and Waze.

Geolocation needs a secure origin. It works on Vercel and on `localhost`;
on plain `http` the browser refuses before asking, and `geo.js` reports
that case separately rather than as a denial.

## Status

A working prototype. Almost everything runs in the browser against
`localStorage` - no database wired up, no payment integration, so a
registered company lives in one browser and clearing site data removes it.
The confirmation screen says so rather than implying otherwise.

The one exception is the platform console's sign-in gate, which is real:
password checking, sessions and password reset run server-side against
Supabase Auth (see "Platform console setup" above and "The sign-in gate"
in ARCHITECTURE.md). Nothing else reads from the database yet - the
console's own content (bookings, documents, reports) is still the demo
dataset in `assets/data.js` / `assets/ops.js`, and the migrations define
the rest of the schema and its security without anything using it. The
commission model in ARCHITECTURE.md is also still a demonstration, not
wired to real payouts.
