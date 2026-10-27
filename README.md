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
  `{ name, description, url, live }`. While the list is empty, the section shows a short "launching soon" note.
- **Accent color:** `--accent` in `assets/css/style.css`.

## What moves

- **Hero:** a perforated-metal dot field. The dots part and warm up around the cursor, and a slow band of light drifts across them.
- **Headline:** the letters reveal on load. Section headings reveal word by word.
- **Structure:** the company diagram builds itself, then pulses flow from the parent company down to each business.
- **Standards:** a sticky counter rolls to whichever item is in view.
- **Footer:** a small bug wanders around and keeps away from the cursor.

All motion is disabled under `prefers-reduced-motion`.
