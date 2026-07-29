# FR Services — Next.js

The FR Services prototype as a Next.js 15 app (App Router). The user
interface is unchanged: every page renders a DOM identical to the static
build it came from, verified page by page rather than asserted.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start
```

## Routes

| Route | Came from |
|---|---|
| `/` | `index.html` |
| `/company` | `company.html` |
| `/admin` | `admin.html` |
| `/platform` | `platform.html` |
| `/register` | `register.html` |
| `/booking` | `booking.html` |
| `/tow` | `tow.html` |
| `/template-a-kalsada`, `/template-b-dispatch`, `/template-c-bayanihan` | the three original design templates |

Query strings work as before: `/company?c=fleetservice-davao`,
`/booking?c=fleetservice-davao&u=fs-exc`, `/admin?c=davao-heavy-lift`.

Platform console sign-in: `admin@frservices.ph` / `FRadmin2026!`

## How it is put together

```
app/
  layout.jsx          <html>, <body>, fonts, globals.css
  globals.css         fr.css, byte for byte
  _LegacyScripts.jsx  loads the classic scripts in order after mount
  <route>/
    page.jsx          metadata + <Markup/> + <LegacyScripts/>
    markup.jsx        the page's markup as JSX
    page.css          the page's own <style> block, byte for byte
public/
  assets/             theme.js, data.js, ops.js, platform.js, auth.js,
                      pdf.js, ph-locations.js, img/ — unchanged logic
  pages/<name>.js     each page's former inline <script>, unchanged
  logo.png
```

**The application logic was not ported.** `assets/*.js` still runs as
classic scripts against the same DOM ids, with the same globals and the
same load order. React renders the markup and gets out of the way; nothing
in `assets/` knows this is a Next.js app. That is what made an identical
DOM achievable — a rewrite into React state and effects would have been a
different application that merely looked similar.

Three structural decisions worth knowing:

- **The markup is real JSX, not `dangerouslySetInnerHTML`.** A wrapper
  element would have broken `body.locked > nav.top` on the platform
  console, which is how the sign-in gate blurs the page behind it.
- **`_LegacyScripts` appends one `<script>` at a time, awaiting each.**
  `next/script` does not guarantee ordering, and this code depends on it
  absolutely: `data.js` reads globals from `theme.js`, `ops.js` reads
  both, and every page script reads all of them.
- **Markup components are Client Components.** Only because a few forms
  carry `onsubmit="return false"`, and React will not put an event
  handler on a Server Component. The alternative — dropping the handler
  and re-attaching it after hydration — leaves a window where a stray
  Enter key submits and navigates.

## What changed, and it is only this

**Addresses.** The static build navigated between files and loaded assets
relative to the current directory; Next serves routes from one origin.
So `company.html?c=x` became `/company?c=x`, `assets/…` became
`/assets/…`, and `logo.png` became `/logo.png` — in the markup, in the
page scripts, and in `data.js` and `auth.js`, which build links at
runtime. Absolute URLs were left alone, so Leaflet still loads from its
CDN. Nothing else in those files was touched.

**One attribute.** `onsubmit="return false"` is now
`onSubmit={e => e.preventDefault()}`. The form still does not navigate;
the attribute is no longer in the serialised DOM.

## How "unchanged" was checked

Both versions were served from the same origin, loaded headlessly, and
their DOM dumped after all scripts had run. The full tree — every element,
every attribute, all visible text — was compared:

```
/                        1754 nodes   IDENTICAL
/company                 3262 nodes   IDENTICAL
/admin                   3037 nodes   IDENTICAL
/platform                 776 nodes   IDENTICAL
/register                 886 nodes   IDENTICAL
/booking                  416 nodes   IDENTICAL
/tow                      619 nodes   IDENTICAL
/template-a-kalsada       608 nodes   IDENTICAL
/template-b-dispatch      744 nodes   IDENTICAL
/template-c-bayanihan     596 nodes   IDENTICAL
```

Identical DOM plus identical stylesheets means identical computed styles,
which is the whole of "the UI did not change".

Behaviour was then exercised in the built app: tab switching, the unit and
document modals, the platform sign-in gate, the grouped review queue and
its verdict dialog, PDF generation, the favourite button appearing only
when signed in, the registration gate refusing to advance without all
three files, and re-rendering the marketplace on a city change.

Three real conversion bugs were found and fixed this way, each of which
would have shipped a subtly different page:

1. **JSX strips whitespace around text.** `<svg/>\n Verified` lost the
   space before the word. Text nodes are now emitted as string
   expressions with HTML whitespace collapsing applied, which is what a
   browser does.
2. **`&nbsp;` was being collapsed into an ordinary space** because `\s`
   matches U+00A0 — so "FR&nbsp;Services" became free to wrap again.
   Whitespace is now collapsed before entities are decoded.
3. **A bare `data-fav` attribute became `data-fav="true"`.** HTML
   serialises a valueless attribute as `""`; React does not for `data-*`.
4. **Twenty form fields would have been read-only.** In HTML, `value` is
   the *initial* value and the user types over it; in React, `value`
   without an `onChange` makes the field controlled and immutable. The
   booking dates and distance, the registration city, province, base and
   slug, the radius slider and the three colour hex boxes would all have
   silently stopped accepting input. They are emitted as `defaultValue`
   now, which is React's name for the HTML meaning.

   This one is worth dwelling on: the DOM comparison passed all ten pages
   *with the bug present*, because the serialised attribute is identical
   either way — only the live behaviour differed. It was caught by a dev
   server warning and then confirmed by typing into every affected field
   in both versions and comparing the results.

## Not carried over

`ARCHITECTURE.md` and the static `*.html` files stay in the parent folder.
They are the reference this was checked against, and the architecture
notes still describe the application, which is unchanged.
