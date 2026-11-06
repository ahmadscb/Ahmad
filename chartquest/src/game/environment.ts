import { Container, Graphics, Sprite } from 'pixi.js';
import { C, rand } from './palette';
import { getAtlas } from './textures';

const lerpC = (a: number, b: number, t: number) => {
  const ch = (s: number) => ((a >> s) & 255) + ((((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (Math.round(ch(16)) << 16) | (Math.round(ch(8)) << 8) | Math.round(ch(0));
};

/**
 * The world behind the candles (rendered on a canvas BEHIND the transparent chart):
 * drifting nebula light, a perspective energy floor and ambient motes whose palette and motion
 * follow the market regime (−1 bear realm … +1 bull realm).
 */
export class Environment {
  readonly root = new Container();
  private nebula: { s: Sprite; x: number; y: number; r: number; ph: number; sp: number }[] = [];
  private floor = new Graphics();
  private motes: { s: Sprite; x: number; y: number; v: number; ph: number }[] = [];
  private vignette = new Graphics();
  mix = 0;
  target = 0;
  private wave = 0; // transition flash 1→0
  private t = 0;

  constructor() {
    const tex = getAtlas();
    const nebLayer = new Container();
    nebLayer.blendMode = 'add';
    for (let i = 0; i < 7; i++) {
      const s = new Sprite(tex.glow);
      s.anchor.set(0.5);
      this.nebula.push({ s, x: rand(0.05, 0.95), y: rand(0.1, 0.9), r: rand(0.45, 0.9), ph: rand(0, 6), sp: rand(0.03, 0.08) });
      nebLayer.addChild(s);
    }
    const moteLayer = new Container();
    moteLayer.blendMode = 'add';
    for (let i = 0; i < 70; i++) {
      const s = new Sprite(i % 4 ? tex.ember : tex.star);
      s.anchor.set(0.5);
      this.motes.push({ s, x: Math.random(), y: Math.random(), v: rand(0.3, 1), ph: rand(0, 6) });
      moteLayer.addChild(s);
    }
    this.floor.blendMode = 'add';
    this.root.addChild(nebLayer, this.floor, moteLayer, this.vignette);
  }

  setRegime(dir: 'bull' | 'bear' | null, instant: boolean) {
    this.target = dir === 'bull' ? 1 : dir === 'bear' ? -1 : 0;
    if (instant) this.mix = this.target;
    else this.wave = 1;
  }

  update(dt: number, w: number, h: number, q: number) {
    this.t += dt;
    this.mix += (this.target - this.mix) * Math.min(1, dt * 1.6);
    this.wave = Math.max(0, this.wave - dt * 0.8);
    const m = this.mix;
    const bullT = Math.max(0, m);
    const bearT = Math.max(0, -m);
    const neutralA = 0x3a2a8c;
    const neutralB = 0x0d4a7a;
    const colA = lerpC(lerpC(neutralA, 0x0f8a5f, bullT), 0x9a1530, bearT);
    const colB = lerpC(lerpC(neutralB, 0x0a6a7a, bullT), 0x8a3a0a, bearT);
    this.nebula.forEach((n, i) => {
      const s = n.s;
      s.x = (n.x + Math.sin(this.t * n.sp + n.ph) * 0.06) * w;
      s.y = (n.y + Math.cos(this.t * n.sp * 0.8 + n.ph) * 0.05) * h;
      s.width = s.height = n.r * Math.max(w, h) * (1 + this.wave * 0.25);
      s.tint = i % 2 ? colA : colB;
      s.alpha = 0.22 + this.wave * 0.25;
    });

    // Perspective floor: horizon at 62% height, lines converge to a vanishing point.
    const g = this.floor.clear();
    const hy = h * 0.62;
    const vx = w * 0.5;
    const lineCol = lerpC(lerpC(0x5a4dff, C.bull, bullT), C.bear, bearT);
    const scroll = (this.t * 0.25) % 1;
    for (let k = 0; k < 14; k++) {
      const z = (k + scroll) / 14;
      const y = hy + (h - hy) * z * z;
      g.moveTo(0, y).lineTo(w, y).stroke({ width: 1, color: lineCol, alpha: (0.02 + z * 0.07) * Math.min(1, z * 3) });
    }
    for (let k = -12; k <= 12; k++) {
      g.moveTo(vx + k * 18, hy).lineTo(vx + k * w * 0.16, h).stroke({ width: 1, color: lineCol, alpha: 0.045 });
    }
    g.rect(0, hy - 1, w, 2).fill({ color: lineCol, alpha: this.wave * 0.35 });

    // Motes: bull realm rises like spores of light, bear realm rains embers/ash.
    const n = Math.round(this.motes.length * q);
    this.motes.forEach((p, i) => {
      p.s.visible = i < n;
      if (i >= n) return;
      const dir = m >= 0 ? -1 : 1;
      p.y += dir * p.v * dt * (0.03 + Math.abs(m) * 0.05);
      p.x += Math.sin(this.t * 0.7 + p.ph) * dt * 0.006;
      if (p.y < -0.05) p.y = 1.05;
      if (p.y > 1.05) p.y = -0.05;
      p.s.x = p.x * w;
      p.s.y = p.y * h;
      const sz = (i % 4 ? 6 : 14) * p.v;
      p.s.width = p.s.height = sz;
      p.s.tint = m >= 0 ? lerpC(0x9fb4ff, C.bull, bullT) : lerpC(0x9fb4ff, C.fire, bearT);
      p.s.alpha = 0.25 + 0.35 * Math.abs(Math.sin(this.t * 1.5 + p.ph));
    });

    this.vignette.clear();
    const v = this.vignette;
    for (let k = 0; k < 6; k++) {
      const pad = k * 18;
      v.rect(pad, pad, w - pad * 2, h - pad * 2).stroke({ width: 18, color: 0x000000, alpha: 0.12 });
    }
  }
}
