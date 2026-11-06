import { Container, Graphics, Sprite } from 'pixi.js';
import type { MarketEvent } from '@/core/types';
import { Anchor } from '../anchor';
import { C, clamp01, dirColor, easeOutCubic, rand } from '../palette';
import { getAtlas } from '../textures';
import { at, flashGlow, shockRing, smoke, sparks } from './bursts';
import type { Effect, FxCtx } from './types';

interface Block {
  s: Sprite;
  i: number; // fractional candle index of its home position
  row: number; // pixel row offset from the level
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  spin: number;
  delay: number;
  free: boolean;
}

/**
 * Bullish BOS: a resistance wall materialises on the broken level, cracks at the breakout candle
 * and its blocks are blasted up and outward.
 * Bearish BOS: the support floor cracks and collapses block-by-block (domino from the break),
 * falling under gravity with dust.
 */
export class StructureBreakFx implements Effect {
  heavy = true;
  private t = 0;
  private root = new Container();
  private glow = new Graphics();
  private cracks = new Graphics();
  private blocks: Block[] = [];
  private exploded = false;
  private impact: Anchor;
  private bull: boolean;
  private crackPaths: number[][] = [];

  constructor(
    private ev: MarketEvent,
    ctx: FxCtx,
  ) {
    this.bull = ev.dir === 'bull';
    this.impact = at(ev.index, ev.price);
    const tex = getAtlas().block;
    const start = Math.max(ev.fromIndex ?? ev.index - 10, ev.index - 14);
    const span = ev.index + 1.5 - start;
    const barW = Math.max(ctx.m.barW, 3);
    const size = Math.max(13, Math.min(22, barW * 1.8));
    const cols = Math.max(6, Math.min(36, Math.round((span * barW) / size)));
    const rows = 3;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const s = new Sprite(tex);
        s.anchor.set(0.5);
        s.width = s.height = size * 0.96;
        const steel = this.bull ? [0x7fe9ff, 0x9fb8ff, 0x6fd8c8][(c + r) % 3] : [0xff8a6a, 0xd0604e, 0xffa07a][(c + r) % 3];
        s.tint = steel;
        s.alpha = 0;
        const dist = Math.abs(cols - 1 - c);
        this.blocks.push({
          s,
          i: start + (c + 0.5) * (span / cols),
          row: this.bull ? (r - 1.5) * size : (r - 0.5) * size,
          ox: 0,
          oy: 0,
          vx: 0,
          vy: 0,
          spin: 0,
          delay: this.bull ? dist * 0.004 : dist * 0.035 + r * 0.04,
          free: false,
        });
        this.root.addChild(s);
      }
    }
    // Pre-compute jagged crack paths radiating from the impact point.
    for (let k = 0; k < 7; k++) {
      const pts: number[] = [0, 0];
      let x = 0;
      let y = 0;
      const ang = Math.PI + rand(-0.9, 0.9) + (k % 2 ? 0 : Math.PI * 0.9);
      for (let j = 0; j < 6; j++) {
        x += Math.cos(ang + rand(-0.6, 0.6)) * rand(8, 18);
        y += Math.sin(ang + rand(-0.6, 0.6)) * rand(4, 10);
        pts.push(x, y);
      }
      this.crackPaths.push(pts);
    }
    this.root.addChild(this.cracks);
    ctx.layer.addChild(this.glow, this.root);
    ctx.sfx(this.bull ? 'crack' : 'rumble');
  }

  update(dt: number, ctx: FxCtx): boolean {
    this.t += dt;
    const t = this.t;
    const m = ctx.m;
    const imp = this.impact.resolve(m, ctx.frame);
    const ly = imp.sy;
    const build = clamp01(t / 0.3);
    const BREAK = 0.42;

    if (!this.exploded && t >= BREAK) {
      this.exploded = true;
      ctx.shake(this.bull ? 0.55 : 0.5);
      ctx.sfx('boom', 0.8);
      ctx.flash(dirColor(this.ev.dir), 0.12);
      flashGlow(ctx.ps, imp, this.bull ? C.bull : C.bear, 260);
      shockRing(ctx.ps, imp, this.bull ? C.bull : C.bear, 340);
      sparks(ctx.ps, imp, Math.round(70 * ctx.q), this.bull ? C.bull : C.fire, {
        dir: this.bull ? -Math.PI / 2 : Math.PI / 2,
        spread: 1.3,
        speed: 700,
      });
      if (!this.bull) smoke(ctx.ps, imp, Math.round(14 * ctx.q), 0x3a2a2a, 1.2);
      for (const b of this.blocks) {
        const bx = (m.x(b.i) ?? 0) - imp.sx;
        if (this.bull) {
          const d = Math.max(20, Math.abs(bx));
          const power = 900 / Math.sqrt(d);
          b.vx = (bx >= 0 ? 1 : -1) * rand(60, 220) + rand(-80, 80) + (bx / d) * power * 4;
          b.vy = -rand(260, 620) * (0.6 + 40 / d) + b.row * 4;
        } else {
          b.vx = rand(-40, 40);
          b.vy = rand(0, 60);
        }
        b.spin = rand(-9, 9);
      }
    }

    // Draw the energy seam along the level.
    this.glow.clear();
    const xs = m.x(this.blocks[0].i) ?? imp.sx;
    const xe = imp.sx + m.barW;
    const fade = this.exploded ? clamp01(1 - (t - BREAK) / 0.9) : build;
    if (fade > 0) {
      const col = this.bull ? C.bull : C.bear;
      this.glow.moveTo(xs, ly).lineTo(xe, ly).stroke({ width: 10, color: col, alpha: 0.18 * fade });
      this.glow.moveTo(xs, ly).lineTo(xe, ly).stroke({ width: 2, color: C.white, alpha: 0.8 * fade });
    }

    // Crack lines spread across the impact face before it breaks.
    this.cracks.clear();
    if (t > 0.18 && t < BREAK + 0.25) {
      const grow = clamp01((t - 0.18) / 0.22);
      const a = this.exploded ? clamp01(1 - (t - BREAK) / 0.25) : 1;
      for (const p of this.crackPaths) {
        const n = Math.max(2, Math.floor((p.length / 2) * grow));
        this.cracks.moveTo(imp.sx + p[0], ly + p[1]);
        for (let j = 1; j < n; j++) this.cracks.lineTo(imp.sx + p[j * 2], ly + p[j * 2 + 1]);
      }
      this.cracks.stroke({ width: 2, color: C.white, alpha: 0.9 * a });
    }

    let alive = false;
    for (const b of this.blocks) {
      const hx = (m.x(b.i) ?? imp.sx) ;
      if (this.exploded && t - BREAK > b.delay) {
        if (!b.free && !this.bull) smokeKick(ctx, b, imp, hx);
        b.free = true;
      }
      if (b.free) {
        b.vy += (this.bull ? 1500 : 1900) * dt;
        b.vx *= Math.pow(0.99, dt * 60);
        b.ox += b.vx * dt;
        b.oy += b.vy * dt;
        b.s.rotation += b.spin * dt;
      }
      b.s.x = hx + b.ox;
      b.s.y = ly + b.row + b.oy;
      const life = b.free ? clamp01(1 - (t - BREAK - b.delay) / 1.5) : easeOutCubic(build);
      b.s.alpha = life;
      if (life > 0.01) alive = true;
    }
    return alive || t < BREAK + 0.3;
  }

  destroy() {
    this.root.destroy({ children: true });
    this.glow.destroy();
  }
}

