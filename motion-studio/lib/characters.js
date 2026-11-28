/* characters.js — Motion Studio character library (needs bm-core.js).
   10 fixed identities (CAST), each a parametric jointed vector rig (Bang Motion law 5: joints via BM.J, GSAP never
   touches a joint transform). Same id + same params => identical look in every scene and every video.
   Render modes per visual style: 'flat' (cartoon), 'ink' (comic: black outlines), 'line' (minimal edu: outline on paper).
   Feet at (0,0); pelvis at y=-190; head joint at torso y=-196. Face state F drives eyes, lids, brows, pupils, extras. */
(function () {
  const { N, G, R, CI, EL, PA, LN, TX, J, shade } = BM;
  const CH = (BM.CH = {});
  /* ---------- the cast: fixed identities ---------- */
  CH.CAST = {
    dave:  { name: 'Dave',  role: 'trader / office guy',  skin: '#F2B98C', hair: ['spiky', '#3A2418'], top: ['hoodie', '#4C7DFF'], pants: '#2E3550', shoes: '#F4F4F8', acc: [] },
    maya:  { name: 'Maya',  role: 'designer',             skin: '#C98E66', hair: ['bob', '#1E1414'], top: ['tshirt', '#FF7A59'], pants: '#2B3A55', shoes: '#FFFFFF', acc: ['glasses', 'earrings'] },
    omar:  { name: 'Omar',  role: 'manager / boss',       skin: '#B97A52', hair: ['bald', '#2A1C14'], top: ['suit', '#2F3B52', '#E64545'], pants: '#2F3B52', shoes: '#1B1B22', acc: ['beard'], build: { w: 1.12 } },
    lina:  { name: 'Lina',  role: 'consultant',           skin: '#E8B48F', hair: ['hijab', '#2F8F7B'], top: ['blazer', '#F2EEE6', '#2F8F7B'], pants: '#3C3F4A', shoes: '#6B4A3A', acc: [] },
    kenji: { name: 'Kenji', role: 'developer',            skin: '#F0C7A0', hair: ['slick', '#151515'], top: ['tshirt', '#2E2E36'], pants: '#4A5D7A', shoes: '#E84A4A', acc: ['headphones'] },
    grace: { name: 'Grace', role: 'senior colleague',     skin: '#F3C7AE', hair: ['bun', '#C9C3BC'], top: ['cardigan', '#8E6BB8', '#F3EEE6'], pants: '#5A5A6A', shoes: '#4A3A3A', acc: ['glasses'] },
    leo:   { name: 'Leo',   role: 'kid',                  skin: '#D6A07A', hair: ['cap', '#E63946'], top: ['tshirt', '#FFC83D'], pants: '#3E7BD6', shoes: '#FFFFFF', acc: ['freckles'], build: { h: .78, head: 1.08 } },
    sam:   { name: 'Sam',   role: 'intern',               skin: '#8D5A3B', hair: ['curly', '#1A1210'], top: ['hoodie', '#2FAE72'], pants: '#3A3A48', shoes: '#F4F4F8', acc: ['lanyard'] },
    rex:   { name: 'Rex',   role: 'CEO',                  skin: '#F2C3A0', hair: ['slick', '#5A4A3A'], top: ['suit', '#1E1E24', '#FFC83D'], pants: '#1E1E24', shoes: '#0E0E12', acc: ['mustache'], build: { w: 1.18 } },
    zara:  { name: 'Zara',  role: 'athlete / creator',    skin: '#A86F4C', hair: ['ponytail', '#2B1B12'], top: ['tshirt', '#7B5CFF'], pants: '#1E2A3A', shoes: '#29D3A0', acc: ['earrings'] },
  };
  const INK = '#1E1B2E';
  /* ---------- expressions (>= 15) ---------- */
  const E = (o) => Object.assign({ lid: 0, low: 0, eyeS: 1, pupS: 1, lx: 0, ly: 0, bA: 0, by: 0, bq: 0, pup: 'dot', m: 'smile', wink: 0 }, o);
  CH.EXPR = {
    neutral: E({ m: 'flat' }), smile: E({}), happy: E({ low: .25, bA: -4, by: -6, m: 'grin' }), laugh: E({ lid: .55, low: .4, bA: -8, by: -10, m: 'laugh' }),
    smug: E({ lid: .38, lx: 9, bA: 4, by: 2, bq: -14, m: 'smirk' }), shock: E({ eyeS: 1.34, pupS: .45, bA: -8, by: -28, m: 'O' }),
    panic: E({ eyeS: 1.2, pupS: .55, bA: -16, by: -16, m: 'wobble' }), sad: E({ lid: .36, eyeS: .96, ly: 7, bA: -18, by: -4, m: 'frown' }),
    cry: E({ lid: .5, low: .3, ly: 6, bA: -22, by: -6, m: 'wail' }), angry: E({ lid: .3, pupS: .85, bA: 20, by: 8, m: 'grit' }),
    furious: E({ lid: .2, eyeS: 1.1, pupS: .5, bA: 28, by: 12, m: 'scream' }), ecstatic: E({ eyeS: 1.16, pupS: 1.15, bA: -8, by: -22, pup: 'dollar', m: 'grin' }),
    deadpan: E({ lid: .56, pupS: .9, by: 6, m: 'flat' }), sly: E({ lid: .28, pupS: 1.05, lx: -12, ly: 6, bA: 8, bq: -16, m: 'smirk' }),
    scared: E({ eyeS: 1.25, pupS: .5, lx: -10, bA: -20, by: -18, m: 'worried' }), confused: E({ lx: 8, ly: -8, bA: 6, bq: -18, m: 'wobble' }),
    sleepy: E({ lid: .78, ly: 4, by: 4, m: 'O_small' }), disgusted: E({ lid: .4, low: .3, bA: 14, by: 6, bq: 6, m: 'tongue' }),
    love: E({ eyeS: 1.1, pupS: 1.2, bA: -10, by: -14, pup: 'heart', m: 'smile' }), nervous: E({ eyeS: 1.08, pupS: .7, lx: 10, bA: -12, by: -8, m: 'grit' }),
    wink: E({ wink: 1, bq: -10, m: 'smirk' }), proud: E({ lid: .45, low: .2, by: -6, bA: -4, m: 'smile' }), starstruck: E({ eyeS: 1.2, pup: 'star', bA: -10, by: -20, m: 'O' }),
  };
  CH.VISEMES = ['v_closed', 'v_small', 'v_open', 'v_wide', 'v_round'];

  /* ---------- the rig ---------- */
  CH.make = function (p, id, x, gy, s = 1, opt = {}) {
    const P = { ...CH.CAST[id], ...opt.override }; if (!P.name) throw new Error('unknown character ' + id);
    const mode = opt.mode || 'flat', legs = opt.legs !== false, B = { w: 1, h: 1, head: 1, ...P.build };
    const st = mode === 'flat' ? {} : { stroke: INK, 'stroke-width': mode === 'ink' ? 6 : 5, 'stroke-linejoin': 'round' };
    const fill = c => mode === 'line' ? '#FFFDF7' : c;
    const place = G({ transform: `translate(${x},${gy}) scale(${s})` }, p), rootEl = G({}, place), root = J(rootEl);
    const ch = { id, P, root, place, s, x, gy, mode, mouths: {}, extras: {} };
    const sd = EL(0, 4, 78 * B.w, 14, INK, rootEl, { opacity: mode === 'line' ? .08 : .14 }); ch.shadow = sd;
    const body = G({ transform: `scale(${B.w},${B.h})` }, rootEl);   // build: width / height
    if (legs) for (const side of ['R', 'L']) {
      const sx = side === 'R' ? -28 : 28, dk = side === 'R' ? .88 : 1, tEl = G({}, body), th = J(tEl, sx, -190);
      if (P.top[0] === 'dress') R(-24, -8, 48, 112, fill(P.skin), 22, tEl, st); else R(-24, -8, 48, 112, fill(shade(P.pants, dk)), 22, tEl, st);
      const sEl = G({}, tEl), sh = J(sEl, 0, 100); R(-21, -6, 42, 100, fill(P.top[0] === 'dress' ? P.skin : shade(P.pants, dk)), 18, sEl, st);
      const fEl = G({}, sEl), ft = J(fEl, 0, 94); PA('M -24 -6 L 18 -6 C 30 6 50 6 52 18 L 52 28 L -26 28 Z', fill(shade(P.shoes, dk)), fEl, st);
      ch[side + 'thigh'] = th; ch[side + 'shin'] = sh; ch[side + 'foot'] = ft;
    }
    const tEl = G({}, body), torso = J(tEl, 0, -190); ch.torso = torso;
    const [topKind, topCol, top2] = P.top;
    const sleeveCol = topKind === 'tshirt' ? null : topCol;
    const arm = (side, front) => { const k = side === 'R' ? -1 : 1, aEl = G({}, tEl), a = J(aEl, 74 * k, -150), c = front ? 1 : .88;
      R(-20, -14, 40, 96, fill(shade(sleeveCol || topCol, c)), 18, aEl, st);
      const fEl = G({}, aEl), f = J(fEl, 0, 82); R(-17, -10, 34, 86, fill(shade(sleeveCol || P.skin, c)), 16, fEl, st);
      const hEl = G({}, fEl), h = J(hEl, 0, 80); CI(0, 6, 22, fill(shade(P.skin, c)), hEl, st);
      ch[side + 'arm'] = a; ch[side + 'fore'] = f; ch[side + 'hand'] = h; ch[side + 'handEl'] = hEl; };
    arm('R', false);
    if (P.hair[0] === 'hijab') EL(0, -176, 96, 50, fill(P.hair[1]), tEl, st);
    const torsoD = 'M -70 -170 C -88 -150 -90 -100 -84 -40 L -76 10 C -40 26 40 26 76 10 L 84 -40 C 90 -100 88 -150 70 -170 C 40 -186 -40 -186 -70 -170 Z';
    if (topKind === 'dress') PA('M -66 -170 C -84 -120 -86 -60 -96 30 L -110 120 C -40 140 40 140 110 120 L 96 30 C 86 -60 84 -120 66 -170 C 40 -186 -40 -186 -66 -170 Z', fill(topCol), tEl, st);
    else PA(torsoD, fill(topCol), tEl, st);
    if (topKind === 'hoodie') { PA('M -46 -40 L 46 -40 L 54 6 L -54 6 Z', fill(shade(topCol, .88)), tEl, st); LN('M -16 -166 L -20 -118', '#EEF0FF', 5, tEl); LN('M 16 -166 L 20 -118', '#EEF0FF', 5, tEl); }
    if (topKind === 'suit' || topKind === 'blazer') { PA('M -30 -176 L 0 -96 L 30 -176 Z', fill(topKind === 'suit' ? '#F4F4F6' : (top2 || '#FFF')), tEl, st);
      PA('M -30 -176 L -8 -110 L -40 -120 Z', fill(shade(topCol, .8)), tEl, st); PA('M 30 -176 L 8 -110 L 40 -120 Z', fill(shade(topCol, .8)), tEl, st);
      if (topKind === 'suit') { const tie = G({}, tEl), tj = J(tie, 0, -168); PA('M -9 0 L 9 0 L 13 60 L 0 76 L -13 60 Z', fill(top2 || '#E64545'), tie, st); ch.tie = tj; } }
    if (topKind === 'shirt') { PA('M -24 -176 L 0 -150 L 24 -176 L 14 -140 L 0 -150 L -14 -140 Z', fill('#FFFFFF'), tEl, st); for (let i = 0; i < 3; i++) CI(0, -128 + i * 34, 4, INK, tEl); }
    if (topKind === 'cardigan') { R(-26, -176, 52, 190, fill(top2 || '#FFF'), 6, tEl, st); for (let i = 0; i < 4; i++) CI(-34, -140 + i * 36, 5, INK, tEl); }
    if (topKind === 'tshirt') PA('M -26 -178 C -14 -160 14 -160 26 -178', 'none', tEl, { stroke: shade(topCol, .7), 'stroke-width': 6 });
    if (P.acc.includes('lanyard')) { LN('M -30 -176 L 0 -110 L 30 -176', '#E63946', 4, tEl); R(-16, -110, 32, 40, '#FFFFFF', 4, tEl, { stroke: INK, 'stroke-width': 2 }); }
    R(-18, -200, 36, 34, fill(shade(P.skin, .9)), 10, tEl, st);
    arm('L', true);
    /* head */
    const hEl = G({}, tEl), head = J(hEl, 0, -196); ch.head = head; const hs = G({ transform: `scale(${B.head})` }, hEl); ch.headEl = hs;
    const [hairKind, hairCol] = P.hair;
    if (hairKind === 'ponytail') { const pt = G({}, hs), pj = J(pt, 70, -190); PA('M 0 0 C 50 10 70 70 50 130 C 30 110 14 60 -6 20 Z', fill(hairCol), pt, st); ch.ponytail = pj; }
    if (hairKind === 'bun') CI(0, -246, 42, fill(hairCol), hs, st);
    if (hairKind === 'hijab') EL(0, -118, 124, 136, fill(hairCol), hs, st);
    if (hairKind !== 'hijab') { EL(-102, -116, 17, 25, fill(shade(P.skin, .9)), hs, st); EL(102, -116, 17, 25, fill(shade(P.skin, .9)), hs, st); }
    EL(0, -118, 104, 112, fill(P.skin), hs, st);
    const H = (d) => PA(d, fill(hairCol), hs, st);
    if (hairKind === 'spiky') { H('M -100 -146 C -106 -232 -20 -262 30 -246 C 70 -262 114 -220 102 -146 C 86 -180 62 -196 42 -186 C 50 -210 20 -214 6 -200 C -10 -222 -50 -214 -60 -190 C -76 -200 -94 -180 -100 -146 Z'); H('M -4 -242 C 4 -280 32 -294 46 -304 C 36 -282 36 -262 24 -244 Z'); }
    if (hairKind === 'bob') H('M -114 -96 C -124 -236 124 -236 114 -96 L 116 -40 L 86 -40 C 92 -120 74 -168 0 -172 C -74 -168 -92 -120 -86 -40 L -116 -40 Z');
    if (hairKind === 'bun') H('M -102 -140 C -100 -226 100 -226 102 -140 C 70 -186 -70 -186 -102 -140 Z');
    if (hairKind === 'bald') { H('M -104 -126 C -110 -100 -104 -80 -96 -70 L -90 -120 Z'); H('M 104 -126 C 110 -100 104 -80 96 -70 L 90 -120 Z'); EL(-30, -200, 26, 10, '#FFFFFF', hs, { opacity: .35 }); }
    if (hairKind === 'curly') for (let i = 0; i < 11; i++) { const a = Math.PI * (1.02 + i * .096); CI(Math.cos(a) * 96, -126 + Math.sin(a) * 100, 30, fill(hairCol), hs, st); }
    if (hairKind === 'ponytail') H('M -100 -136 C -102 -228 100 -228 102 -136 C 60 -190 -60 -190 -100 -136 Z');
    if (hairKind === 'slick') H('M -102 -140 C -104 -236 104 -236 102 -140 C 90 -176 30 -196 -20 -184 C -50 -178 -80 -164 -102 -140 Z');
    if (hairKind === 'cap') { PA('M -104 -140 C -100 -240 100 -240 104 -140 Z', fill(hairCol), hs, st); PA('M 40 -150 L 160 -150 C 160 -136 120 -128 60 -132 Z', fill(shade(hairCol, .8)), hs, st); CI(0, -228, 8, fill(shade(hairCol, .7)), hs); }
    if (hairKind === 'hijab') PA('M -110 -150 C -96 -230 96 -230 110 -150 C 80 -190 -80 -190 -110 -150 Z', fill(shade(hairCol, .9)), hs, st);
    /* face */
    const F = { lid: 0, blink: 0, low: 0, eyeS: 1, pupS: 1, lx: 0, ly: 0, bA: 0, by: 0, bq: 0, pup: 0, twitch: 0, wink: 0 }; ch.F = F; ch.eyes = [];
    const pupKinds = ['dot', 'dollar', 'heart', 'star'];
    for (const [ex, k] of [[-40, 0], [40, 1]]) {
      const cid = `ec_${id}_${BM.S.childElementCount}_${k}_${Math.round(x)}_${Math.round(gy)}`, cp = N('clipPath', { id: cid }, BM.defs); EL(0, 0, 26, 30, '#fff', cp);
      const eg = G({}, hs), ej = J(eg, ex, -124); EL(0, 0, 26, 30, '#FFFFFF', eg);
      const pg = G({}, eg), pj = J(pg, 0, 4), kinds = {};
      kinds.dot = G({}, pg); CI(0, 0, 11, INK, kinds.dot); CI(-4, -4, 3.6, '#FFFFFF', kinds.dot);
      kinds.dollar = G({ opacity: 0 }, pg); TX(0, 11, '$', 32, '#16A34A', kinds.dollar, { 'font-weight': 900 });
      kinds.heart = G({ opacity: 0 }, pg); PA('M 0 10 C -18 -2 -16 -16 -7 -16 C -2 -16 0 -11 0 -9 C 0 -11 2 -16 7 -16 C 16 -16 18 -2 0 10 Z', '#FF3B6B', kinds.heart);
      kinds.star = G({ opacity: 0 }, pg); PA('M 0 -14 L 4 -4 L 14 -4 L 6 3 L 9 13 L 0 7 L -9 13 L -6 3 L -14 -4 L -4 -4 Z', '#FFC83D', kinds.star);
      const lid = R(-30, -34, 60, 0, fill(P.skin), 0, eg, { 'clip-path': `url(#${cid})` }), lowL = R(-30, 34, 60, 0, fill(P.skin), 0, eg, { 'clip-path': `url(#${cid})` });
      EL(0, 0, 26, 30, 'none', eg, { stroke: INK, 'stroke-width': 3.5 });
      ch.eyes.push({ ej, pj, kinds, lid, lowL, k });
    }
    const bL = G({}, hs), browL = J(bL, -40, -174); LN('M -22 2 C -10 -8 10 -8 22 2', mode === 'line' ? INK : hairCol === '#C9C3BC' ? '#8A847C' : hairCol, 9, bL);
    const bR = G({}, hs), browR = J(bR, 40, -174); LN('M -22 2 C -10 -8 10 -8 22 2', mode === 'line' ? INK : hairCol === '#C9C3BC' ? '#8A847C' : hairCol, 9, bR);
    EL(0, -94, 14, 11, fill(shade(P.skin, .88)), hs, mode === 'flat' ? {} : { stroke: INK, 'stroke-width': 3 });
    if (P.acc.includes('freckles')) for (const [fx, fy] of [[-60, -90], [-50, -80], [-66, -78], [60, -90], [50, -80], [66, -78]]) CI(fx, fy, 3.5, shade(P.skin, .72), hs);
    ch.extras.blush = [EL(-66, -78, 19, 10, '#FF8FA3', hs, { opacity: 0 }), EL(66, -78, 19, 10, '#FF8FA3', hs, { opacity: 0 })];
    if (P.acc.includes('beard')) PA('M -96 -110 C -96 -30 -50 4 0 4 C 50 4 96 -30 96 -110 C 80 -70 60 -56 0 -56 C -60 -56 -80 -70 -96 -110 Z', fill(hairCol), hs, st);
    /* mouths: one visible at a time */
    const mg = G({}, hs), mj = J(mg, 0, -58); ch.mj = mj;
    const M = (n, build) => { const g = G({ opacity: n === 'smile' ? 1 : 0 }, mg); build(g); ch.mouths[n] = g; };
    const dark = '#7A1F2B', tongue = '#FF7A8A';
    M('smile', g => LN('M -28 -4 C -12 12 12 12 28 -4', INK, 7, g)); M('smirk', g => LN('M -26 6 C -6 14 12 10 30 -8', INK, 7, g));
    M('grin', g => { PA('M -42 -10 Q 0 50 42 -10 Z', dark, g); PA('M -38 -8 L 38 -8 L 31 6 L -31 6 Z', '#FFFFFF', g); EL(0, 22, 15, 8, tongue, g); });
    M('laugh', g => { PA('M -46 -14 Q 0 64 46 -14 Z', dark, g); PA('M -42 -12 L 42 -12 L 36 2 L -36 2 Z', '#FFFFFF', g); EL(0, 30, 18, 10, tongue, g); });
    M('O', g => { EL(0, 6, 19, 26, dark, g); EL(0, 22, 11, 7, tongue, g); }); M('O_small', g => EL(0, 4, 9, 11, dark, g));
    M('scream', g => { EL(0, 10, 30, 38, dark, g); EL(0, 32, 16, 9, tongue, g); R(-22, -26, 44, 9, '#FFFFFF', 3, g); });
    M('frown', g => LN('M -28 12 C -10 -6 10 -6 28 12', INK, 7, g)); M('worried', g => PA('M -24 10 C -10 -10 10 -10 24 10 Z', dark, g));
    M('wail', g => { PA('M -34 18 C -20 -18 20 -18 34 18 Z', dark, g); EL(0, 12, 12, 6, tongue, g); });
    M('wobble', g => LN('M -32 6 L -20 -3 L -8 6 L 4 -3 L 16 6 L 28 -3', INK, 6, g)); M('flat', g => LN('M -22 4 L 22 4', INK, 7, g));
    M('grit', g => { R(-34, -10, 68, 24, '#FFFFFF', 7, g, { stroke: INK, 'stroke-width': 4 }); LN('M -34 2 L 34 2 M -17 -10 L -17 14 M 0 -10 L 0 14 M 17 -10 L 17 14', INK, 3, g); });
    M('tongue', g => { LN('M -24 0 C -8 8 8 8 24 0', INK, 6, g); PA('M 2 4 C 2 24 22 24 20 4 Z', tongue, g); });
    M('slurp', g => { EL(0, 4, 10, 9, dark, g); LN('M -14 4 C -14 -6 14 -6 14 4', INK, 5, g); });
    M('v_closed', g => LN('M -18 4 C -6 7 6 7 18 4', INK, 7, g)); M('v_small', g => EL(0, 4, 14, 7, dark, g));
    M('v_open', g => { EL(0, 6, 17, 17, dark, g); EL(0, 15, 9, 5, tongue, g); }); M('v_wide', g => { PA('M -30 -2 Q 0 26 30 -2 Z', dark, g); R(-26, -2, 52, 6, '#FFFFFF', 3, g); });
    M('v_round', g => EL(0, 4, 11, 14, dark, g));
    if (P.acc.includes('mustache')) PA('M -46 -74 C -30 -90 -8 -84 0 -76 C 8 -84 30 -90 46 -74 C 30 -70 10 -70 0 -66 C -10 -70 -30 -70 -46 -74 Z', fill(hairCol), hs, st);
    /* extras */
    const X = ch.extras;
    X.sweat = PA('M 0 0 C -10 14 -10 26 0 26 C 10 26 10 14 0 0 Z', '#7FD3FF', hs, { transform: 'translate(92,-176)', opacity: 0 });
    X.tears = [-40, 40].map(ex => PA('M 0 0 C -9 13 -9 24 0 24 C 9 24 9 13 0 0 Z', '#7FD3FF', hs, { transform: `translate(${ex},-96)`, opacity: 0 }));
    X.stream = [-40, 40].map(ex => PA(`M ${ex - 8} -96 C ${ex - 10} -60 ${ex - 12} -20 ${ex - 14} 30 L ${ex + 2} 30 C ${ex} -20 ${ex + 2} -60 ${ex + 6} -96 Z`, '#7FD3FF', hs, { opacity: 0 }));
    X.vein = G({ transform: 'translate(64,-196)', opacity: 0 }, hs); LN('M -14 -4 C -4 -4 -4 -14 -4 -20 M 4 -20 C 4 -14 4 -4 14 -4 M 14 4 C 4 4 4 14 4 20 M -4 20 C -4 14 -4 4 -14 4', '#E63946', 6, X.vein);
    X.zzz = G({ transform: 'translate(110,-250)', opacity: 0 }, hs); TX(0, 0, 'z', 34, INK, X.zzz, { 'font-weight': 800 }); TX(26, -30, 'z', 44, INK, X.zzz, { 'font-weight': 800 }); TX(58, -66, 'Z', 56, INK, X.zzz, { 'font-weight': 800 });
    X.question = G({ transform: 'translate(-120,-250)', opacity: 0 }, hs); TX(0, 0, '?', 70, INK, X.question, { 'font-weight': 900 });
    X.sparkle = G({ transform: 'translate(118,-200)', opacity: 0 }, hs); PA('M 0 -24 L 6 -6 L 24 0 L 6 6 L 0 24 L -6 6 L -24 0 L -6 -6 Z', '#FFC83D', X.sparkle);
    if (P.acc.includes('glasses')) { const gg = G({}, hs); CI(-40, -124, 34, 'none', gg, { stroke: INK, 'stroke-width': 6 }); CI(40, -124, 34, 'none', gg, { stroke: INK, 'stroke-width': 6 }); LN('M -6 -124 L 6 -124', INK, 6, gg); ch.glasses = gg; }
    if (P.acc.includes('earrings')) { CI(-104, -86, 8, '#FFC83D', hs); CI(104, -86, 8, '#FFC83D', hs); }
    if (P.acc.includes('headphones')) { PA('M -112 -120 C -112 -250 112 -250 112 -120', 'none', hs, { stroke: '#2B2B33', 'stroke-width': 14 }); R(-128, -150, 30, 64, '#E84A4A', 12, hs); R(98, -150, 30, 64, '#E84A4A', 12, hs); }
    const sg = G({ opacity: 0 }, hs), sj = J(sg, 0, 0); ch.sunglasses = sg; ch.sj = sj;
    R(-80, -148, 72, 46, '#141322', 16, sg, { stroke: '#FFC83D', 'stroke-width': 4 }); R(8, -148, 72, 46, '#141322', 16, sg, { stroke: '#FFC83D', 'stroke-width': 4 }); LN('M -8 -130 L 8 -130', '#FFC83D', 5, sg);
    F.apply = () => {
      for (const e of ch.eyes) {
        const w = e.k === 1 ? Math.max(F.twitch, F.wink) : 0, lid = Math.min(1, Math.max(F.lid + w, F.blink));
        e.ej.sx = e.ej.sy = F.eyeS; e.ej.apply(); e.pj.x = F.lx; e.pj.y = 4 + F.ly; e.pj.sx = e.pj.sy = F.pupS; e.pj.apply();
        e.lid.setAttribute('height', 64 * lid); e.lowL.setAttribute('y', 34 - 30 * F.low); e.lowL.setAttribute('height', 30 * F.low);
        pupKinds.forEach((k, i) => e.kinds[k].setAttribute('opacity', Math.round(F.pup) === i ? 1 : 0));
      }
      browL.r = F.bA; browL.y = F.by; browL.apply(); browR.r = -F.bA; browR.y = F.by + F.bq; browR.apply();
    };
    F.apply(); ch.mouth = 'smile';
    return ch;
  };

  /* ---------- animation API (all deterministic, seek-safe) ---------- */
  const tl = () => BM.tl;
  CH.setMouth = (ch, at, m) => { for (const k in ch.mouths) tl().set(ch.mouths[k], { opacity: k === m ? 1 : 0 }, at); };
  CH.expr = (ch, at, name, dur = .16) => { const x = CH.EXPR[name]; if (!x) throw new Error('unknown expression ' + name);
    const { m, pup, ...f } = x; tl().to(ch.F, { ...f, pup: ['dot', 'dollar', 'heart', 'star'].indexOf(pup), duration: dur, ease: 'power2.out', onUpdate: ch.F.apply }, at);
    CH.setMouth(ch, at, m); tl().fromTo(ch.mj, { sx: 1.25, sy: 1.25 }, { sx: 1, sy: 1, duration: .22, ease: 'back.out(3)', onUpdate: ch.mj.apply, immediateRender: false }, at);
    const X = ch.extras;
    tl().to(X.vein, { opacity: name === 'angry' || name === 'furious' ? 1 : 0, duration: .1 }, at); tl().to(X.zzz, { opacity: name === 'sleepy' ? 1 : 0, duration: .2 }, at);
    tl().to(X.question, { opacity: name === 'confused' ? 1 : 0, duration: .15 }, at); tl().to(X.blush, { opacity: name === 'love' || name === 'proud' ? .8 : 0, duration: .2 }, at);
    tl().to(X.stream, { opacity: name === 'cry' ? .85 : 0, duration: .2 }, at); tl().to(X.sweat, { opacity: name === 'nervous' || name === 'panic' ? 1 : 0, duration: .15 }, at);
    tl().to(X.sparkle, { opacity: name === 'proud' || name === 'starstruck' ? 1 : 0, duration: .15 }, at); };
  CH.blink = (ch, at) => tl().to(ch.F, { keyframes: [{ blink: 1, duration: .06 }, { blink: 1, duration: .05 }, { blink: 0, duration: .07 }], onUpdate: ch.F.apply }, at);
  CH.blinks = (ch, t0, t1, every = 3.4) => { for (let t = t0 + .8 + BM.hash(ch.x) * 1.5; t < t1; t += every + BM.hash(t) * 1.2) CH.blink(ch, t); };
  CH.look = (ch, at, lx, ly, dur = .2) => tl().to(ch.F, { lx, ly, duration: dur, ease: 'power2.out', onUpdate: ch.F.apply }, at);
  /* POSES: joint rotations in degrees. R* = character's right (screen left), arm 0 = hanging down, +R raises outward */
  CH.POSES = {
    neutral: { Rarm: 6, Rfore: 4, Larm: -6, Lfore: -4, torso: 0, head: 0 },
    wave: { Larm: -150, Lfore: -30 }, point: { Larm: -92, Lfore: -6 }, pointUp: { Larm: -165, Lfore: 0 }, armsUp: { Rarm: 160, Rfore: 14, Larm: -160, Lfore: -14 },
    handsHips: { Rarm: 38, Rfore: -96, Larm: -38, Lfore: 96 }, crossArms: { Rarm: -30, Rfore: -112, Larm: 30, Lfore: 112 },
    thinking: { Larm: 26, Lfore: 140, head: 8, Rarm: 30, Rfore: -110 }, facepalm: { Larm: 28, Lfore: 150, head: 14 }, shrug: { Rarm: 50, Rfore: -110, Larm: -50, Lfore: 110, head: -6 },
    thumbsUp: { Larm: -60, Lfore: -80 }, typing: { Rarm: -32, Rfore: -60, Larm: 32, Lfore: 60 }, phone: { Larm: 20, Lfore: 130, head: 10 },
    clap: { Rarm: -20, Rfore: -100, Larm: 20, Lfore: 100 }, hideFace: { Rarm: -10, Rfore: -150, Larm: 10, Lfore: 150, head: 6 }, presenter: { Larm: -70, Lfore: -40, Rarm: 10, Rfore: 0 },
    sip: { Larm: 150, Lfore: -58, head: 6 }, stretch: { Rarm: 170, Rfore: 10, Larm: -170, Lfore: -10, torso: 0, head: -8 }, sneak: { Rarm: 40, Rfore: -60, Larm: -40, Lfore: 60, torso: 10 }, dab: { Rarm: 125, Rfore: 35, Larm: -100, Lfore: -125, head: 22, torso: -6 },
  };
  /* pose with anticipation (small move the other way) and follow-through (overshoot, settle) */
  CH.pose = (ch, at, name, dur = .38, { antic = .12, over = .12 } = {}) => { const P = typeof name === 'string' ? CH.POSES[name] : name;
    for (const k in P) { const j = ch[k]; if (!j) continue; const target = P[k], cur = j._last ?? 0, d = target - cur; j._last = target;
      tl().to(j, { keyframes: [{ r: cur - d * antic, duration: dur * .25, ease: 'sine.inOut' }, { r: target + d * over, duration: dur * .5, ease: 'power3.out' }, { r: target, duration: dur * .25, ease: 'sine.inOut' }], onUpdate: j.apply }, at); } };
  CH.snap = (ch, at, name) => { const P = typeof name === 'string' ? CH.POSES[name] : name; for (const k in P) if (ch[k]) { ch[k]._last = P[k]; tl().set(ch[k], { r: P[k], onUpdate: ch[k].apply, onComplete: ch[k].apply }, at); } };
  /* squash & stretch on the root (pivot at the feet) */
  CH.squash = (ch, at, amt = .18, dur = .32) => tl().to(ch.root, { keyframes: [{ sx: 1 + amt, sy: 1 - amt, duration: dur * .35, ease: 'power2.out' }, { sx: 1 - amt * .4, sy: 1 + amt * .4, duration: dur * .35, ease: 'sine.inOut' }, { sx: 1, sy: 1, duration: dur * .3, ease: 'sine.out' }], onUpdate: ch.root.apply }, at);
  /* secondary motion: damped swing on hair / ponytail / tie after a move (closed form) */
  CH.jiggle = (ch, at, amp = 14, dur = 1.0) => { for (const j of [ch.ponytail, ch.tie].filter(Boolean)) { const o = { k: 0 };
    tl().to(o, { k: 1, duration: dur, ease: 'none', onUpdate() { const t = o.k * dur; j.r = amp * Math.exp(-t * 4) * Math.sin(t * 16); j.apply(); } }, at); }
    const o = { k: 0 }, h = ch.head; tl().to(o, { k: 1, duration: dur * .7, ease: 'none', onUpdate() { const t = o.k * dur * .7; h.y = -amp * .25 * Math.exp(-t * 6) * Math.sin(t * 18); h.apply(); } }, at); };
  CH.idle = (ch, t0, t1) => { const n = Math.max(1, Math.floor((t1 - t0) / 1.7));
    tl().fromTo(ch.torso, { r: -1.2 }, { r: 1.2, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: n, onUpdate: ch.torso.apply, immediateRender: false }, t0);
    tl().fromTo(ch.head, { r: 1.6 }, { r: -1.6, duration: 2.3, ease: 'sine.inOut', yoyo: true, repeat: Math.max(1, Math.floor((t1 - t0) / 2.3)), onUpdate: ch.head.apply, immediateRender: false }, t0 + .3);
    CH.blinks(ch, t0, t1); };
  /* locomotion: walk / run / sneak (stride from duration), shadow follows, body bobs, arms counter-swing */
  const gait = (ch, at, dur, dx, { period = .39, thigh = 15, shin = 18, arm = 12, bob = 4, lean = 0 } = {}) => {
    const n = Math.max(1, Math.round(dur / period)), dir = Math.sign(dx) || 1;
    tl().to(ch.root, { x: '+=' + dx, duration: dur, ease: 'none', onUpdate: ch.root.apply }, at);
    const leg = (j, a, b) => j && tl().fromTo(j, { r: a }, { r: b, duration: period, ease: 'sine.inOut', yoyo: true, repeat: n - 1, onUpdate: j.apply, immediateRender: false }, at);
    leg(ch.Lthigh, -thigh * dir, thigh * dir); leg(ch.Rthigh, thigh * dir, -thigh * dir); leg(ch.Lshin, 0, shin); leg(ch.Rshin, shin, 0);
    leg(ch.Larm, -arm, arm); leg(ch.Rarm, arm, -arm);
    tl().fromTo(ch.root, { y: 0 }, { y: -bob, duration: period / 2, ease: 'sine.inOut', yoyo: true, repeat: n * 2 - 1, onUpdate: ch.root.apply, immediateRender: false }, at);
    if (lean) { tl().to(ch.torso, { r: lean * dir, duration: .2, onUpdate: ch.torso.apply }, at); tl().to(ch.torso, { r: 0, duration: .3, onUpdate: ch.torso.apply }, at + dur); }
    [ch.Lthigh, ch.Rthigh, ch.Lshin, ch.Rshin, ch.Larm, ch.Rarm].filter(Boolean).forEach(j => tl().to(j, { r: 0, duration: .25, onUpdate: j.apply }, at + dur));
    CH.jiggle(ch, at + dur, 10, .8); };
  CH.walk = (ch, at, dur, dx) => gait(ch, at, dur, dx);
  CH.run = (ch, at, dur, dx) => { CH.squash(ch, at - .12, .1, .2); gait(ch, at, dur, dx, { period: .24, thigh: 32, shin: 50, arm: 40, bob: 12, lean: 10 }); };
  CH.sneak = (ch, at, dur, dx) => { CH.snap(ch, at, 'sneak'); gait(ch, at, dur, dx, { period: .6, thigh: 10, shin: 30, arm: 6, bob: 8, lean: 8 }); };
  CH.sit = (ch, at, seatY = 120, dur = .45) => { tl().to(ch.root, { y: seatY, duration: dur, ease: 'power2.inOut', onUpdate: ch.root.apply }, at);
    for (const [j, v] of [[ch.Lthigh, -85], [ch.Rthigh, -85], [ch.Lshin, 85], [ch.Rshin, 85]]) if (j) tl().to(j, { r: v, duration: dur, ease: 'power2.inOut', onUpdate: j.apply }, at);
    CH.squash(ch, at + dur, .08, .25); };
  CH.stand = (ch, at, dur = .4) => { tl().to(ch.root, { y: 0, duration: dur, ease: 'back.out(1.6)', onUpdate: ch.root.apply }, at);
    for (const j of [ch.Lthigh, ch.Rthigh, ch.Lshin, ch.Rshin]) if (j) tl().to(j, { r: 0, duration: dur, onUpdate: j.apply }, at); };
  CH.jump = (ch, at, h = 160, dur = .6) => { CH.squash(ch, at, .2, .18);
    tl().to(ch.root, { keyframes: [{ y: -h, duration: dur * .45, ease: 'power2.out' }, { y: 0, duration: dur * .55, ease: 'power2.in' }], onUpdate: ch.root.apply }, at + .12);
    tl().to(ch.root, { keyframes: [{ sy: 1.12, sx: .92, duration: dur * .3 }, { sy: 1, sx: 1, duration: dur * .3 }], onUpdate: ch.root.apply }, at + .14);
    CH.squash(ch, at + .12 + dur, .22, .3); CH.jiggle(ch, at + .12 + dur, 18, .9); };
  CH.celebrate = (ch, at, dur = 1.6) => { CH.expr(ch, at, 'happy'); CH.pose(ch, at, 'armsUp', .3); CH.jump(ch, at + .2, 150, .55); CH.jump(ch, at + .95, 110, .5);
    tl().to(ch.Larm, { r: '-=18', duration: .14, yoyo: true, repeat: Math.floor(dur / .14), onUpdate: ch.Larm.apply }, at + .3); };
  CH.cry = (ch, t0, t1) => { CH.expr(ch, t0, 'cry'); CH.pose(ch, t0, 'hideFace', .4);
    tl().fromTo(ch.torso, { r: -2 }, { r: 2, duration: .11, yoyo: true, repeat: Math.floor((t1 - t0) / .11), ease: 'sine.inOut', onUpdate: ch.torso.apply, immediateRender: false }, t0 + .3); };
  CH.dance = (ch, t0, t1, bpm = 120) => { const b = 60 / bpm, n = Math.floor((t1 - t0) / b);
    tl().fromTo(ch.root, { y: 0 }, { y: -18, duration: b / 2, yoyo: true, repeat: n * 2 - 1, ease: 'sine.inOut', onUpdate: ch.root.apply, immediateRender: false }, t0);
    tl().fromTo(ch.torso, { r: -8 }, { r: 8, duration: b, yoyo: true, repeat: n - 1, ease: 'sine.inOut', onUpdate: ch.torso.apply, immediateRender: false }, t0);
    tl().fromTo(ch.Larm, { r: -140 }, { r: -60, duration: b, yoyo: true, repeat: n - 1, ease: 'power1.inOut', onUpdate: ch.Larm.apply, immediateRender: false }, t0);
    tl().fromTo(ch.Rarm, { r: 60 }, { r: 140, duration: b, yoyo: true, repeat: n - 1, ease: 'power1.inOut', onUpdate: ch.Rarm.apply, immediateRender: false }, t0);
    if (ch.Lthigh) tl().fromTo(ch.Lthigh, { r: 0 }, { r: -24, duration: b, yoyo: true, repeat: n - 1, onUpdate: ch.Lthigh.apply, immediateRender: false }, t0); };
  CH.typing = (ch, t0, t1) => { CH.pose(ch, t0, 'typing', .3); const n = Math.floor((t1 - t0) / .09);
    tl().fromTo(ch.Lfore, { r: 60 }, { r: 52, duration: .09, yoyo: true, repeat: n, onUpdate: ch.Lfore.apply, immediateRender: false }, t0 + .3);
    tl().fromTo(ch.Rfore, { r: -52 }, { r: -60, duration: .11, yoyo: true, repeat: Math.floor((t1 - t0) / .11), onUpdate: ch.Rfore.apply, immediateRender: false }, t0 + .34); };
  CH.nod = (ch, at, n = 2) => tl().to(ch.head, { keyframes: Array.from({ length: n * 2 }, (_, i) => ({ r: 0, y: i % 2 ? 0 : 8, duration: .12 })), onUpdate: ch.head.apply }, at);
  CH.shakeHead = (ch, at, n = 3) => tl().to(ch.head, { keyframes: Array.from({ length: n * 2 }, (_, i) => ({ r: i % 2 ? 7 : -7, duration: .1 })).concat([{ r: 0, duration: .1 }]), onUpdate: ch.head.apply }, at);
  CH.startle = (ch, at) => { CH.expr(ch, at, 'shock', .06); CH.jump(ch, at, 90, .4); CH.pose(ch, at, 'armsUp', .18, { antic: 0, over: .2 }); };
  CH.fall = (ch, at) => { tl().to(ch.root, { r: -88, y: 40, duration: .45, ease: 'power3.in', onUpdate: ch.root.apply }, at); CH.squash(ch, at + .45, .15, .3); };
  /* talking: audio-driven visemes (frames from tools/lipsync.py) or procedural flaps; head bobs on stressed frames */
  CH.lipsync = (ch, t0, frames, fps = 30) => { BM.everyFrame(t => { const i = Math.floor((t - t0) * fps); if (i < 0 || i >= frames.length) return;
    const v = CH.VISEMES[frames[i]] || 'v_closed'; for (const k in ch.mouths) ch.mouths[k].style.opacity = k === v ? 1 : 0; });
    tl().call(() => {}, null, t0 + frames.length / fps); CH.setMouth(ch, t0 + frames.length / fps + .01, 'smile'); };
  CH.talk = (ch, t0, t1, { rate = 11 } = {}) => { const n = Math.ceil((t1 - t0) * 30), fr = [];
    for (let i = 0; i < n; i++) { const syl = Math.floor(i * rate / 30); fr.push(BM.hash(syl * 7.3 + ch.x) < .18 ? 0 : 1 + Math.floor(BM.hash(syl * 3.1 + ch.gy) * 4)); }
    fr[n - 1] = 0; CH.lipsync(ch, t0, fr); for (let t = t0 + .4; t < t1 - .3; t += .9 + BM.hash(t) * .5) CH.nod(ch, t, 1); };
})();
