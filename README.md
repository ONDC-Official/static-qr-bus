# ONDC Bus Discover — Static QR Pages

Static, zero-build landing pages for ONDC bus QR codes. Each physical QR on a
bus or at a stop points to a page that lists the authorised ONDC buyer apps a
commuter can use to buy a ticket.

Live at [bus.ondc.tech](https://bus.ondc.tech).

## How it's structured

The site has three levels, each a thin static HTML shell rendered by one
shared script. Every real URL is root-relative:

```
/                                  → pick a region
/<region>/                         → pick an operator in that region
/<region>/<operator>/              → pick a buyer app to book with
```

For example:

```
/odisha/
/odisha/osrtc/?vid=OD07AU3015
```

Generated pages live at the **repo root** (not under `public/`) so that the
bare `/` URL itself resolves — `public/` holds only the shared,
non-generated assets (`public/js/`, `public/css/`, `public/images/`).
`public/js/app.js` hardcodes `DATA_URL`/`GA_ID` so that the links it generates
between pages resolve to the right place.

There is no build step for the _runtime_ — every page is a plain `.html` file
that:

1. Sets its own `<title>`/`<meta>` tags (so link previews and SEO work without JS).
2. Declares which slice of data it needs via `data-group` / `data-entity` attributes on `<body>`.
3. Links a shared stylesheet (`public/css/picker.css` for region/operator pickers,
   `public/css/entity.css` for buyer-app lists) instead of inlining CSS per page.
4. Loads `public/js/app.js`, which fetches `data/entities.json` and renders
   _everything dynamic_ — the navbar, footer, header icon/photo, and the list
   itself (regions, operators, or buyer apps) — into placeholder elements
   (`#navbar-slot`, `#footer-slot`, `#header-logo`, `#main-content`).

All of those HTML files are **generated** — see [Generating pages](#generating-pages)
below. You never hand-write or copy folders; you edit `data/entities.json` and
run one script.

```
index.html                                            # region picker (generated)
odisha/index.html                                     # operator picker (generated, data-group="odisha")
odisha/osrtc/index.html                               # buyer-app list (generated, data-group + data-entity)

data/entities.json                                    # single source of truth for all content + site config
scripts/generate.mjs                                  # reads data/entities.json, writes index.html + <group>/**/index.html
.github/workflows/deploy.yml                          # runs the generator and deploys to GitHub Pages on push
scripts/templates/root.html                           # template for the region picker
scripts/templates/group.html                          # template for the operator picker
scripts/templates/entity.html                         # template for the buyer-app list
public/js/app.js                                      # shared renderer + navbar/footer/icon injection + GA4 tracking
public/css/picker.css                                 # shared styles for region/operator picker pages
public/css/entity.css                                 # shared styles for buyer-app list pages
public/images/buyers/                                 # buyer app logos + operator photos
public/images/ondc-logo.svg
public/images/favicon.png
CNAME                                                  # custom domain for GitHub Pages
```

## Editing content

All operator, buyer-app, and site-level data lives in **`data/entities.json`** —
nothing else needs to change for day-to-day updates.

```json
{
  "site": {
    "gaId": "G-SJEL7S80GE",
    "productName": "Discover Buses",
    "orgName": "ONDC"
  },
  "groups": [
    {
      "slug": "odisha",
      "name": "Odisha",
      "entities": [
        {
          "slug": "osrtc",
          "name": "OSRTC",
          "title": "Get OSRTC Digital Tickets via ONDC",
          "photo": "/public/images/buyers/osrtc.png",
          "defaultVid": "OD07AU3015",
          "buyers": [
            {
              "label": "OSRTC",
              "status": "live",
              "logo": "/public/images/buyers/osrtc.png",
              "url": "https://osrtcapp.chartr.in/buy-ticket?bus_number={bus_number}",
              "fallbackUrl": "https://osrtcapp.chartr.in/"
            }
          ]
        }
      ]
    }
  ]
}
```

- **`site`**: project-wide config used to fill every generated page.
  - **`gaId`**: GA4 measurement ID, used in the `gtag.js` script tag on every page.
  - **`productName`** / **`orgName`**: used to compose `<title>`/`<meta>` text.
- **`groups`**: regions (e.g. Odisha). Each group contains **entities** (operators).
- **`status`**: `"live"` (clickable link), `"pending"` (Coming soon), or `"na"` (omitted).
- **`defaultVid`**: used when the page URL has no `?vid=` / `?bus=`. The page
  URL is updated to include it, and buyer links with `{bus_number}` are filled
  with the same value.
- **`url`** may contain `{bus_number}` — filled from the QR's `?vid=` (alias
  `?bus=`) or the operator's `defaultVid`. Without either, `fallbackUrl` is
  used; buyers with neither are hidden.
- **`logo`** / **`photo`**: optional. Drop images in `public/images/buyers/`.

### Adding a buyer app

Add an entry to that operator's `buyers` array and re-run the generator.

### Adding a new operator

Add an entry to a group's `entities` array and re-run the generator.

### Adding a new region

Add an entry to the `groups` array (with at least one entity) and re-run the generator.

## Generating pages

```
node scripts/generate.mjs
```

This reads `data/entities.json`, validates it, and writes `index.html` plus every
`<group>/**/index.html` at the repo root. Stale group/entity folders are removed.
Generated HTML is git-ignored — rebuilt on every deploy.

## QR code URLs

| Placement                | URL                                                  |
| ------------------------ | ---------------------------------------------------- |
| Operator list (on a bus) | `https://bus.ondc.tech/odisha/osrtc/?vid=OD07AU3015` |
| Operator list (generic)  | `https://bus.ondc.tech/odisha/osrtc/`                |
| Region picker            | `https://bus.ondc.tech/odisha/`                      |
| All regions              | `https://bus.ondc.tech/`                             |

## Local development

```
node scripts/generate.mjs
python3 -m http.server 8000
```

Then open `http://localhost:8000/odisha/osrtc/?vid=OD07AU3015`.

## Deployment

Deployed to GitHub Pages via `.github/workflows/deploy.yml`: on every push to
`main`, it runs `node scripts/generate.mjs` and publishes the result. Generated
HTML is **never committed** — it's rebuilt fresh on every deploy.

This requires the repo's Pages source (Settings → Pages → Build and
deployment) to be set to **"GitHub Actions"** (a one-time setting).

- `CNAME` — custom domain `bus.ondc.tech`, copied into the deployed artifact.

## Analytics

Every page loads GA4 (`G-SJEL7S80GE`) via `public/js/app.js`, which fires:

- `platform_detected` — on every buyer-app list page, with detected OS (Android/iOS/Other).
- `buyer_app_click` — when a visitor taps a buyer app link, with the app name, entity name, and destination URL.
