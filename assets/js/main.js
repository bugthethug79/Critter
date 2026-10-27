/* ==========================================================================
   Critter — landing page interactions
   No dependencies. Everything respects prefers-reduced-motion.
   ========================================================================== */

/*
 * Companies shown in section 03. Add one object per company; the grid
 * pads itself with "unannounced" slots up to MIN_COMPANY_SLOTS.
 *
 *   { name: "Name", niche: "What it does", url: "https://…", live: true }
 */
const COMPANIES = [];
const MIN_COMPANY_SLOTS = 3;

(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ------------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------------ */
  const toastEl = $("[data-toast]");
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("is-shown");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("is-shown"), 2200);
  }

  /* ------------------------------------------------------------------------
     Brushed aluminum texture, generated once
     ------------------------------------------------------------------------ */
  function brushedTexture() {
    const W = 1024, H = 640;
    // Narrow noise strip, stretched horizontally → long brushed streaks
    const strip = document.createElement("canvas");
    strip.width = 48;
    strip.height = H;
    const sctx = strip.getContext("2d");
    const sdata = sctx.createImageData(strip.width, H);
    for (let y = 0; y < H; y++) {
      const row = Math.random() * 30;
      for (let x = 0; x < strip.width; x++) {
        const v = row + Math.random() * 18;
        const i = (y * strip.width + x) * 4;
        sdata.data[i] = sdata.data[i + 1] = sdata.data[i + 2] = 255;
        sdata.data[i + 3] = v;
      }
    }
    sctx.putImageData(sdata, 0, 0);

    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.globalAlpha = 0.5;
    ctx.drawImage(strip, 0, 0, W, H);

    // Fine grain on top
    const img = ctx.getImageData(0, 0, W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 10;
      img.data[i + 3] = clamp(img.data[i + 3] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/png");
  }

  const lidSurface = $("[data-lid-surface]");
  if (lidSurface) {
    try {
      lidSurface.style.setProperty("--brushed", `url(${brushedTexture()})`);
      lidSurface.style.backgroundSize = "100% 100%, cover";
    } catch (_) { /* flat fallback is fine */ }
  }

  /* ------------------------------------------------------------------------
     Split text
     ------------------------------------------------------------------------ */
  $$("[data-split]").forEach((el) => {
    const text = el.textContent.trim().replace(/\s+/g, " ");
    const scrub = el.dataset.split === "scrub";
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(" ").forEach((word, i, arr) => {
      if (scrub) {
        const s = document.createElement("span");
        s.className = "ws";
        s.setAttribute("aria-hidden", "true");
        s.textContent = word;
        el.appendChild(s);
      } else {
        const w = document.createElement("span");
        w.className = "w";
        w.setAttribute("aria-hidden", "true");
        const wi = document.createElement("span");
        wi.className = "wi";
        wi.style.setProperty("--i", i);
        wi.textContent = word;
        w.appendChild(wi);
        el.appendChild(w);
      }
      if (i < arr.length - 1) el.appendChild(document.createTextNode(" "));
    });
  });

  // Normalize glyph paths so stroke-dash drawing works on any shape
  $$(".g-draw").forEach((p) => p.setAttribute("pathLength", "1"));

  /* ------------------------------------------------------------------------
     Companies
     ------------------------------------------------------------------------ */
  const companiesEl = $("[data-companies]");
  if (companiesEl) {
    const slots = Math.max(MIN_COMPANY_SLOTS, COMPANIES.length);
    const pad = (n) => String(n).padStart(2, "0");
    for (let i = 0; i < slots; i++) {
      const co = COMPANIES[i];
      const card = document.createElement(co && co.url ? "a" : "div");
      card.className = "co" + (co ? "" : " co--soon");
      card.setAttribute("data-reveal", "");
      card.style.setProperty("--d", i % 3);
      card.style.setProperty("--n", i);
      if (co && co.url) {
        card.href = co.url;
        card.target = "_blank";
        card.rel = "noopener";
      }
      const top = document.createElement("div");
      top.className = "co-top mono";
      const num = document.createElement("span");
      num.textContent = `C—${pad(i + 1)}`;
      const status = document.createElement("span");
      status.className = "co-status";
      if (co && co.live) status.setAttribute("data-live", "");
      status.textContent = co ? (co.live ? "Live" : "In development") : "Unannounced";
      top.append(num, status);

      const body = document.createElement("div");
      body.className = "co-body";
      const name = document.createElement("p");
      name.className = "co-name";
      const niche = document.createElement("p");
      niche.className = "co-niche";
      if (co) {
        name.textContent = co.name;
        niche.textContent = co.niche || "";
      } else {
        name.setAttribute("aria-label", "Unannounced company");
        niche.textContent = "Coming soon";
      }
      const endorse = document.createElement("p");
      endorse.className = "co-endorse mono";
      const line = document.createElement("span");
      line.textContent = "a Critter company";
      const arrow = document.createElement("span");
      arrow.className = "co-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = co && co.url ? "↗" : "·";
      endorse.append(line, arrow);
      body.append(name, niche, endorse);
      card.append(top, body);
      companiesEl.appendChild(card);
    }

    companiesEl.addEventListener("pointermove", (e) => {
      const card = e.target.closest(".co");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--x", `${e.clientX - r.left}px`);
      card.style.setProperty("--y", `${e.clientY - r.top}px`);
    });
  }

  /* ------------------------------------------------------------------------
     Reveal on view
     ------------------------------------------------------------------------ */
  const revealEls = $$("[data-reveal], [data-split]:not([data-split='scrub'])");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("is-in");
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------------
     Copy buttons, year
     ------------------------------------------------------------------------ */
  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        btn.textContent = "Copied";
        toast(`Copied ${value}`);
      } catch (_) {
        toast(value);
      }
      setTimeout(() => (btn.textContent = "Copy"), 1800);
    });
  });
  const yearEl = $("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ------------------------------------------------------------------------
     Magnetic buttons
     ------------------------------------------------------------------------ */
  if (finePointer && !reduceMotion) {
    $$("[data-magnetic]").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = "transform 0.2s ease-out";
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)";
        el.style.transform = "";
      });
    });
  }

  /* ------------------------------------------------------------------------
     Scroll-driven state: hero lid, nav, principles, lineage, marquee
     ------------------------------------------------------------------------ */
  const hero = $("[data-hero]");
  const nav = $("[data-nav]");
  const navLinks = $$(".nav-links a");
  const principles = $$("[data-principle]");
  const odo = $("[data-odo]");
  const howProgress = $("[data-how-progress]");
  const howList = $(".principles");
  const scrubEls = $$("[data-split='scrub']");
  const marquee = $("[data-marquee]");

  const pointer = { x: 0.5, y: 0.5 };
  const state = {
    o: 0, copy: 0, cap: 0, tx: 0, ty: 0, sx: -30,
    lastY: window.scrollY, vel: 0, marqueeX: 0, activeIdx: -1,
  };
  const t0 = performance.now();

  window.addEventListener("pointermove", (e) => {
    pointer.x = e.clientX / window.innerWidth;
    pointer.y = e.clientY / window.innerHeight;
  }, { passive: true });

  // Marquee: clone the row until there's enough to loop seamlessly
  let rowWidth = 0;
  function buildMarquee() {
    if (!marquee) return;
    const first = marquee.firstElementChild;
    $$(".marquee-row", marquee).slice(1).forEach((r) => r.remove());
    rowWidth = first.getBoundingClientRect().width;
    const copies = Math.ceil((window.innerWidth * 2) / Math.max(rowWidth, 1)) + 1;
    for (let i = 0; i < copies; i++) {
      const clone = first.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      marquee.appendChild(clone);
    }
  }
  buildMarquee();

  function heroTargets() {
    if (!hero) return { o: 1, copy: 0, cap: 1 };
    if (reduceMotion) return { o: 1, copy: 0, cap: 1 };
    const r = hero.getBoundingClientRect();
    const total = Math.max(1, hero.offsetHeight - window.innerHeight);
    const p = clamp(-r.top / total);
    return {
      o: easeInOut(clamp((p - 0.04) / 0.66)),
      copy: clamp((p - 0.02) / 0.4),
      cap: clamp((p - 0.55) / 0.3),
    };
  }

  function updateNav(y, dy) {
    nav.classList.toggle("is-scrolled", y > 12);
    if (y > window.innerHeight * 0.6 && dy > 4) nav.classList.add("is-hidden");
    else if (dy < -4 || y < 80) nav.classList.remove("is-hidden");

    let current = null;
    navLinks.forEach((a) => {
      const sec = $(a.getAttribute("href"));
      if (!sec) return;
      const r = sec.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.4 && r.bottom > window.innerHeight * 0.4) current = a;
    });
    navLinks.forEach((a) => a.classList.toggle("is-active", a === current));
  }

  function updatePrinciples() {
    if (!principles.length) return;
    const mid = window.innerHeight * 0.5;
    let best = 0, bestD = Infinity;
    principles.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (best !== state.activeIdx) {
      state.activeIdx = best;
      principles.forEach((el, i) => el.classList.toggle("is-active", i === best));
      if (odo) odo.style.setProperty("--i", best);
    }
    if (howProgress && howList) {
      const r = howList.getBoundingClientRect();
      const p = clamp((mid - r.top) / r.height);
      howProgress.parentElement.style.setProperty("--hp", p.toFixed(4));
    }
  }

  function updateScrub() {
    scrubEls.forEach((el) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35));
      const words = el.children;
      const n = words.length;
      for (let i = 0; i < n; i++) {
        const f = reduceMotion ? 1 : clamp(p * (n + 3) - i);
        words[i].style.setProperty("--f", f.toFixed(3));
      }
    });
  }

  function frame(now) {
    const y = window.scrollY;
    const dy = y - state.lastY;
    state.lastY = y;
    state.vel = lerp(state.vel, dy, 0.12);

    // Hero lid
    if (hero) {
      const t = heroTargets();
      const k = reduceMotion ? 1 : 0.09;
      state.o = lerp(state.o, t.o, k);
      state.copy = lerp(state.copy, t.copy, k * 1.4);
      state.cap = lerp(state.cap, t.cap, k);

      const intro = clamp((now - t0 - 600) / 2400);
      const introSx = lerp(-40, 30, easeInOut(intro));
      const px = finePointer ? pointer.x - 0.5 : 0;
      const py = finePointer ? pointer.y - 0.5 : 0;
      const tiltK = reduceMotion ? 0 : state.o;
      state.tx = lerp(state.tx, py * 5 * tiltK, 0.08);
      state.ty = lerp(state.ty, px * -7 * tiltK, 0.08);
      state.sx = lerp(state.sx, introSx + state.o * 22 + px * 60, 0.08);

      const s = hero.style;
      s.setProperty("--o", state.o.toFixed(4));
      s.setProperty("--copy", state.copy.toFixed(4));
      s.setProperty("--cap", state.cap.toFixed(4));
      s.setProperty("--tx", state.tx.toFixed(3));
      s.setProperty("--ty", state.ty.toFixed(3));
      s.setProperty("--sx", state.sx.toFixed(2));
      hero.toggleAttribute("data-copy-hidden", state.copy > 0.5);
    }

    if (nav) updateNav(y, dy);
    updatePrinciples();
    updateScrub();

    // Marquee: slow drift, nudged by scroll velocity
    if (marquee && rowWidth && !reduceMotion) {
      const speed = 0.45 + Math.min(Math.abs(state.vel) * 0.35, 14);
      state.marqueeX -= speed;
      if (-state.marqueeX >= rowWidth) state.marqueeX += rowWidth;
      marquee.style.transform = `translate3d(${state.marqueeX.toFixed(2)}px,0,0)`;
    }

    requestAnimationFrame(frame);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      buildMarquee();
      critter && critter.resize();
    }, 150);
  });

  /* ------------------------------------------------------------------------
     The critter: a small bug that lives in the footer.
     Walks with a tripod gait, wanders, and keeps its distance from the cursor.
     ------------------------------------------------------------------------ */
  const critter = (() => {
    const canvas = $("[data-critter]");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1;
    let visible = false;
    let last = performance.now();
    const S = 1.7; // scale

    const bug = {
      x: -30, y: 80, a: 0, v: 0,
      tx: 120, ty: 90,
      phase: 0, pause: 0, flee: 0, spin: 0,
    };
    const mouse = { x: -999, y: -999 };

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) { bug.x = W * 0.72; bug.y = H * 0.38; bug.a = -0.3; draw(); }
    }

    function pickTarget() {
      bug.tx = 40 + Math.random() * (W - 80);
      bug.ty = 30 + Math.random() * (H * 0.55);
    }

    function step(dt) {
      const dxm = bug.x - mouse.x;
      const dym = bug.y - mouse.y;
      const dm = Math.hypot(dxm, dym);
      if (dm < 110) {
        bug.flee = 1;
        bug.pause = 0;
        bug.tx = clamp(bug.x + (dxm / dm) * 160, 20, W - 20);
        bug.ty = clamp(bug.y + (dym / dm) * 160, 20, H - 20);
      }

      const dx = bug.tx - bug.x;
      const dy = bug.ty - bug.y;
      const dist = Math.hypot(dx, dy);

      if (bug.pause > 0) {
        bug.pause -= dt;
        bug.v = lerp(bug.v, 0, 0.2);
      } else if (dist < 8) {
        bug.flee = 0;
        bug.pause = Math.random() < 0.6 ? 0.6 + Math.random() * 2.4 : 0;
        pickTarget();
      } else {
        let want = Math.atan2(dy, dx);
        let diff = ((want - bug.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        const turn = (bug.flee ? 7 : 3.2) * dt;
        bug.a += clamp(diff, -turn, turn);
        const top = bug.flee ? 170 : 46;
        const facing = Math.max(0, Math.cos(diff));
        bug.v = lerp(bug.v, top * (0.3 + 0.7 * facing), 0.08);
      }

      if (bug.spin > 0) {
        bug.spin -= dt;
        bug.a += dt * 14;
      }

      bug.x += Math.cos(bug.a) * bug.v * dt;
      bug.y += Math.sin(bug.a) * bug.v * dt;
      bug.phase += bug.v * dt * 0.22;
    }

    function leg(side, i, swing) {
      // side: 1 right, -1 left; i: 0 front, 1 mid, 2 back
      const hx = [2.4, 0.2, -2.2][i] * S;
      const kx = hx + ([1.6, 0, -1.8][i] + swing * 3) * S;
      const ky = side * 4.6 * S;
      const fx = kx + ([2.6, 0.2, -3][i] + swing * 2) * S;
      const fy = ky + side * 2.2 * S;
      ctx.beginPath();
      ctx.moveTo(hx, side * 1.4 * S);
      ctx.lineTo(kx, ky);
      ctx.lineTo(fx, fy);
      ctx.stroke();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      ctx.save();
      ctx.translate(bug.x, bug.y);
      ctx.rotate(bug.a);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(-0.5 * S, 1.2 * S, 7.5 * S, 4.4 * S, 0, 0, Math.PI * 2);
      ctx.fill();

      // Legs: tripod gait, L0 R1 L2 together, R0 L1 R2 opposite
      ctx.strokeStyle = "#6c6d73";
      ctx.lineWidth = 1.1;
      const amp = Math.min(1, bug.v / 30) * 0.42;
      for (let i = 0; i < 3; i++) {
        const sA = Math.sin(bug.phase + (i % 2 ? Math.PI : 0)) * amp;
        leg(-1, i, sA);
        leg(1, i, -Math.sin(bug.phase + (i % 2 ? 0 : Math.PI)) * amp);
      }

      // Antennae
      const tw = Math.sin(performance.now() / 260) * 0.12;
      ctx.beginPath();
      ctx.moveTo(6.2 * S, -0.8 * S);
      ctx.quadraticCurveTo(9 * S, -2.6 * S, 11 * S, (-4.4 + tw * 6) * S);
      ctx.moveTo(6.2 * S, 0.8 * S);
      ctx.quadraticCurveTo(9 * S, 2.6 * S, 11 * S, (4.4 - tw * 6) * S);
      ctx.stroke();

      // Abdomen + thorax + head
      ctx.fillStyle = "#1f2023";
      ctx.strokeStyle = "#7d7e84";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(-2 * S, 0, 5.4 * S, 3.6 * S, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-6.6 * S, 0);
      ctx.lineTo(2.4 * S, 0);
      ctx.strokeStyle = "#3a3b40";
      ctx.stroke();
      ctx.strokeStyle = "#7d7e84";
      ctx.beginPath();
      ctx.arc(4.8 * S, 0, 1.9 * S, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    function loop(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visible) {
        step(dt);
        draw();
      }
      requestAnimationFrame(loop);
    }

    function hit(e) {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      return Math.hypot(x - bug.x, y - bug.y) < 26;
    }

    canvas.addEventListener("click", (e) => {
      if (!hit(e)) return;
      toast("a bug is a critter.");
      bug.spin = 0.45;
      bug.pause = 0;
      bug.flee = 1;
      pickTarget();
    });

    const footer = $("[data-footer]");
    footer.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      // Let the bug notice the cursor a beat late, so it can be caught
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      canvas.style.cursor = hit(e) ? "pointer" : "";
    });
    footer.addEventListener("pointerleave", () => { mouse.x = mouse.y = -999; });

    resize();
    pickTarget();
    bug.y = 40 + Math.random() * (H * 0.4);

    if (!reduceMotion) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
      requestAnimationFrame(loop);
    }

    return { resize };
  })();

  /* ------------------------------------------------------------------------
     Start
     ------------------------------------------------------------------------ */
  requestAnimationFrame(() => {
    root.classList.add("is-loaded");
    requestAnimationFrame(frame);
  });

  if (window.console) {
    console.log(
      "%cCritter%c\nWhen we make something, we make it well.\nhello@critter.holdings",
      "font: 600 20px Geist, system-ui; letter-spacing: -0.04em;",
      "font: 12px 'Geist Mono', monospace; color: #8b8c92;"
    );
  }
})();