function smokeKick(ctx: FxCtx, b: Block, imp: Anchor, hx: number) {
  if (Math.random() > 0.25 * ctx.q) return;
  ctx.ps.emit(
    {
      shape: 'smoke',
      anchor: imp,
      x: hx - imp.sx,
      y: b.row,
      vx: rand(-30, 30),
      vy: rand(-40, 10),
      life: 1.2,
      size: 30,
      size1: 90,
      alpha: 0.5,
      color: 0x4a3a36,
      fadeIn: 0.1,
    },
    'normal',
  );
}

/**
 * CHoCH: a dramatic world transition. A radial shockwave and a full-height energy wave sweep the
 * arena from the break candle while the environment re-colours to the new regime.
 */
export class ChochFx implements Effect {
  heavy = true;
  private t = 0;
  private g = new Graphics();
  private a: Anchor;
  constructor(
    private ev: MarketEvent,
    ctx: FxCtx,
  ) {
    this.a = at(ev.index, ev.price);
    ctx.layer.addChild(this.g);
    const bull = ev.dir === 'bull';
    ctx.sfx('rise');
    ctx.sfx('boom', 0.7);
    ctx.shake(0.7);
    ctx.flash(bull ? C.bull : C.bear, 0.28);
    ctx.setEnv(ev.dir);
    ctx.banner('CHANGE OF CHARACTER', bull ? 'THE BULLS SEIZE CONTROL' : 'THE BEARS SEIZE CONTROL', bull ? C.bull : C.bear);
    const a = this.a.resolve(ctx.m, ctx.frame);
    flashGlow(ctx.ps, a, bull ? C.bull : C.bear, 420, 0.8);
    shockRing(ctx.ps, a, bull ? C.bull : C.bear, 900, 1.2);
    for (let i = 0; i < Math.round(36 * ctx.q); i++) {
      const ang = (i / 36) * Math.PI * 2;
      ctx.ps.emit({ shape: 'spark', anchor: a, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, drag: 0.04, life: 0.9, size: 40, stretch: 4, align: true, color: C.white, color1: bull ? C.bull : C.bear });
    }
    sparks(ctx.ps, a, Math.round(60 * ctx.q), bull ? C.bull : C.bear, { speed: 800, gravity: bull ? -300 : 900, life: 1.4 });
  }
  update(dt: number, ctx: FxCtx) {
    this.t += dt;
    const t = this.t;
    const a = this.a.resolve(ctx.m, ctx.frame);
    const col = this.ev.dir === 'bull' ? C.bull : C.bear;
    const g = this.g.clear();
    // Expanding wavefront rings.
    for (let k = 0; k < 3; k++) {
      const tt = t - k * 0.12;
      if (tt <= 0 || tt > 1.3) continue;
      const r = easeOutCubic(tt / 1.3) * Math.max(ctx.m.width, ctx.m.height) * 1.2;
      g.circle(a.sx, a.sy, r).stroke({ width: 26 * (1 - tt / 1.3) + 2, color: col, alpha: 0.35 * (1 - tt / 1.3) });
      g.circle(a.sx, a.sy, r).stroke({ width: 2, color: C.white, alpha: 0.7 * (1 - tt / 1.3) });
    }
    // Vertical energy curtain sweeping across the pane from the break.
    const sweep = clamp01((t - 0.1) / 1.1);
    if (sweep > 0 && sweep < 1) {
      const w = ctx.m.width;
      const x = a.sx + (w - a.sx + 200) * easeOutCubic(sweep) * (this.ev.dir === 'bull' ? 1 : 1);
      const xl = a.sx - (a.sx + 200) * easeOutCubic(sweep);
      for (const xx of [x, xl]) {
        for (let k = 0; k < 6; k++) g.rect(xx - 4 - k * 10, 0, 10, ctx.m.height).fill({ color: col, alpha: (0.22 - k * 0.035) * (1 - sweep) });
        g.rect(xx - 1.5, 0, 3, ctx.m.height).fill({ color: C.white, alpha: 0.6 * (1 - sweep) });
      }
    }
    return t < 1.6;
  }
  destroy() {
    this.g.destroy();
  }
}
