/* camera.js — cinematic camera moves + professional transitions + captions (needs bm-core.js).
   Moves act on a stage camera (sc.cam). Transitions and subtitles live on a screen-space overlay that is
   re-appended on top of every stage at BM.finish(). Everything is a closed-form function of t (seek-safe). */
(function () {
  const { G, R, CI, PA, TX, J, hash } = BM, tl = () => BM.tl;
  const CAM = (BM.CAM = {}), TR = (BM.TR = {}), CAP = (BM.CAP = {});
  let OV, SUB; const overlay = () => (OV ||= G({ 'data-name': 'overlay', 'pointer-events': 'none' }));
  const subLayer = () => (SUB ||= G({ 'data-name': 'subtitles' }, overlay()));
  const _finish = BM.finish; BM.finish = () => { if (OV) { BM.S.appendChild(OV); if (SUB) OV.insertBefore(SUB, OV.firstChild); } _finish(); };

  /* ---------------- camera moves ---------------- */
  CAM.push = (sc, at, z, dur = 2, ease = 'sine.inOut') => tl().to(sc.cam, { z, duration: dur, ease, onUpdate: sc.apply }, at);
  CAM.pan = (sc, at, x, y, dur = 1.6, ease = 'power2.inOut') => tl().to(sc.cam, { x, y, duration: dur, ease, onUpdate: sc.apply }, at);
  CAM.dolly = (sc, at, x, y, z, dur = 2.4) => tl().to(sc.cam, { x, y, z, duration: dur, ease: 'power1.inOut', onUpdate: sc.apply }, at);
  CAM.dutch = (sc, at, r, dur = .5) => tl().to(sc.cam, { r, duration: dur, ease: 'power2.out', onUpdate: sc.apply }, at);
  /* punch-in: comedic snap zoom with overshoot (hold, then optional release) */
  CAM.punch = (sc, at, x, y, z, hold = 0, back = null) => { tl().to(sc.cam, { x, y, z, duration: .14, ease: 'back.out(2.4)', onUpdate: sc.apply }, at);
    if (hold && back) tl().to(sc.cam, { ...back, duration: .35, ease: 'power2.inOut', onUpdate: sc.apply }, at + .14 + hold); };
  /* whip pan with directional motion blur on the stage */
  let blurN = 0;
  CAM.whip = (sc, at, x, y, dur = .32) => { const id = 'whip' + blurN++, f = BM.N('filter', { id, x: '-20%', y: '-20%', width: '140%', height: '140%' }, BM.defs),
      gb = BM.N('feGaussianBlur', { stdDeviation: '0 0' }, f), o = { b: 0 }, dir = Math.abs(x - sc.cam.x) > Math.abs(y - sc.cam.y) ? 0 : 1;
    tl().to(sc.cam, { x, y, duration: dur, ease: 'expo.inOut', onUpdate: sc.apply }, at);
    tl().to(o, { keyframes: [{ b: 60, duration: dur / 2, ease: 'power2.in' }, { b: 0, duration: dur / 2, ease: 'power2.out' }],
      onUpdate() { if (o.b < .5) sc.g.removeAttribute('filter'); else { gb.setAttribute('stdDeviation', dir ? `0 ${o.b}` : `${o.b} 0`); sc.g.setAttribute('filter', `url(#${id})`); } },
      onComplete() { sc.g.removeAttribute('filter'); } }, at); BM.sfx(at, 'whoosh', .7); };
  /* handheld: layered sines (no randomness) */
  CAM.handheld = (sc, t0, t1, amp = 7) => BM.everyFrame(t => { if (t < t0 || t > t1) return; const k = hash(sc.name.length);
    sc.cam.ox = amp * (Math.sin(t * 1.3 + k) * .6 + Math.sin(t * 3.7 + k * 3) * .3 + Math.sin(t * 7.1) * .1);
    sc.cam.oy = amp * (Math.cos(t * 1.1 + k) * .6 + Math.sin(t * 2.9 + 1) * .3); sc.cam.r = amp * .05 * Math.sin(t * .9 + k); sc.apply(); });
  /* follow: camera eases toward a target each frame (critically damped, closed-form over a sampled path) */
  CAM.follow = (sc, t0, t1, getXY, { lag = .25, dy = 0 } = {}) => BM.everyFrame(t => { if (t < t0 || t > t1) return;
    const [x, y] = getXY(Math.max(t0, t - lag)); sc.cam.x = x; sc.cam.y = y + dy; sc.apply(); });

  /* ---------------- transitions: TR.<kind>(at, d, opts) covers the cut at `at + d/2` ---------------- */
  const full = (fill, a = {}) => R(-40, -40, BM.W + 80, BM.H + 80, fill, 0, overlay(), { opacity: 0, ...a });
  TR.flash = (at, d = .3, color = '#FFFFFF') => { const r = full(color); tl().to(r, { keyframes: [{ opacity: 1, duration: d * .3 }, { opacity: 0, duration: d * .7, ease: 'power2.out' }] }, at); BM.sfx(at, 'hit', .5); };
  TR.dip = (at, d = .6, color = '#000000') => { const r = full(color); tl().to(r, { keyframes: [{ opacity: 1, duration: d / 2, ease: 'power2.in' }, { opacity: 0, duration: d / 2, ease: 'power2.out' }] }, at); };
  TR.iris = (at, d = .7, color = '#111111', cx = BM.W / 2, cy = BM.H / 2) => { const id = 'iris' + hash(at).toString(36).slice(2, 7), m = BM.N('mask', { id }, BM.defs);
    BM.R(-40, -40, BM.W + 80, BM.H + 80, '#fff', 0, m); const hole = CI(cx, cy, 1400, '#000', m); const r = full(color, { mask: `url(#${id})`, opacity: 1 });
    tl().set(r, { opacity: 0 }, 0); tl().set(r, { opacity: 1 }, at);
    tl().fromTo(hole, { attr: { r: 1400 } }, { keyframes: [{ attr: { r: 0 }, duration: d / 2, ease: 'power3.in' }, { attr: { r: 1400 }, duration: d / 2, ease: 'power3.out' }], immediateRender: false }, at);
    tl().set(r, { opacity: 0 }, at + d); BM.sfx(at, 'swoosh', .6); };
  TR.wipe = (at, d = .6, color = '#FFC83D', dir = 1) => { const g = G({ opacity: 0 }, overlay()), j = J(G({}, g));
    PA(`M -300 -200 L ${BM.W + 300} -200 L ${BM.W + 300} ${BM.H + 200} L -300 ${BM.H + 200} Z`, color, j.el); PA(`M ${BM.W + 300} -200 L ${BM.W + 560} -200 L ${BM.W + 360} ${BM.H + 200} L ${BM.W + 300} ${BM.H + 200} Z`, color, j.el);
    const w = BM.W + 900; tl().set(g, { opacity: 1 }, at); tl().fromTo(j, { x: -w * dir }, { keyframes: [{ x: 0, duration: d / 2, ease: 'power3.in' }, { x: w * dir, duration: d / 2, ease: 'power3.out' }], onUpdate: j.apply, immediateRender: false }, at);
    tl().set(g, { opacity: 0 }, at + d); BM.sfx(at, 'whoosh', .8); };
  TR.slam = (at, d = .55, colors = ['#FFE14D', '#FF4D6D', '#1E1B2E']) => { const g = G({ opacity: 0 }, overlay());   // comic panel slam
    const panes = colors.map((c, i) => { const j = J(G({}, g)); PA(`M -200 ${-200 + i * 760} L ${BM.W + 200} ${-420 + i * 760} L ${BM.W + 200} ${420 + i * 760} L -200 ${640 + i * 760} Z`, c, j.el, { stroke: '#111', 'stroke-width': 14 }); return j; });
    tl().set(g, { opacity: 1 }, at); panes.forEach((j, i) => tl().fromTo(j, { x: (i % 2 ? 1 : -1) * 1500 }, { keyframes: [{ x: 0, duration: d * .4, ease: 'power4.in' }, { x: 0, duration: d * .2 }, { x: (i % 2 ? -1 : 1) * 1500, duration: d * .4, ease: 'power3.in' }], onUpdate: j.apply, immediateRender: false }, at + i * .03));
    tl().set(g, { opacity: 0 }, at + d + .1); BM.sfx(at + d * .4, 'punch', .9); };
  TR.ink = (at, d = .8, color = '#111111') => { const g = G({ opacity: 0 }, overlay());   // ink-splash blobs
    const blobs = Array.from({ length: 9 }, (_, i) => { const j = J(G({}, g), BM.W * (.1 + hash(i + 2) * .8), BM.H * (.1 + hash(i + 7) * .8)); CI(0, 0, 420 + hash(i) * 260, color, j.el); return j; });
    tl().set(g, { opacity: 1 }, at); blobs.forEach((j, i) => tl().fromTo(j, { sx: 0, sy: 0 }, { keyframes: [{ sx: 1, sy: 1, duration: d * .45, ease: 'power2.in' }, { sx: 1, sy: 1, duration: d * .1 }, { sx: 0, sy: 0, duration: d * .45, ease: 'power2.out' }], onUpdate: j.apply, immediateRender: false }, at + hash(i) * .08));
    tl().set(g, { opacity: 0 }, at + d + .1); BM.sfx(at, 'slurp', .5); };
  TR.glitch = (at, d = .4) => { const g = G({ opacity: 0 }, overlay()), bars = Array.from({ length: 14 }, (_, i) => R(0, 0, BM.W, 40, ['#FF2A6D', '#05D9E8', '#FFFFFF', '#111'][i % 4], 0, g, { opacity: .85 }));
    tl().set(g, { opacity: 1 }, at); tl().set(g, { opacity: 0 }, at + d);
    BM.everyFrame(t => { if (t < at || t > at + d) return; const f = Math.floor(t * 30); bars.forEach((b, i) => { b.setAttribute('y', hash(f * 13 + i) * BM.H); b.setAttribute('height', 8 + hash(f + i * 3) * 90); b.setAttribute('x', (hash(f * 7 + i) - .5) * 300); }); });
    BM.sfx(at, 'glitch', .7); };
  /* zoom-through: scale the outgoing stage's camera hard into a point, cut, incoming stage settles from big */
  TR.zoomThrough = (at, from, to, d = .6, px = BM.W / 2, py = BM.H / 2) => { const z0 = from.cam.z;
    tl().to(from.cam, { x: px, y: py, z: z0 * 6, duration: d / 2, ease: 'power3.in', onUpdate: from.apply }, at); BM.cut(at + d / 2, from, to);
    tl().fromTo(to.cam, { z: to.cam.z * 3.5 }, { z: to.cam.z, duration: d / 2 + .2, ease: 'power3.out', onUpdate: to.apply, immediateRender: false }, at + d / 2);
    TR.flash(at + d / 2 - .05, .2); BM.sfx(at, 'whoosh', .9); };
  /* convenience: transition + the scene cut at its midpoint */
  TR.cut = (at, from, to, kind = 'wipe', d, opt) => { if (kind === 'zoomThrough') return TR.zoomThrough(at, from, to, d);
    TR[kind](at, d, opt); BM.cut(at + (d ?? ({ flash: .3, dip: .6, iris: .7, wipe: .6, slam: .55, ink: .8, glitch: .4 }[kind])) / 2, from, to); };
  TR.LIST = ['flash', 'dip', 'iris', 'wipe', 'slam', 'ink', 'glitch', 'zoomThrough'];
  CAM.LIST = ['push', 'pan', 'dolly', 'dutch', 'punch', 'whip', 'handheld', 'follow'];

  /* ---------------- subtitles + speech bubbles ---------------- */
  CAP.style = { font: 'Inter, sans-serif', weight: 800, size: 58, fill: '#FFFFFF', hi: '#FFE14D', stroke: '#111111', sw: 12, y: .86, maxChars: 22, bg: null, upper: false };
  const wrap = (words, max) => { const lines = [[]]; let n = 0; for (const w of words) { if (n + w.length > max && lines.at(-1).length) { lines.push([]); n = 0; } lines.at(-1).push(w); n += w.length + 1; } return lines; };
  /* BM.CAP.sub(t0, t1, text): karaoke subtitle, words light up in proportion to their length */
  CAP.sub = (t0, t1, text, o = {}) => { const S = { ...CAP.style, ...o }, words = (S.upper ? text.toUpperCase() : text).split(/\s+/), lines = wrap(words, S.maxChars);
    const g = G({ opacity: 0 }, subLayer()), y0 = BM.H * S.y - (lines.length - 1) * S.size * 1.18, total = words.join('').length; let acc = 0; const spans = [];
    if (S.bg) { const w = Math.min(BM.W - 80, Math.max(...lines.map(l => l.join(' ').length)) * S.size * .62 + 60); R(BM.W / 2 - w / 2, y0 - S.size * 1.05, w, lines.length * S.size * 1.18 + S.size * .5, S.bg, 18, g, { opacity: .82 }); }
    lines.forEach((ln, li) => { const t = BM.N('text', { x: BM.W / 2, y: y0 + li * S.size * 1.18, 'text-anchor': 'middle', 'font-size': S.size, 'font-weight': S.weight, 'font-family': S.font,
        fill: S.fill, 'paint-order': 'stroke', stroke: S.stroke || 'none', 'stroke-width': S.stroke ? S.sw : 0, 'stroke-linejoin': 'round' }, g);
      ln.forEach((w, wi) => { const sp = BM.N('tspan', {}, t); sp.textContent = (wi ? ' ' : '') + w; const st = t0 + (t1 - t0) * .85 * (acc / total); acc += w.length; spans.push([sp, st]); }); });
    tl().fromTo(g, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .16, ease: 'power2.out', immediateRender: false }, t0); tl().to(g, { opacity: 0, duration: .14 }, t1);
    spans.forEach(([sp, st]) => { tl().set(sp, { attr: { fill: S.fill } }, 0); tl().set(sp, { attr: { fill: S.hi } }, st); }); return g; };
  /* BM.CAP.bubble(ch, t0, t1, text): speech bubble that tracks the character */
  CAP.bubble = (ch, t0, t1, text, o = {}) => { const sz = o.size || 40, lines = wrap(text.split(/\s+/), o.maxChars || 18), w = Math.max(...lines.map(l => l.join(' ').length)) * sz * .58 + 70, h = lines.length * sz * 1.2 + 44;
    const hy = o.y ?? -(560 * (ch.P.build?.h || 1)) - h, g = G({ opacity: 0 }, ch.place), j = J(G({}, g), o.dx ?? 0, hy), ink = o.ink || '#1E1B2E', tail = o.tail ?? -w * .18;
    R(-w / 2, 0, w, h, o.fill || '#FFFFFF', Math.min(40, h / 2), j.el, { stroke: ink, 'stroke-width': 5 });
    PA(`M ${tail - 18} ${h - 3} L ${tail - 30} ${h + 46} L ${tail + 22} ${h - 3} Z`, o.fill || '#FFFFFF', j.el, { stroke: ink, 'stroke-width': 5, 'stroke-linejoin': 'round' }); R(tail - 22, h - 8, 48, 10, o.fill || '#FFFFFF', 0, j.el);
    lines.forEach((ln, i) => TX(0, 22 + sz + i * sz * 1.2 - sz * .18, ln.join(' '), sz, ink, j.el, { 'font-weight': 700, 'font-family': o.font || 'inherit' }));
    BM.everyFrame(() => { g.setAttribute('transform', `translate(${ch.root.x},0)`); });
    tl().fromTo(j, { sx: .3, sy: .3 }, { sx: 1, sy: 1, duration: .28, ease: 'back.out(2.4)', onUpdate: j.apply, immediateRender: false }, t0); tl().set(g, { opacity: 1 }, t0); tl().to(g, { opacity: 0, duration: .15 }, t1);
    return g; };
  /* BM.say(ch, t0, t1, text, {bubble, sub, visemes}): one call = mouth animation + subtitle (+ optional bubble) */
  BM.say = (ch, t0, t1, text, o = {}) => { if (o.visemes) BM.CH.lipsync(ch, t0, o.visemes); else BM.CH.talk(ch, t0, t1);
    if (o.sub !== false) CAP.sub(t0, t1, (o.speaker ? o.speaker + ': ' : '') + text, o.subStyle); if (o.bubble) CAP.bubble(ch, t0, t1, o.bubbleText || text, o.bubbleOpts); };
  /* auto-subtitles from narration timings ([{t0,t1,text}] written by tools/narration.py) */
  CAP.fromTimings = (lines, o) => lines.forEach(l => CAP.sub(l.t0, l.t1, l.text, o));
  /* comic onomatopoeia burst (BAM!, WHOOSH) in stage space */
  CAP.burst = (p, at, x, y, text, o = {}) => { const j = J(G({ opacity: 0 }, p), x, y), n = 14, r1 = o.r || 170, r2 = r1 * .7;
    PA('M ' + Array.from({ length: n * 2 }, (_, i) => { const a = i / (n * 2) * Math.PI * 2, r = i % 2 ? r2 : r1 * (.9 + hash(i + x) * .2); return `${Math.cos(a) * r} ${Math.sin(a) * r * .78}`; }).join(' L ') + ' Z', o.fill || '#FFE14D', j.el, { stroke: '#111', 'stroke-width': 8, 'stroke-linejoin': 'round' });
    TX(0, r1 * .2, text, Math.min(o.size || 92, r1 * 2.7 / Math.max(1, text.length) * 1.5), o.color || '#E63946', j.el, { 'font-family': 'Bangers, Impact, sans-serif', stroke: '#111', 'stroke-width': 6, 'paint-order': 'stroke', transform: `rotate(${o.rot ?? -8})` });
    tl().set(j.el, { opacity: 1 }, at); tl().fromTo(j, { sx: 0, sy: 0, r: -20 }, { sx: 1, sy: 1, r: 0, duration: .25, ease: 'back.out(3)', onUpdate: j.apply, immediateRender: false }, at);
    tl().to(j.el, { opacity: 0, duration: .2 }, at + (o.hold || .9)); return j; };
})();
