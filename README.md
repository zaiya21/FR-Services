# FR Services

A multi-vendor fleet rental marketplace for the Philippines — vehicle hire,
heavy equipment and 24/7 emergency towing — with a storefront each company
controls, a company admin console, and a platform console for FR Services.

The application is a **Next.js 15 app in [`fr-next/`](fr-next/)**.

```bash
cd fr-next
npm install
npm run dev        # http://localhost:3000
```

Platform console sign-in: `admin@frservices.ph` / `FRadmin2026!`
(a demo account — the sign-in gate is client-side only and says so on the
form; see the security note in ARCHITECTURE.md before putting anything
real behind it).

## What is here

| | |
|---|---|
| [`fr-next/`](fr-next/) | the Next.js application — **this is the project** |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | why the thing is built the way it is: the location model, the verification and trust design, the money model, the security boundaries, and the bugs worth remembering |
| `*.html`, `assets/` | the original static build the Next app was converted from, kept as the reference the conversion was checked against |

The static files are not needed to run anything. They are here because the
conversion's claim — that the UI did not change — was verified by rendering
both versions and comparing the resulting DOM node by node, and that check
needs both sides. [`fr-next/README.md`](fr-next/README.md) records the
result and the four conversion bugs it caught.

## Routes

| Route | What it is |
|---|---|
| `/` | the marketplace — geo-matched search across 42 companies |
| `/company?c=<id>` | a company's storefront, themed by its owner |
| `/admin?c=<id>` | the company console — bookings, expenses, documents, reports, storefront editor |
| `/platform` | the FR Services console — document approval, companies, renter reports, monitoring |
| `/register` | company registration |
| `/booking?c=<id>&u=<unit>` | booking request |
| `/tow` | emergency tow dispatch |

## Status

A working prototype. Everything runs in the browser against generated
fixtures held in `localStorage` — there is no server, no database and no
payment integration. `ARCHITECTURE.md` is explicit about which parts are
demonstrations and which would have to move server-side to be real, the
sign-in gate and the commission model foremost among them.
