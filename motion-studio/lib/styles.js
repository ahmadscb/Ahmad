/* styles.js — six style packs with their own artistic identity (needs bm-core.js; camera.js for subtitles).
   A pack is not a palette swap: each defines typography, composition grid, easing/timing language, character render
   mode, transitions, music and its own components. BM.STYLE.use(name) applies subtitle style + returns the pack. */
(function () {
  const { G, R, CI, PA, LN, TX, J, hash } = BM, tl = () => BM.tl;
  const ST = (BM.STYLE = {});
  const P = (o) => o;   // documentation helper

  /* ---------------- 1. CARTOON: funny 2D shorts ---------------- */
  ST.cartoon = P({
    name: 'Funny 2D cartoon', font: 'Fredoka, Inter, sans-serif', weight: 700,
    pal: { bg: '#F3E6CF', ink: '#1E1B2E', a: '#4C7DFF', b: '#FF7A59', c: '#FFC83D' },
    composition: 'stage sets (BM.ENV), characters full-body, camera punches on reactions, 9:16 stacked staging',
    ease: { move: 'back.out(1.8)', snap: 'back.out(3)', settle: 'elastic.out(1,.5)' }, timing: 'fast action 0.15-0.25 s, reaction holds >= 0.6 s, beat 0.4 s',
    charMode: 'flat', transitions: ['wipe', 'iris', 'zoomThrough'], music: ['sneaky', 'cartoon', 'lofi'],
    sub: { font: 'Fredoka, Inter, sans-serif', weight: 700, size: 60, fill: '#FFFFFF', hi: '#FFE14D', stroke: '#1E1B2E', sw: 14, y: .87, maxChars: 20 },
  });

  /* ---------------- 2. PREMIUM: commercial motion graphics ---------------- */
  ST.premium = P({
    name: 'Premium commercial motion graphics', font: 'Inter, sans-serif', weight: 800,
    pal: { bg: '#07070B', ink: '#F4F2EE', a: '#C8FF3D', b: '#7A5CFF', c: '#2A2A35' },
    composition: 'dark void, one idea per frame, huge tight type (letter-spacing -0.04em), glass cards, thin rules, 12-col grid',
    ease: { move: 'expo.out', snap: 'expo.inOut', settle: 'power4.out' }, timing: 'long confident moves 0.8-1.2 s, overlap 40 %, never bounce',
    charMode: null, transitions: ['flash', 'zoomThrough', 'dip'], music: ['pulse', 'corporate', 'product'],
    sub: { font: 'Inter, sans-serif', weight: 600, size: 44, fill: '#F4F2EE', hi: '#C8FF3D', stroke: null, sw: 0, y: .9, maxChars: 30, bg: '#000000' },
  });
  /* kinetic headline: each word rises out of its own mask with blur-free expo motion */
  ST.premium.headline = (p, at, x, y, text, size = 120, o = {}) => { const g = G({}, p), words = text.split(' '); let cx = 0; const els = [];
    const tw = text.length * size * .56; words.forEach((w, i) => { const id = 'pm' + Math.round(hash(at + i + x) * 1e6), cp = BM.N('clipPath', { id }, BM.defs);
      const ww = w.length * size * .58; R(x - tw / 2 + cx - 10, y - size, ww + 20, size * 1.25, '#fff', 0, cp);
      const t = TX(x - tw / 2 + cx + ww / 2, y, w, size, o.color || ST.premium.pal.ink, G({ 'clip-path': `url(#${id})` }, g), { 'font-weight': 800, 'letter-spacing': -size * .04 });
      els.push(t); tl().fromTo(t, { y: size * 1.1 }, { y: 0, duration: .9, ease: 'expo.out', immediateRender: false }, at + i * .08); tl().set(t, { y: size * 1.1 }, 0); cx += ww + size * .22; }); return g; };
  ST.premium.glassCard = (p, x, y, w, h, o = {}) => { const g = G({ transform: `translate(${x},${y})` }, p); R(0, 0, w, h, '#FFFFFF', 28, g, { opacity: .06, stroke: '#FFFFFF', 'stroke-opacity': .18, 'stroke-width': 2 });
    R(0, 0, w, 3, o.accent || ST.premium.pal.a, 1, g); return g; };
  ST.premium.glow = (p, x, y, r, col) => CI(x, y, r, BM.rg('pg' + Math.round(hash(x + y) * 1e6), [[0, col, .55], [1, col, 0]]), p);

  /* ---------------- 3. EDU: minimalist educational ---------------- */
  ST.edu = P({
    name: 'Minimalist educational', font: 'Inter, sans-serif', weight: 300,
    pal: { bg: '#FBFAF7', ink: '#22252B', a: '#2D6BFF', b: '#E8E6E0', c: '#FF6B4A' },
    composition: 'paper white, generous margins (>= 120 px), single accent colour, line-mode characters, diagrams drawn on, one concept per screen',
    ease: { move: 'sine.inOut', snap: 'power2.out', settle: 'sine.out' }, timing: 'calm: 0.6-1 s moves, 1.5 s reading holds per line',
    charMode: 'line', transitions: ['dip'], music: ['edu'],
    sub: { font: 'Inter, sans-serif', weight: 500, size: 46, fill: '#22252B', hi: '#2D6BFF', stroke: null, sw: 0, y: .9, maxChars: 30 },
  });
  /* draw-on: strokes reveal along their length (pathLength=1 so no measuring) */
  ST.edu.drawOn = (el, at, dur = 1.2, ease = 'sine.inOut') => { el.setAttribute('pathLength', 1); el.setAttribute('stroke-dasharray', 1);
    tl().set(el, { attr: { 'stroke-dashoffset': 1 } }, 0); tl().fromTo(el, { attr: { 'stroke-dashoffset': 1 } }, { attr: { 'stroke-dashoffset': 0 }, duration: dur, ease, immediateRender: false }, at); return el; };
  ST.edu.label = (p, at, x, y, text, o = {}) => { const g = G({ opacity: 0 }, p); LN(`M ${x - 4} ${y + 14} L ${x + text.length * (o.size || 40) * .55} ${y + 14}`, ST.edu.pal.a, 4, g);
    TX(x, y, text, o.size || 40, ST.edu.pal.ink, g, { 'text-anchor': 'start', 'font-weight': 500 }); tl().fromTo(g, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: .6, ease: 'sine.out', immediateRender: false }, at); return g; };
  ST.edu.step = (p, at, x, y, n, text) => { const g = G({ opacity: 0 }, p); CI(x, y, 34, ST.edu.pal.a, g); TX(x, y + 13, String(n), 36, '#fff', g, { 'font-weight': 700 });
    TX(x + 64, y + 13, text, 40, ST.edu.pal.ink, g, { 'text-anchor': 'start', 'font-weight': 400 }); BM.show(g, at, .5); return g; };

  /* ---------------- 4. COMIC: comic-book animation ---------------- */
  ST.comic = P({
    name: 'Comic-book animation', font: 'Bangers, Impact, sans-serif', weight: 400,
    pal: { bg: '#FFF4D6', ink: '#111111', a: '#E63946', b: '#1D9BF0', c: '#FFE14D' },
    composition: 'tilted panels with thick black gutters, halftone dots, ink-outlined characters, yellow narration boxes, onomatopoeia bursts',
    ease: { move: 'power4.out', snap: 'steps(3)', settle: 'back.out(2.5)' }, timing: 'held poses (on 2s/3s feel), panel slams 0.2 s, hard cuts',
    charMode: 'ink', transitions: ['slam', 'ink', 'flash'], music: ['cartoon', 'hype'],
    sub: { font: 'Bangers, Impact, sans-serif', weight: 400, size: 64, fill: '#111111', hi: '#E63946', stroke: '#FFE14D', sw: 0, y: .9, maxChars: 22, bg: '#FFE14D', upper: true },
  });
  ST.comic.halftone = (p, color = '#E63946', op = .22, size = 22) => { const id = 'ht' + Math.round(hash(size + op) * 1e6), pat = BM.N('pattern', { id, width: size, height: size, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(20)' }, BM.defs);
    CI(size / 2, size / 2, size * .28, color, pat); return R(-400, -400, BM.W + 800, BM.H + 800, `url(#${id})`, 0, p, { opacity: op }); };
  /* a panel = clipped, tilted frame with its own content group (put a scene's art inside .content) */
  ST.comic.panel = (p, x, y, w, h, tilt = 0, o = {}) => { const id = 'pn' + Math.round(hash(x * 3 + y + w) * 1e6), cp = BM.N('clipPath', { id }, BM.defs);
    const pts = `M ${x} ${y + tilt} L ${x + w} ${y - tilt} L ${x + w} ${y + h + tilt} L ${x} ${y + h - tilt} Z`; PA(pts, '#fff', cp);
    const g = G({}, p), content = G({ 'clip-path': `url(#${id})` }, g); R(x - 50, y - 100, w + 100, h + 200, o.bg || '#FFF4D6', 0, content);
    PA(pts, 'none', g, { stroke: '#111', 'stroke-width': 14, 'stroke-linejoin': 'round' }); return { g, content }; };
  ST.comic.caption = (p, at, x, y, text, o = {}) => { const w = text.length * 26 + 50, g = G({ opacity: 0, transform: `translate(${x},${y}) rotate(${o.rot ?? -2})` }, p);
    R(0, 0, w, 74, '#FFE14D', 0, g, { stroke: '#111', 'stroke-width': 6 }); TX(w / 2, 52, text.toUpperCase(), 44, '#111', g, { 'font-family': 'Bangers, Impact, sans-serif' });
    tl().set(g, { opacity: 1 }, at); return g; };
  ST.comic.speedLines = (p, cx, cy, n = 40, col = '#111') => { const g = G({}, p); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + hash(i) * .1, r0 = 380 + hash(i + 5) * 200;
    PA(`M ${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0} L ${cx + Math.cos(a + .02) * 1600} ${cy + Math.sin(a + .02) * 1600} L ${cx + Math.cos(a - .02) * 1600} ${cy + Math.sin(a - .02) * 1600} Z`, col, g); } return g; };

  /* ---------------- 5. INFOGRAPHIC: animated data storytelling ---------------- */
  ST.infographic = P({
    name: 'Animated infographic storytelling', font: 'Inter, sans-serif', weight: 700,
    pal: { bg: '#0E2A47', ink: '#FFFFFF', a: '#2EC4B6', b: '#FFBF69', c: '#FF6B6B', grid: '#1D3F63' },
    composition: 'data is the hero: big numbers, bars, donuts, pictogram arrays on a baseline grid; every number counts up; source line at bottom',
    ease: { move: 'power3.out', snap: 'power2.inOut', settle: 'power1.out' }, timing: 'count-ups 1-1.5 s, staggered bars 0.06 s, hold each stat 2 s',
    charMode: 'flat', transitions: ['wipe', 'dip'], music: ['corporate', 'edu'],
    sub: { font: 'Inter, sans-serif', weight: 700, size: 48, fill: '#FFFFFF', hi: '#2EC4B6', stroke: '#0E2A47', sw: 10, y: .9, maxChars: 26 },
  });
  const IG = ST.infographic;
  IG.counter = (p, at, x, y, to, o = {}) => { const t = TX(x, y, (o.prefix || '') + '0' + (o.suffix || ''), o.size || 160, o.color || IG.pal.ink, p, { 'font-weight': 800, 'font-variant-numeric': 'tabular-nums' });
    const s = { v: 0 }, fmt = v => (o.prefix || '') + (o.dec ? v.toFixed(o.dec) : Math.round(v).toLocaleString('en-US')) + (o.suffix || '');
    tl().set(s, { v: 0 }, 0); tl().to(s, { v: to, duration: o.dur || 1.3, ease: 'power2.out', onUpdate() { t.textContent = fmt(s.v); } }, at);
    tl().set(t, { opacity: 0 }, 0); tl().set(t, { opacity: 1 }, at); return t; };
  IG.bars = (p, at, x, y, w, h, values, o = {}) => { const g = G({}, p), n = values.length, bw = w / n * .62, max = o.max || Math.max(...values);
    LN(`M ${x} ${y} L ${x + w} ${y}`, IG.pal.grid, 4, g); values.forEach((v, i) => { const bx = x + i * w / n + (w / n - bw) / 2, bh = v / max * h, col = (o.colors || [IG.pal.a, IG.pal.b, IG.pal.c])[i % 3];
      const b = R(bx, y - bh, bw, bh, col, 8, g); tl().fromTo(b, { attr: { height: 0, y } }, { attr: { height: bh, y: y - bh }, duration: .8, ease: 'power3.out', immediateRender: false }, at + i * .07); tl().set(b, { attr: { height: 0, y } }, 0);
      if (o.labels) TX(bx + bw / 2, y + 48, o.labels[i], 34, IG.pal.ink, g, { opacity: .8 }); }); return g; };
  IG.donut = (p, at, cx, cy, r, pct, o = {}) => { const g = G({}, p); CI(cx, cy, r, 'none', g, { stroke: IG.pal.grid, 'stroke-width': o.w || 46 });
    const arc = CI(cx, cy, r, 'none', g, { stroke: o.color || IG.pal.a, 'stroke-width': o.w || 46, pathLength: 100, 'stroke-dasharray': '0 100', transform: `rotate(-90 ${cx} ${cy})`, 'stroke-linecap': 'round' });
    tl().set(arc, { attr: { 'stroke-dasharray': '0 100' } }, 0); tl().to(arc, { attr: { 'stroke-dasharray': `${pct} 100` }, duration: 1.2, ease: 'power2.out' }, at);
    IG.counter(g, at, cx, cy + 34, pct, { suffix: '%', size: 96 }); return g; };
  IG.pictogram = (p, at, x, y, cols, total, filled, o = {}) => { const g = G({}, p), s = o.s || 70;
    for (let i = 0; i < total; i++) { const px = x + (i % cols) * s, py = y + Math.floor(i / cols) * s * 1.3, on = i < filled, ig = G({ opacity: 0 }, g);
      CI(px, py - s * .3, s * .17, on ? (o.on || IG.pal.b) : IG.pal.grid, ig); R(px - s * .22, py - s * .1, s * .44, s * .5, on ? (o.on || IG.pal.b) : IG.pal.grid, s * .2, ig); BM.pop(ig, at + i * .025, .25); } return g; };
  IG.source = (p, text) => TX(BM.W / 2, BM.H - 60, text, 26, IG.pal.ink, p, { opacity: .55, 'font-weight': 400 });

  /* ---------------- 6. PRODUCT 3D: cinematic 3D product ads (lib/product3d.js does the 3D) ---------------- */
  ST.product3d = P({
    name: 'Cinematic 3D product advertisement', font: 'Inter, sans-serif', weight: 200,
    pal: { bg: '#050507', ink: '#F5F3EF', a: '#E2BF7E', b: '#9AA3B5', c: '#1A1A22' },
    composition: 'one hero object, PBR materials + studio reflections, light sweeps, macro detail pushes, thin uppercase type with wide tracking, end card with lock-up',
    ease: { move: 'power2.inOut', snap: 'expo.out', settle: 'sine.inOut' }, timing: 'slow reveals 2-3 s, turntable 6-8 s/rev, type holds 1.5 s',
    charMode: null, transitions: ['dip', 'flash'], music: ['product', 'cinematic'],
    sub: { font: 'Inter, sans-serif', weight: 300, size: 40, fill: '#F5F3EF', hi: '#E2BF7E', stroke: null, sw: 0, y: .91, maxChars: 34 },
  });
  ST.product3d.tracking = (p, at, x, y, text, size = 46, o = {}) => { const t = TX(x, y, text.toUpperCase(), size, o.color || ST.product3d.pal.ink, p, { 'font-weight': o.weight || 200, 'letter-spacing': size * .5 });
    tl().set(t, { opacity: 0 }, 0); tl().fromTo(t, { opacity: 0, attr: { 'letter-spacing': size * 1.1 } }, { opacity: 1, attr: { 'letter-spacing': size * .5 }, duration: 1.6, ease: 'power2.out', immediateRender: false }, at); return t; };

  ST.LIST = ['cartoon', 'premium', 'edu', 'comic', 'infographic', 'product3d'];
  ST.use = (name) => { const s = ST[name]; if (!s) throw new Error('unknown style ' + name); if (BM.CAP) Object.assign(BM.CAP.style, s.sub); ST.current = s; return s; };
})();
