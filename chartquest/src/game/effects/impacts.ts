import { Graphics } from 'pixi.js';
import type { Candle, MarketEvent } from '@/core/types';
import { Anchor } from '../anchor';
import { C, clamp01, easeOutCubic, rand } from '../palette';
import { at, embers, fireball, flashGlow, shockRing, smoke, sparks } from './bursts';
import type { Effect, FxCtx } from './types';

/** Sudden price spike: fireball, sparks, smoke column, shockwave and lingering flames. */
export class SpikeFx implements Effect {
  heavy = true;
  private t = 0;
  private a: Anchor;
  private burn = 0;
  constructor(
    private ev: MarketEvent,
    ctx: FxCtx,
  ) {
    this.a = at(ev.index, ev.price);
    const a = this.a.resolve(ctx.m, ctx.frame);
    const q = ctx.q;
    ctx.sfx('boom');
    ctx.shake(0.75);
    ctx.flash(C.fire, 0.22);
    flashGlow(ctx.ps, a, C.fireCore, 320, 0.5);
    shockRing(ctx.ps, a, C.fire, 420, 0.8);
    fireball(ctx.ps, a, Math.round(46 * q), 1.1);
    sparks(ctx.ps, a, Math.round(110 * q), C.fire, { speed: 900, spread: Math.PI, gravity: 900, life: 1.3 });
    smoke(ctx.ps, a, Math.round(18 * q), 0x2b2028, 1.3);
    embers(ctx.ps, a, Math.round(40 * q), C.fire, 50);
  }
  update(dt: number, ctx: FxCtx) {
    this.t += dt;
    this.burn += dt;
    // Lingering flames licking the candle extreme.
    if (this.t < 1.6 && this.burn > 0.03) {
      this.burn = 0;
      const a = this.a.resolve(ctx.m, ctx.frame);
      const f = 1 - this.t / 1.6;
      ctx.ps.emit({ shape: 'flame', anchor: a, x: rand(-10, 10), y: rand(-4, 4), vx: rand(-20, 20), vy: rand(-180, -90), ay: -60, life: rand(0.4, 0.8), size: 30 * f + 10, size1: 70 * f + 10, color: C.fireCore, color1: 0xff2200, rot: rand(-0.3, 0.3) });
    }
    return this.t < 1.7;
  }
  destroy() {}
}

/**
 * Trendline break: an electric fracture crawls along the line to the break point, the line
 * shatters into fragments and arcs keep crackling for a moment.
 */
