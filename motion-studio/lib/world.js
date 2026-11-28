/* world.js — environments + props for Motion Studio (needs bm-core.js). Vertical-first (1080x1920 stage),
   every environment draws into a stage group, registers its own ambient motion (clocks, lights, clouds, traffic,
   steam — all closed-form functions of t) and returns anchors (floor y, desk top, seats, doors) for staging.
   Palette comes from opts.pal (style packs pass theirs); defaults are the flat-cartoon palette.
   Props: PROP.<name>(parent, x, y, scale, opts) -> { g, j (joint), ...parts }. */
(function () {
  const { G, R, CI, EL, PA, LN, TX, J, shade, hash } = BM;
  const ENV = (BM.ENV = {}), PROP = (BM.PROP = {});
  const PAL = { ink: '#1E1B2E', wall: '#F3E6CF', wall2: '#E8D6B8', floor: '#B98B63', floor2: '#A57A54', wood: '#8A5A3A', wood2: '#6B4329',
    sky: '#9ED8F2', sky2: '#E3F4FB', grass: '#7DC67E', metal: '#9AA3B5', glass: '#BFE6F7', accent: '#4C7DFF', accent2: '#FF7A59', gold: '#FFC83D', night: '#1E2244' };
  const P = o => ({ ...PAL, ...(o && o.pal) });
  const tick = fn => BM.everyFrame(fn);

  /* ================= PROPS ================= */
  PROP.desk = (p, x, y, s = 1, o = {}) => { const c = P(o), g = G({ transform: `translate(${x},${y}) scale(${s})` }, p);
    R(-260, -18, 520, 36, c.wood, 8, g); R(-240, 18, 30, 220, c.wood2, 4, g); R(210, 18, 30, 220, c.wood2, 4, g); R(-200, 18, 160, 120, shade(c.wood2, 1.1), 6, g); R(-150, 70, 60, 10, '#E8D2B5', 5, g); return { g, top: y - 18 * s }; };
  PROP.monitor = (p, x, y, s = 1, o = {}) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p);
    R(-30, -24, 60, 24, '#2B2E3A', 4, g); R(-10, -90, 20, 70, '#2B2E3A', 0, g); R(-150, -280, 300, 200, '#20232E', 14, g); const screen = G({}, g);
    R(-138, -268, 276, 176, o.screen || '#3E7BFF', 6, screen); return { g, screen, sx: x, sy: y - 180 * s }; };
  PROP.laptop = (p, x, y, s = 1, o = {}) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p), lid = G({}, g), lj = J(lid, 0, 0);
    PA('M -110 0 L 110 0 L 96 -150 L -96 -150 Z', o.back ? '#C9CED8' : '#2B2E3A', lid); if (!o.back) R(-86, -140, 172, 128, o.screen || '#3E7BFF', 4, lid); else CI(0, -78, 20, '#E9ECF2', lid);
    R(-130, -6, 260, 12, '#9AA1AE', 4, g); return { g, lid: lj }; };
  PROP.phone = (p, x, y, s = 1, o = {}) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p), j = J(G({}, g));
    R(-36, -70, 72, 140, '#151826', 14, j.el); const screen = R(-30, -60, 60, 116, o.screen || '#2A3050', 8, j.el); CI(0, -64, 3, '#444', j.el); return { g, j, screen }; };
  PROP.mug = (p, x, y, s = 1, o = {}) => { const c = o.color || '#5B8DEF', g = G({ transform: `translate(${x},${y}) scale(${s})` }, p);
    R(-24, -58, 48, 58, c, 10, g); LN('M 24 -46 C 44 -46 44 -18 24 -18', c, 8, g);
    const steam = [0, 1, 2].map(i => LN(`M ${-10 + i * 10} -66 C ${-20 + i * 10} -86 ${i * 10} -96 ${-10 + i * 10} -118`, '#FFFFFF', 4, g, { opacity: o.hot === false ? 0 : .7 }));
    tick(t => steam.forEach((s2, i) => s2.setAttribute('transform', `translate(0,${-((t * 30 + i * 12) % 36)})`))); return { g, steam }; };
  PROP.chair = (p, x, y, s = 1, o = {}) => { const c = P(o), g = G({ transform: `translate(${x},${y}) scale(${s})` }, p);
    R(-90, -340, 180, 230, o.color || '#2E3550', 30, g); R(-100, -130, 200, 36, shade(o.color || '#2E3550', .85), 14, g); R(-10, -94, 20, 70, c.metal, 0, g);
    LN('M -80 -10 L 80 -10', c.metal, 10, g); CI(-80, 0, 12, '#1E1B2E', g); CI(80, 0, 12, '#1E1B2E', g); return { g, seatY: y - 130 * s }; };
  PROP.plant = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); R(-34, -64, 68, 64, '#D9734E', 8, g);
    const leaves = [-30, -8, 12, 32].map((dx, i) => { const j = J(G({ transform: `translate(${dx / 2},-60)` }, g)); PA(`M 0 0 C ${dx - 20} -40 ${dx} -90 ${dx * 1.4} -112 C ${dx + 20} -80 ${dx / 2 + 10} -40 0 0 Z`, i % 2 ? '#3FA66B' : '#2F8F5B', j.el); return j; });
    tick(t => leaves.forEach((l, i) => { l.r = Math.sin(t * 1.4 + i + x) * 4; l.apply(); })); return { g }; };
  PROP.clock = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); CI(0, 0, 50, '#F7F4EC', g, { stroke: '#3C4170', 'stroke-width': 8 });
    const m = J(G({}, g)); LN('M 0 0 L 0 -36', PAL.ink, 5, m.el); const h = J(G({}, g)); LN('M 0 0 L 0 -24', PAL.ink, 7, h.el); CI(0, 0, 6, PAL.ink, g);
    tick(t => { m.r = t * 36; m.apply(); h.r = t * 3 + 120; h.apply(); }); return { g }; };
  PROP.money = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p), j = J(G({}, g));
    R(-46, -24, 92, 48, '#7ED38B', 6, j.el, { stroke: '#3E9A57', 'stroke-width': 3 }); CI(0, 0, 14, '#3E9A57', j.el); TX(0, 9, '$', 24, '#E9FFE9', j.el, { 'font-weight': 900 }); return { g, j }; };
  PROP.coin = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p), j = J(G({}, g)); CI(0, 0, 22, '#FFC83D', j.el, { stroke: '#E29A00', 'stroke-width': 4 }); TX(0, 9, '$', 24, '#B87400', j.el, { 'font-weight': 900 }); return { g, j }; };
  PROP.car = (p, x, y, s = 1, o = {}) => { const col = o.color || '#E63946', g = G({ transform: `translate(${x},${y}) scale(${s})` }, p), j = J(G({}, g));
    PA('M -470 40 C -470 -30 -430 -60 -340 -64 L -200 -70 C -120 -140 60 -150 150 -96 L 380 -80 C 450 -74 480 -40 480 10 L 480 50 C 480 70 460 80 440 80 L -450 80 C -466 80 -470 66 -470 40 Z', col, j.el);
    PA('M -470 30 L 480 30 L 480 50 C 480 70 460 80 440 80 L -450 80 C -466 80 -470 66 -470 40 Z', shade(col, .8), j.el);
    PA('M -130 -86 C -90 -150 30 -158 110 -110 L 100 -96 C 30 -134 -80 -128 -112 -82 Z', '#9FD8FF', j.el); R(390, -40, 60, 20, '#FFF3B0', 8, j.el);
    const wheels = [-280, 300].map(wx => { const w = G({ transform: `translate(${wx},80)` }, j.el); CI(0, 0, 78, '#1C1A28', w); CI(0, 0, 50, '#D9DEE7', w); const sp = J(G({}, w)); for (let i = 0; i < 5; i++) R(-6, -46, 12, 46, '#9AA3B5', 4, sp.el, { transform: `rotate(${i * 72})` }); return sp; });
    return { g, j, wheels, spin(at, dur, turns = 6) { wheels.forEach(w => BM.tl.to(w, { r: '+=' + 360 * turns, duration: dur, ease: 'none', onUpdate: w.apply }, at)); } }; };
  PROP.briefcase = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); R(-60, -80, 120, 80, '#6B4329', 10, g); R(-24, -96, 48, 20, 'none', 8, g, { stroke: '#4A2E1C', 'stroke-width': 8 }); R(-8, -50, 16, 12, '#FFC83D', 3, g); return { g }; };
  PROP.papers = (p, x, y, s = 1, n = 6) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p);
    for (let i = 0; i < n; i++) R(-70 + hash(i) * 10, -i * 9 - 10, 140, 10, i % 2 ? '#FFFFFF' : '#F2EEE3', 2, g, { stroke: '#D8CFBE', 'stroke-width': 1.5 }); return { g }; };
  PROP.trophy = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); R(-40, -20, 80, 20, '#6B4329', 4, g); R(-10, -60, 20, 40, '#FFC83D', 0, g); PA('M -50 -160 L 50 -160 C 50 -90 20 -64 0 -64 C -20 -64 -50 -90 -50 -160 Z', '#FFC83D', g); return { g }; };
  PROP.waterCooler = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); R(-50, -220, 100, 220, '#E9ECF2', 10, g); EL(0, -270, 46, 56, '#9FD8FF', g, { opacity: .9 });
    const bub = [0, 1, 2].map(i => CI(-10 + i * 10, -250, 5, '#FFFFFF', g, { opacity: .8 })); tick(t => bub.forEach((b, i) => b.setAttribute('cy', -230 - ((t * 40 + i * 20) % 70)))); return { g }; };
  PROP.lamp = (p, x, y, s = 1) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); R(-40, -14, 80, 14, '#2B2B3F', 6, g); LN('M 0 -14 L 26 -170 L 80 -226', '#2B2B3F', 10, g);
    PA('M 52 -256 L 140 -214 L 110 -176 Z', '#FFC83D', g); const cone = PA('M 112 -196 L 40 40 L 320 40 Z', '#FFE9A8', g, { opacity: .16 }); return { g, cone }; };
  PROP.bubble = (p, x, y, text, o = {}) => { const g = G({ transform: `translate(${x},${y})`, opacity: 0 }, p), j = J(G({}, g)), w = o.w || Math.max(220, text.length * 22 + 60);
    R(-w / 2, -90, w, 110, '#FFFFFF', 34, j.el, { stroke: PAL.ink, 'stroke-width': 5 }); PA(`M ${o.tail || -30} 18 L ${(o.tail || -30) - 10} 62 L ${(o.tail || -30) + 30} 18 Z`, '#FFFFFF', j.el, { stroke: PAL.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' });
    R(-w / 2 + 3, 10, w - 6, 12, '#FFFFFF', 0, j.el); TX(0, -22, text, o.size || 40, PAL.ink, j.el, { 'font-weight': 700 }); return { g, j }; };

  /* ================= ENVIRONMENTS (all return anchors) ================= */
  const W = () => BM.W, H = () => BM.H;
  ENV.office = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1500;
    R(-400, -600, W() + 800, floorY + 600, c.wall, 0, p); for (let i = -2; i < 9; i++) R(i * 160, -600, 3, floorY + 600, c.wall2, 0, p);
    const win = G({ transform: 'translate(560,260)' }, p); R(-10, -10, 420, 520, '#3C4170', 12, win); R(0, 0, 400, 500, c.sky, 6, win);
    const sky = [[60, 300, 70, 200], [150, 250, 80, 250], [250, 330, 60, 170], [320, 280, 70, 220]].map(([bx, by, bw, bh]) => R(bx, by, bw, bh, '#8FB3C9', 0, win));
    const blinds = Array.from({ length: 9 }, (_, i) => R(0, i * 56, 400, 22, '#F7F4EC', 2, win, { opacity: .85 }));
    const cloud = G({}, win), cj = J(cloud); [[0, 0, 30], [34, -8, 38], [70, 0, 30]].forEach(([x, y, r]) => CI(x + 40, y + 120, r, '#FFFFFF', cj.el));
    tick(t => { cj.x = (t * 14) % 460 - 120; cj.apply(); });
    PROP.clock(p, 300, 240, 1); R(80, 380, 200, 270, '#FFFFFF', 8, p, { stroke: c.ink, 'stroke-width': 4 }); LN('M 110 600 L 150 520 L 190 560 L 240 440', '#E63946', 8, p);
    TX(180, 425, 'Q3 TARGETS', 26, c.ink, p, { 'font-weight': 800 });
    R(-400, floorY, W() + 800, 800, c.floor, 0, p); R(-400, floorY, W() + 800, 16, c.floor2, 0, p);
    PROP.plant(p, 120, floorY, 1.3); PROP.waterCooler(p, 980, floorY, 1);
    return { floorY, deskY: floorY - 160, cx: W() / 2 }; };
  ENV.bedroom = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1520, night = o.night !== false;
    R(-400, -600, W() + 800, floorY + 600, night ? '#3A3A6A' : '#DCE7F5', 0, p);
    const win = G({ transform: 'translate(600,300)' }, p); R(-10, -10, 360, 440, '#2B2B4F', 12, win); R(0, 0, 340, 420, night ? '#141632' : c.sky, 6, win); CI(240, 100, 44, night ? '#F4E9C1' : '#FFF3B0', win);
    const stars = Array.from({ length: 14 }, (_, i) => CI(20 + hash(i) * 300, 20 + hash(i + 9) * 380, 3, '#FFFFFF', win)); tick(t => stars.forEach((s2, i) => s2.setAttribute('opacity', .4 + .6 * Math.abs(Math.sin(t * 2 + i)))));
    R(100, 330, 220, 300, '#F25F5C', 8, p); TX(210, 500, 'DREAM', 46, '#FFE066', p, { 'font-weight': 900 });
    R(-400, floorY, W() + 800, 800, '#7A5A8A', 0, p); R(80, floorY - 300, 900, 300, '#6B4329', 18, p); R(100, floorY - 360, 860, 140, '#EDE6FF', 30, p); R(110, floorY - 400, 240, 90, '#FFFFFF', 40, p);
    R(520, floorY - 330, 460, 150, '#8E6BB8', 26, p); PROP.lamp(p, 960, floorY - 300, .8);
    return { floorY, bedY: floorY - 360, cx: W() / 2 }; };
  ENV.street = (p, o = {}) => { const c = P(o), groundY = o.floorY || 1560;
    R(-400, -800, W() + 800, groundY + 800, BM.lg('st_sky' + BM.S.childElementCount, [[0, c.sky], [1, c.sky2]]), 0, p);
    const sun = CI(860, 260, 80, '#FFE9A0', p);
    const far = G({}, p), fj = J(far); for (let i = 0; i < 12; i++) R(-400 + i * 180, groundY - 500 - hash(i) * 300, 150, 900, i % 2 ? '#B7C7D9' : '#A5B8CC', 0, fj.el);
    const near = G({}, p), nj = J(near); for (let i = 0; i < 9; i++) { const bx = -400 + i * 260, bh = 520 + hash(i + 3) * 280; R(bx, groundY - bh, 230, bh, ['#E07A5F', '#F2CC8F', '#81B29A', '#3D405B'][i % 4], 0, nj.el);
      for (let r = 0; r < 5; r++) for (let k = 0; k < 3; k++) R(bx + 24 + k * 66, groundY - bh + 40 + r * 90, 40, 54, '#FFF6D6', 4, nj.el, { opacity: .9 }); }
    R(-400, groundY, W() + 800, 60, '#C9C3B8', 0, p); R(-400, groundY + 60, W() + 800, 600, '#4A4A58', 0, p);
    const stripes = Array.from({ length: 8 }, (_, i) => R(0, groundY + 240, 120, 14, '#FFE29A', 6, p));
    for (const lx of [150, 930]) { R(lx - 7, groundY - 420, 14, 420, '#3D405B', 4, p); CI(lx, groundY - 430, 24, '#FFE9A0', p); }
    const traffic = PROP.car(p, -900, groundY + 300, .55, { color: o.carColor || '#4C7DFF' });
    tick(t => { stripes.forEach((s2, i) => s2.setAttribute('x', ((i * 300 - t * 500) % 2400 + 2400) % 2400 - 400)); traffic.j.x = ((t * 900) % 4000); traffic.j.apply(); fj.x = -t * 6; fj.apply(); });
    return { floorY: groundY, cx: W() / 2, near: nj, far: fj }; };
  ENV.restaurant = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1520;
    R(-400, -600, W() + 800, floorY + 600, '#7B2D26', 0, p); for (let i = -3; i < 12; i++) R(i * 120, -600, 60, floorY + 600, '#86352D', 0, p);
    R(110, 300, 360, 280, '#1E1B1A', 10, p, { stroke: '#C9A26B', 'stroke-width': 10 }); TX(290, 370, 'MENU', 44, '#F2E6C9', p, { 'font-weight': 800 });
    for (let i = 0; i < 4; i++) { R(160, 410 + i * 40, 180, 8, '#F2E6C9', 4, p, { opacity: .8 }); R(380, 410 + i * 40, 50, 8, '#F2E6C9', 4, p, { opacity: .8 }); }
    const lights = [300, 640, 900].map(lx => { const j = J(G({ transform: `translate(${lx},0)` }, p)); LN('M 0 -600 L 0 200', '#2B2B2B', 4, j.el); PA('M -60 240 L 60 240 L 30 200 L -30 200 Z', '#FFC83D', j.el); const glow = EL(0, 300, 120, 70, '#FFE9A0', j.el, { opacity: .25 }); return j; });
    tick(t => lights.forEach((l, i) => { l.r = Math.sin(t * 1.1 + i) * 1.5; l.apply(); }));
    R(-400, floorY, W() + 800, 800, '#3A2A24', 0, p); for (let i = 0; i < 12; i++) R(-400 + i * 140, floorY, 140, 800, i % 2 ? '#3A2A24' : '#2F221D', 0, p);
    const tableY = floorY - 220; R(140, tableY, 800, 30, '#F2E6C9', 8, p); R(180, tableY + 30, 720, 160, '#FFFFFF', 0, p, { opacity: .92 }); R(510, tableY + 30, 60, 220, '#4A3A30', 0, p);
    PROP.mug(p, 760, tableY, .8, { color: '#FFFFFF' }); EL(360, tableY - 4, 90, 18, '#FFFFFF', p); EL(360, tableY - 14, 60, 18, '#E07A5F', p);
    return { floorY, tableY, cx: W() / 2 }; };
  ENV.luxury = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1540;
    R(-400, -600, W() + 800, floorY + 600, '#F7F1E6', 0, p);
    const view = G({ transform: 'translate(60,180)' }, p); R(0, 0, 960, 760, BM.lg('lx_sea' + BM.S.childElementCount, [[0, '#FFB86B'], [.55, '#FF8FA3'], [.56, '#3FA7C9'], [1, '#2B7A9A']]), 0, view);
    const sunL = CI(480, 420, 90, '#FFF1C7', view, { opacity: .95 }); const waves = Array.from({ length: 6 }, (_, i) => LN(`M 0 ${470 + i * 50} Q 240 ${460 + i * 50} 480 ${470 + i * 50} T 960 ${470 + i * 50}`, '#FFFFFF', 3, view, { opacity: .4 }));
    tick(t => waves.forEach((w, i) => w.setAttribute('transform', `translate(${Math.sin(t * .8 + i) * 20},0)`)));
    for (const fx of [0, 320, 640, 960]) R(fx + 54, 180, 12, 760, '#D8C9A8', 0, p);
    const chand = J(G({ transform: 'translate(540,0)' }, p)); LN('M 0 -600 L 0 90', '#C9A26B', 4, chand.el); for (let i = -3; i <= 3; i++) { LN(`M 0 90 L ${i * 40} 150`, '#C9A26B', 3, chand.el); CI(i * 40, 160, 12, '#FFF1C7', chand.el); }
    tick(t => { chand.r = Math.sin(t * .9) * 1.2; chand.apply(); });
    R(-400, floorY, W() + 800, 800, '#E9DCC4', 0, p); for (let i = 0; i < 10; i++) R(-400 + i * 200, floorY, 4, 800, '#D8C9A8', 0, p);
    R(120, floorY - 230, 840, 160, '#2F3B52', 40, p); R(100, floorY - 330, 880, 140, '#3A4A66', 50, p); R(150, floorY - 300, 140, 110, '#FFC83D', 30, p); R(800, floorY - 300, 140, 110, '#FF8FA3', 30, p);
    PROP.plant(p, 1010, floorY, 1.6); PROP.trophy(p, 80, floorY - 0, .9);
    return { floorY, sofaY: floorY - 200, cx: W() / 2 }; };
  ENV.park = (p, o = {}) => { const c = P(o), groundY = o.floorY || 1560;
    R(-400, -800, W() + 800, groundY + 800, BM.lg('pk_sky' + BM.S.childElementCount, [[0, '#8ED1F5'], [1, '#E8F7FF']]), 0, p);
    const clouds = [[200, 300], [700, 220], [1000, 420]].map(([cx, cy]) => { const j = J(G({ transform: `translate(${cx},${cy})` }, p)); [[-50, 0, 44], [0, -20, 56], [56, 0, 44]].forEach(([x, y, r]) => CI(x, y, r, '#FFFFFF', j.el)); return j; });
    PA(`M -400 ${groundY - 200} C 100 ${groundY - 380} 500 ${groundY - 140} 1500 ${groundY - 320} L 1500 ${groundY + 800} L -400 ${groundY + 800} Z`, '#9BD38A', p);
    R(-400, groundY, W() + 800, 800, c.grass, 0, p); PA(`M 300 ${groundY + 800} C 420 ${groundY + 300} 560 ${groundY + 100} 600 ${groundY} L 700 ${groundY} C 680 ${groundY + 120} 640 ${groundY + 400} 640 ${groundY + 800} Z`, '#E8D6B8', p);
    const trees = [120, 960].map((tx, i) => { R(tx - 22, groundY - 400, 44, 400, '#8A5A3A', 8, p); const j = J(G({ transform: `translate(${tx},${groundY - 440})` }, p)); CI(0, 0, 160, '#3FA66B', j.el); CI(-90, 60, 110, '#2F8F5B', j.el); CI(90, 60, 110, '#2F8F5B', j.el); return j; });
    R(330, groundY - 120, 420, 26, '#8A5A3A', 6, p); R(330, groundY - 200, 420, 22, '#8A5A3A', 6, p); R(360, groundY - 94, 18, 94, '#5A3A2A', 0, p); R(700, groundY - 94, 18, 94, '#5A3A2A', 0, p);
    const bird = J(G({}, p)); LN('M -20 0 Q -10 -12 0 0 Q 10 -12 20 0', c.ink, 4, bird.el);
    tick(t => { clouds.forEach((cl, i) => { cl.x = (t * (10 + i * 5)) % 300; cl.apply(); }); trees.forEach((tr, i) => { tr.r = Math.sin(t * 1.2 + i) * 1.5; tr.apply(); }); bird.tx = ((t * 160) % 1600) - 300; bird.ty = 380 + Math.sin(t * 3) * 30; bird.sy = .6 + .4 * Math.abs(Math.sin(t * 9)); bird.apply(); });
    return { floorY: groundY, benchY: groundY - 120, cx: W() / 2 }; };
  ENV.kitchen = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1520;
    R(-400, -600, W() + 800, floorY + 600, '#E8F1EE', 0, p); for (let r = 0; r < 8; r++) for (let k = 0; k < 10; k++) R(k * 120 - 40, 700 + r * 60, 116, 56, '#FFFFFF', 4, p, { stroke: '#CFE0DA', 'stroke-width': 2 });
    R(40, 200, 1000, 320, '#81B29A', 10, p); for (let k = 0; k < 4; k++) R(60 + k * 245, 220, 225, 280, '#93C4AC', 8, p);
    R(-400, floorY - 360, W() + 800, 360, '#F2CC8F', 0, p); R(-400, floorY - 380, W() + 800, 30, '#3D405B', 0, p);
    const pot = G({ transform: 'translate(760,' + (floorY - 380) + ')' }, p); R(-80, -110, 160, 110, '#3D405B', 14, pot); const st = [0, 1, 2].map(i => LN(`M ${-30 + i * 30} -130 C ${-50 + i * 30} -170 ${-10 + i * 30} -190 ${-30 + i * 30} -230`, '#FFFFFF', 6, pot, { opacity: .7 }));
    tick(t => st.forEach((s2, i) => s2.setAttribute('transform', `translate(0,${-((t * 40 + i * 20) % 60)})`)));
    R(-400, floorY, W() + 800, 800, '#C9B79C', 0, p); return { floorY, counterY: floorY - 380, cx: W() / 2 }; };
  ENV.classroom = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1520;
    R(-400, -600, W() + 800, floorY + 600, '#F6E7C8', 0, p); const board = G({ transform: 'translate(90,240)' }, p); R(-14, -14, 928, 548, '#8A5A3A', 10, board); R(0, 0, 900, 520, '#2F4F3E', 6, board);
    R(-400, floorY, W() + 800, 800, '#B98B63', 0, p); PROP.clock(p, 960, 160, .9);
    return { floorY, board, boardX: 90, boardY: 240, cx: W() / 2 }; };
  ENV.stage = (p, o = {}) => { const c = P(o), floorY = o.floorY || 1560;
    R(-400, -600, W() + 800, floorY + 600, '#1B1830', 0, p);
    const beams = [200, 540, 880].map((bx, i) => PA(`M ${bx - 30} -200 L ${bx + 30} -200 L ${bx + 260} ${floorY} L ${bx - 260} ${floorY} Z`, '#FFF1C7', p, { opacity: .1 }));
    tick(t => beams.forEach((b, i) => b.setAttribute('transform', `rotate(${Math.sin(t * .7 + i * 2) * 8} ${[200, 540, 880][i]} -200)`)));
    R(-400, floorY, W() + 800, 800, '#3A2A4A', 0, p); EL(540, floorY + 40, 420, 60, '#FFF1C7', p, { opacity: .25 });
    return { floorY, cx: W() / 2 }; };
  ENV.LIST = ['office', 'bedroom', 'street', 'restaurant', 'luxury', 'park', 'kitchen', 'classroom', 'stage'];
  PROP.LIST = ['desk', 'monitor', 'laptop', 'phone', 'mug', 'chair', 'plant', 'clock', 'money', 'coin', 'car', 'briefcase', 'papers', 'trophy', 'waterCooler', 'lamp', 'bubble'];
})();
