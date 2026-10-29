/* Critter: core interactions.
   Text reveals, section transitions, nav state, scroll-linked text, magnetic buttons.
   Exposes window.CRITTER for the background field (field.js). */
(() => {
  'use strict';

  // Companies shown in the Companies section: { name, description, url }.
  const COMPANIES = [
    {
      name: 'Bugware',
      description: 'Competitive Roblox closet-cheating company. Provides scripts, configs, and other tools related to cheating.',
      url: 'https://bugware.cc',
    },
  ];

  // Address of the forums (hosted on bot-hosting.net). While empty, the forums page button
  // reads "Opening soon" instead of linking anywhere.
  const FORUM_URL = 'https://forum.critter.cv';

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const C = (window.CRITTER = {
    reduce,
    clamp,
    lerp,
    ready: false,
    readyAt: 0,
    mouse: { x: innerWidth * 0.62, y: innerHeight * 0.45, inside: false },
    onReady(fn) { this.ready ? fn() : document.addEventListener('critter:ready', fn, { once: true }); },
  });

  addEventListener('pointermove', (e) => {
    C.mouse.x = e.clientX; C.mouse.y = e.clientY; C.mouse.inside = true;
  }, { passive: true });
  document.addEventListener('pointerleave', () => { C.mouse.inside = false; });

  /* ---------- text splitting ---------- */
  // Walks text nodes so inline markup (<em>) survives. mode: 'chars' | 'mask' | 'words'.
  function split(el, mode) {
    const out = [];
    const walk = (node) => {
      for (const n of [...node.childNodes]) {
        if (n.nodeType === 1) { walk(n); continue; }
        if (n.nodeType !== 3) continue;
        const frag = document.createDocumentFragment();
        // Split on breaking whitespace only, so non-breaking spaces keep their words together.
        for (const tok of n.textContent.split(/([ \t\r\n]+)/)) {
          if (!tok) continue;
          if (/^[ \t\r\n]+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); continue; }
          const w = document.createElement('span');
          if (mode === 'chars') {
            w.className = 'w';
            for (const c of tok) {
              const s = document.createElement('span');
              s.className = 'ch'; s.textContent = c;
              w.appendChild(s); out.push(s);
            }
          } else if (mode === 'mask') {
            w.className = 'mask';
            const i = document.createElement('span');
            i.className = 'wi'; i.textContent = tok;
            w.appendChild(i); out.push(i);
          } else {
            w.className = 'sw'; w.textContent = tok; out.push(w);
          }
          frag.appendChild(w);
        }
        n.replaceWith(frag);
      }
    };
    if (mode === 'words') { walk(el); return out; }
    if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    for (const c of el.children) c.setAttribute('aria-hidden', 'true');
    return out;
  }

  const heroTitle = $('[data-hero-title]');
  const heroChars = heroTitle ? split(heroTitle, 'chars') : [];
  heroChars.forEach((s, i) => s.style.setProperty('--i', i));
  $$('[data-split]').forEach((el) => split(el, 'mask').forEach((s, i) => s.style.setProperty('--i', i)));
  const scrubEl = $('[data-scrub]');
  const scrubWords = scrubEl ? split(scrubEl, 'words') : [];

  /* ---------- reveals ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); revealIO.unobserve(e.target); }
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal], [data-split]').forEach((el) => revealIO.observe(el));

  // Start the intro once fonts are in, so the headline doesn't reflow mid-animation.
  const markReady = () => {
    if (C.ready) return;
    C.ready = true;
    C.readyAt = performance.now();
    root.classList.add('is-ready');
    document.dispatchEvent(new Event('critter:ready'));
  };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(markReady));
  setTimeout(markReady, 1200);

  /* ---------- inertial wheel scrolling ---------- */
  // Wheel input eases toward its target instead of stepping. Keyboard, scrollbar and touch stay
  // native; any scroll we didn't cause resyncs the target.
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const smooth = (() => {
    if (reduce || !fine) return null;
    let target = scrollY, current = scrollY, running = false, last = 0, writing = false;
    const max = () => document.documentElement.scrollHeight - innerHeight;
    function step(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      current = lerp(current, target, 1 - Math.exp(-dt * 8));
      if (Math.abs(target - current) < 0.4) current = target;
      writing = true;
      scrollTo(0, current);
      running = current !== target;
      if (running) requestAnimationFrame(step);
    }
    addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      if (transitioning) return;
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
      if (!running) { target = current = scrollY; last = performance.now(); }
      target = clamp(target + e.deltaY * unit, 0, max());
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });
    addEventListener('scroll', () => {
      if (writing) { writing = false; return; }
      if (!running) target = current = scrollY;
    }, { passive: true });
    return { jump(y) { target = current = y; running = false; scrollTo(0, y); } };
  })();

  /* ---------- section transitions ---------- */
  const nav = $('[data-nav]');
  const curtain = $('[data-curtain]');
  const curtainTitle = $('[data-curtain-title]');
  let transitioning = false;

  async function goTo(target) {
    const top = target.id === 'top' ? 0 : target.getBoundingClientRect().top + scrollY;
    if (reduce || !curtain) { scrollTo({ top, behavior: 'auto' }); return; }
    if (transitioning) return;
    transitioning = true;
    curtainTitle.textContent = target.dataset.title || 'Critter';
    curtain.classList.remove('is-out');
    void curtain.offsetWidth;
    curtain.classList.add('is-in');
    await wait(700 + 4 * 45 + 220);
    if (smooth) smooth.jump(top); else scrollTo({ top, behavior: 'instant' });
    nav.classList.remove('is-hidden');
    await wait(140);
    curtain.classList.add('is-out');
    await wait(700 + 4 * 45);
    curtain.classList.remove('is-in', 'is-out');
    transitioning = false;
  }

  // Leaving for another page: close the curtain, then navigate. The next page starts closed
  // (see the inline script in <head>) and lifts it once it's ready.
  async function leaveTo(href, title) {
    if (transitioning) return;
    transitioning = true;
    curtainTitle.textContent = title;
    try { sessionStorage.setItem('critter:to', title); } catch {}
    curtain.classList.remove('is-out');
    void curtain.offsetWidth;
    curtain.classList.add('is-in');
    await wait(700 + 4 * 45 + 200);
    location.href = href;
  }

  const arriving = root.classList.contains('arriving') && curtain;
  try { sessionStorage.removeItem('critter:to'); } catch {}
  if (arriving) {
    curtain.classList.add('no-anim', 'is-in');
    root.classList.remove('arriving');
    void curtain.offsetWidth;
    curtain.classList.remove('no-anim');
    transitioning = true;
    C.onReady(async () => {
      await wait(120);
      curtain.classList.add('is-out');
      await wait(700 + 4 * 45);
      curtain.classList.remove('is-in', 'is-out');
      transitioning = false;
    });
  }
  // Back/forward cache restores the page with the curtain still closed; reopen it.
  addEventListener('pageshow', (e) => {
    if (!e.persisted || !curtain) return;
    curtain.classList.remove('is-in', 'is-out');
    transitioning = false;
  });

  const pagePath = (p) => p.replace(/index\.html$/, '');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return;
    if (pagePath(url.pathname) === pagePath(location.pathname)) {
      const id = url.hash.slice(1) || 'top';
      const target = document.getElementById(id);
      if (!target || id === 'main') return;
      e.preventDefault();
      history.replaceState(null, '', id === 'top' ? location.pathname : `#${id}`);
      goTo(target);
      return;
    }
    if (reduce || !curtain) return;
    e.preventDefault();
    leaveTo(url.href, a.dataset.title || a.textContent.trim() || 'Critter');
  });

  /* ---------- nav backdrop once scrolled ---------- */
  const syncNavBackdrop = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  syncNavBackdrop();
  addEventListener('scroll', syncNavBackdrop, { passive: true });

  /* ---------- nav active state (in-page links only) ---------- */
  const navLinks = $$('[data-nav-links] a[href^="#"]');
  const sectionIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`));
    }
  }, { rootMargin: '-45% 0px -50% 0px' });
  if (navLinks.length) $$('main > section[id]').forEach((s) => sectionIO.observe(s));

  /* ---------- forums link ---------- */
  const forumLink = $('[data-forum-link]');
  if (forumLink) {
    if (FORUM_URL) {
      forumLink.href = FORUM_URL;
      forumLink.target = '_blank';
      forumLink.rel = 'noopener';
    } else {
      forumLink.textContent = 'Opening soon';
      forumLink.setAttribute('aria-disabled', 'true');
    }
  }

  /* ---------- companies ---------- */
  const companiesEl = $('[data-companies]');
  if (companiesEl) {
    if (!COMPANIES.length) {
      const soon = document.createElement('p');
      soon.className = 'company-soon';
      soon.textContent = 'First companies announced soon.';
      companiesEl.appendChild(soon);
    }
    COMPANIES.forEach((c, i) => {
      const card = document.createElement('article');
      card.className = 'company';
      card.dataset.reveal = '';
      card.style.setProperty('--d', i);
      if (c.url) {
        const domain = document.createElement('span');
        domain.className = 'company-domain';
        domain.textContent = new URL(c.url).host;
        card.appendChild(domain);
      }
      const name = document.createElement('h3');
      name.textContent = c.name;
      card.appendChild(name);
      if (c.description) {
        const desc = document.createElement('p');
        desc.textContent = c.description;
        card.appendChild(desc);
      }
      if (c.url) {
        const visit = document.createElement('a');
        visit.className = 'company-link';
        visit.href = c.url;
        visit.target = '_blank';
        visit.rel = 'noopener';
        visit.setAttribute('aria-label', `Visit the ${c.name} website`);
        visit.innerHTML = 'Visit website <span class="arrow" aria-hidden="true">↗</span>';
        card.appendChild(visit);
      }
      companiesEl.appendChild(card);
      revealIO.observe(card);
    });
  }

  /* ---------- magnetic buttons ---------- */
  function spring(apply) {
    let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
    const step = () => {
      x = lerp(x, tx, 0.14); y = lerp(y, ty, 0.14);
      apply(x, y);
      raf = Math.abs(x - tx) + Math.abs(y - ty) > 0.01 ? requestAnimationFrame(step) : 0;
    };
    return (nx, ny) => { tx = nx; ty = ny; if (!raf) raf = requestAnimationFrame(step); };
  }
  if (fine && !reduce) {
    $$('.btn').forEach((btn) => {
      const set = spring((x, y) => { btn.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`; });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        set((e.clientX - r.left - r.width / 2) * 0.3, (e.clientY - r.top - r.height / 2) * 0.4);
      });
      btn.addEventListener('pointerleave', () => set(0, 0));
    });
  }

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- scroll-linked: nav hide, hero fade, manifesto, headline weight field ---------- */
  if (reduce) return;
  const heroContent = $('[data-hero-content]');
  let lastY = scrollY;

  // Headline letters thicken toward the cursor. Rest positions are measured once the intro
  // has settled so the weight changes never feed back into the distances.
  let charPos = [];
  const charW = new Float32Array(heroChars.length).fill(500);
  const measureChars = () => {
    charPos = heroChars.map((c) => {
      const r = c.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + scrollY + r.height / 2];
    });
  };
  C.onReady(() => setTimeout(measureChars, 1700));
  let measureT = 0;
  addEventListener('resize', () => { clearTimeout(measureT); measureT = setTimeout(measureChars, 200); });
  const scrubP = new Float32Array(scrubWords.length).fill(-1);

  function frame() {
    const y = scrollY;
    const dy = y - lastY;
    lastY = y;
    const vh = innerHeight;

    if (!transitioning && Math.abs(dy) > 2) nav.classList.toggle('is-hidden', dy > 0 && y > vh * 0.6);

    if (heroContent && y < vh * 1.2) {
      const p = clamp(y / vh, 0, 1);
      heroContent.style.transform = `translate3d(0, ${p * vh * 0.2}px, 0)`;
      heroContent.style.opacity = String(1 - p * 1.1);

      if (charPos.length) {
        const mx = C.mouse.x, my = C.mouse.y + y, on = C.mouse.inside && C.mouse.y < vh;
        const S2 = 2 * 150 * 150;
        for (let i = 0; i < heroChars.length; i++) {
          const dx = charPos[i][0] - mx, dy = charPos[i][1] - my;
          const goal = on ? 500 + 300 * Math.exp(-(dx * dx + dy * dy) / S2) : 500;
          const w = lerp(charW[i], goal, 0.12);
          if (Math.abs(w - charW[i]) > 0.3) heroChars[i].style.fontWeight = String(Math.round(w));
          charW[i] = w;
        }
      }
    }

    if (scrubEl) {
      const r = scrubEl.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        const lit = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.25), 0, 1) * (scrubWords.length + 4);
        for (let i = 0; i < scrubWords.length; i++) {
          const p = clamp((lit - i) / 3, 0, 1);
          if (Math.abs(p - scrubP[i]) > 0.002) { scrubWords[i].style.setProperty('--p', p.toFixed(3)); scrubP[i] = p; }
        }
      }
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
