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

- `/{operator}` renders that operator's buyer list (e.g. `/osrtc`).
- `/` renders the operator directly when only one exists, otherwise an operator picker.
- `?bus=<number>` is read from the QR and substituted into any buyer URL containing `{bus_number}`. Buyers with templated URLs are hidden when no bus number is present.
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
        "logo": "/public/assets/buyers/chartr.png",
        "enabled": true,
        "remarks": "Link requires bus number from QR"
      }
    ]
  }
}
```

- `url` may contain `{bus_number}` — it is filled from the QR's `?bus=` parameter.
- `logo` is optional; drop the image in `public/assets/buyers/` and reference it.
- Set `"enabled": false` to hide a buyer without deleting it.

The config is served with a 5-minute cache, so buyer changes go live **without a redeploy**.

## QR code URLs

| Placement            | URL                                    |
|----------------------|----------------------------------------|
| Specific bus         | `https://bus.ondc.tech/osrtc?bus=1234` |
| Generic (stop/depot) | `https://bus.ondc.tech/osrtc`          |

## Deployment

Designed for **Netlify** or **Cloudflare Pages** — publish the repository root, no build command. `public/_redirects` rewrites all paths to `index.html` so `/osrtc` works. The `CNAME` file maps the site to `bus.ondc.tech`.

## Local development

```sh
python3 -m http.server 8080
# open http://localhost:8080/?operator=osrtc&bus=1234
```

(Local servers don't apply the `_redirects` rewrite, so use the `?operator=` fallback for path-style testing.)
