/* bm-core.js — shared runtime for Motion Studio projects.
   Built on Bang Motion's patterns (MIT, github.com/bangtutorial/bang-motion @ c1aa65e): jointed rig J(),
   per-stage cameras, cut/slide transitions, particle rules, the window.OPENER seek contract.
   Additions: any frame size (reels 1080x1920), sound/music cue lists for tools/sound.py,
   one per-frame render hook, deterministic noise (no Math.random: every frame is a function of t). */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const BM = (window.BM = {});
  BM.init = function ({ W = 1080, H = 1920, DUR = 10, svg }) {
    Object.assign(BM, { W, H, DUR, S: svg, SFX: [], MUSIC: [], scenes: [], hooks: [] });
    BM.tl = gsap.timeline({ paused: true });
    const stage = document.getElementById('stage');
    const fit = () => { const s = Math.min(innerWidth / W, innerHeight / H); stage.style.transform = `translate(-50%,-50%) scale(${s})`; };
    addEventListener('resize', fit); fit();
    BM.defs = BM.N('defs', {}, svg);
    return BM;
  };
  /* ---------- shape builders (Bang Motion style) ---------- */
  BM.N = (tag, a = {}, p = BM.S) => { const n = document.createElementNS(NS, tag); for (const k in a) n.setAttribute(k, a[k]); p.appendChild(n); return n; };
  BM.G = (a = {}, p = BM.S) => BM.N('g', a, p);
  BM.R = (x, y, w, h, f, rx = 0, p = BM.S, a = {}) => BM.N('rect', { x, y, width: w, height: h, rx, fill: f, ...a }, p);
  BM.CI = (cx, cy, r, f, p = BM.S, a = {}) => BM.N('circle', { cx, cy, r, fill: f, ...a }, p);
  BM.EL = (cx, cy, rx, ry, f, p = BM.S, a = {}) => BM.N('ellipse', { cx, cy, rx, ry, fill: f, ...a }, p);
  BM.PA = (d, f, p = BM.S, a = {}) => BM.N('path', { d, fill: f || 'none', ...a }, p);
  BM.LN = (d, st, w, p = BM.S, a = {}) => BM.N('path', { d, fill: 'none', stroke: st, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...a }, p);
  BM.TX = (x, y, t, size, f, p = BM.S, a = {}) => { const n = BM.N('text', { x, y, 'font-size': size, fill: f, 'text-anchor': 'middle', ...a }, p); n.textContent = t; return n; };
  BM.lg = (id, stops, vertical = true) => { const g = BM.N('linearGradient', { id, x1: 0, y1: 0, x2: vertical ? 0 : 1, y2: vertical ? 1 : 0 }, BM.defs);
    stops.forEach(([o, c, op = 1]) => BM.N('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, g)); return `url(#${id})`; };
  BM.rg = (id, stops) => { const g = BM.N('radialGradient', { id }, BM.defs); stops.forEach(([o, c, op = 1]) => BM.N('stop', { offset: o, 'stop-color': c, 'stop-opacity': op }, g)); return `url(#${id})`; };
  BM.shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), c = v => Math.min(255, Math.round(v * f));
    return '#' + ((1 << 24) + (c((n >> 16) & 255) << 16) + (c((n >> 8) & 255) << 8) + c(n & 255)).toString(16).slice(1); };
  /* JOINT: transform written by hand so rotation pivots on the local origin, never on the bbox (Bang Motion law 5) */
  BM.J = (el, tx = 0, ty = 0) => { const j = { el, tx, ty, x: 0, y: 0, r: 0, sx: 1, sy: 1,
    apply() { el.setAttribute('transform', `translate(${j.tx + j.x},${j.ty + j.y}) rotate(${j.r}) scale(${j.sx},${j.sy})`); } }; j.apply(); return j; };
  /* ---------- stages with their own camera; z >= 1.05 so nothing reads as a miniature ---------- */
  BM.scene = (name) => { const g = BM.G({ 'data-name': name }); g.style.display = 'none';
    const sc = { name, g, cam: { x: BM.W / 2, y: BM.H / 2, z: 1.08, ox: 0, oy: 0, r: 0 },
      apply() { const c = sc.cam; g.setAttribute('transform', `translate(${BM.W / 2 - (c.x + c.ox) * c.z},${BM.H / 2 - (c.y + c.oy) * c.z}) scale(${c.z}) rotate(${c.r} ${c.x} ${c.y})`); } };
    sc.apply(); BM.scenes.push(sc); return sc; };
  /* ---------- timeline helpers ---------- */
  const tl = () => BM.tl;
  BM.at = (t, fn) => tl().call(fn, null, t);
  BM.show = (el, at, d = .4) => tl().fromTo(el, { opacity: 0 }, { opacity: 1, duration: d, ease: 'power2.out', immediateRender: false }, at);
  BM.hide = (el, at, d = .3) => tl().to(el, { opacity: 0, duration: d, ease: 'power2.in' }, at);
  BM.rot = (j, at, v, dur, ease = 'power2.inOut') => tl().to(j, { r: v, duration: dur, ease, onUpdate: j.apply }, at);
  BM.jto = (j, at, props, dur, ease = 'power2.inOut') => tl().to(j, { ...props, duration: dur, ease, onUpdate: j.apply }, at);
  BM.sway = (j, at, v, dur, until) => { const n = until ? Math.max(1, Math.floor((until - at) / dur)) : -1;
    tl().fromTo(j, { r: -v }, { r: v, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: n, onUpdate: j.apply, immediateRender: false }, at); };
  BM.spin = (j, at, period, until) => tl().fromTo(j, { r: 0 }, { r: 360, duration: period, ease: 'none', repeat: until ? Math.ceil((until - at) / period) : -1, onUpdate: j.apply, immediateRender: false }, at);
  BM.pop = (el, at, d = .35, from = .4) => tl().fromTo(el, { opacity: 0, scale: from, transformOrigin: '50% 50%' }, { opacity: 1, scale: 1, duration: d, ease: 'back.out(2.2)', immediateRender: false }, at);
  BM.cam = (sc, at, x, y, z, dur = 1.4, ease = 'sine.inOut') => tl().to(sc.cam, { x, y, z, duration: dur, ease, onUpdate: sc.apply }, at);
  BM.setCam = (sc, at, x, y, z) => tl().set(sc.cam, { x, y, z, onComplete: sc.apply, onUpdate: sc.apply }, at);
  BM.cut = (at, from, to) => { if (from) tl().set(from.g, { display: 'none' }, at); tl().set(to.g, { display: 'block' }, at); };
  /* camera shake: closed-form decaying sine (no randomness) */
  BM.shake = (sc, at, amp = 26, dur = .6, freq = 23) => { const o = { k: 0 };
    tl().to(o, { k: 1, duration: dur, ease: 'none', onUpdate() { const d = 1 - o.k, t = o.k * dur;
      sc.cam.ox = Math.sin(t * freq) * amp * d * d; sc.cam.oy = Math.cos(t * freq * 1.3) * amp * .8 * d * d; sc.apply(); },
      onComplete() { sc.cam.ox = 0; sc.cam.oy = 0; sc.apply(); } }, at); };
  /* deterministic pseudo-random */
  BM.hash = (i) => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  /* ---------- sound & music cue lists (rendered by tools/sound.py) ---------- */
  BM.sfx = (t, type, gain = 1, dur = null) => BM.SFX.push({ t: +t.toFixed(3), type, gain, dur });
  BM.music = (t0, t1, style, gain = 1) => BM.MUSIC.push({ t0, t1, style, gain });
  /* per-frame hook for things that are a function of time (charts, counters, particles) */
  BM.everyFrame = (fn) => BM.hooks.push(fn);
  BM.finish = () => {
    const DUR = BM.DUR, T = tl();
    T.to({ p: 0 }, { p: 1, duration: DUR, ease: 'none', onUpdate() { const t = T.time(); BM.hooks.forEach(f => f(t)); } }, 0);
    T.to({}, { duration: .01 }, DUR - .01);
    const applyAll = () => BM.scenes.forEach(s => s.apply());
    const q = new URLSearchParams(location.search);
    window.OPENER = { W: BM.W, H: BM.H, DURATION: DUR, tl: T, SFX: BM.SFX, MUSIC: BM.MUSIC, ready: false,
      seek(t) { T.pause(t, false); applyAll(); BM.hooks.forEach(f => f(t)); } };
    T.eventCallback('onComplete', () => T.play(0));
    document.fonts.ready.then(() => { applyAll(); window.OPENER.seek(0); window.OPENER.ready = true; if (!q.has('clean')) T.play(0); });
  };
})();
