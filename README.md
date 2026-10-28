# Critter landing page

Static site, no build step, no dependencies.

```
index.html          landing page
forums.html         forums page (links out to the forum on bot-hosting.net)
assets/css/style.css
assets/favicon.svg  placeholder favicon (no logo yet)
assets/js/main.js   config, text reveals, page/section transitions, nav state, scroll-linked text, company cards
assets/js/field.js  page-wide WebGL background (drifting gradient with grain)
```

## Run locally

```sh
python -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk also works.

## Editing

- **Companies:** edit `COMPANIES` at the top of `assets/js/main.js`. Each entry is `{ name, description, url }`. Each one is shown as a card with the domain in pastel pink, the name, the description and a "Visit website ↗" link. Cards sit two per row on desktop and one per row on phones. The whole card is clickable and opens the site in a new tab. If the list is empty, the section reads "First companies announced soon."
- **Forums:** set `FORUM_URL` at the top of `assets/js/main.js` to the forum's address on bot-hosting.net. The "Open the forums" button on `forums.html` then links there in a new tab. While it's empty, the button reads "Opening soon" and is disabled.
- **Accent colour:** `--accent` / `--accent-rgb` in `style.css` (currently pastel pink, `#f6c6d0`). The background glows are set in `field.js` (`pink`, `blush`, `dusty`) and the favicon dot in `assets/favicon.svg`.
- **Logo:** there isn't one yet. The nav shows the word "Critter" and the favicon is a plain placeholder. When a logo exists, put it in the `.brand` link of both pages and replace `assets/favicon.svg`.

## Layout

Every section below the hero uses the same chapter grid (`.chapter`). The left column (`.chapter-head`) holds a small pastel-pink section label and the section heading. On desktop it stays pinned while that section's content scrolls past in the right column (`.chapter-body`), and the next section's heading pushes it out. Below 960px wide the two columns stack and nothing pins. To add a section, copy an existing `<section class="section">` block. There are no divider lines: the pinned headings, the spacing and the background scene changes separate the sections. The nav gets a soft dark fade behind it once the page has scrolled.

## What moves

- **Background:** one fixed WebGL layer behind both pages. Soft pastel pink, peach blush and dusty rose glows drift and bend over near-black, with fine grain that also prevents banding. A faint pink glow trails the cursor. The gradient fades up on load and is fullest behind the hero.
- **Section scenes:** there are no divider lines. Instead, each section has its own arrangement of glows. As you cross into the next section, the glows travel to its arrangement, so the background marks where each section begins.
- **Headline weight:** letters in the headline get heavier as the cursor gets close, using the variable weight axis of Schibsted Grotesk.
- **Scrolling:** mouse-wheel scrolling eases toward its target. Keyboard, scrollbar and touch scrolling stay native.
- **Navigation:** in-page links drop a column curtain showing the section name, jump to the section, then lift it. Links between pages close the curtain, load the next page under it, then lift it there. The back button restores the page open.
- **Text:** the headline rises letter by letter, and section headings reveal word by word. As the About paragraph scrolls through, each word sharpens out of a blur, rises and brightens.
- **Company cards:** each card fades up in turn as it enters view. On hover it lifts slightly and takes a faint pink tint, the link turns pink and the arrow lifts. Buttons lean toward the cursor.

Under `prefers-reduced-motion` the transitions and smooth scrolling are skipped, text appears as it is, and the background draws a still frame for the current section (redrawn on scroll). The magnetic buttons and smooth scrolling only run with a mouse or trackpad. If frames run slow, the background lowers its resolution.