export class TrendlineBreakFx implements Effect {
  heavy = true;
  private t = 0;
  private g = new Graphics();
  private a: Anchor;
  private seed = 0;
  private bolts: number[][] = [];
  constructor(
    private ev: MarketEvent,
    ctx: FxCtx,
  ) {
    this.a = at(ev.index, ev.price);
    ctx.layer.addChild(this.g);
    ctx.sfx('zap');
    ctx.sfx('crack', 0.6);
    ctx.shake(0.35);
    const a = this.a.resolve(ctx.m, ctx.frame);
    flashGlow(ctx.ps, a, C.cyan, 200, 0.4);
    for (let i = 0; i < Math.round(26 * ctx.q); i++) {
      const ang = rand(0, Math.PI * 2);
      const v = rand(200, 620);
      ctx.ps.emit({ shape: 'shard', anchor: a, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 120, ay: 1100, life: rand(0.8, 1.4), size: rand(8, 18), color: 0xd8f6ff, color1: C.cyan, spin: rand(-14, 14), rot: rand(0, 6) }, 'normal');
    }
    sparks(ctx.ps, a, Math.round(50 * ctx.q), C.cyan, { speed: 600, gravity: 600 });
  }
  private lineY(i: number, m: FxCtx['m']) {
    const L = this.ev.line!;
    const slope = (L.p2 - L.p1) / (L.i2 - L.i1);
    return m.y(L.p1 + slope * (i - L.i1));
  }
  update(dt: number, ctx: FxCtx) {
    this.t += dt;
    const t = this.t;
    const m = ctx.m;
    const L = this.ev.line;
    const g = this.g.clear();
    if (!L) return t < 1;
    const crawl = easeOutCubic(clamp01(t / 0.35));
    const i0 = Math.max(L.i1, this.ev.index - 30);
    const iEnd = i0 + (this.ev.index + 0.5 - i0) * crawl;
    this.seed += dt;
    if (this.seed > 0.045 || this.bolts.length === 0) {
      this.seed = 0;
      this.bolts = [];
      for (let b = 0; b < 3; b++) {
        const pts: number[] = [];
        const steps = 22;
        for (let s = 0; s <= steps; s++) {
          const i = i0 + ((iEnd - i0) * s) / steps;
          const x = m.x(i);
          const y = this.lineY(i, m);
          if (x === null || y === null) continue;
          const j = s === 0 || s === steps ? 0 : rand(-1, 1) * (6 + b * 4);
          pts.push(x, y + j);
        }
        this.bolts.push(pts);
      }
    }
    const fade = t < 0.6 ? 1 : clamp01(1 - (t - 0.6) / 0.6);
    for (const [k, pts] of this.bolts.entries()) {
      if (pts.length < 4) continue;
      g.moveTo(pts[0], pts[1]);
      for (let p = 2; p < pts.length; p += 2) g.lineTo(pts[p], pts[p + 1]);
      g.stroke({ width: k === 0 ? 3 : 1.5, color: k === 0 ? C.white : C.cyan, alpha: (k === 0 ? 0.95 : 0.6) * fade * (0.6 + Math.random() * 0.4) });
      g.moveTo(pts[0], pts[1]);
      for (let p = 2; p < pts.length; p += 2) g.lineTo(pts[p], pts[p + 1]);
      g.stroke({ width: 12, color: C.cyan, alpha: 0.12 * fade });
    }
    // Branching arcs at the fracture point.
    const a = this.a.resolve(m, ctx.frame);
    if (crawl >= 1 && t < 1.1) {
      for (let k = 0; k < 4; k++) {
        let x = a.sx;
        let y = a.sy;
        g.moveTo(x, y);
        const ang = rand(0, Math.PI * 2);
        for (let s = 0; s < 5; s++) {
          x += Math.cos(ang + rand(-0.8, 0.8)) * rand(6, 14);
          y += Math.sin(ang + rand(-0.8, 0.8)) * rand(6, 14);
          g.lineTo(x, y);
        }
        g.stroke({ width: 1.5, color: 0xe6fbff, alpha: 0.8 * fade });
      }
    }
    return t < 1.25;
  }
  destroy() {
    this.g.destroy();
  }
}

/** Breakout: energy erupts through the arena boundary as a beam with a particle stream. */
export class BreakoutFx implements Effect {
  heavy = true;
  private t = 0;
  private g = new Graphics();
  private a: Anchor;
  private emitT = 0;
  constructor(
    private ev: MarketEvent,
    ctx: FxCtx,
  ) {
    this.a = at(ev.index, ev.price);
    ctx.layer.addChild(this.g);
    const bull = ev.dir === 'bull';
    const col = bull ? C.bull : C.bear;
    const a = this.a.resolve(ctx.m, ctx.frame);
    ctx.sfx('boom', 0.7);
    ctx.sfx('whoosh');
    ctx.shake(0.45);
    ctx.flash(col, 0.15);
    flashGlow(ctx.ps, a, col, 300);
    shockRing(ctx.ps, a, col, 300);
    for (let i = 0; i < Math.round(30 * ctx.q); i++) {
      const v = rand(300, 800);
      const ang = (bull ? -Math.PI / 2 : Math.PI / 2) + rand(-0.9, 0.9);
      ctx.ps.emit({ shape: 'shard', anchor: a, x: rand(-30, 30), vx: Math.cos(ang) * v, vy: Math.sin(ang) * v, ay: 900, life: rand(0.7, 1.3), size: rand(8, 16), color: C.white, color1: col, spin: rand(-12, 12) }, 'normal');
    }
  }
  update(dt: number, ctx: FxCtx) {
    this.t += dt;
    const t = this.t;
    const bull = this.ev.dir === 'bull';
    const col = bull ? C.bull : C.bear;
    const a = this.a.resolve(ctx.m, ctx.frame);
    const g = this.g.clear();
    const life = clamp01(1 - t / 1.2);
    const h = 260 * easeOutCubic(clamp01(t / 0.25));
    const w = Math.max(10, ctx.m.barW * 2.5) * (0.5 + life * 0.8);
    const y0 = a.sy;
    const y1 = bull ? y0 - h : y0 + h;
    for (let k = 0; k < 5; k++) g.rect(a.sx - (w * (1 + k * 0.7)) / 2, Math.min(y0, y1), w * (1 + k * 0.7), h).fill({ color: col, alpha: (0.25 - k * 0.045) * life });
    g.rect(a.sx - 2, Math.min(y0, y1), 4, h).fill({ color: C.white, alpha: 0.8 * life });
    this.emitT += dt;
    if (t < 0.9 && this.emitT > 0.016) {
      this.emitT = 0;
      for (let k = 0; k < 3; k++)
        ctx.ps.emit({ shape: 'spark', anchor: a, x: rand(-w / 2, w / 2), vx: rand(-30, 30), vy: (bull ? -1 : 1) * rand(500, 1000), drag: 0.02, life: rand(0.3, 0.6), size: rand(14, 26), stretch: 3, align: true, color: C.white, color1: col });
    }
    return t < 1.3;
  }
  destroy() {
    this.g.destroy();
  }
}

