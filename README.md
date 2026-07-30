# FR Services

A multi-vendor fleet rental marketplace for the Philippines — vehicle hire,
heavy equipment and 24/7 emergency towing — with a storefront each company
controls, a company admin console, and a platform console for FR Services.

A **Next.js 15 app** (App Router), at the repository root.

```bash
npm install
npm run dev        # http://localhost:3000
```

Platform console sign-in: `admin@frservices.ph` / `FRadmin2026!`
A demo account. The sign-in gate is client-side only and says so on the
form — read the security note in ARCHITECTURE.md before putting anything
real behind it.

## Deploying

Import the repository in Vercel and press Deploy. **Leave Root Directory
empty** — `package.json` is at the root, so framework detection finds
Next.js on its own. No environment variables are needed; all ten routes
prerender as static.

## Routes

| Route | What it is |
|---|---|
| `/` | the marketplace — geo-matched search across 42 companies |
| `/company?c=<id>` | a company's storefront, themed by its owner |
| `/admin?c=<id>` | the company console — bookings, expenses, documents, printable reports, storefront editor |
| `/platform` | the FR Services console — document approval, companies, renter reports, monitoring |
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
public/
  assets/*.js         the application logic — theme, data, ops, platform,
                      auth, pdf, locations. Unchanged by the conversion.
  pages/*.js          each page's former inline script, unchanged
supabase/
  migrations/         schema and row-level security
legacy/               the static build this was converted from
```

The application logic was never ported to React. `public/assets/*.js` runs
as classic scripts against the same DOM ids, with the same globals and the
same load order; React renders the markup and gets out of the way. That is
what made an identical DOM achievable — see [CONVERSION.md](CONVERSION.md)
for how that was verified and the four bugs it caught.

## Documentation

| | |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | why the thing is built this way: the location model, verification and trust design, the money model, the security boundaries, and the bugs worth remembering |
| [CONVERSION.md](CONVERSION.md) | the static-to-Next conversion, what changed, and how "the UI is unchanged" was checked |
| [supabase/README.md](supabase/README.md) | the database schema, the RLS model, and the three places a row policy is not enough |

## `legacy/`

The static build the Next app was converted from. Not needed to run
anything — it is kept because the conversion's claim, that the UI did not
change, was verified by rendering both versions and comparing the resulting
DOM node by node, and that check needs both sides. Safe to delete once
you no longer care to re-run it.

## Status

A working prototype. Everything runs in the browser against generated
fixtures held in `localStorage` — there is no server, no database wired up
and no payment integration. The Supabase migrations define the schema and
its security but nothing reads from them yet. ARCHITECTURE.md is explicit
about which parts are demonstrations and which would have to move
server-side to be real — the sign-in gate and the commission model
foremost among them.
