/* grotesque.js — "Sarcastic Grotesque" expressive-comedy character system (needs bm-core.js; camera.js for subtitles).
   Separate from characters.js (the simple puppets stay untouched). Faces are NOT swapped drawings: every frame the head,
   eyes, lids, brows, mouth, teeth, wrinkles and FX are rebuilt from ~80 numeric shape parameters, so expressions morph
   with real anatomy distortion (jaw drop stretches the skull, eyes bulge asymmetrically, mouth goes from slit to
   rectangular grimace, crooked teeth, nasolabial folds follow the mouth corners, forehead wrinkles follow the brows).
   Anchor of a character = head centre. Bust body hangs below (to y = +1000 local units). Head is ~420 units tall. */
(function () {
  const { G, R, CI, EL, PA, LN, TX, J, hash } = BM, tl = () => BM.tl;
  const GR = (BM.GR = {}); const INK = '#16110E';
  const f = v => Math.round(v * 10) / 10;
  const shade = (hex, k) => BM.shade(hex, k);
  /* Catmull-Rom spline through points -> cubic Bezier path */
  const cr = (p, closed = true, k = 1) => { const n = p.length, g = i => closed ? p[(i + n) % n] : p[Math.max(0, Math.min(n - 1, i))]; let d = `M${f(p[0][0])} ${f(p[0][1])}`;
    for (let i = 0; i < (closed ? n : n - 1); i++) { const a = g(i - 1), b = g(i), c = g(i + 1), e = g(i + 2);
      d += `C${f(b[0] + (c[0] - a[0]) / 6 * k)} ${f(b[1] + (c[1] - a[1]) / 6 * k)} ${f(c[0] - (e[0] - b[0]) / 6 * k)} ${f(c[1] - (e[1] - b[1]) / 6 * k)} ${f(c[0])} ${f(c[1])}`; }
    return d + (closed ? 'Z' : ''); };
  const ell = (cx, cy, rx, ry) => `M${f(cx - rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)}A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}Z`;
  const bz = (p0, c1, c2, p1, t) => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p1[1]]; };
  const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const A = (el, o) => { for (const k in o) el.setAttribute(k, o[k]); return el; };
  let UID = 0;

  /* =========================== THE CAST (original characters) =========================== */
  const T8 = (o) => ({ n: 7, h: 26, crook: .5, color: '#F2E8BE', gap: -1, gold: -1, buck: false, ...o });
  GR.CAST = {
    gary:  { base: 'deadInside', name: 'Gary', role: 'exhausted office employee', noseS: 1.2, skin: '#E8C7A6', head: { T: 232, crW: 128, chk: 136, chkY: 40, jawW: 112, jawY: 172, chinW: 52, chinY: 252 }, eye: { R: 44, gap: 60, y: -42, iris: '#6F8A5B' },
             brow: { col: '#6B5A48', th: 13, len: 62 }, nose: 'droop', mouth: { y: 150, w: 112 }, teeth: T8({ color: '#E9DCA6', crook: .7 }), hair: 'combover', hairCol: '#7B6A57',
             outfit: 'shirtTie', top: '#C9D7C4', acc: '#8B2F2F', quirk: { bags: .9, lLid: .14, rLid: .2, dull: .15 }, extras: ['stubble'] },
    brock: { base: 'smug', name: 'Brock', role: 'smug boss', noseS: 1.05, skin: '#E6A585', head: { T: 168, crW: 112, chk: 172, chkY: 56, jawW: 186, jawY: 150, chinW: 132, chinY: 222, boxy: 1 }, eye: { R: 36, gap: 66, y: -22, iris: '#4F6E9C' },
             brow: { col: '#3A2A20', th: 17, len: 66 }, nose: 'wide', mouth: { y: 128, w: 124 }, teeth: T8({ n: 9, color: '#F4EFD8', crook: .25 }), hair: 'helmet', hairCol: '#2E2119',
             outfit: 'suit', top: '#27324F', acc: '#C8202F', quirk: { lLid: .08, rLid: .08, sm: .12, mR: .1 }, extras: ['mustache', 'doubleChin'] },
    kyle:  { base: 'fakeSmile', name: 'Kyle', role: 'fake motivational manager', noseS: .9, skin: '#E39A62', head: { T: 212, crW: 134, chk: 146, chkY: 46, jawW: 132, jawY: 160, chinW: 72, chinY: 228 }, eye: { R: 44, gap: 62, y: -30, iris: '#3C9BD6' },
             brow: { col: '#C79A4A', th: 11, len: 60 }, nose: 'pointy', mouth: { y: 138, w: 132 }, teeth: T8({ n: 8, h: 34, crook: 0, color: '#FFFFFF' }), hair: 'quiff', hairCol: '#F1CF6A',
             outfit: 'polo', top: '#7A4FD6', acc: '#F2F2F2', quirk: { sm: .32, tU: .5, lS: .06, rS: .06 }, extras: ['headset'] },
    vlad:  { base: 'panic', name: 'Vlad', role: 'dramatic crypto trader', noseS: 1.4, skin: '#D9A27C', head: { T: 178, crW: 172, chk: 182, chkY: 46, jawW: 166, jawY: 140, chinW: 108, chinY: 198 }, eye: { R: 52, gap: 66, y: -26, iris: '#8A5A2B' },
             brow: { col: '#2A1E18', th: 15, len: 64 }, nose: 'bulb', mouth: { y: 132, w: 118 }, teeth: T8({ color: '#EFE3B4', crook: .6 }), hair: 'mop', hairCol: '#2A1E18',
             outfit: 'hoodie', top: '#1F1F27', acc: '#E8B93A', quirk: { blood: .35, bags: .5 }, extras: ['beardPatchy'] },
    tiff:  { base: 'sideEye', name: 'Tiff', role: 'gossip girl', noseS: .75, skin: '#F0C1A4', head: { T: 206, crW: 156, chk: 146, chkY: 34, jawW: 98, jawY: 150, chinW: 22, chinY: 230, pointy: 2.2 }, eye: { R: 48, gap: 62, y: -30, iris: '#3E8E6E' },
             brow: { col: '#4A2B1E', th: 10, len: 60 }, nose: 'button', mouth: { y: 132, w: 108 }, teeth: T8({ n: 8, color: '#FBF7EA', crook: .15 }), hair: 'ponytail', hairCol: '#5A3322',
             outfit: 'crop', top: '#FF7EB6', acc: '#F5C542', lips: '#E2336B', lashes: true, quirk: {}, extras: ['hoops'] },
    bev:   { base: 'judgmental', name: 'Auntie Bev', role: 'judgmental auntie', noseS: 1.3, skin: '#C4875F', head: { T: 168, crW: 128, chk: 172, chkY: 64, jawW: 186, jawY: 176, chinW: 118, chinY: 230, boxy: 1 }, eye: { R: 38, gap: 62, y: -24, iris: '#4A2F20' },
             brow: { col: '#2B1B14', th: 9, len: 60 }, nose: 'hook', mouth: { y: 140, w: 104 }, teeth: T8({ n: 8, color: '#EDE2B8', crook: .45, gold: 2 }), hair: 'curlers', hairCol: '#3B2A24',
             outfit: 'blouse', top: '#2E8C7A', acc: '#F6F0E2', lips: '#B3263A', quirk: { pucker: .22, naso: .4, lLid: .1, rLid: .1 }, extras: ['catEye', 'mole', 'doubleChin'] },
    zeke:  { base: 'psychoSmile', name: 'Zeke', role: 'weird influencer', noseS: 1.15, skin: '#F0CFB3', head: { T: 218, crW: 150, chk: 126, chkY: 40, jawW: 108, jawY: 160, chinW: 44, chinY: 232 }, eye: { R: 46, gap: 58, y: -36, iris: '#9B59D0' },
             brow: { col: '#1D8F8C', th: 9, len: 58 }, nose: 'crooked', mouth: { y: 142, w: 112 }, teeth: T8({ n: 8, color: '#F8F4E6', crook: .35 }), hair: 'splitMullet', hairCol: '#21B8B4',
             outfit: 'tank', top: '#C8F03C', acc: '#FF5FA2', ringlight: true, quirk: { tilt: 6, sm: .1, pS: -.1 }, extras: ['tinyStache', 'earring'] },
    marco: { base: 'overconfident', name: 'Marco', role: 'broke guy acting rich', noseS: 1.25, skin: '#C8936F', head: { T: 238, crW: 120, chk: 118, chkY: 40, jawW: 104, jawY: 182, chinW: 48, chinY: 266 }, eye: { R: 40, gap: 54, y: -38, iris: '#3B2A1E' },
             brow: { col: '#140E0B', th: 11, len: 56 }, nose: 'pointy', mouth: { y: 160, w: 104 }, teeth: T8({ n: 8, color: '#EFE6C2', crook: .4, gold: 5 }), hair: 'slick', hairCol: '#141014',
             outfit: 'openShirt', top: '#F3F0E8', acc: '#D9B13B', quirk: { sm: .15, mL: .15 }, extras: ['pencilStache', 'shadesOnHead'] },
    dale:  { base: 'overconfident', name: 'Dale', role: 'overconfident salesman', noseS: 1.3, skin: '#EFB796', head: { T: 280, crW: 176, chk: 150, chkY: 50, jawW: 152, jawY: 180, chinW: 104, chinY: 246, boxy: 1 }, eye: { R: 40, gap: 62, y: -6, iris: '#5D7F3E' },
             brow: { col: '#8A5A33', th: 14, len: 64 }, nose: 'wide', mouth: { y: 140, w: 138 }, teeth: T8({ n: 7, h: 36, crook: .55, color: '#F6EBC4' }), hair: 'baldTufts', hairCol: '#8A5A33',
             outfit: 'plaid', top: '#C9962B', acc: '#3B2A1E', quirk: { sm: .25, tU: .3, lB: .15, rB: .15 }, extras: ['cleft', 'shine'] },
    pip:   { base: 'manicLaugh', name: 'Pip', role: 'chaotic best friend', noseS: 1.05, skin: '#F5CDAA', head: { T: 176, crW: 146, chk: 140, chkY: 34, jawW: 114, jawY: 136, chinW: 56, chinY: 192 }, eye: { R: 46, gap: 60, y: -26, iris: '#4D7EC9' },
             brow: { col: '#C4561E', th: 12, len: 56 }, nose: 'pig', mouth: { y: 116, w: 108 }, teeth: T8({ n: 6, h: 30, crook: .6, buck: true, gap: 4 }), hair: 'frizz', hairCol: '#E2712A',
             outfit: 'stripes', top: '#E84B4B', acc: '#FFFFFF', quirk: { lS: .1, rS: -.08 }, extras: ['freckles', 'bandaid'] },
  };

  /* =========================== PARAMETERS + EXPRESSIONS =========================== */
  const DEF = { sq: 0, tilt: 0, hx: 0, hy: 0, jaw: 0, jawSide: 0, cheek: 0,
    lS: 1, rS: 1, lW: 1, rW: 1, pS: 1, px: 0, py: 0, lLid: .1, rLid: .1, lAng: 0, rAng: 0, lLow: .06, rLow: .06, blood: 0, bags: 0, dull: 0, shine: 0, dollar: 0, glow: 0,
    lB: 0, rB: 0, lBA: 0, rBA: 0, knit: 0, bCurve: 0,
    mW: 1, mO: 0, sm: 0, mL: 0, mR: 0, mU: 0, mSn: 0, box: 0, tU: 0, tL: 0, tongue: 0, pucker: 0, wob: 0, mX: 0, drool: 0,
    scr: 0, fore: 0, crow: 0, naso: .15, chinW: 0, strain: 0,
    tears: 0, fount: 0, tear1: 0, sweat: 0, snot: 0, vein: 0, steam: 0, blush: 0, pale: 0, red: 0, sick: 0, gloom: 0, shock: 0, sparkle: 0, cringe: 0, qmark: 0, heart: 0, zz: 0,
    trem: 0, twitch: 0, still: 0, pA: 0 };
  const X = (o) => o;   // expression = partial parameter set (+ optional hands preset)
  GR.EXPR = {
    neutral: X({}),
    smug: X({ lLid: .4, rLid: .48, lLow: .26, rLow: .08, px: .45, py: -.1, lB: -.3, rB: 1, lBA: .4, rBA: -.3, sm: .35, mL: -.15, mR: 1.05, mX: 22, mW: .95, crow: .5, naso: .7, cheek: .15, tilt: -9, hy: -14 }),
    disgust: X({ lLid: .4, rLid: .66, lLow: .45, rLow: .62, lBA: .65, rBA: .5, knit: .9, lB: -.45, rB: -.25, scr: 1, mU: .8, mSn: 1.2, mO: .34, box: .5, tU: .95, tongue: .8, sm: -.55, mW: 1.1, chinW: .8, tilt: 11, hx: 22, sick: .5, px: -.5, jawSide: -.2 }),
    shockScream: X({ lS: 1.75, rS: 1.4, pS: .3, pA: .35, lLid: 0, rLid: 0, lLow: 0, rLow: 0, lB: 1.25, rB: 1.05, lBA: -.45, rBA: -.35, jaw: 1.15, mO: 1.2, mW: 1.15, box: .2, tU: .9, tL: .7, tongue: .5, fore: 1, strain: 1, shock: 1, sq: -.24, hy: -12, jawSide: .15 }),
    uglyCry: X({ lLid: .66, rLid: .72, lLow: .5, rLow: .45, lB: .55, rB: .6, lBA: -.85, rBA: -.85, knit: .6, mO: .62, jaw: .35, box: .85, sm: -.85, mW: 1.25, tU: .5, tL: .75, wob: 1, chinW: 1, tears: 1, snot: 1, fore: .8, red: .3, blush: .4, sq: .1, trem: .35 }),
    panic: X({ lS: 1.5, rS: 1.22, pS: .28, pA: .3, px: -.35, lLid: 0, rLid: 0, lLow: 0, rLow: 0, lB: 1, rB: .7, lBA: -.6, rBA: -.35, mO: .55, box: 1, sm: -.3, mW: 1.5, tU: 1, tL: 1, sweat: 1, pale: .6, trem: .75, strain: .7, fore: .8, cheek: .2, hands: 'cheeks' }),
    sideEye: X({ lS: .78, rS: 1.42, pA: -.2, lLid: .55, rLid: 0, lLow: .38, lB: -.45, rB: 1.15, lBA: .45, rBA: -.3, px: .85, py: -.05, mO: .1, mL: -.55, mR: .35, mX: 26, pucker: .35, tilt: 13, qmark: 1, fore: .5, wob: .3, jawSide: .35 }),
    evilGrin: X({ lLid: .45, rLid: .45, lAng: .8, rAng: .8, lLow: .35, rLow: .35, lBA: 1.1, rBA: 1.1, lB: .25, rB: .25, knit: .55, sm: 1.3, mW: 1.75, mO: .24, box: .25, tU: 1, tL: 1, cheek: .45, crow: .7, naso: 1, gloom: .75, glow: 1, py: -.3, hy: 16, sq: .07 }),
    fakeSmile: X({ lS: 1.12, rS: 1.08, lLid: 0, rLid: 0, lLow: .1, rLow: .1, pS: .42, lB: .55, rB: .45, lBA: -.25, rBA: -.15, sm: 1.15, mW: 1.75, mO: .36, box: 1, tU: 1, tL: 1, mU: .55, cheek: .3, sweat: .7, trem: .14, naso: .9, twitch: 1 }),
    deadInside: X({ lLid: .6, rLid: .6, lLow: .1, rLow: .1, pS: .62, dull: 1, bags: 1, lB: -.15, rB: -.15, lBA: -.08, rBA: -.08, mO: 0, sm: -.2, mW: .62, mL: -.1, gloom: 1, pale: .45, still: 1, sq: .05, hy: 12 }),
    cringe: X({ lLid: .78, rLid: .86, lLow: .66, rLow: .66, lBA: -.35, rBA: -.25, lB: .35, rB: .3, knit: .9, scr: .8, mO: .42, box: 1, sm: -.35, mW: 1.65, tU: 1, tL: 1, mSn: .35, cheek: .4, sq: .2, tilt: -13, hx: -26, cringe: 1, fore: .6, chinW: .6, strain: .85 }),
    manicLaugh: X({ lLid: .78, rLid: .86, lLow: .7, rLow: .72, lB: .7, rB: .75, lBA: -.2, rBA: -.2, mO: 1, jaw: .7, sm: 1, mW: 1.42, box: .1, tU: 1, tL: .5, tongue: .6, cheek: .45, crow: 1, naso: 1, fount: .6, tilt: -15, hy: -18, red: .3, trem: .55 }),
    angryMeltdown: X({ lLid: .3, rLid: .36, lAng: 1, rAng: 1, lBA: 1, rBA: 1, lB: -.45, rB: -.4, knit: 1, pS: .4, blood: .9, mO: .72, jaw: .5, box: 1, sm: -.6, mW: 1.3, tU: 1, tL: 1, mU: .6, scr: .8, red: .8, vein: 1, steam: 1, strain: 1, trem: .8, hands: 'fists' }),
    terrified: X({ lS: 1.52, rS: 1.5, pS: .2, py: .2, lLid: 0, rLid: 0, lLow: 0, rLow: 0, lB: 1, rB: .9, lBA: -1, rBA: -1, mO: .55, jaw: .3, box: .6, sm: -.8, mW: 1.1, wob: 1, tU: .3, tL: .8, pale: 1, sweat: 1, trem: 1, sq: -.08, shock: .5, fore: 1, hands: 'cheeks' }),
    suspicious: X({ lLid: .62, rLid: .3, lLow: .46, rLow: .1, lB: -.5, rB: .4, lBA: .42, rBA: 0, px: .75, mO: 0, pucker: .5, mX: -16, sm: -.2, mL: .1, mR: -.3, tilt: -8, hx: 12, fore: .3 }),
    jealous: X({ lLid: .46, rLid: .46, lAng: .3, rAng: .3, px: .85, py: .1, lBA: .42, rBA: .42, knit: .6, mO: .05, mW: .72, sm: -.42, pucker: .42, chinW: .65, sick: .45, gloom: .3, mL: -.2, tilt: 6 }),
    plotting: X({ lLid: .52, rLid: .52, lAng: .85, rAng: .85, lBA: 1, rBA: 1, lB: .35, rB: .35, py: -.35, px: .35, sm: .75, mW: 1.25, mO: 0, mL: -.1, mR: .75, mX: 14, naso: .7, gloom: .6, glow: .6, hy: 14, cheek: .15, hands: 'steeple' }),
    overwhelmed: X({ lS: 1.28, rS: .9, pS: .5, lLid: 0, rLid: .3, lB: .85, rB: .2, lBA: -.6, rBA: -.2, mO: .32, box: .5, sm: -.5, wob: .8, mW: 1.1, sweat: 1, fore: 1, trem: .4, shock: .3, sq: .05, tilt: 5, hands: 'grabhead' }),
    sleepyBroken: X({ lLid: .86, rLid: .7, lLow: .1, py: .3, bags: 1, blood: .55, lB: -.2, rB: .1, lBA: -.3, mO: .26, mW: .72, sm: -.3, mL: -.4, jawSide: .3, dull: .7, tilt: 14, hy: 22, drool: 1, zz: 1, still: .6 }),
    embarrassed: X({ lLid: .25, rLid: .25, lLow: .36, rLow: .36, px: -.65, py: .45, lB: .42, rB: .42, lBA: -.5, rBA: -.5, mO: .1, box: .7, sm: .2, mW: 1.12, tU: .7, tL: .7, blush: 1, red: .3, sweat: .7, sq: .1, tilt: 8, hy: 10, cringe: .35, hands: 'scratch' }),
    done: X({ lLid: .68, rLid: .64, lLow: .02, rLow: .02, pS: .85, px: 0, py: 0, lB: -.2, rB: .25, rBA: -.1, mO: 0, mW: .78, sm: -.18, mL: -.3, mR: .12, mX: -8, dull: .55, fore: .25, gloom: .35, still: 1, jawSide: -.2 }),
    heartbreak: X({ lS: 1.22, rS: 1.22, lLid: .1, rLid: .1, lLow: .32, rLow: .32, shine: 1, lB: .9, rB: .9, lBA: -1, rBA: -1, mO: .25, wob: 1, sm: -.62, mW: .9, tear1: 1, tilt: -12, hy: -10, heart: 1, hands: 'chest' }),
    fakePro: X({ lLid: .18, rLid: .18, lS: 1.08, rS: 1.08, pS: .62, lB: .35, rB: .35, mO: 0, sm: .7, mW: 1.25, sweat: .5, twitch: 1, hy: -4, naso: .5, vein: .45, cheek: .12, hands: 'tie' }),
    passiveAggro: X({ lLid: .4, rLid: .4, lLow: .42, rLow: .42, lBA: .6, rBA: .6, knit: .4, sm: 1.15, mO: .06, mW: 1.55, tU: .3, cheek: .4, vein: .7, crow: .6, tilt: -6, twitch: .6 }),
    caughtLying: X({ lS: 1.42, rS: 1.18, pS: .3, pA: .25, px: -.85, py: .2, lLid: 0, rLid: 0, lLow: 0, rLow: 0, lB: .75, rB: 1, mO: .48, box: 1, sm: .3, mW: 1.65, tU: 1, tL: 1, sweat: 1, pale: .35, blush: .35, trem: .35, sq: .1, cringe: .35, cheek: .2, hands: 'shrug' }),
    greedy: X({ lS: 1.38, rS: 1.38, pS: 1.4, dollar: 1, shine: .5, lLid: 0, rLid: 0, lLow: .1, rLow: .1, lB: 1, rB: 1, mO: .7, sm: 1.2, mW: 1.5, tU: .9, tongue: .9, drool: 1, cheek: .4, sparkle: 1, red: .2, hy: -8, trem: .3, hands: 'rub' }),
    whatDidISee: X({ lS: 1.6, rS: .62, pS: .3, pA: .3, lLid: 0, rLid: .6, lLow: 0, rLow: .38, lB: 1.25, rB: -.6, rBA: .65, mO: .4, box: .35, mL: -.65, mR: .3, mW: .9, jawSide: -.7, tilt: -20, hx: 30, fore: .8, qmark: .9, sq: -.07 }),
    psychoSmile: X({ lS: 1.25, rS: 1.18, pS: .2, lLid: 0, rLid: 0, lLow: 0, rLow: 0, dull: .5, lB: .2, rB: .1, mO: .14, sm: 1.35, mW: 1.95, box: .55, tU: 1, tL: 1, cheek: .35, gloom: .75, tilt: 18, still: 1, twitch: .35, naso: .8 }),
    sarcasticClap: X({ lLid: .6, rLid: .6, lLow: .12, rLow: .12, lB: .4, rB: -.15, mO: 0, sm: .3, mL: -.1, mR: .8, mW: 1, mX: 14, px: 0, tilt: 6, dull: .35, hands: 'clap' }),
    hystericalCry: X({ lLid: .92, rLid: .92, lLow: .62, rLow: .62, lBA: -1, rBA: -1, lB: .8, rB: .85, mO: 1.1, jaw: .8, box: .5, sm: -1, mW: 1.4, tU: .6, tL: .8, tongue: .4, wob: 1, fount: 1, tears: 1, snot: 1, red: .5, trem: .8, sq: -.1, hy: -10, tilt: -6, strain: .5 }),
    unhingedRage: X({ lS: 1.32, rS: 1.12, pS: .24, blood: 1, lLid: .1, rLid: .1, lAng: .85, rAng: .85, lBA: 1, rBA: 1, knit: 1, mO: 1.2, jaw: 1, box: .92, mW: 1.45, tU: 1, tL: 1, mU: 1, tongue: .3, scr: 1, red: 1, vein: 1, steam: 1, strain: 1, trem: 1.3, shock: .8, sq: -.15, fore: .5, hands: 'fists' }),
    overconfident: X({ lLid: .32, rLid: .32, lB: .65, rB: .65, lBA: .25, rBA: .25, sm: 1.1, mW: 1.65, mO: .3, tU: 1, tL: .4, box: .25, sparkle: 1, hy: -20, tilt: -5, crow: .3, naso: .7, cheek: .35, hands: 'thumbs' }),
    judgmental: X({ lLid: .6, rLid: .5, lLow: .22, rLow: .1, py: .5, px: -.1, lB: .7, rB: -.3, lBA: .2, rBA: .45, pucker: 1, mO: 0, sm: -.55, mW: .6, mX: -10, chinW: .7, hy: -18, tilt: -8, fore: .35, naso: .6 }),
  };
  GR.EXPR_ALIASES = { 'smug sarcasm': 'smug', 'shocked screaming': 'shockScream', 'ugly crying': 'uglyCry', 'confused side-eye': 'sideEye', 'evil grin': 'evilGrin', 'fake smile': 'fakeSmile',
    'dead inside': 'deadInside', 'manic laughter': 'manicLaugh', 'angry meltdown': 'angryMeltdown', 'sleepy and broken': 'sleepyBroken', 'i am done': 'done', 'dramatic heartbreak': 'heartbreak',
    'fake professionalism': 'fakePro', 'passive aggressive smile': 'passiveAggro', 'caught lying': 'caughtLying', 'greedy excitement': 'greedy', 'what did i just see': 'whatDidISee',
    'blank psychotic smile': 'psychoSmile', 'sarcastic applause': 'sarcasticClap', 'hysterical crying': 'hystericalCry', 'full unhinged rage': 'unhingedRage' };

  /* =========================== HANDS =========================== */
  const HP = { open: 0, fist: 1, point: 2, thumb: 3, flat: 4, phone: 5 };
  // preset(C) -> { l: [x, y, rot, shape, scale, face], r: [...] } ; face=1 -> hand follows the head
  GR.HANDS = {
    rest: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [C.sw * .95, 980, 0, 'open'] }),
    cheeks: C => ({ l: [-C.head.chk - 8, C.head.chkY + 78, 28, 'open', 1, 1], r: [C.head.chk + 8, C.head.chkY + 78, -28, 'open', 1, 1] }),
    grabhead: C => ({ l: [-C.head.crW - 22, -C.head.T * .38, -24, 'open', 1, 1], r: [C.head.crW + 22, -C.head.T * .38, 24, 'open', 1, 1] }),
    facepalm: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [26, C.eye.y + 28, -12, 'open', 1.18, 1] }),
    clap: C => ({ l: [-40, C.sy + 70, 16, 'flat'], r: [40, C.sy + 70, -16, 'flat'] }),
    fists: C => ({ l: [-C.sw - 20, C.sy - 30, -12, 'fist', 1.1], r: [C.sw + 20, C.sy - 30, 12, 'fist', 1.1] }),
    steeple: C => ({ l: [-30, C.sy + 40, 22, 'flat'], r: [30, C.sy + 40, -22, 'flat'] }),
    shrug: C => ({ l: [-C.sw - 40, C.sy - 10, -64, 'open'], r: [C.sw + 40, C.sy - 10, 64, 'open'] }),
    chest: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [70, C.sy + 110, -8, 'open', 1.05] }),
    rub: C => ({ l: [-26, C.sy + 60, 72, 'flat'], r: [26, C.sy + 60, -72, 'flat'] }),
    thumbs: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [C.sw * .62 + 40, C.sy - 10, 0, 'thumb', 1.15] }),
    point: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [C.sw * .55, C.sy - 30, -75, 'point', 1.1] }),
    scratch: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [C.head.crW * .8, -C.head.T * .5, -32, 'open', 1, 1] }),
    tie: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [14, C.sy + 60, 0, 'fist'] }),
    phone: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [C.head.chk + 40, C.head.chkY + 30, -12, 'phone', 1, 1] }),
    selfie: C => ({ l: [-C.sw * .95, 980, 0, 'open'], r: [C.sw * .6, C.sy - 140, 14, 'phone', 1.2] }),
    temples: C => ({ l: [-C.head.crW + 4, C.eye.y - 16, 38, 'point', .9, 1], r: [C.head.crW - 4, C.eye.y - 16, -38, 'point', .9, 1] }),
  };
  const HAND_SEG = {   // [x1,y1,x2,y2,width] segments drawn as fat round lines (ink pass + skin pass) ; palm circle r
    open: { palm: 34, s: [[-24, -20, -36, -80, 17], [-8, -26, -12, -96, 17], [9, -26, 12, -94, 17], [24, -20, 34, -76, 16], [-30, 6, -64, -22, 18]] },
    fist: { palm: 42, s: [[-28, -4, 4, -18, 17]] },
    point: { palm: 40, s: [[-6, -30, -6, -104, 17], [-28, -4, 4, -18, 17]] },
    thumb: { palm: 40, s: [[-30, -12, -36, -82, 18]] },
    flat: { palm: 32, s: [[-18, -22, -16, -92, 16], [-6, -26, -4, -100, 16], [6, -26, 8, -98, 16], [18, -22, 20, -86, 15], [-28, 4, -50, -40, 17]] },
    phone: { palm: 38, s: [[-30, -4, -20, -50, 16]], phone: true },
  };

  /* =========================== BUILD A CHARACTER =========================== */
  GR.make = function (parent, id, x, y, s = 1, opt = {}) {
    const C = { ...GR.CAST[id] }; if (!C.name) throw new Error('unknown grotesque character ' + id);
    C.sw = C.sw || 250; C.sy = C.head.chinY + 92; const u = 'gr' + (UID++), hd = C.head, E = C.eye;
    const ch = { id, C, u, s, x, y, parent, P: { ...DEF, ...C.quirk }, D: { pulse: 0, jx: 0, jy: 0, pop: 0, smear: 0, smx: 0, smy: 0, clapA: 0, talk: 0, slideBob: 0 }, talks: [], holds: [] };
    for (const k in C.quirk) ch.P[k] = DEF[k] + C.quirk[k];
    ch.place = G({ transform: `translate(${x},${y}) scale(${s})` }, parent); ch.root = J(G({}, ch.place)); const RT = ch.root.el;
    if (opt.boil !== false) { const fl = BM.N('filter', { id: u + 'boil', x: '-10%', y: '-10%', width: '120%', height: '120%' }, BM.defs);
      ch.turb = BM.N('feTurbulence', { type: 'fractalNoise', baseFrequency: .022, numOctaves: 1, seed: 1 }, fl); BM.N('feDisplacementMap', { in: 'SourceGraphic', scale: opt.boil || 3.2 }, fl);
      RT.setAttribute('filter', `url(#${u}boil)`); }
    const skin = C.skin, skD = shade(skin, .8), skL = shade(skin, 1.06);
    /* --- body --- */
    const body = G({}, RT); ch.body = body;
    const nw = hd.jawW * .4, sy = C.sy, sw = C.sw;
    R(-nw, hd.jawY - 60, nw * 2, sy - hd.jawY + 120, skin, 0, body); R(-nw, hd.jawY - 60, nw * 2, sy - hd.jawY + 120, 'none', 0, body, { stroke: INK, 'stroke-width': 7 });
    R(-nw + 4, hd.chinY - 30, nw * 2 - 8, 60, skD, 0, body, { opacity: .6 });
    ch.cords = LN(`M ${-nw * .5} ${hd.chinY + 10} L ${-nw * .35} ${sy}M ${nw * .5} ${hd.chinY + 10} L ${nw * .35} ${sy}`, INK, 5, body, { opacity: 0 });
    const torso = `M ${-sw - 10} 1100 L ${-sw - 10} ${sy + 110} C ${-sw - 10} ${sy + 30} ${-sw + 60} ${sy} ${-nw - 34} ${sy - 6} L ${nw + 34} ${sy - 6} C ${sw - 60} ${sy} ${sw + 10} ${sy + 30} ${sw + 10} ${sy + 110} L ${sw + 10} 1100 Z`;
    PA(torso, C.top, body, { stroke: INK, 'stroke-width': 8, 'stroke-linejoin': 'round' });
    OUTFIT[C.outfit](body, C, nw, sy, sw);
    /* --- arms (dynamic) --- */
    const arms = G({}, RT); ch.armL = [LN('', INK, 66, arms), LN('', C.sleeve || C.top, 52, arms)]; ch.armR = [LN('', INK, 66, arms), LN('', C.sleeve || C.top, 52, arms)];
    /* --- smear ghosts (use) + head --- */
    const ghosts = G({}, RT); const headG = G({ id: u + 'head' }, RT); ch.headG = headG;
    ch.ghosts = [0, 1].map(() => BM.N('use', { href: '#' + u + 'head', opacity: 0 }, ghosts));
    const back = G({}, headG); HAIR[C.hair]?.(back, C, 'back');
    for (const sx of [-1, 1]) { EL(sx * (hd.chk + 6), E.y + 40, 30, 44, skin, back, { stroke: INK, 'stroke-width': 7 }); LN(`M ${sx * (hd.chk + 4)} ${E.y + 22} q ${sx * 14} 18 0 40`, INK, 4, back); }
    if (C.extras.includes('hoops') || C.extras.includes('earring')) for (const sx of C.extras.includes('earring') ? [1] : [-1, 1]) CI(sx * (hd.chk + 10), E.y + 104, C.extras.includes('earring') ? 14 : 30, 'none', back, { stroke: C.acc, 'stroke-width': 7 });
    ch.headPath = PA('', skin, headG);
    const cp = BM.N('clipPath', { id: u + 'hc' }, BM.defs); ch.headClipP = PA('', '#fff', cp);
    const inner = G({ 'clip-path': `url(#${u}hc)` }, headG);
    ch.shadeA = PA('', skD, inner); ch.hatch = PA('', `url(#${hatchId()})`, inner, { opacity: .5 }); ch.shadeB = PA('', skin, inner); ch.hl = EL(-hd.crW * .35, -hd.T * .55, hd.crW * .28, hd.T * .12, skL, inner, { opacity: .7 });
    if (C.extras.includes('shine')) EL(-hd.crW * .2, -hd.T * .7, hd.crW * .3, 26, '#FFFFFF', inner, { opacity: .55, transform: 'rotate(-14)' });
    if (C.extras.includes('stubble') || C.extras.includes('beardPatchy')) { const g = G({}, inner); for (let i = 0; i < 160; i++) { const a = hash(i + 3) * Math.PI, rr = .55 + hash(i * 7) * .5;
        const px = Math.cos(a) * hd.jawW * rr * 1.05, py = hd.jawY * .5 + Math.sin(a) * (hd.chinY - hd.jawY * .5) * rr * 1.15 + 20; if (C.extras.includes('beardPatchy') && hash(i * 13) < .45) continue; CI(px, py, 2.2, shade(C.hairCol, .9), g, { opacity: .55 }); } ch.stubble = g; }
    { const g = G({}, inner); for (let i = 0; i < 26; i++) { const sx = i % 2 ? 1 : -1; CI(sx * (E.gap * .4 + hash(i * 3.7) * hd.chk * .55), E.y + 66 + hash(i * 5.1) * 70, 1.6 + hash(i) * 2.4, shade(skin, .72), g, { opacity: .7 }); }
      for (let i = 0; i < 3; i++) EL(-hd.crW * .3 + hash(i * 11) * hd.crW * .9, -hd.T * .3 + hash(i * 17) * hd.T * .3, 5 + hash(i) * 5, 4 + hash(i + 1) * 3, shade(skin, .82), g, { opacity: .8 }); }
    if (C.extras.includes('freckles')) for (let i = 0; i < 18; i++) { const sx = i % 2 ? 1 : -1; CI(sx * (E.gap * .55 + hash(i) * 50), E.y + 70 + hash(i + 9) * 30, 3.2, '#C9733F', inner, { opacity: .8 }); }
    ch.ovRed = R(-400, -400, 800, 900, '#E0322B', 0, inner, { opacity: 0 }); ch.ovSick = R(-400, -400, 800, 900, '#7DBA3A', 0, inner, { opacity: 0 });
    ch.ovPale = R(-400, -hd.T - 20, 800, hd.T + 40, BM.lg(u + 'pl', [[0, '#6E8BE8', .85], [1, '#6E8BE8', 0]]), 0, inner, { opacity: 0 });
    ch.ovGloom = G({ opacity: 0 }, inner); R(-400, -hd.T - 20, 800, hd.T + E.y + 60, BM.lg(u + 'gl', [[0, '#2A1638', .9], [1, '#2A1638', 0]]), 0, ch.ovGloom);
    for (let i = -6; i <= 6; i++) LN(`M ${i * 22} ${-hd.T} L ${i * 22} ${-hd.T * .25 - (i % 2) * 20}`, '#2A1638', 4, ch.ovGloom, { opacity: .8 });
    ch.blushG = G({ opacity: 0 }, inner); for (const sx of [-1, 1]) { EL(sx * E.gap * 1.15, E.y + 74, 46, 26, '#F0506E', ch.blushG, { opacity: .55 }); for (let k = -1; k <= 1; k++) LN(`M ${sx * E.gap * 1.15 + k * 16 - 8} ${E.y + 86} l 14 -22`, '#C0284A', 4, ch.blushG); }
    /* wrinkles + folds (dynamic) */
    ch.fore = LN('', INK, 4.5, inner); ch.furrow = LN('', INK, 4.5, inner); ch.naso = LN('', INK, 5, inner); ch.crow = LN('', INK, 4, inner); ch.chinL = LN('', INK, 4, inner); ch.cheekL = LN('', INK, 4, inner); ch.bags = LN('', INK, 4, inner);
    ch.headOut = PA('', 'none', headG, { stroke: INK, 'stroke-width': 9, 'stroke-linejoin': 'round' });
    if (C.extras.includes('doubleChin')) ch.dchin = LN('', INK, 5, headG);
    if (C.extras.includes('cleft')) ch.cleft = LN('', INK, 5, headG);
    if (C.extras.includes('mole')) { CI(hd.jawW * .5, hd.jawY + 10, 7, '#3A2418', headG); LN(`M ${hd.jawW * .5} ${hd.jawY + 6} q 8 -14 18 -10`, INK, 2, headG); }
    /* eyes */
    ch.eyes = [-1, 1].map(sx => { const g = G({}, headG), cpe = BM.N('clipPath', { id: u + 'e' + sx }, BM.defs), clipP = PA('', '#fff', cpe);
      const scl = PA('', '#FBF6E6', g), inn = G({ 'clip-path': `url(#${u}e${sx})` }, g);
      const veins = G({}, inn); LN('M -50 -8 q 14 4 24 -2 M -48 14 q 16 -2 22 6 M 50 -6 q -14 6 -24 0 M 48 16 q -14 -4 -22 4 M -20 46 q 2 -10 10 -14 M 22 -46 q -4 10 -12 12', '#D3262E', 2.6, veins);
      const iris = G({}, inn), irisC = CI(0, 0, 22, E.iris, iris, { stroke: INK, 'stroke-width': 3 }); CI(0, 0, 12, INK, iris); const glow = CI(0, 0, 8, '#FF2A2A', iris, { opacity: 0 });
      const dull = CI(0, 0, 23, '#8B8B8E', iris, { opacity: 0 }); const hl = G({}, iris); CI(-8, -9, 6, '#FFF', hl); CI(7, 7, 2.6, '#FFF', hl);
      const shn = G({ opacity: 0 }, iris); CI(-6, -8, 10, '#FFF', shn); CI(9, 4, 5, '#FFF', shn); CI(-10, 10, 3, '#FFF', shn);
      const ring = C.ringlight ? CI(0, 0, 14, 'none', iris, { stroke: '#FFFFFF', 'stroke-width': 3.2, opacity: .9 }) : null;
      const dol = TX(0, 9, '$', 30, '#2FBF5B', iris, { 'font-weight': 900, opacity: 0, 'font-family': 'Anton, Inter, sans-serif' });
      const lid = PA('', skin, inn), lidLine = LN('', INK, 8, inn), low = PA('', skin, inn), lowLine = LN('', INK, 4.5, inn);
      const out = PA('', 'none', g, { stroke: INK, 'stroke-width': 6 }); const lash = C.lashes ? LN('', INK, 5, g) : null;
      return { sx, g, clipP, scl, veins, iris, glow, dull, hl, shn, dol, lid, lidLine, low, lowLine, out, lash, ring }; });
    ch.brows = [-1, 1].map(() => PA('', C.brow.col, headG, { stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }));
    /* nose */
    const ng = G({}, headG); ch.noseG = ng; PA(NOSE[C.nose], shade(skin, .9), ng, { stroke: INK, 'stroke-width': 6, 'stroke-linejoin': 'round' });
    for (let i = 0; i < 9; i++) CI(-18 + hash(i * 2.3) * 36, -10 + hash(i * 4.1) * 30, 1.6, shade(skin, .62), ng); ch.noseWr = LN('M -16 -56 q 16 -8 32 0 M -12 -44 q 12 -6 24 0', INK, 4, ng, { opacity: 0 });
    if (C.extras.includes('bandaid')) { R(-30, -40, 60, 22, '#F3C98B', 6, ng, { stroke: INK, 'stroke-width': 3, transform: 'rotate(-14)' }); for (let i = -1; i <= 1; i++) CI(i * 10, -29, 2, '#B88A4A', ng, { transform: 'rotate(-14)' }); }
    /* mouth */
    const mg = G({}, headG); ch.mouthG = mg;
    ch.lips = C.lips ? PA('', C.lips, mg, { stroke: INK, 'stroke-width': 5, 'stroke-linejoin': 'round' }) : null;
    ch.mIn = PA('', '#3B0E14', mg); const mcp = BM.N('clipPath', { id: u + 'mc' }, BM.defs); ch.mClip = PA('', '#fff', mcp);
    const mi = G({ 'clip-path': `url(#${u}mc)` }, mg);
    ch.gums = R(-300, -300, 600, 0, '#D9707E', 0, mi); ch.tongueIn = EL(0, 0, 10, 10, '#D9566A', mi, { stroke: INK, 'stroke-width': 3 });
    ch.teethL = PA('', C.teeth.color, mi, { stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' }); ch.teethU = PA('', C.teeth.color, mi, { stroke: INK, 'stroke-width': 3.5, 'stroke-linejoin': 'round' });
    ch.gold = PA('', '#E8B931', mi, { stroke: INK, 'stroke-width': 3.5 });
    ch.mOut = PA('', 'none', mg, { stroke: INK, 'stroke-width': 6.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' });
    ch.dimples = LN('', INK, 4.5, mg); ch.apples = LN('', INK, 5, mg); ch.underLip = LN('', INK, 4.5, mg, { opacity: .7 }); ch.gloss = C.lips ? EL(0, 0, 14, 5, '#FFFFFF', mg, { opacity: .6 }) : null;
    ch.tongueOut = PA('', '#E0607A', mg, { stroke: INK, 'stroke-width': 5, opacity: 0 }); ch.tongueMid = LN('', '#A63149', 4, mg, { opacity: 0 });
    ch.droolP = PA('', '#BFE6F5', mg, { stroke: INK, 'stroke-width': 3, opacity: 0 });
    ch.stache = G({}, mg); STACHE(ch.stache, C);
    /* front hair + accessories */
    const front = G({}, headG); HAIR[C.hair]?.(front, C, 'front'); ACC(front, C);
    /* FX */
    const fx = G({}, headG); ch.fx = fx;
    ch.tearS = [-1, 1].map(() => [LN('', INK, 30, fx, { opacity: 0 }), LN('', '#86D4F5', 20, fx, { opacity: 0 }), LN('', '#E4F7FF', 5, fx, { opacity: 0, 'stroke-dasharray': '18 40' })]);
    ch.fountG = G({ opacity: 0 }, fx); ch.drops = Array.from({ length: 16 }, () => PA('M 0 -16 C 10 -4 12 4 0 10 C -12 4 -10 -4 0 -16 Z', '#86D4F5', ch.fountG, { stroke: INK, 'stroke-width': 3 }));
    ch.bigTear = PA('M 0 -30 C 22 0 26 18 0 30 C -26 18 -22 0 0 -30 Z', '#86D4F5', fx, { stroke: INK, 'stroke-width': 4, opacity: 0 });
    ch.sweatG = G({ opacity: 0 }, fx); ch.sweats = [0, 1, 2].map(() => PA('M 0 -18 C 10 -4 12 6 0 12 C -12 6 -10 -4 0 -18 Z', '#9AD8F2', ch.sweatG, { stroke: INK, 'stroke-width': 3 }));
    ch.snot = CI(0, 0, 10, '#DDF2C4', fx, { stroke: INK, 'stroke-width': 3, opacity: 0 });
    ch.vein = PA('M -26 -6 Q -8 -4 -6 -26 M 6 -26 Q 8 -6 26 -6 M 26 6 Q 8 8 6 26 M -6 26 Q -8 8 -26 6', 'none', fx, { stroke: '#D4252B', 'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0 });
    ch.steamG = G({ opacity: 0 }, fx); ch.steams = Array.from({ length: 6 }, () => CI(0, 0, 20, '#F2F2F2', ch.steamG, { stroke: INK, 'stroke-width': 3.5 }));
    ch.shockG = G({ opacity: 0 }, fx); for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, r0 = 300, r1 = 370 + (i % 2) * 40; LN(`M ${Math.cos(a) * r0} ${Math.sin(a) * r0 * .95 - 20} L ${Math.cos(a) * r1} ${Math.sin(a) * r1 * .95 - 20}`, INK, 9, ch.shockG); }
    ch.sparkG = G({ opacity: 0 }, fx); [[-hd.crW - 60, -hd.T * .6, 1], [hd.crW + 70, -hd.T * .2, .8], [C.mouth.w * .6, C.mouth.y - 10, .6], [-hd.crW - 30, hd.chkY + 40, .5]].forEach(([sx2, sy2, k]) =>
      PA('M 0 -40 Q 6 -6 40 0 Q 6 6 0 40 Q -6 6 -40 0 Q -6 -6 0 -40 Z', '#FFE14D', ch.sparkG, { stroke: INK, 'stroke-width': 4, transform: `translate(${sx2},${sy2}) scale(${k})` }));
    ch.qm = TX(hd.crW + 70, -hd.T * .55, '?!', 150, '#FFFFFF', fx, { 'font-family': 'Anton, Bangers, sans-serif', stroke: INK, 'stroke-width': 10, 'paint-order': 'stroke', opacity: 0, transform: 'rotate(12)' });
    ch.zz = TX(hd.crW + 40, -hd.T * .6, 'Z z z', 80, '#FFFFFF', fx, { 'font-family': 'Anton, Bangers, sans-serif', stroke: INK, 'stroke-width': 8, 'paint-order': 'stroke', opacity: 0 });
    ch.cringeG = G({ opacity: 0 }, fx); ch.cringes = [-1, 1].flatMap(sx => [0, 1, 2].map(k => LN('', INK, 6, ch.cringeG, { 'data-sx': sx, 'data-k': k })));
    ch.heartG = G({ opacity: 0, transform: `translate(${hd.crW + 40},${-hd.T * .55})` }, fx); ch.heartA = PA('M 0 -20 C -10 -46 -60 -40 -50 -4 C -44 18 -20 34 0 52 L -12 16 L 6 -2 Z', '#E8344E', ch.heartG, { stroke: INK, 'stroke-width': 5 });
    ch.heartB = PA('M 0 -20 C 10 -46 60 -40 50 -4 C 44 18 20 34 0 52 L 14 14 L -2 -4 Z', '#E8344E', ch.heartG, { stroke: INK, 'stroke-width': 5 });
    /* hands (front) */
    ch.hands = [-1, 1].map(sx => { const g = G({}, RT), shapes = {};
      for (const k in HAND_SEG) { const sg = G({ opacity: 0 }, g), H = HAND_SEG[k];
        if (H.phone) { R(-40, -150, 80, 150, '#20222C', 12, sg, { stroke: INK, 'stroke-width': 6 }); R(-32, -140, 64, 128, '#3B6BD6', 6, sg); }
        for (const pass of [[INK, 9], [skin, 0]]) { CI(0, 0, H.palm + pass[1] / 2, pass[0], sg); H.s.forEach(([a, b, c, d, w]) => LN(`M ${a} ${b} L ${c} ${d}`, pass[0], w + pass[1], sg)); }
        if (k === 'fist' || k === 'point' || k === 'thumb' || k === 'phone') for (let i = -1; i <= 1; i++) LN(`M ${i * 16 - 6} -28 q 6 8 12 0`, INK, 3.5, sg);
        shapes[k] = sg; }
      return { sx, g, shapes, cur: null }; });
    Object.assign(ch.P, handParams(C, 'rest')); if (opt.base !== false && C.base) { const b = target(ch, C.base); for (const k in b) ch.P[k] = DEF[k] + (b[k] - DEF[k]) * .45; }
    BM.everyFrame(t => draw(ch, t));
    return ch;
  };
  let HATCH; const hatchId = () => { if (!HATCH) { HATCH = 'grHatch'; const p = BM.N('pattern', { id: HATCH, width: 14, height: 14, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(35)' }, BM.defs); BM.N('line', { x1: 0, y1: 0, x2: 0, y2: 14, stroke: INK, 'stroke-width': 3 }, p); } return HATCH; };
  const handParams = (C, name) => { const h = (GR.HANDS[name] || GR.HANDS.rest)(C), o = {};
    for (const [k, v] of [['l', h.l], ['r', h.r]]) { o[k + 'hx'] = v[0]; o[k + 'hy'] = v[1]; o[k + 'hr'] = v[2]; o[k + 'hp'] = HP[v[3]]; o[k + 'hs'] = v[4] || 1; o[k + 'hf'] = v[5] || 0; } return o; };

  /* =========================== NOSES, HAIR, OUTFITS, ACCESSORIES =========================== */
  const NOSE = {
    droop: cr([[-12, -78], [12, -78], [20, -24], [40, 12], [34, 40], [0, 50], [-34, 40], [-40, 12], [-20, -24]]),
    bulb: cr([[-14, -60], [14, -60], [34, -14], [52, 18], [36, 42], [0, 40], [-36, 42], [-52, 18], [-34, -14]]),
    hook: cr([[-10, -84], [8, -80], [30, -26], [44, 16], [24, 34], [4, 22], [-16, 32], [-30, 14], [-18, -34]]),
    pig: cr([[-14, -44], [14, -44], [30, -8], [34, 18], [0, 26], [-34, 18], [-30, -8]]) + 'M -12 8 a 6 9 0 1 0 0.1 0 M 12 8 a 6 9 0 1 0 0.1 0',
    wide: cr([[-12, -62], [12, -62], [26, -14], [50, 16], [40, 36], [0, 34], [-40, 36], [-50, 16], [-26, -14]]),
    pointy: cr([[-8, -80], [8, -80], [20, -20], [52, 22], [22, 32], [0, 28], [-24, 30], [-26, 10], [-16, -22]]),
    button: cr([[-10, -40], [10, -40], [22, 0], [26, 20], [0, 26], [-26, 20], [-22, 0]]),
    crooked: cr([[-4, -84], [14, -78], [30, -26], [26, 18], [6, 34], [-20, 30], [-34, 14], [-14, -28]]),
  };
  const HAIR = {
    combover: (g, C, L) => { const T = C.head.T, w = C.head.crW; if (L === 'back') { for (const sx of [-1, 1]) PA(cr([[sx * (w - 30), -T * .55], [sx * (w + 14), -T * .4], [sx * (w + 20), -T * .05], [sx * (w - 6), 0], [sx * (w - 26), -T * .3]]), C.hairCol, g, { stroke: INK, 'stroke-width': 6 }); return; }
      for (let i = 0; i < 4; i++) LN(`M ${-w * .8} ${-T * (.5 + i * .07)} C ${-w * .3} ${-T * (.96 - i * .04)} ${w * .4} ${-T * (.94 - i * .05)} ${w * .82} ${-T * (.55 + i * .05)}`, C.hairCol, 6, g); },
    helmet: (g, C, L) => { if (L !== 'front') return; const T = C.head.T, w = C.head.crW; PA(cr([[-w - 14, -T * .25], [-w - 10, -T * .8], [-w * .3, -T * 1.18], [w * .6, -T * 1.12], [w + 16, -T * .7], [w + 14, -T * .25], [w * .7, -T * .62], [0, -T * .7], [-w * .7, -T * .6]]), C.hairCol, g, { stroke: INK, 'stroke-width': 8 });
      LN(`M ${-w * .5} ${-T * .98} Q 0 ${-T * 1.1} ${w * .5} ${-T * .95}`, '#7C6A5E', 7, g, { opacity: .8 }); },
    quiff: (g, C, L) => { if (L !== 'front') return; const T = C.head.T, w = C.head.crW; PA(`M ${-w - 8} ${-T * .3} L ${-w + 4} ${-T * .9} L ${-w * .5} ${-T * 1.05} L ${-w * .4} ${-T * 1.4} L ${-w * .05} ${-T * 1.12} L ${w * .2} ${-T * 1.5} L ${w * .4} ${-T * 1.12} L ${w * .85} ${-T * 1.3} L ${w * .8} ${-T * .95} L ${w + 10} ${-T * .62} L ${w + 6} ${-T * .3} L ${w * .7} ${-T * .7} L 0 ${-T * .78} L ${-w * .7} ${-T * .68} Z`, C.hairCol, g, { stroke: INK, 'stroke-width': 7, 'stroke-linejoin': 'round' }); },
    mop: (g, C, L) => { const T = C.head.T, w = C.head.crW; if (L === 'back') { PA(cr(Array.from({ length: 14 }, (_, i) => { const a = Math.PI + i / 13 * Math.PI, r = 1.12 + (i % 2) * .12; return [Math.cos(a) * w * r, -T * .35 + Math.sin(a) * T * .75 * r]; }), false), C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); return; }
      PA(`M ${-w} ${-T * .45} Q ${-w * .6} ${-T * .2} ${-w * .3} ${-T * .55} Q ${-w * .1} ${-T * .25} ${w * .2} ${-T * .56} Q ${w * .5} ${-T * .22} ${w} ${-T * .45} Q ${w * .8} ${-T * 1.1} 0 ${-T * 1.05} Q ${-w * .9} ${-T * 1.1} ${-w} ${-T * .45} Z`, C.hairCol, g, { stroke: INK, 'stroke-width': 7 });
      LN(`M ${w * .1} ${-T * 1.02} q 30 -70 80 -60 q -40 10 -50 60`, INK, 8, g); },
    ponytail: (g, C, L) => { const T = C.head.T, w = C.head.crW; if (L === 'back') { PA(cr([[-30, -T * 1.0], [40, -T * 1.35], [130, -T * 1.55], [150, -T * 1.1], [90, -T * .95]]), C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); PA(cr([[-w - 18, -T * .2], [-w - 10, -T * .85], [0, -T * 1.06], [w + 10, -T * .85], [w + 18, -T * .2], [w + 30, T * .2], [-w - 30, T * .2]]), C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); return; }
      PA(`M ${-w - 6} ${-T * .2} Q ${-w} ${-T * .95} 0 ${-T * 1.02} Q ${w} ${-T * .95} ${w + 6} ${-T * .2} Q ${w * .7} ${-T * .7} ${w * .1} ${-T * .62} Q ${-w * .4} ${-T * .52} ${-w * .7} ${-T * .2} Z`, C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); R(-24, -T * 1.08, 48, 30, '#FF7EB6', 10, g, { stroke: INK, 'stroke-width': 4 }); },
    curlers: (g, C, L) => { const T = C.head.T, w = C.head.crW; if (L === 'back') { PA(cr([[-w - 34, -T * .1], [-w - 30, -T * .8], [0, -T * 1.12], [w + 30, -T * .8], [w + 34, -T * .1], [w + 10, T * .1], [-w - 10, T * .1]]), C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); return; }
      PA(`M ${-w - 20} ${-T * .1} Q ${-w - 10} ${-T * .95} 0 ${-T * 1.04} Q ${w + 10} ${-T * .95} ${w + 20} ${-T * .1} Q ${w * .5} ${-T * .62} 0 ${-T * .6} Q ${-w * .5} ${-T * .62} ${-w - 20} ${-T * .1} Z`, C.hairCol, g, { stroke: INK, 'stroke-width': 7 });
      [[-w * .7, -T * .85], [-w * .2, -T * 1.0], [w * .3, -T * 1.0], [w * .78, -T * .82], [-w * .95, -T * .45], [w * .95, -T * .45]].forEach(([x, y], i) => R(x - 30, y - 18, 60, 36, ['#F48FB1', '#81D4FA', '#FFE082'][i % 3], 16, g, { stroke: INK, 'stroke-width': 4 })); },
    splitMullet: (g, C, L) => { const T = C.head.T, w = C.head.crW; if (L === 'back') { PA(cr([[-w, -T * .3], [-w - 40, T * .2], [-w - 10, T * .55], [-w * .3, T * .2]]), '#21B8B4', g, { stroke: INK, 'stroke-width': 6 }); PA(cr([[w, -T * .3], [w + 40, T * .2], [w + 10, T * .55], [w * .3, T * .2]]), '#FF5FA2', g, { stroke: INK, 'stroke-width': 6 }); return; }
      PA(`M 0 ${-T * 1.08} Q ${-w * 1.05} ${-T * 1.02} ${-w - 8} ${-T * .25} L ${-w * .6} ${-T * .62} L ${-w * .3} ${-T * .5} L 0 ${-T * .66} Z`, '#21B8B4', g, { stroke: INK, 'stroke-width': 7 });
      PA(`M 0 ${-T * 1.08} Q ${w * 1.05} ${-T * 1.02} ${w + 8} ${-T * .25} L ${w * .6} ${-T * .62} L ${w * .3} ${-T * .5} L 0 ${-T * .66} Z`, '#FF5FA2', g, { stroke: INK, 'stroke-width': 7 }); },
    slick: (g, C, L) => { if (L !== 'front') return; const T = C.head.T, w = C.head.crW; PA(`M ${-w - 6} ${-T * .35} Q ${-w - 4} ${-T * 1.05} ${w * .2} ${-T * 1.06} Q ${w + 14} ${-T * .95} ${w + 6} ${-T * .35} Q ${w * .8} ${-T * .78} ${w * .2} ${-T * .8} Q ${-w * .6} ${-T * .72} ${-w - 6} ${-T * .35} Z`, C.hairCol, g, { stroke: INK, 'stroke-width': 7 });
      for (let i = 0; i < 3; i++) LN(`M ${-w * .6 + i * 30} ${-T * .9} Q ${w * .1} ${-T * (1.02 - i * .02)} ${w * .7} ${-T * .82}`, '#5C5866', 4, g, { opacity: .9 }); },
    baldTufts: (g, C, L) => { if (L !== 'front') return; const T = C.head.T, w = C.head.crW; for (const sx of [-1, 1]) PA(`M ${sx * (w - 2)} ${-T * .45} q ${sx * 40} 10 ${sx * 34} 50 q ${sx * 30} 10 ${sx * 10} 60 q ${sx * -20} -40 ${sx * -36} -20 Z`, C.hairCol, g, { stroke: INK, 'stroke-width': 6 }); },
    frizz: (g, C, L) => { const T = C.head.T, w = C.head.crW; if (L === 'back') { PA(cr(Array.from({ length: 26 }, (_, i) => { const a = Math.PI * .85 + i / 25 * Math.PI * 1.3, r = (1.32 + (i % 2) * .2 + hash(i) * .1); return [Math.cos(a) * w * r, -T * .3 + Math.sin(a) * T * .8 * r]; }), false), C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); return; }
      PA(cr([[-w - 10, -T * .4], [-w * .6, -T * .5], [-w * .5, -T * .7], [-w * .1, -T * .58], [w * .2, -T * .75], [w * .45, -T * .55], [w + 10, -T * .45], [w * .8, -T * 1.05], [0, -T * 1.2], [-w * .8, -T * 1.05]]), C.hairCol, g, { stroke: INK, 'stroke-width': 7 }); },
  };
  const OUTFIT = {
    shirtTie: (g, C, nw, sy) => { PA(`M ${-nw - 20} ${sy - 6} L 0 ${sy + 70} L ${nw + 20} ${sy - 6} L ${nw + 40} ${sy + 40} L 0 ${sy + 90} L ${-nw - 40} ${sy + 40} Z`, '#EEF1E8', g, { stroke: INK, 'stroke-width': 6 });
      PA(`M -16 ${sy + 60} L 22 ${sy + 64} L 34 ${sy + 300} L 4 ${sy + 340} L -14 ${sy + 290} Z`, C.acc, g, { stroke: INK, 'stroke-width': 6, transform: `rotate(-8 0 ${sy})` }); CI(-40, sy + 220, 26, '#8E6A3E', g, { opacity: .45 }); C.sleeve = C.top; },
    suit: (g, C, nw, sy, sw) => { PA(`M ${-nw - 10} ${sy - 4} L 0 ${sy + 200} L ${nw + 10} ${sy - 4} Z`, '#F7F4EE', g, { stroke: INK, 'stroke-width': 5 }); PA(`M -18 ${sy + 30} L 18 ${sy + 30} L 30 ${sy + 260} L 0 ${sy + 300} L -30 ${sy + 260} Z`, C.acc, g, { stroke: INK, 'stroke-width': 6 });
      for (const sx of [-1, 1]) PA(`M ${sx * (nw + 14)} ${sy - 6} L ${sx * 6} ${sy + 230} L ${sx * (nw + 90)} ${sy + 120} L ${sx * (nw + 50)} ${sy + 70} Z`, shade(C.top, 1.25), g, { stroke: INK, 'stroke-width': 6 }); C.sleeve = C.top; },
    polo: (g, C, nw, sy) => { for (const sx of [-1, 1]) PA(`M ${sx * 6} ${sy + 4} L ${sx * (nw + 40)} ${sy - 10} L ${sx * (nw + 50)} ${sy + 50} Z`, shade(C.top, 1.3), g, { stroke: INK, 'stroke-width': 6 }); LN(`M ${-nw} ${sy} L -60 ${sy + 330} M ${nw} ${sy} L 60 ${sy + 330}`, '#202020', 6, g); R(-60, sy + 320, 120, 80, '#FFFFFF', 8, g, { stroke: INK, 'stroke-width': 5 }); TX(0, sy + 370, 'TEAM LEAD', 20, INK, g, { 'font-weight': 800 }); C.sleeve = C.top; },
    hoodie: (g, C, nw, sy) => { PA(`M ${-nw - 60} ${sy - 10} Q 0 ${sy + 120} ${nw + 60} ${sy - 10} Q 0 ${sy + 60} ${-nw - 60} ${sy - 10} Z`, shade(C.top, 1.4), g, { stroke: INK, 'stroke-width': 6 }); LN(`M -30 ${sy + 60} L -36 ${sy + 230} M 30 ${sy + 60} L 36 ${sy + 230}`, '#DDDDDD', 6, g);
      LN(`M ${-nw - 4} ${sy + 4} Q 0 ${sy + 150} ${nw + 4} ${sy + 4}`, C.acc, 12, g); LN(`M ${-nw - 4} ${sy + 4} Q 0 ${sy + 150} ${nw + 4} ${sy + 4}`, INK, 3, g, { 'stroke-dasharray': '4 14' }); CI(0, sy + 80, 24, C.acc, g, { stroke: INK, 'stroke-width': 4 }); TX(0, sy + 90, '₿', 28, INK, g, { 'font-weight': 900 }); C.sleeve = C.top; },
    crop: (g, C, nw, sy) => { PA(`M ${-nw - 20} ${sy - 4} Q 0 ${sy + 90} ${nw + 20} ${sy - 4}`, C.skin, g, { stroke: INK, 'stroke-width': 6 }); for (let i = -3; i <= 3; i++) CI(i * 22, sy + 30 + Math.abs(i) * -6 + 30, 8, C.acc, g, { stroke: INK, 'stroke-width': 2.5 }); C.sleeve = C.skin; },
    blouse: (g, C, nw, sy) => { for (let i = 0; i < 40; i++) CI(-220 + hash(i) * 440, sy + 40 + hash(i + 4) * 560, 12, ['#F6D365', '#FDA085', '#FFFFFF'][i % 3], g, { opacity: .9 }); PA(`M ${-nw - 16} ${sy - 4} L 0 ${sy + 90} L ${nw + 16} ${sy - 4}`, C.skin, g, { stroke: INK, 'stroke-width': 6 });
      for (let i = 0; i < 15; i++) { const a = Math.PI * (.15 + i / 14 * .7); CI(Math.cos(a) * (nw + 30) * -1 * -1, sy - 10 + Math.sin(a) * 90, 9, C.acc, g, { stroke: INK, 'stroke-width': 2.5 }); } C.sleeve = C.top; },
    tank: (g, C, nw, sy) => { for (const sx of [-1, 1]) PA(`M ${sx * (nw + 20)} ${sy - 6} L ${sx * (nw + 110)} ${sy + 10} L ${sx * (nw + 140)} ${sy + 200} L ${sx * (nw + 60)} ${sy + 60} Z`, C.skin, g, { stroke: INK, 'stroke-width': 6 }); PA(`M ${-nw - 20} ${sy - 4} Q 0 ${sy + 110} ${nw + 20} ${sy - 4}`, C.skin, g, { stroke: INK, 'stroke-width': 6 }); C.sleeve = C.skin; },
    openShirt: (g, C, nw, sy) => { PA(`M ${-nw - 20} ${sy - 6} L 0 ${sy + 230} L ${nw + 20} ${sy - 6} Z`, C.skin, g, { stroke: INK, 'stroke-width': 6 }); for (let i = 0; i < 12; i++) LN(`M ${-24 + hash(i) * 48} ${sy + 60 + hash(i + 3) * 120} q 6 -8 0 -14`, INK, 3, g);
      LN(`M ${-nw - 6} ${sy + 2} Q 0 ${sy + 180} ${nw + 6} ${sy + 2}`, C.acc, 14, g); LN(`M ${-nw - 6} ${sy + 2} Q 0 ${sy + 180} ${nw + 6} ${sy + 2}`, '#6EA35A', 14, g, { 'stroke-dasharray': '10 70', opacity: .9 }); CI(0, sy + 96, 26, C.acc, g, { stroke: INK, 'stroke-width': 4 }); TX(0, sy + 107, '$', 30, INK, g, { 'font-weight': 900 });
      for (const sx of [-1, 1]) PA(`M ${sx * (nw + 20)} ${sy - 6} L ${sx * (nw + 60)} ${sy + 80} L ${sx * 12} ${sy + 240} Z`, '#E5E0D4', g, { stroke: INK, 'stroke-width': 5 }); C.sleeve = C.top; },
    plaid: (g, C, nw, sy, sw) => { for (let i = -5; i <= 5; i++) { R(i * 50 - 6, sy, 12, 700, '#8A5A1E', 0, g, { opacity: .45 }); R(-sw, sy + 40 + (i + 5) * 60, sw * 2, 10, '#8A1E1E', 0, g, { opacity: .35 }); }
      PA(`M ${-nw - 10} ${sy - 4} L 0 ${sy + 190} L ${nw + 10} ${sy - 4} Z`, '#F2EFE6', g, { stroke: INK, 'stroke-width': 5 }); PA(`M -16 ${sy + 24} L 16 ${sy + 24} L 26 ${sy + 220} L 0 ${sy + 250} L -26 ${sy + 220} Z`, '#2E6B3A', g, { stroke: INK, 'stroke-width': 5 });
      for (const sx of [-1, 1]) PA(`M ${sx * (nw + 14)} ${sy - 6} L ${sx * 6} ${sy + 220} L ${sx * (nw + 90)} ${sy + 110} Z`, shade(C.top, 1.15), g, { stroke: INK, 'stroke-width': 6 }); C.sleeve = C.top; },
    stripes: (g, C, nw, sy, sw) => { for (let i = 0; i < 8; i++) R(-sw, sy + 30 + i * 70, sw * 2, 34, '#FFFFFF', 0, g, { opacity: .95 }); PA(`M ${-nw - 16} ${sy - 4} Q 0 ${sy + 70} ${nw + 16} ${sy - 4}`, C.skin, g, { stroke: INK, 'stroke-width': 6 }); C.sleeve = C.top; },
  };
  const STACHE = (g, C) => { const e = C.extras;
    if (e.includes('mustache')) PA('M -70 -6 Q -40 -34 0 -16 Q 40 -34 70 -6 Q 60 14 30 4 Q 10 -2 0 6 Q -10 -2 -30 4 Q -60 14 -70 -6 Z', '#2E2119', g, { stroke: INK, 'stroke-width': 5 });
    if (e.includes('pencilStache')) PA('M -52 -2 Q -26 -16 0 -8 Q 26 -16 52 -2 Q 26 -6 0 0 Q -26 -6 -52 -2 Z', '#140E0B', g, { stroke: INK, 'stroke-width': 3 });
    if (e.includes('tinyStache')) R(-18, -12, 36, 10, '#1D8F8C', 4, g, { stroke: INK, 'stroke-width': 3 }); };
  const ACC = (g, C) => { const E = C.eye, hd = C.head;
    if (C.extras.includes('catEye')) { for (const sx of [-1, 1]) { const cx = sx * E.gap, y = E.y;
        PA(`M ${cx - sx * 56} ${y + 4} Q ${cx - sx * 50} ${y - 44} ${cx} ${y - 46} Q ${cx + sx * 50} ${y - 48} ${cx + sx * 84} ${y - 66} Q ${cx + sx * 70} ${y + 30} ${cx} ${y + 44} Q ${cx - sx * 52} ${y + 44} ${cx - sx * 56} ${y + 4} Z`, 'none', g, { stroke: '#B0183A', 'stroke-width': 9, 'stroke-linejoin': 'round' }); }
      LN(`M ${-E.gap + 56} ${E.y - 4} Q 0 ${E.y - 22} ${E.gap - 56} ${E.y - 4}`, '#B0183A', 8, g); LN(`M ${-E.gap - 80} ${E.y - 30} Q ${-hd.chk - 60} ${hd.chinY} ${-70} ${C.sy + 70}`, '#E8C14A', 3.5, g, { 'stroke-dasharray': '7 6' }); }
    if (C.extras.includes('headset')) { LN(`M ${-hd.crW - 10} ${E.y + 30} Q 0 ${-hd.T * 1.35} ${hd.crW + 10} ${E.y + 30}`, '#222', 10, g); R(hd.chk - 6, E.y + 10, 30, 56, '#222', 10, g); LN(`M ${hd.chk + 8} ${E.y + 60} Q ${hd.chk - 20} ${C.mouth.y + 20} ${C.mouth.w * .55} ${C.mouth.y + 6}`, '#222', 6, g); CI(C.mouth.w * .55, C.mouth.y + 6, 9, '#222', g); }
    if (C.extras.includes('shadesOnHead')) { const y = -hd.T * .72; R(-110, y - 30, 96, 52, '#141414', 20, g, { stroke: '#D9B13B', 'stroke-width': 5 }); R(14, y - 30, 96, 52, '#141414', 20, g, { stroke: '#D9B13B', 'stroke-width': 5 }); LN(`M -14 ${y - 8} L 14 ${y - 8}`, '#D9B13B', 6, g); LN(`M -96 ${y - 20} L -60 ${y - 6}`, '#FFFFFF', 4, g, { opacity: .6 }); } };

  /* =========================== PER-FRAME DRAW =========================== */
  function draw(ch, t) {
    const C = ch.C, hd = C.head, E = C.eye, P = ch.P, D = ch.D, still = cl(P.still);
    if (ch.turb) ch.turb.setAttribute('seed', 1 + Math.floor(t * 12) % 4);
    /* additive life: idle drift, blink, tremble, twitch, talk */
    const idle = 1 - still, tr = P.trem;
    let hx = P.hx + D.jx + Math.sin(t * 1.3 + ch.x) * 3 * idle + tr * 7 * Math.sin(t * 71), hy = P.hy + D.jy + Math.sin(t * 1.7) * 3 * idle + tr * 5 * Math.sin(t * 89 + 1) + D.slideBob;
    let tilt = P.tilt + Math.sin(t * .9 + ch.y) * 1.4 * idle + tr * 1.6 * Math.sin(t * 57), sq = P.sq + D.pulse * .14 - D.smear * .3;
    const bp = (t + hash(ch.x + ch.y) * 3) % 3.4, blink = still > .7 ? 0 : (bp < .07 ? bp / .07 : bp < .16 ? 1 - (bp - .07) / .09 : 0);
    const tw = P.twitch * (((t * 1.15) % 1) < .12 ? Math.sin(((t * 1.15) % 1) / .12 * Math.PI) : 0);
    let talkO = 0; for (const k of ch.talks) if (t >= k.t0 && t < k.t1) { if (k.vis) { const v = k.vis[Math.floor((t - k.t0) * 30)] ?? 0; talkO = [0, .25, .7, .5, .55][v]; } else { const sy = Math.floor((t - k.t0) * 9); talkO = hash(sy * 7.7 + ch.x) < .2 ? 0 : .25 + hash(sy * 3.1) * .55; } }
    const J = P.jaw * 120 + talkO * 22, cheek = P.cheek, js = P.jawSide * 34;
    /* head transform: pivot at neck */
    const ny = hd.jawY + 40, sx = 1 + sq, syy = 1 - sq * .9 + D.smear * .45;
    ch.headG.setAttribute('transform', `translate(${f(hx)},${f(hy)}) translate(0,${ny}) rotate(${f(tilt)}) scale(${f(sx)},${f(syy)}) translate(0,${-ny})`);
    ch.ghosts.forEach((gh, i) => { gh.setAttribute('opacity', D.smear * (.35 - i * .14)); gh.setAttribute('transform', `translate(${-D.smx * (i + 1) * 46},${-D.smy * (i + 1) * 46})`); });
    ch.body.setAttribute('transform', `translate(${f(hx * .3)},${f(hy * .25 + Math.sin(t * 1.7) * 2 * idle)}) scale(${f(1 + sq * .3)},${f(1 - sq * .15)})`);
    /* head shape */
    const pts = [[0, -hd.T], [hd.crW * .78, -hd.T * .86], [hd.crW, -hd.T * .38], [hd.chk * (1 + cheek * .16), hd.chkY], [hd.jawW * (1 - P.jaw * .1) + cheek * 22 + js * .3, hd.jawY + J * .55], ...(hd.boxy ? [[hd.jawW * .97 + cheek * 18 + js * .5, (hd.jawY + hd.chinY) / 2 + J * .8 + 14]] : []), [hd.chinW + js * .8, hd.chinY + J], [js, hd.chinY + J + 14 * (hd.pointy || 1)],
      [-hd.chinW + js * .8, hd.chinY + J], ...(hd.boxy ? [[-hd.jawW * .97 - cheek * 18 + js * .5, (hd.jawY + hd.chinY) / 2 + J * .8 + 14]] : []), [-hd.jawW * (1 - P.jaw * .1) - cheek * 22 + js * .3, hd.jawY + J * .55], [-hd.chk * (1 + cheek * .16), hd.chkY], [-hd.crW, -hd.T * .38], [-hd.crW * .78, -hd.T * .86]];
    const hp = cr(pts); ch.headPath.setAttribute('d', hp); ch.headClipP.setAttribute('d', hp); ch.headOut.setAttribute('d', hp);
    ch.shadeA.setAttribute('d', hp); ch.hatch.setAttribute('d', hp); ch.shadeB.setAttribute('d', hp); ch.shadeB.setAttribute('transform', 'translate(-26,-16)');
    if (ch.dchin) ch.dchin.setAttribute('d', `M ${-hd.chinW * 1.1 + js} ${hd.chinY + J - 22} Q ${js} ${hd.chinY + J + 22} ${hd.chinW * 1.1 + js} ${hd.chinY + J - 22}`);
    if (ch.cleft) ch.cleft.setAttribute('d', `M ${js} ${hd.chinY + J - 30} q -6 18 0 36`);
    ch.ovRed.setAttribute('opacity', P.red * .5); ch.ovSick.setAttribute('opacity', P.sick * .45); ch.ovPale.setAttribute('opacity', P.pale); ch.ovGloom.setAttribute('opacity', P.gloom); ch.blushG.setAttribute('opacity', P.blush);
    /* eyes */
    const pop = D.pop, eyeC = [];
    ch.eyes.forEach((e, i) => { const L = i === 0, s = e.sx, S = (L ? P.lS : P.rS) * (1 + pop * .65), Wd = L ? P.lW : P.rW;
      const rx = E.R * S * Wd * 1.05, ry = E.R * S * (1 + pop * .1), cx = s * E.gap * (1 + cheek * .05), cy = E.y + (S - 1) * -6;
      let lid = cl((L ? P.lLid : P.rLid) + blink * (1 - (L ? P.lLid : P.rLid)) + (L ? tw * .45 : 0)), low = cl((L ? P.lLow : P.rLow) + (L ? tw * .3 : 0)); const ang = L ? P.lAng : P.rAng;
      if (pop > .3) { lid *= 1 - pop; low *= 1 - pop; }
      const ep = ell(cx, cy, rx, ry); e.clipP.setAttribute('d', ep); e.scl.setAttribute('d', ep); e.out.setAttribute('d', ep);
      e.veins.setAttribute('transform', `translate(${f(cx)},${f(cy)}) scale(${f(rx / 50)},${f(ry / 50)})`); e.veins.setAttribute('opacity', P.blood);
      const ps = P.pS * (L ? 1 + P.pA : 1 - P.pA) * (1 - pop * .5) * (rx + ry) / 100 * 1.0, ix = cx + P.px * rx * .55, iy = cy + P.py * ry * .5 + Math.max(0, lid - .3) * ry * .45 - Math.max(0, low - .3) * ry * .3;
      e.iris.setAttribute('transform', `translate(${f(ix)},${f(iy)}) scale(${f(Math.max(.34, ps * 1.7))})`);
      e.dull.setAttribute('opacity', P.dull * .75); e.hl.setAttribute('opacity', 1 - P.dull * .9); e.shn.setAttribute('opacity', P.shine); e.dol.setAttribute('opacity', P.dollar); e.glow.setAttribute('opacity', P.glow);
      const xL = cx - rx - 6, xR = cx + rx + 6, inner = s < 0 ? 'R' : 'L', y0 = cy - ry + 2 * ry * lid, ao = ang * ry * .75;
      const yI = y0 + ao, yO = y0 - ao, yLl = inner === 'L' ? yI : yO, yRr = inner === 'L' ? yO : yI, yc = (yLl + yRr) / 2 - ry * .32 * (1 - lid);
      e.lid.setAttribute('d', `M ${f(xL)} ${f(cy - ry - 80)} L ${f(xR)} ${f(cy - ry - 80)} L ${f(xR)} ${f(yRr)} Q ${f(cx)} ${f(yc)} ${f(xL)} ${f(yLl)} Z`);
      e.lidLine.setAttribute('d', `M ${f(xL)} ${f(yLl)} Q ${f(cx)} ${f(yc)} ${f(xR)} ${f(yRr)}`);
      const y1 = cy + ry - 2 * ry * low, yc1 = y1 - ry * (.15 + .7 * low) * (low > .3 ? 1 : .4);
      e.low.setAttribute('d', `M ${f(xL)} ${f(cy + ry + 80)} L ${f(xR)} ${f(cy + ry + 80)} L ${f(xR)} ${f(y1)} Q ${f(cx)} ${f(yc1)} ${f(xL)} ${f(y1)} Z`);
      e.lowLine.setAttribute('d', `M ${f(xL)} ${f(y1)} Q ${f(cx)} ${f(yc1)} ${f(xR)} ${f(y1)}`); e.lowLine.setAttribute('opacity', low > .25 ? 1 : 0);
      if (e.lash) { const ox = s < 0 ? xL : xR, oy = s < 0 ? yLl : yRr; e.lash.setAttribute('d', `M ${f(ox - s * 10)} ${f(oy + 2)} l ${s * 26} -20 M ${f(ox - s * 26)} ${f(oy - 2)} l ${s * 18} -24 M ${f(ox - s * 44)} ${f(oy - 8)} l ${s * 8} -24`); }
      eyeC.push({ cx, cy, rx, ry, lid }); });
    const bagO = P.bags * .9; ch.bags.setAttribute('d', eyeC.map(e => `M ${f(e.cx - e.rx * .8)} ${f(e.cy + e.ry + 12)} Q ${f(e.cx)} ${f(e.cy + e.ry + 34)} ${f(e.cx + e.rx * .8)} ${f(e.cy + e.ry + 12)} M ${f(e.cx - e.rx * .5)} ${f(e.cy + e.ry + 32)} Q ${f(e.cx)} ${f(e.cy + e.ry + 46)} ${f(e.cx + e.rx * .5)} ${f(e.cy + e.ry + 32)}`).join(' ')); ch.bags.setAttribute('opacity', bagO);
    ch.crow.setAttribute('d', eyeC.map((e, i) => { const s = i ? 1 : -1, x = e.cx + s * (e.rx + 10); return `M ${f(x)} ${f(e.cy - 8)} l ${s * 26} -14 M ${f(x + s * 2)} ${f(e.cy + 4)} l ${s * 30} 0 M ${f(x)} ${f(e.cy + 16)} l ${s * 26} 14`; }).join(' ')); ch.crow.setAttribute('opacity', cl(P.crow + Math.max(0, P.sm) * .3));
    /* brows */
    ch.brows.forEach((b, i) => { const L = i === 0, s = L ? -1 : 1, e = eyeC[i], raise = L ? P.lB : P.rB, ang = L ? P.lBA : P.rBA, bl = C.brow.len, th = C.brow.th;
      const xi = s * (E.gap - bl * .48 - P.knit * 16), xo = s * (E.gap + bl * .6), base = e.cy - e.ry - 22 - raise * 46;
      const yi = base + ang * 36 + P.knit * 10, yo = base - ang * 16 - Math.max(0, -ang) * 6, xm = (xi + xo) / 2, ym = (yi + yo) / 2 - 10 - P.bCurve * 10 - Math.max(0, -ang) * 8;
      b.setAttribute('d', `M ${f(xi)} ${f(yi - th * .55)} Q ${f(xm)} ${f(ym - th * .6)} ${f(xo)} ${f(yo - th * .2)} L ${f(xo)} ${f(yo + th * .2)} Q ${f(xm)} ${f(ym + th * .5)} ${f(xi)} ${f(yi + th * .55)} Z`); });
    const browAvg = (P.lB + P.rB) / 2, worried = Math.max(0, -(P.lBA + P.rBA) / 2);
    ch.fore.setAttribute('d', [0, 1, 2].map(k => { const y = -hd.T * (.55 - k * .1) + (browAvg > 0 ? -browAvg * 10 : 0), w = hd.crW * (.55 - k * .06), bow = worried * 18 + (P.knit * -6);
      return `M ${f(-w)} ${f(y)} Q ${f(-w / 2)} ${f(y - 8 - bow)} 0 ${f(y + bow * .3)} Q ${f(w / 2)} ${f(y - 8 - bow)} ${f(w)} ${f(y)}`; }).join(' ')); ch.fore.setAttribute('opacity', cl(P.fore + Math.max(0, browAvg - .4)));
    ch.furrow.setAttribute('d', `M -10 ${E.y - E.R - 30} l -4 30 M 10 ${E.y - E.R - 30} l 4 30 M 0 ${E.y - E.R - 34} l 0 22`); ch.furrow.setAttribute('opacity', cl(P.knit));
    /* nose */
    const noseY = (E.y + C.mouth.y) / 2 + 10; const nS = C.noseS || 1; ch.noseG.setAttribute('transform', `translate(${f(js * .2)},${f(noseY - P.scr * 12)}) scale(${f(nS * (1 + P.scr * .08))},${f(nS * (1 - P.scr * .1))})`); ch.noseWr.setAttribute('opacity', P.scr);
    /* mouth */
    const my = C.mouth.y + J * .18, mx = P.mX + js * .55, w = C.mouth.w * 1.3 * P.mW * (1 - P.pucker * .55) * (1 + talkO * .1), wob = P.wob * Math.sin(t * 38) * 6;
    const H = Math.max(0, P.mO * 78 + J * .9 + talkO * 30);
    const cL = [mx - w / 2, my - (P.sm + P.mL) * 42 + H * .2 * P.box + wob * .4], cR = [mx + w / 2, my - (P.sm + P.mR) * 42 + H * .2 * P.box - wob * .4];
    const uy = my - P.mU * 16 - H * .08, ly = my + H + Math.max(0, P.sm) * 8 * (H > 4 ? 1 : 0) + wob, k1 = .3 - .27 * P.box;
    const c1 = [cL[0] + w * .28, uy - P.mSn * 26], c2 = [cR[0] - w * .28, uy], c3 = [cR[0] - w * k1, ly + H * .12 * (1 - P.box)], c4 = [cL[0] + w * k1, ly + H * .12 * (1 - P.box)];
    const mp = `M ${f(cL[0])} ${f(cL[1])} C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(cR[0])} ${f(cR[1])} C ${f(c3[0])} ${f(c3[1])} ${f(c4[0])} ${f(c4[1])} ${f(cL[0])} ${f(cL[1])} Z`;
    ch.mIn.setAttribute('d', mp); ch.mClip.setAttribute('d', mp); ch.mOut.setAttribute('d', mp); ch.mOut.setAttribute('stroke-width', H > 3 ? 6.5 : 8);
    if (ch.lips) { const lt = 13 * (1 + P.pucker * .6); ch.lips.setAttribute('d', cr([[cL[0] - 8, cL[1]], [cL[0] + w * .22, uy - lt * 1.15], [mx, uy - lt * .5], [cR[0] - w * .22, uy - lt * 1.15], [cR[0] + 8, cR[1]], [cR[0] - w * .2, ly + lt * 1.4], [mx, ly + lt * 1.6], [cL[0] + w * .2, ly + lt * 1.4]]));
      ch.gloss.setAttribute('cx', mx - w * .12); ch.gloss.setAttribute('cy', ly + lt * .9); }
    const TT = C.teeth, gum = P.mU * 12;
    ch.gums.setAttribute('y', f(uy - 60)); ch.gums.setAttribute('height', f(60 + gum + 4)); ch.gums.setAttribute('opacity', P.mU > .05 ? 1 : 0);
    let du = '', dl = '', dg = ''; const p0 = cL, p1 = cR;
    if (P.tU > .02) for (let i = 0; i < TT.n; i++) { if (i === TT.gap) continue; const a = bz(p0, c1, c2, p1, i / TT.n), b = bz(p0, c1, c2, p1, (i + 1) / TT.n), big = TT.buck && (i === Math.floor(TT.n / 2) - 1 || i === Math.floor(TT.n / 2));
      const h = TT.h * 1.35 * (.8 + .45 * hash(i * 3.3 + TT.n)) * (big ? 1.7 : 1) * P.tU, top = Math.min(a[1], b[1]) - 6 + gum, x0 = a[0] + 1.5, x1 = b[0] - 1.5, rot = (hash(i * 7.1 + 2) - .5) * TT.crook * 18, cxm = (x0 + x1) / 2;
      const dd = `M ${f(x0)} ${f(top)} L ${f(x1)} ${f(top)} L ${f(x1)} ${f(top + h - 5)} Q ${f(x1)} ${f(top + h)} ${f(cxm)} ${f(top + h + 2)} Q ${f(x0)} ${f(top + h)} ${f(x0)} ${f(top + h - 5)} Z`;
      const tdd = rot ? rotPath(dd, rot, cxm, top) : dd; if (i === TT.gold) dg += tdd; else du += tdd; }
    if (P.tL > .02) for (let i = 0; i < TT.n - 1; i++) { const a = bz(p1, c3, c4, p0, (i + .5) / (TT.n - .5)), b = bz(p1, c3, c4, p0, (i + 1.5) / (TT.n - .5)), h = TT.h * .72 * (.75 + .5 * hash(i * 5.7 + 1)) * P.tL, bot = Math.max(a[1], b[1]) + 6, x0 = b[0] + 1.5, x1 = a[0] - 1.5;
      const dd = `M ${f(x0)} ${f(bot)} L ${f(x1)} ${f(bot)} L ${f(x1)} ${f(bot - h + 5)} Q ${f(x1)} ${f(bot - h)} ${f((x0 + x1) / 2)} ${f(bot - h - 2)} Q ${f(x0)} ${f(bot - h)} ${f(x0)} ${f(bot - h + 5)} Z`;
      dl += rotPath(dd, (hash(i * 9.1) - .5) * TT.crook * 22, (x0 + x1) / 2, bot); }
    ch.teethU.setAttribute('d', du || 'M0 0'); ch.teethL.setAttribute('d', dl || 'M0 0'); ch.gold.setAttribute('d', dg || 'M0 0');
    const tH = Math.min(H * .42, 34); A(ch.tongueIn, { cx: f(mx + w * .06), cy: f(ly - tH * .3), rx: f(w * .3), ry: f(Math.max(1, tH)), opacity: H > 10 ? 1 : 0 });
    if (P.tongue > .03) { const tl2 = P.tongue * (60 + H * .4); ch.tongueOut.setAttribute('d', cr([[mx - 30, ly - 16], [mx - 34, ly + tl2 * .6], [mx + 4, ly + tl2], [mx + 34, ly + tl2 * .6], [mx + 30, ly - 16]], false) + ' Z'); ch.tongueOut.setAttribute('opacity', 1);
      ch.tongueMid.setAttribute('d', `M ${f(mx)} ${f(ly)} L ${f(mx + 2)} ${f(ly + tl2 * .75)}`); ch.tongueMid.setAttribute('opacity', 1); } else { ch.tongueOut.setAttribute('opacity', 0); ch.tongueMid.setAttribute('opacity', 0); }
    ch.dimples.setAttribute('d', `M ${f(cL[0] - 4)} ${f(cL[1] - 12)} q -12 12 0 24 M ${f(cR[0] + 4)} ${f(cR[1] - 12)} q 12 12 0 24`); ch.dimples.setAttribute('opacity', cl(.35 + Math.abs(P.sm) * .7 + P.box * .4));
    const aL = cl((P.sm + P.mL) * 1.2 - .25), aR = cl((P.sm + P.mR) * 1.2 - .25); ch.apples.setAttribute('d', (aL > .02 ? `M ${f(cL[0] - 10)} ${f(cL[1] - 18)} C ${f(cL[0] - 56)} ${f(cL[1] - 30)} ${f(cL[0] - 60)} ${f(cL[1] - 80 * aL)} ${f(cL[0] - 24)} ${f(cL[1] - 104 * aL)}` : '') + (aR > .02 ? ` M ${f(cR[0] + 10)} ${f(cR[1] - 18)} C ${f(cR[0] + 56)} ${f(cR[1] - 30)} ${f(cR[0] + 60)} ${f(cR[1] - 80 * aR)} ${f(cR[0] + 24)} ${f(cR[1] - 104 * aR)}` : '') || 'M0 0');
    ch.underLip.setAttribute('d', `M ${f(mx - w * .16)} ${f(ly + 20)} Q ${f(mx)} ${f(ly + 28)} ${f(mx + w * .16)} ${f(ly + 20)}`);
    ch.chinL.setAttribute('d', `M ${f(mx - 22)} ${f(ly + 44)} q 6 8 12 0 M ${f(mx + 6)} ${f(ly + 48)} q 6 8 12 0 M ${f(mx - 8)} ${f(ly + 58)} q 6 8 12 0` + (P.pucker > .2 ? ` M ${f(mx - w * .5 - 10)} ${f(my - 6)} l -14 -6 M ${f(mx - w * .5 - 10)} ${f(my + 8)} l -14 6 M ${f(mx + w * .5 + 10)} ${f(my - 6)} l 14 -6 M ${f(mx + w * .5 + 10)} ${f(my + 8)} l 14 6 M ${f(mx)} ${f(uy - 18)} l 0 -14` : ''));
    ch.chinL.setAttribute('opacity', cl(P.chinW + P.pucker * .7));
    const nw2 = 34; ch.naso.setAttribute('d', `M ${f(-nw2 + js * .2)} ${f(noseY + 18)} Q ${f(cL[0] - 30)} ${f((noseY + cL[1]) / 2)} ${f(cL[0] - 14)} ${f(cL[1] + 6)} M ${f(nw2 + js * .2)} ${f(noseY + 18)} Q ${f(cR[0] + 30)} ${f((noseY + cR[1]) / 2)} ${f(cR[0] + 14)} ${f(cR[1] + 6)}`);
    ch.naso.setAttribute('opacity', cl(P.naso + Math.max(0, P.sm) * .4 + P.box * .3 + P.mSn * .5));
    ch.cheekL.setAttribute('d', `M ${f(-hd.chk * .75)} ${f(hd.chkY + 30)} l 20 30 M ${f(-hd.chk * .7)} ${f(hd.chkY + 62)} l 16 24 M ${f(hd.chk * .75)} ${f(hd.chkY + 30)} l -20 30 M ${f(hd.chk * .7)} ${f(hd.chkY + 62)} l -16 24`); ch.cheekL.setAttribute('opacity', cl(P.strain * .8 + P.jaw * .4));
    if (P.drool > .02) { ch.droolP.setAttribute('d', `M ${f(cR[0] - 8)} ${f(cR[1])} q 6 ${f(P.drool * 40)} 2 ${f(P.drool * 70)} a 9 9 0 1 0 6 0 q -2 -30 -4 ${f(-P.drool * 70)} Z`); ch.droolP.setAttribute('opacity', 1); } else ch.droolP.setAttribute('opacity', 0);
    ch.stache.setAttribute('transform', `translate(${f(mx * .6)},${f(Math.min(uy, my) - 26)}) rotate(${f(-P.mSn * 6 + (P.mR - P.mL) * -4)}) scale(.82)`);
    ch.cords.setAttribute('opacity', P.strain);
    /* FX */
    ch.tearS.forEach((ls, i) => { const e = eyeC[i], s = i ? 1 : -1, x0 = e.cx + s * e.rx * .45, y0 = e.cy + e.ry * .7, yb = hd.chinY + J + 150, wv = Math.sin(t * 9 + i) * 8;
      const d = `M ${f(x0)} ${f(y0)} C ${f(x0 + s * 30 + wv)} ${f(y0 + 90)} ${f(x0 + s * 5 - wv)} ${f(yb - 110)} ${f(x0 + s * 40)} ${f(yb)}`;
      ls.forEach((l, k) => { l.setAttribute('d', d); l.setAttribute('opacity', P.tears); if (k === 2) l.setAttribute('stroke-dashoffset', f(-t * 260)); });
      ls[0].setAttribute('stroke-width', 18 + P.tears * 20); ls[1].setAttribute('stroke-width', 9 + P.tears * 20); });
    ch.fountG.setAttribute('opacity', P.fount); if (P.fount > .02) ch.drops.forEach((dp, k) => { const i = k % 2, e = eyeC[i], s = i ? 1 : -1, ph = (t * 1.7 + k / 16 * 2.3) % 1;
      dp.setAttribute('transform', `translate(${f(e.cx + s * (e.rx + ph * 300))},${f(e.cy - ph * 150 + ph * ph * 420)}) rotate(${f(s * (40 + ph * 80))}) scale(${f(1.2 - ph * .5)})`); });
    A(ch.bigTear, { opacity: P.tear1, transform: `translate(${f(eyeC[0].cx - eyeC[0].rx * .4)},${f(eyeC[0].cy + eyeC[0].ry + 30 + ((t * 30) % 60) * P.tear1)}) scale(${f(.8 + P.tear1 * .5)})` });
    ch.sweatG.setAttribute('opacity', P.sweat); ch.sweats.forEach((s2, k) => { const ph = (t * .6 + k * .33) % 1; s2.setAttribute('transform', `translate(${f(hd.crW * (.8 - k * .12) + 10)},${f(-hd.T * (.5 - k * .15) + ph * 70)}) scale(${f(1.3 - k * .2)})`); s2.setAttribute('opacity', 1 - ph * .6); });
    A(ch.snot, { opacity: P.snot, cx: f(-14 + js * .2), cy: f(noseY + 40), r: f(8 + P.snot * 22 * (.6 + .4 * Math.sin(t * 3.2))) });
    A(ch.vein, { opacity: P.vein, transform: `translate(${f(hd.crW * .45)},${f(-hd.T * .62)}) scale(${f(1 + .18 * Math.sin(t * 14))})` });
    ch.steamG.setAttribute('opacity', P.steam); if (P.steam > .02) ch.steams.forEach((s2, k) => { const sx2 = k % 2 ? 1 : -1, ph = (t * 1.3 + k * .17) % 1; A(s2, { cx: f(sx2 * (hd.chk + 40 + ph * 50)), cy: f(E.y + 40 - ph * 200), r: f(14 + ph * 26), opacity: 1 - ph }); });
    A(ch.shockG, { opacity: P.shock, transform: `rotate(${f(Math.sin(t * 20) * 3)}) scale(${f(1 + .04 * Math.sin(t * 25))})` });
    A(ch.sparkG, { opacity: P.sparkle * (.6 + .4 * Math.abs(Math.sin(t * 6))) }); ch.qm.setAttribute('opacity', P.qmark); ch.zz.setAttribute('opacity', P.zz * (.6 + .4 * Math.sin(t * 3)));
    ch.cringeG.setAttribute('opacity', P.cringe); if (P.cringe > .02) ch.cringes.forEach(l => { const s2 = +l.dataset.sx, k = +l.dataset.k, x = s2 * (hd.crW + 60 + k * 34), y0 = -hd.T * .4 + k * 30;
      l.setAttribute('d', `M ${f(x)} ${f(y0)} q ${f(14 * Math.sin(t * 20 + k))} 25 0 50 q ${f(-14 * Math.sin(t * 20 + k))} 25 0 50 q ${f(14 * Math.sin(t * 20 + k))} 25 0 50`); });
    ch.heartG.setAttribute('opacity', P.heart); const hs = P.heart * (6 + 4 * Math.sin(t * 5)); ch.heartA.setAttribute('transform', `translate(${-hs},0) rotate(${-hs})`); ch.heartB.setAttribute('transform', `translate(${hs},${hs * .5}) rotate(${hs})`);
    /* hands + arms */
    ch.hands.forEach((hnd, i) => { const k = i ? 'r' : 'l', s = i ? 1 : -1; let x = P[k + 'hx'], y = P[k + 'hy']; const face = P[k + 'hf'] > .5, shp = Math.round(P[k + 'hp']), name = Object.keys(HP).find(n => HP[n] === shp);
      if (face) { x += hx; y += hy + (y > hd.chkY ? J * .5 : 0); } else { x += hx * .3; y += hy * .25; }
      if (name === 'flat' && P.clap > 0) x += s * (24 + 40 * Math.abs(Math.sin(t * Math.PI * (P.clapRate || 1.6)))) * P.clap;
      if (name === 'flat' && P.rubA > 0) y += Math.sin(t * 16 + i * Math.PI) * 14 * P.rubA;
      if (name === 'fist') { x += Math.sin(t * 30 + i) * 10 * cl(P.trem); y += Math.cos(t * 26 + i) * 8 * cl(P.trem); }
      if (hnd.cur !== name) { for (const n in hnd.shapes) hnd.shapes[n].setAttribute('opacity', n === name ? 1 : 0); hnd.cur = name; }
      const rot = P[k + 'hr'], sc = P[k + 'hs']; hnd.g.setAttribute('transform', `translate(${f(x)},${f(y)}) rotate(${f(rot)}) scale(${f(s < 0 ? -sc : sc)},${f(sc)})`);
      const sxp = s * C.sw * .82, syp = C.sy + 40 + hy * .25, rr = rot * Math.PI / 180, wx = x - Math.sin(rr) * 50 * sc, wy = y + Math.cos(rr) * 50 * sc;
      const ex = (sxp + wx) / 2 + s * 70, ey = Math.max(syp, wy) + 70;
      const arm = i ? ch.armR : ch.armL; const d = `M ${f(sxp)} ${f(syp)} Q ${f(ex)} ${f(ey)} ${f(wx)} ${f(wy)}`, vis = wy < C.sy + 330 ? 1 : 0; arm.forEach(a => { a.setAttribute('d', d); a.setAttribute('opacity', vis); }); hnd.g.setAttribute('opacity', vis); });
  }
  const rotPath = (d, deg, cx, cy) => { const a = deg * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
    return d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, x, y) => { const X2 = +x - cx, Y2 = +y - cy; return `${f(cx + X2 * c - Y2 * s)} ${f(cy + X2 * s + Y2 * c)}`; }); };

  /* =========================== ANIMATION BEHAVIOUR =========================== */
  const resolve = n => GR.EXPR[n] ? n : GR.EXPR_ALIASES[String(n).toLowerCase()] || (() => { throw new Error('unknown expression ' + n); })();
  const target = (ch, name) => { const ex = GR.EXPR[resolve(name)], o = { ...DEF, clap: 0, rubA: 0 };
    for (const k in ex) if (k !== 'hands') o[k] = ex[k];
    for (const k in ch.C.quirk) o[k] = (o[k] ?? 0) + ch.C.quirk[k];
    for (const k of ['lLid', 'rLid', 'lLow', 'rLow', 'dull', 'bags']) o[k] = cl(o[k]);
    return o; };
  /* expression morph with anticipation + overshoot (+ optional hands preset) */
  GR.expr = (ch, at, name, { dur = .2, ease = 'back.out(1.8)', hands } = {}) => { const tg = target(ch, name), ex = GR.EXPR[resolve(name)];
    if (dur <= .02) tl().set(ch.P, tg, at); else tl().to(ch.P, { ...tg, duration: dur, ease }, at);
    GR.hands(ch, at, hands || ex.hands || 'rest', dur + .06); };
  GR.hands = (ch, at, preset, dur = .24) => { const hp = handParams(ch.C, preset), pos = {}, snap = {};
    for (const k in hp) (k.endsWith('hp') || k.endsWith('hf') ? snap : pos)[k] = hp[k];
    tl().set(ch.P, { ...snap, clap: preset === 'clap' ? 1 : 0, rubA: preset === 'rub' ? 1 : 0 }, at); tl().to(ch.P, { ...pos, duration: dur, ease: 'back.out(1.6)' }, at); };
  /* the big one: anticipation -> SNAP to the face -> squash pulse + head jerk (+ smear, eye pop, camera punch, sfx) */
  GR.react = (ch, at, name, o = {}) => { const a = o.antic ?? .12;
    if (a > 0) tl().to(ch.D, { pulse: -.6, jy: 14, duration: a, ease: 'power2.in' }, at - a);
    GR.expr(ch, at, name, { dur: o.dur ?? .16, ease: 'back.out(2.6)', hands: o.hands });
    tl().to(ch.D, { keyframes: [{ pulse: 1, jy: -22, duration: .07 }, { pulse: -.35, jy: 6, duration: .1 }, { pulse: 0, jy: 0, duration: .22, ease: 'elastic.out(1,.45)' }] }, at);
    if (o.smear !== false) GR.smear(ch, at, 0, -1);
    if (o.pop) GR.pop(ch, at + .02, o.pop === true ? .5 : o.pop);
    if (o.sc) GR.punch(o.sc, at, ch, o.shot || 'close', { hold: o.hold });
    if (o.sfx !== false) BM.sfx(at, o.sfx || 'boom', o.gain ?? .9); };
  GR.pop = (ch, at, hold = .5) => tl().to(ch.D, { keyframes: [{ pop: 1, duration: .09, ease: 'back.out(3)' }, { pop: .85, duration: hold }, { pop: 0, duration: .25, ease: 'power2.inOut' }] }, at);
  GR.jawDrop = (ch, at, amt = 1, hold = .8) => tl().to(ch.P, { keyframes: [{ jaw: amt * 1.25, mO: .6, duration: .14, ease: 'power3.in' }, { jaw: amt, duration: .3, ease: 'bounce.out' }, { jaw: amt, duration: hold }] }, at);
  GR.blink = (ch, at) => tl().to(ch.P, { keyframes: [{ lLid: 1, rLid: 1, sq: .06, duration: .05 }, { lLid: 1, rLid: 1, duration: .08 }, { lLid: ch.P.lLid, rLid: ch.P.rLid, sq: 0, duration: .1 }] }, at);
  GR.jerk = (ch, at, dx = 0, dy = -30) => tl().to(ch.D, { keyframes: [{ jx: dx, jy: dy, duration: .06, ease: 'power3.out' }, { jx: 0, jy: 0, duration: .4, ease: 'elastic.out(1,.4)' }] }, at);
  GR.recoil = (ch, at, dist = 60) => { tl().to(ch.D, { keyframes: [{ jy: 20, pulse: -.4, duration: .06 }, { jy: -dist * .4, jx: -dist * .3, pulse: .6, duration: .1, ease: 'power3.out' }, { jy: 0, jx: 0, pulse: 0, duration: .45, ease: 'elastic.out(1,.4)' }] }, at); };
  GR.smear = (ch, at, dx = 0, dy = -1) => tl().to(ch.D, { keyframes: [{ smear: 1, smx: dx, smy: dy, duration: .033 }, { smear: .6, duration: .033 }, { smear: 0, duration: .05 }] }, at);
  GR.tremble = (ch, t0, t1, amp = 1) => { tl().to(ch.P, { trem: amp, duration: .08 }, t0); tl().to(ch.P, { trem: 0, duration: .15 }, t1); };
  GR.wobble = (ch, t0, t1, amp = 1) => { tl().to(ch.P, { wob: amp, duration: .1 }, t0); tl().to(ch.P, { wob: 0, duration: .2 }, t1); };
  GR.tearBurst = (ch, t0, t1) => { tl().to(ch.P, { fount: 1, tears: 1, duration: .12 }, t0); tl().to(ch.P, { fount: 0, tears: 0, duration: .3 }, t1); BM.sfx(t0, 'gasp', .5); };
  GR.hold = (ch, t0, t1) => { tl().to(ch.P, { still: 1, duration: .05 }, t0); tl().to(ch.P, { still: 0, duration: .2 }, t1); };   // comedic hold: freeze idle + blinks
  GR.talk = (ch, t0, t1, visemes) => { ch.talks.push({ t0, t1, vis: visemes || null }); };
  GR.say = (ch, t0, t1, text, o = {}) => { GR.talk(ch, t0, t1, o.visemes); if (o.sub !== false && BM.CAP) BM.CAP.sub(t0, t1, (o.speaker ? o.speaker + ': ' : '') + text, o.subStyle); };
  GR.laugh = (ch, t0, t1) => { GR.expr(ch, t0, 'manicLaugh'); const n = Math.floor((t1 - t0) / .14);
    tl().fromTo(ch.D, { jy: 0 }, { jy: -16, duration: .07, yoyo: true, repeat: n * 2 - 1, ease: 'sine.inOut', immediateRender: false }, t0); tl().set(ch.D, { jy: 0 }, t1); BM.sfx(t0 + .05, 'laugh', .7); };
  GR.clap = (ch, t0, t1, rate = 1.6) => { GR.hands(ch, t0, 'clap'); tl().set(ch.P, { clapRate: rate }, t0); for (let tt = t0 + .5 / rate; tt < t1; tt += 1 / rate) BM.sfx(tt, 'clap', .6); tl().set(ch.P, { clap: 0 }, t1); };
  /* rapid escalation: cycle through faces, each one a snap reaction (crypto meltdown) */
  GR.escalate = (ch, t0, names, every = .55, o = {}) => names.forEach((n, i) => GR.react(ch, t0 + i * every, n, { antic: .06, sfx: i % 2 ? 'punch' : 'boom', gain: .5 + i * .06, ...o }));
  /* bust slides in/out of frame with a walking bob (no legs needed in close comedy framing) */
  GR.slide = (ch, at, dx, dur = .8, bob = 12) => { ch.planX = (ch.planX || 0) + dx; tl().to(ch.root, { x: '+=' + dx, duration: dur, ease: 'power1.inOut', onUpdate: ch.root.apply }, at);
    tl().fromTo(ch.D, { slideBob: 0 }, { slideBob: -bob, duration: .16, yoyo: true, repeat: Math.max(1, Math.round(dur / .16)) - 1, ease: 'sine.inOut', immediateRender: false }, at); tl().set(ch.D, { slideBob: 0 }, at + dur); };

  /* =========================== SHOT GRAMMAR (camera framing per character) =========================== */
  /* framing uses the character's PLANNED position (GR.slide updates it when called), so shots can be written in story order */
  GR.frame = (ch, kind = 'close') => { const hx = ch.x + (ch.planX || 0) * ch.s, hy = ch.y + (ch.planY || 0) * ch.s, hh = 470 * ch.s, hw = 2 * (ch.C.head.chk + 50) * ch.s, E = ch.C.eye;
    switch (kind) {
      case 'wide': return { x: BM.W / 2, y: BM.H / 2, z: 1.05 };
      case 'medium': return { x: hx, y: hy + hh * .62, z: Math.max(1.05, BM.H / (hh * 2.5)) };
      case 'close': return { x: hx, y: hy + 30 * ch.s, z: BM.W * .9 / hw };
      case 'ecu': return { x: hx, y: hy + (E.y + 10) * ch.s, z: BM.W * 1.02 / (2 * (E.gap + E.R * 1.75) * ch.s) };
      case 'mouth': return { x: hx, y: hy + (ch.C.mouth.y + 20) * ch.s, z: BM.W * .9 / (ch.C.mouth.w * 2.6 * ch.s) };
      default: return { x: hx, y: hy, z: 1.4 }; } };
  GR.cutTo = (sc, at, ch, kind) => { const fr = GR.frame(ch, kind); BM.setCam(sc, at, fr.x, fr.y, fr.z); };
  GR.punch = (sc, at, ch, kind = 'close', { hold = 0, back = null, sfx = 'zoom_in' } = {}) => { const fr = GR.frame(ch, kind);
    tl().to(sc.cam, { x: fr.x, y: fr.y, z: fr.z, duration: .12, ease: 'back.out(2.2)', onUpdate: sc.apply }, at); if (sfx) BM.sfx(at, sfx, .6);
    if (hold && back) { const b = typeof back === 'string' ? GR.frame(ch, back) : back; tl().to(sc.cam, { ...b, duration: .3, ease: 'power3.inOut', onUpdate: sc.apply }, at + .12 + hold); } };
  GR.drift = (sc, t0, dur, dz = .06) => tl().to(sc.cam, { z: '+=' + dz, duration: dur, ease: 'none', onUpdate: sc.apply }, t0);   // slow creep-in on a held reaction

  /* =========================== BACKGROUNDS + REACTION BACKDROPS =========================== */
  const BG = (GR.BG = {});
  BG.void = (p, col = '#F2E6CF') => R(-2000, -2000, 6000, 6000, col, 0, p);
  BG.burst = (p, cx = BM.W / 2, cy = BM.H / 2, cols = ['#FFD23F', '#FF9F1C'], n = 24) => { const g = G({}, p); R(-2000, -2000, 6000, 6000, cols[0], 0, g); const j = J(G({}, g), cx, cy);
    for (let i = 0; i < n; i += 2) { const a0 = i / n * Math.PI * 2, a1 = (i + 1) / n * Math.PI * 2; PA(`M 0 0 L ${Math.cos(a0) * 3000} ${Math.sin(a0) * 3000} L ${Math.cos(a1) * 3000} ${Math.sin(a1) * 3000} Z`, cols[1], j.el); }
    BM.everyFrame(t => { j.r = t * 8; j.apply(); }); return g; };
  BG.speed = (p, cx = BM.W / 2, cy = BM.H / 2, col = '#FFFFFF', ink = INK) => { const g = G({}, p); R(-2000, -2000, 6000, 6000, col, 0, g); const lines = G({}, g);
    for (let i = 0; i < 90; i++) { const a = i / 90 * Math.PI * 2 + hash(i) * .05, r0 = 420 + hash(i + 3) * 300, w = .012 + hash(i + 7) * .02;
      PA(`M ${cx + Math.cos(a) * r0} ${cy + Math.sin(a) * r0} L ${cx + Math.cos(a - w) * 2600} ${cy + Math.sin(a - w) * 2600} L ${cx + Math.cos(a + w) * 2600} ${cy + Math.sin(a + w) * 2600} Z`, ink, lines); }
    BM.everyFrame(t => lines.setAttribute('transform', `rotate(${(Math.floor(t * 12) % 3) * 1.2} ${cx} ${cy})`)); return g; };
  BG.dread = (p, col = '#2B0F3A') => { const g = G({}, p); R(-2000, -2000, 6000, 6000, col, 0, g); for (let i = 0; i < 30; i++) LN(`M ${-200 + i * 60} -400 L ${-200 + i * 60 + 80} 2400`, '#000', 14, g, { opacity: .35 }); return g; };
  BG.rage = (p) => BG.burst(p, BM.W / 2, BM.H * .42, ['#B3001B', '#E8202F'], 30);
  BG.office = (p, o = {}) => { const g = G({}, p), fy = o.floorY || 1560;
    R(-1000, -1000, 3200, 4000, '#B8C4B0', 0, g); for (let i = -6; i < 14; i++) LN(`M ${i * 120} -1000 L ${i * 120} ${fy}`, '#A3B09C', 4, g);
    R(-1000, fy, 3200, 1400, '#6F7A86', 0, g); for (let i = 0; i < 30; i++) R(-1000 + i * 110, fy + 20 + (i % 2) * 40, 60, 8, '#5F6975', 4, g);
    const light = R(140, 120, 800, 40, '#FFFDE8', 8, g, { stroke: INK, 'stroke-width': 6 }); BM.everyFrame(t => light.setAttribute('opacity', (Math.floor(t * 15) % 23 === 0) ? .3 : 1));
    R(700, 260, 300, 380, '#2C5E8C', 6, g, { stroke: INK, 'stroke-width': 7 }); PA('M 740 560 L 850 380 L 960 560 Z', '#E9F1F7', g, { stroke: INK, 'stroke-width': 5 }); TX(850, 610, 'SYNERGY', 44, '#FFFFFF', g, { 'font-family': 'Anton, Inter, sans-serif' });
    [[80, 300, '#FFE27A'], [190, 340, '#FF9EC7'], [110, 430, '#9EE7FF']].forEach(([x, y, c], i) => R(x, y, 90, 90, c, 2, g, { stroke: INK, 'stroke-width': 4, transform: `rotate(${(i - 1) * 6} ${x + 45} ${y + 45})` }));
    return g; };
  BG.desk = (p, x = BM.W / 2, y = 1500, o = {}) => { const g = G({}, p); PA(`M ${x - 620} ${y} L ${x + 620} ${y} L ${x + 680} ${y + 90} L ${x - 680} ${y + 90} Z`, '#B88A5A', g, { stroke: INK, 'stroke-width': 8 }); R(x - 680, y + 90, 1360, 600, '#8E6640', 0, g, { stroke: INK, 'stroke-width': 8 });
    if (o.mug !== false) { R(x + 330, y - 90, 80, 96, '#F1EFE9', 10, g, { stroke: INK, 'stroke-width': 6 }); TX(x + 370, y - 32, '#1', 30, INK, g, { 'font-family': 'Anton, Inter, sans-serif' }); }
    return g; };
  /* a monitor whose screen is a group you can swap (screen.g); flip(at, toKey) cross-cuts screens instantly */
  GR.monitor = (p, x, y, s = 1, screens = {}) => { const g = G({ transform: `translate(${x},${y}) scale(${s})` }, p); R(-40, 150, 80, 90, '#3A3D48', 0, g, { stroke: INK, 'stroke-width': 6 }); R(-120, 230, 240, 30, '#3A3D48', 8, g, { stroke: INK, 'stroke-width': 6 });
    R(-230, -170, 460, 330, '#2A2D38', 18, g, { stroke: INK, 'stroke-width': 8 }); const scr = {}; for (const k in screens) { const sg = G({ opacity: 0 }, g); R(-210, -150, 420, 290, '#FFF', 6, sg); screens[k](sg); scr[k] = sg; }
    const mon = { g, scr, flip(at, key) { for (const k in scr) tl().set(scr[k], { opacity: k === key ? 1 : 0 }, at); } }; return mon; };
  GR.SCREENS = {
    spreadsheet: g => { R(-210, -150, 420, 36, '#1F7A45', 0, g); TX(-200, -124, 'Q3_FINAL_final(2).xlsx', 20, '#FFF', g, { 'text-anchor': 'start', 'font-weight': 700 }); for (let r = 0; r < 8; r++) for (let c = 0; c < 4; c++) R(-200 + c * 102, -104 + r * 30, 96, 24, r % 2 ? '#EEF3EE' : '#FFFFFF', 0, g, { stroke: '#BBC8BB', 'stroke-width': 1.5 }); },
    meme: g => { R(-210, -150, 420, 290, '#111', 6, g); CI(0, -10, 90, '#F2B33D', g, { stroke: INK, 'stroke-width': 5 }); PA('M -60 -80 L -40 -130 L -20 -86 M 60 -80 L 40 -130 L 20 -86', '#F2B33D', g, { stroke: INK, 'stroke-width': 5 }); CI(-30, -20, 10, INK, g); CI(30, -20, 10, INK, g); LN('M -20 20 Q 0 36 20 20', INK, 6, g); TX(0, 120, 'CAT FAILS #47', 30, '#FFF', g, { 'font-family': 'Anton, Inter, sans-serif' }); R(-200, 132, 380, 8, '#E33', 2, g); },
    crash: g => { R(-210, -150, 420, 290, '#0E1116', 6, g); TX(-190, -110, 'MOONCOIN', 30, '#FFF', g, { 'text-anchor': 'start', 'font-family': 'Anton, Inter, sans-serif' }); const t = TX(190, -110, '-94%', 34, '#FF3B3B', g, { 'text-anchor': 'end', 'font-family': 'Anton, Inter, sans-serif' });
      for (let i = 0; i < 14; i++) { const up = i < 5, h = 20 + hash(i) * 40, y = -40 + i * 12 + (up ? -i * 14 : 0); R(-190 + i * 27, y, 16, h + (i > 9 ? 40 : 0), up ? '#2ECC71' : '#FF3B3B', 2, g); } },
    off: g => { R(-210, -150, 420, 290, '#0B0B0D', 6, g); LN('M -150 -110 L -60 -20', '#FFFFFF', 6, g, { opacity: .15 }); },
  };
  /* reaction backdrop that pops in BEHIND a character (punchline frames) */
  GR.backdrop = (ch, at, dur, kind = 'burst', o = {}) => { const g = G({ opacity: 0 }, ch.parent); ch.parent.insertBefore(g, ch.place);
    const cx = ch.x, cy = ch.y + 60 * ch.s; if (kind === 'burst') BG.burst(g, cx, cy, o.cols); else if (kind === 'speed') BG.speed(g, cx, cy, o.col); else if (kind === 'rage') BG.burst(g, cx, cy, ['#B3001B', '#E8202F'], 30); else if (kind === 'dread') BG.dread(g, o.col); else BG.void(g, o.col || '#111');
    tl().set(g, { opacity: 1 }, at); tl().set(g, { opacity: 0 }, at + dur); return g; };

  /* =========================== MEME TYPOGRAPHY =========================== */
  GR.meme = (at, dur, text, { pos = 'top', size = 96, color = '#FFFFFF', p = null, y = null } = {}) => { const layer = p || (BM.CAP ? null : BM.S);
    const g = G({ opacity: 0 }, layer || BM.S), lines = wrapW(text.toUpperCase(), 16), yy = y ?? (pos === 'top' ? 230 : BM.H - 330);
    lines.forEach((ln, i) => TX(BM.W / 2, yy + i * size * 1.05, ln, size, color, g, { 'font-family': 'Anton, Impact, sans-serif', stroke: INK, 'stroke-width': size * .14, 'paint-order': 'stroke', 'stroke-linejoin': 'round' }));
    tl().fromTo(g, { opacity: 0, scale: 1.25, transformOrigin: `${BM.W / 2}px ${yy}px` }, { opacity: 1, scale: 1, duration: .14, ease: 'back.out(3)', immediateRender: false }, at); tl().set(g, { opacity: 0 }, at + dur);
    GR._ov = GR._ov || []; GR._ov.push(g); return g; };
  GR.label = (at, dur, text, { x = 70, y = 140, bg = '#FFE14D' } = {}) => { const g = G({ opacity: 0, transform: `translate(${x},${y}) rotate(-3)` }, BM.S), w = text.length * 30 + 60;
    R(0, 0, w, 88, bg, 6, g, { stroke: INK, 'stroke-width': 7 }); TX(w / 2, 64, text.toUpperCase(), 58, INK, g, { 'font-family': 'Anton, Impact, sans-serif' });
    tl().set(g, { opacity: 1 }, at); tl().set(g, { opacity: 0 }, at + dur); GR._ov = GR._ov || []; GR._ov.push(g); return g; };
  const wrapW = (s, n) => { const out = [[]]; let c = 0; for (const w of s.split(' ')) { if (c + w.length > n && out.at(-1).length) { out.push([]); c = 0; } out.at(-1).push(w); c += w.length + 1; } return out.map(l => l.join(' ')); };
  /* keep meme captions above stages (re-append at finish) */
  const _fin = BM.finish; BM.finish = () => { (GR._ov || []).forEach(g => BM.S.appendChild(g)); _fin(); };

  /* =========================== STYLE PACK =========================== */
  if (BM.STYLE) {
    BM.STYLE.grotesque = { name: 'Sarcastic Grotesque (reaction-meme comedy)', font: 'Anton, Impact, sans-serif', weight: 400,
      pal: { bg: '#F2E6CF', ink: INK, a: '#FFD23F', b: '#E8202F', c: '#2B0F3A' },
      composition: 'face-first: 50 %+ of screen time in close-ups / extreme close-ups; busts behind desks; reaction backdrops (burst, speed lines, dread) on punchlines; meme captions top/bottom',
      ease: { move: 'power3.out', snap: 'back.out(2.6)', settle: 'elastic.out(1,.45)' }, timing: 'normal beat 1-2 s -> trigger -> SNAP reaction (0.12 s antic, 0.16 s pop) -> comedic hold 0.6-1.2 s -> hard cut; cuts every 1.2-2.5 s',
      charMode: 'grotesque', transitions: ['flash', 'whip', 'hard cut'], music: ['awkward', 'drama', 'sneaky'],
      sub: { font: 'Anton, Impact, sans-serif', weight: 400, size: 70, fill: '#FFFFFF', hi: '#FFD23F', stroke: INK, sw: 14, y: .86, maxChars: 18, upper: true } };
  }
  GR.LIST = Object.keys(GR.EXPR);
})();
