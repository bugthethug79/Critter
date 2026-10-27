/* ==========================================================================
   Critter — landing page interactions
   No dependencies. Everything respects prefers-reduced-motion.
   ========================================================================== */

/*
 * Companies shown in section 04. Add one object per company:
 *
 *   { name: "Name", description: "What it does", url: "https://…", live: true }
 *
 * While the list is empty, a short "launching soon" note is shown instead.
 */
const COMPANIES = [];

(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ------------------------------------------------------------------------
     Hero dot field: a sheet of perforated metal. Dots swell and part
     around the cursor, and a slow light passes across the sheet.
     ------------------------------------------------------------------------ */
  const field = (() => {
    const canvas = $("[data-field]");
    if (!canvas) return null;
    const ctx = canvas.getContext("2d");
    let W = 0, H = 0, dpr = 1, gap = 22, cols = 0, rows = 0;
    let visible = true;
    const start = performance.now();
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const accent = [255, 106, 61];

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      gap = W < 600 ? 18 : 22;
      cols = Math.ceil(W / gap) + 1;
      rows = Math.ceil(H / gap) + 1;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduceMotion) draw(performance.now() + 4000);
    }

    function draw(now) {
      const t = (now - start) / 1000;
      ctx.clearRect(0, 0, W, H);

      mouse.x = lerp(mouse.x, mouse.tx, 0.12);
      mouse.y = lerp(mouse.y, mouse.ty, 0.12);

      // Sweep the sheet in from the right on load
      const intro = reduceMotion ? 1 : clamp((t - 0.2) / 1.8);
      const sweepX = W * (1 - intro * 1.4);
      // A slow band of light drifting across the surface
      const band = ((t * 0.06) % 1.6 - 0.3) * W;
      const ox = (W % gap) / 2;
      const oy = (H % gap) / 2;

      for (let j = 0; j < rows; j++) {
        const y0 = oy + j * gap;
        for (let i = 0; i < cols; i++) {
          const x0 = ox + i * gap;
          if (x0 < sweepX) continue;

          // Fade toward the headline (left) and bottom so text stays clear
          let mask;
          if (W < 700) {
            // Narrow screens: keep the sheet in the open space above the headline
            mask = clamp(1 - (y0 / H - 0.08) / 0.18) * clamp((x0 / W - 0.15) / 0.5);
          } else {
            const side = clamp((x0 / W - 0.42) / 0.4);
            mask = side * side * clamp(1 - (y0 / H - 0.55) / 0.45);
          }
          if (mask < 0.02) continue;

          const dx = x0 - mouse.x;
          const dy = y0 - mouse.y;
          const d2 = dx * dx + dy * dy;
          const lift = Math.exp(-d2 / (2 * 110 * 110));
          const d = Math.sqrt(d2) || 1;
          const push = lift * 9;
          const x = x0 + (dx / d) * push;
          const y = y0 + (dy / d) * push;

          const wave = 0.5 + 0.5 * Math.sin(x0 * 0.011 + y0 * 0.006 + t * 0.7);
          const light = Math.exp(-Math.pow((x0 + y0 * 0.35 - band) / 160, 2));
          const edge = clamp((x0 - sweepX) / 140);

          const r = 0.75 + wave * 0.35 + lift * 1.5 + light * 0.3;
          const a = (0.09 + wave * 0.08 + light * 0.18 + lift * 0.55) * mask * edge;
          if (a < 0.01) continue;

          const k = clamp(lift * 1.6 - 0.35);
          const cr = Math.round(lerp(237, accent[0], k));
          const cg = Math.round(lerp(237, accent[1], k));
          const cb = Math.round(lerp(238, accent[2], k));
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function loop(now) {
      if (visible) draw(now);
      requestAnimationFrame(loop);
    }

    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.tx = e.clientX - r.left;
        mouse.ty = e.clientY - r.top;
      }, { passive: true });
      document.addEventListener("pointerleave", () => { mouse.tx = mouse.ty = -9999; });
    }

    resize();
    if (!reduceMotion) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(canvas);
      requestAnimationFrame(loop);
    }
    return { resize };
  })();

  /* ------------------------------------------------------------------------
     Split headings into words for the reveal
     ------------------------------------------------------------------------ */
  $$("[data-split]").forEach((el) => {
    const text = el.textContent.trim().replace(/\s+/g, " ");
    el.setAttribute("aria-label", text);
    el.textContent = "";
    text.split(" ").forEach((word, i, arr) => {
      const w = document.createElement("span");
      w.className = "w";
      w.setAttribute("aria-hidden", "true");
      const wi = document.createElement("span");
      wi.className = "wi";
      wi.style.setProperty("--i", i);
      wi.textContent = word;
      w.appendChild(wi);
      el.appendChild(w);
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
    if (!COMPANIES.length) {
      companiesEl.className = "companies-empty";
      companiesEl.setAttribute("data-reveal", "");
      const p = document.createElement("p");
      p.innerHTML = "<strong>Our first companies are getting ready to launch.</strong> They'll be listed here as they go live.";
      const status = document.createElement("span");
      status.className = "co-status mono";
      status.setAttribute("data-live", "");
      status.textContent = "In progress";
      companiesEl.append(p, status);
    } else {
      COMPANIES.forEach((co, i) => {
        const card = document.createElement(co.url ? "a" : "div");
        card.className = "co";
        card.setAttribute("data-reveal", "");
        card.style.setProperty("--d", i % 3);
        if (co.url) {
          card.href = co.url;
          card.target = "_blank";
          card.rel = "noopener";
        }
        const top = document.createElement("div");
        top.className = "co-top mono";
        const status = document.createElement("span");
        status.className = "co-status";
        if (co.live) status.setAttribute("data-live", "");
        status.textContent = co.live ? "Live" : "Coming soon";
        top.append(status);

        const body = document.createElement("div");
        body.className = "co-body";
        const name = document.createElement("p");
        name.className = "co-name";
        name.textContent = co.name;
        const desc = document.createElement("p");
        desc.className = "co-niche";
        desc.textContent = co.description || "";
        const endorse = document.createElement("p");
        endorse.className = "co-endorse mono";
        const line = document.createElement("span");
        line.textContent = "a Critter company";
        endorse.append(line);
        if (co.url) {
          const arrow = document.createElement("span");
          arrow.className = "co-arrow";
          arrow.setAttribute("aria-hidden", "true");
          arrow.textContent = "↗";
          endorse.append(arrow);
        }
        body.append(name, desc, endorse);
        card.append(top, body);
        companiesEl.appendChild(card);
      });

      companiesEl.addEventListener("pointermove", (e) => {
        const card = e.target.closest(".co");
        if (!card) return;
        const r = card.getBoundingClientRect();
        card.style.setProperty("--x", `${e.clientX - r.left}px`);
        card.style.setProperty("--y", `${e.clientY - r.top}px`);
      });
    }
  }

  /* ------------------------------------------------------------------------
     Reveal on view
     ------------------------------------------------------------------------ */
  const tree = $("[data-tree]");
  const revealEls = $$("[data-reveal], [data-split], [data-tree]");
  const onReveal = (el) => {
    el.classList.add("is-in");
    // Once the diagram has built itself, start the flow along the wires
    if (el === tree) setTimeout(() => tree.classList.add("is-flowing"), reduceMotion ? 0 : 2400);
  };
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(onReveal);
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            onReveal(en.target);
            io.unobserve(en.target);
          }
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );
    revealEls.forEach((el) => io.observe(el));
  }

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
     Scroll-driven state: nav, standards list
     ------------------------------------------------------------------------ */
  const nav = $("[data-nav]");
  const navLinks = $$(".nav-links a");
  const principles = $$("[data-principle]");
  const odo = $("[data-odo]");
  const howProgress = $("[data-how-progress]");
  const howList = $(".principles");
  let lastY = window.scrollY;
  let activeIdx = -1;

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
    if (best !== activeIdx) {
      activeIdx = best;
      principles.forEach((el, i) => el.classList.toggle("is-active", i === best));
      if (odo) odo.style.setProperty("--i", best);
    }
    if (howProgress && howList) {
      const r = howList.getBoundingClientRect();
      howProgress.parentElement.style.setProperty("--hp", clamp((mid - r.top) / r.height).toFixed(4));
    }
  }

  function onScroll() {
    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    if (nav) updateNav(y, dy);
    updatePrinciples();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

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
        const want = Math.atan2(dy, dx);
        const diff = ((want - bug.a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
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
        leg(1, i, -sA);
      }

      // Antennae
      const tw = Math.sin(performance.now() / 260) * 0.12;
      ctx.beginPath();
      ctx.moveTo(6.2 * S, -0.8 * S);
      ctx.quadraticCurveTo(9 * S, -2.6 * S, 11 * S, (-4.4 + tw * 6) * S);
      ctx.moveTo(6.2 * S, 0.8 * S);
      ctx.quadraticCurveTo(9 * S, 2.6 * S, 11 * S, (4.4 - tw * 6) * S);
      ctx.stroke();

      // Abdomen, wing seam, head
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
      return Math.hypot(e.clientX - r.left - bug.x, e.clientY - r.top - bug.y) < 26;
    }

    canvas.addEventListener("click", (e) => {
      if (!hit(e)) return;
      bug.spin = 0.45;
      bug.pause = 0;
      bug.flee = 1;
      pickTarget();
    });

    const footer = $("[data-footer]");
    footer.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
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

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      field && field.resize();
      critter && critter.resize();
    }, 150);
  });

  requestAnimationFrame(() => root.classList.add("is-loaded"));
})();