/** Generic formation pulse for zones (FVG portal opening, pool forming, arena forming). */
export class PulseFx implements Effect {
  private t = 0;
  private a: Anchor;
  constructor(
    ev: MarketEvent,
    ctx: FxCtx,
    private color: number,
    kind: 'portal' | 'pool' | 'arena',
  ) {
    const mid = ev.price2 !== undefined ? (ev.price + ev.price2) / 2 : ev.price;
    this.a = at(ev.index, mid);
    const a = this.a.resolve(ctx.m, ctx.frame);
    ctx.sfx(kind === 'portal' ? 'portal' : kind === 'pool' ? 'chime' : 'rumble', kind === 'arena' ? 0.5 : 0.7);
    shockRing(ctx.ps, a, color, kind === 'arena' ? 360 : 180, 0.7);
    for (let i = 0; i < Math.round(24 * ctx.q); i++) {
      const ang = rand(0, Math.PI * 2);
      ctx.ps.emit({ shape: 'orb', anchor: a, x: Math.cos(ang) * 40, y: Math.sin(ang) * 14, vx: -Math.sin(ang) * 120, vy: Math.cos(ang) * 40 - 30, drag: 0.03, life: rand(0.8, 1.4), size: rand(8, 16), color: C.white, color1: color });
    }
  }
  update(dt: number) {
    this.t += dt;
    return this.t < 0.2;
  }
  destroy() {}
}

/** Strong trend ignition: a comet surges along the closes from the trend origin to the head. */
export class TrendIgniteFx implements Effect {
  private t = 0;
  private emitT = 0;
  constructor(
    private ev: MarketEvent,
    private candles: Candle[],
    ctx: FxCtx,
  ) {
    ctx.sfx('whoosh', 0.8);
    if (ev.dir === 'bear') ctx.sfx('rumble', 0.4);
  }
  update(dt: number, ctx: FxCtx) {
    this.t += dt;
    const p = easeOutCubic(clamp01(this.t / 0.8));
    const i0 = this.ev.fromIndex ?? this.ev.index - 10;
    const fi = i0 + (this.ev.index - i0) * p;
    const lo = Math.floor(fi);
    const hi = Math.min(this.candles.length - 1, lo + 1);
    const f = fi - lo;
    const price = this.candles[lo].close * (1 - f) + this.candles[hi].close * f;
    const a = new Anchor(fi, price);
    a.resolve(ctx.m, ctx.frame);
    const bull = this.ev.dir === 'bull';
    const col = bull ? C.bull : C.fire;
    this.emitT += dt;
    if (this.t < 0.85 && this.emitT > 0.012) {
      this.emitT = 0;
      ctx.ps.emit({ shape: 'glow', anchor: a, life: 0.35, size: 60, size1: 20, color: col, alpha: 0.9 });
      for (let k = 0; k < 2; k++)
        ctx.ps.emit(
          bull
            ? { shape: 'spark', anchor: a, vx: rand(-120, 60), vy: rand(-200, 60), drag: 0.03, life: rand(0.4, 0.8), size: rand(8, 16), stretch: 2, align: true, color: C.white, color1: C.bull }
            : { shape: 'flame', anchor: a, vx: rand(-60, 60), vy: rand(-160, -60), ay: -100, life: rand(0.4, 0.7), size: rand(20, 34), size1: 50, color: C.fireCore, color1: 0xff1e00, rot: rand(-0.3, 0.3) },
        );
    }
    if (this.t >= 0.8 && this.t - dt < 0.8) flashGlow(ctx.ps, a, col, 160, 0.5);
    return this.t < 0.9;
  }
  destroy() {}
}
