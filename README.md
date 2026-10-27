# Critter

Landing page for Critter Holdings. A static site with no build step and no dependencies: `index.html`, `assets/css/style.css` and `assets/js/main.js`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (Cloudflare Pages)

Create a Pages project from this repo with **no build command** and the output directory set to `/`. Then point the domain at it in Cloudflare DNS.

## Editing

- **Companies:** add entries to `COMPANIES` at the top of `assets/js/main.js`:
  `{ name, niche, url, live }`. Empty slots fill up to `MIN_COMPANY_SLOTS` as "Unannounced".
- **Emails / domain:** the page uses `hello@critter.holdings` and `support@critter.holdings`.
  Search for `critter.holdings` to change them once the domain is final.
- **Accent color:** `--accent` in `assets/css/style.css`.

## What moves

- **Hero:** a brushed-aluminum lid, generated on a canvas, opens as you scroll. It tilts and catches light as the cursor moves.
- **Headline:** the letters reveal on load. Section headings reveal word by word.
- **Marquee:** speeds up with scroll velocity.
- **How we work:** a sticky odometer counter tracks the active principle.
- **Lineage line:** fills in word by word as you scroll.
- **Company cards:** a spotlight and border glow follow the cursor.
- **Footer:** a small bug wanders around, avoids the cursor and can be clicked.

All motion is disabled under `prefers-reduced-motion`.
