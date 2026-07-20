# ONDC Bus Discover — Static QR Pages

A lightweight, zero-build static site that powers the QR codes placed on buses and at bus stops. When a commuter scans a QR code, they land on an operator-specific page listing the authorised ONDC buyer apps they can use to purchase bus tickets.

Unlike the metro site, there are **no per-operator HTML pages** — a single `index.html` renders everything dynamically from `public/buyers-config.json`.

## How it works

```
QR code on bus  →  /osrtc?bus=1234  →  index.html (single dynamic page)
                                           │
                                           ├── resolves operator from URL path
                                           ├── fetches /public/buyers-config.json
                                           └── renders buyer app list
                                               (substituting the bus number into
                                                templated links like Chartr's)
```

- `/{buyer}` (e.g. `/osrtc`, `/katch`, `/oneticket`, `/chartr`) shows that buyer app and hands off to its link automatically — one QR per buyer app. Slugs are case-insensitive (`/Katch` works).
- `/` renders the full buyer list for the operator (buyer routes take priority over operator routes when names collide).
- `?buyer=` / `?operator=` work as query-param fallbacks for local testing.
- `?vid=<vehicle-id>` is read from the QR and substituted into any buyer URL containing `{bus_number}` (e.g. `/osrtc?vid=OD07AU3015` → `https://osrtcapp.chartr.in/buy-ticket?bus_number=OD07AU3015`). Without a vid, a buyer's `fallbackUrl` is used; buyers with neither are hidden. `?bus=` is accepted as an alias.
- Buyers with `"enabled": false` or no URL are skipped. Missing logos fall back to an initial-letter placeholder.

## Project structure

```
.
├── index.html              # The single dynamic page
├── CNAME                   # bus.ondc.tech
└── public/
    ├── buyers-config.json  # Source of truth: operators + buyer apps
    ├── _redirects          # Netlify / Cloudflare Pages SPA fallback rule
    ├── _headers            # HTTP response headers (caching, security)
    ├── ondc-logo.svg
    ├── icons.svg
    ├── favicon.svg
    └── assets/
        └── buyers/         # Self-hosted buyer app logos
```

## Adding an operator or updating buyers

Edit `public/buyers-config.json` — no HTML changes needed. Each operator is a top-level key:

```json
{
  "osrtc": {
    "displayName": "OSRTC",
    "description": "Odisha State Road Transport Corporation",
    "buyers": [
      {
        "name": "Chartr",
        "url": "https://osrtcapp.chartr.in/buy-ticket?bus_number={bus_number}",
        "fallbackUrl": "https://osrtcapp.chartr.in/",
        "logo": "/public/assets/buyers/chartr.png",
        "enabled": true,
        "remarks": "Link requires bus number from QR"
      }
    ]
  }
}
```

- `url` may contain `{bus_number}` — it is filled from the QR's `?vid=` parameter; `fallbackUrl` is used when the QR has no vehicle id.
- `logo` is optional; drop the image in `public/assets/buyers/` and reference it.
- Set `"enabled": false` to hide a buyer without deleting it.

The config is served with a 5-minute cache, so buyer changes go live **without a redeploy**.

## QR code URLs

| Placement                      | URL                                     |
|--------------------------------|-----------------------------------------|
| Buyer-specific, on a bus       | `https://bus.ondc.tech/osrtc?vid=OD07AU3015` |
| Buyer-specific, generic        | `https://bus.ondc.tech/katch`           |
| All buyers (stop/depot poster) | `https://bus.ondc.tech/?vid=OD07AU3015`       |

A buyer's route slug is its `slug` field in the config, or its name lowercased with non-alphanumerics stripped (`OneTicket` → `/oneticket`).

## Deployment

### GitHub Pages (current)

Settings → Pages → deploy from branch `main`, folder `/ (root)`. The `CNAME` file maps the site to `bus.ondc.tech` (the custom domain is required — absolute `/public/...` paths assume the site is served at the domain root, not under `/static-qr-bus/`).

GitHub Pages has no rewrite rules, so `404.html` is an exact copy of `index.html` — Pages serves it for any path (`/osrtc`, `/katch`, …) with the URL intact, and the router takes over. **If you edit `index.html`, re-copy it to `404.html`** (`cp index.html 404.html`). `public/_headers` and `public/_redirects` are ignored by GitHub Pages; they are kept for a possible move to Netlify/Cloudflare Pages, where they'd apply and `404.html` would be unnecessary.

## Local development

```sh
python3 -m http.server 8080
# open http://localhost:8080/?operator=osrtc&vid=OD07AU3015
```

(Local servers don't apply the `_redirects` rewrite, so use the `?operator=` fallback for path-style testing.)
