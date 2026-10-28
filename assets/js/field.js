/* Critter background: one fixed WebGL layer behind the whole page. Soft pink, blush and dusty
   rose glows drift on a slowly warping flow over near-black, with fine grain that also dithers
   away banding. Each section has its own arrangement of glows, and the glows travel to the next
   arrangement as you cross into the next section, which is what separates the sections.
   A faint pink glow trails the cursor. */
(() => {
  'use strict';
  const C = window.CRITTER;
  const canvas = document.querySelector('[data-field]');
  if (!canvas) return;
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false });
  if (!gl) return;

  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
precision highp float;
uniform vec2 uRes, uMouse;
uniform float uTime, uStrength, uIntro, uMouseOn, uScene;

vec2 hash2(vec2 p){
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1. + 2. * fract(sin(p) * 43758.5453);
}
float gnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1., 0.)), f - vec2(1., 0.)), u.x),
             mix(dot(hash2(i + vec2(0., 1.)), f - vec2(0., 1.)), dot(hash2(i + vec2(1., 1.)), f - vec2(1., 1.)), u.x), u.y);
}
float grain(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
float glow(vec2 p, vec2 c, float k){ vec2 d = p - c; return exp(-dot(d, d) * k); }

// Each section has its own arrangement of glows; uScene (section index, fractional while
// crossing a boundary) blends between neighbouring arrangements.
vec2 pick(float i, vec2 a, vec2 b, vec2 c, vec2 d){
  i = mod(i, 4.);
  return i < .5 ? a : i < 1.5 ? b : i < 2.5 ? c : d;
}
vec2 scene(vec2 a, vec2 b, vec2 c, vec2 d){
  float i = floor(uScene), f = uScene - i;
  f = f * f * (3. - 2. * f);
  return mix(pick(i, a, b, c, d), pick(i + 1., a, b, c, d), f);
}

void main(){
  vec2 fc = gl_FragCoord.xy;
  vec2 s = (fc - .5 * uRes) / uRes.y;                // y up, one unit = viewport height
  float t = uTime * .045;

  // Warp the domain so the glows bend and smear instead of sliding as rigid circles.
  vec2 q = s + .32 * vec2(gnoise(s * 1.1 + vec2(t, -t)), gnoise(s * 1.1 + vec2(5.2, 1.3) - t));

  vec2 c1 = scene(vec2(.58, .22), vec2(-.65, .3), vec2(.2, -.45), vec2(.65, -.1))
          + vec2(.14 * sin(t * 1.3), .12 * cos(t * 1.1));
  vec2 c2 = scene(vec2(-.55, -.32), vec2(.6, -.35), vec2(-.7, .4), vec2(-.3, -.5))
          + vec2(.12 * cos(t * .9), .1 * sin(t * 1.25));
  vec2 c3 = scene(vec2(.05, .42), vec2(.3, .45), vec2(.75, .1), vec2(-.6, .4))
          + vec2(.25 * sin(t * .7 + 1.), .08 * cos(t * .8));

  vec3 pink  = vec3(.98, .68, .76);   // pastel pink; carries more chroma since it's drawn dim
  vec3 blush = vec3(1.0, .76, .68);   // warm peach blush
  vec3 dusty = vec3(.86, .60, .64);   // soft dusty rose for the low corner

  vec3 col = vec3(.043, .045, .045);
  col += pink  * glow(q, c1, 2.6) * .42;
  col += dusty * glow(q, c2, 2.2) * .2;
  col += blush * glow(q, c3, 4.5) * .16;

  vec2 m = (uMouse - .5 * uRes) / uRes.y;
  col += pink * glow(s, m, 10.) * .07 * uMouseOn;

  // Strength: full behind the hero, quiet behind content; intro fades it up from black.
  vec3 bg = vec3(.043, .045, .045);
  col = mix(bg, col, uStrength * uIntro);
  col *= 1. - .3 * smoothstep(.6, 1.35, length(s * vec2(.75, 1.)));
  col += (grain(fc) - .5) * .028;
  gl_FragColor = vec4(col, 1.);
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  } catch (err) { console.warn('[critter] field shader failed:', err); return; }
  gl.bindAttribLocation(prog, 0, 'p');
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.warn('[critter] field link failed:', gl.getProgramInfoLog(prog)); return; }
  gl.useProgram(prog);
  const u = {};
  for (const name of ['uRes', 'uMouse', 'uTime', 'uStrength', 'uScene', 'uIntro', 'uMouseOn']) {
    u[name] = gl.getUniformLocation(prog, name);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // A soft gradient doesn't need full resolution; grain is drawn per rendered pixel.
  let W = 0, H = 0, scale = 1;
  function resize() {
    W = Math.max(1, canvas.clientWidth); H = Math.max(1, canvas.clientHeight);
    scale = Math.min(devicePixelRatio || 1, 1);
    canvas.width = Math.round(W * scale);
    canvas.height = Math.round(H * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
  }
  resize();
  addEventListener('resize', () => { resize(); measure(); if (C.reduce) render(performance.now()); });

  // Section geometry for the scene index: [top, height] in document px.
  const sections = [...document.querySelectorAll('main > section')];
  let bounds = [];
  function measure() {
    bounds = sections.map((s) => { const r = s.getBoundingClientRect(); return [r.top + scrollY, r.height]; });
  }
  measure();
  addEventListener('load', measure);
  if (document.fonts) document.fonts.ready.then(measure);

  // Which section sits at mid-viewport. Each section holds its arrangement for most of its
  // height, then hands over to the next one across its final 35%.
  function sceneTarget() {
    const c = scrollY + H * 0.5;
    for (let i = bounds.length - 1; i >= 0; i--) {
      const [top, h] = bounds[i];
      if (c < top) continue;
      if (i === bounds.length - 1) return i;
      const f = C.clamp((c - top) / h, 0, 1);
      const e = C.clamp((f - 0.65) / 0.35, 0, 1);
      return i + e;
    }
    return 0;
  }

  const mouse = { x: W * 0.7, y: H * 0.4, on: 0 };
  let last = performance.now(), sceneNow = sceneTarget();

  function render(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const inside = C.mouse.inside && !C.reduce;
    const k = 1 - Math.exp(-dt * 4);
    if (inside) { mouse.x = C.lerp(mouse.x, C.mouse.x, k); mouse.y = C.lerp(mouse.y, C.mouse.y, k); }
    mouse.on = C.lerp(mouse.on, inside ? 1 : 0, k);

    const sp = scrollY / Math.max(1, H);
    const introT = C.ready ? (now - C.readyAt) / 1800 : 0;
    const intro = C.reduce ? 1 : 1 - Math.pow(1 - C.clamp(introT, 0, 1), 3);
    const goal = sceneTarget();
    sceneNow = C.reduce ? goal : C.lerp(sceneNow, goal, 1 - Math.exp(-dt * 2.5));

    gl.uniform1f(u.uTime, C.reduce ? 20 : now / 1000);
    gl.uniform1f(u.uScene, sceneNow);
    gl.uniform1f(u.uStrength, 1 - 0.4 * C.clamp(sp, 0, 1));
    gl.uniform1f(u.uIntro, intro);
    gl.uniform2f(u.uMouse, mouse.x * scale, (H - mouse.y) * scale);
    gl.uniform1f(u.uMouseOn, mouse.on);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  if (C.reduce) {
    C.onReady(() => render(performance.now()));
    addEventListener('scroll', () => render(performance.now()), { passive: true });
    return;
  }
  const loop = (now) => { if (!document.hidden) render(now); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
})();
