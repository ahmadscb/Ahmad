import { Container, Graphics, Sprite, Text } from 'pixi.js';
import type { MarketEvent } from '@/core/types';
import { Anchor } from '../anchor';
import { C, clamp01, easeOutBack, easeOutCubic, rand } from '../palette';
import { getAtlas } from '../textures';
import { Thief } from '../Thief';
import { at, flashGlow, shockRing, smoke, sparks } from './bursts';
import type { Effect, FxCtx } from './types';

interface Orb {
  s: Sprite;
  i: number;
  delay: number;
  t: number;
  done: boolean;
  wob: number;
}

/**
 * Liquidity sweep: the thief sneaks along the resting-liquidity level, snatches the orbs of
 * liquidity at the swept wick, stuffs them into the sack and escapes into the unrevealed future
 * (right side of the chart) with a smoke-bomb exit.
 *
 * Timeline (seconds): 0–1.2 approach · 1.2–2.2 grab & drain · 2.2–3.8 escape · 3.8 vanish.
 */
export class SweepFx implements Effect {
  heavy = true;
  private t = 0;
  private thief = new Thief();
  private root = new Container();
  private line = new Graphics();
  private aura = new Sprite(getAtlas().glow);
  private orbs: Orb[] = [];
  private level: Anchor;
  private wick: Anchor;
  private label: Text;
  private escapeX = 0;
  private escapeY = 0;
  private vanished = false;
  private stoleFx = false;
  private dustT = 0;
  private up: boolean;
  private scale: number;

  constructor(
    private ev: MarketEvent,
    ctx: FxCtx,
  ) {
    this.up = ev.dir === 'bear'; // buy-side (above highs) sweep → bearish intent
    this.level = at(ev.index, ev.price);
    this.wick = at(ev.index, ev.price2 ?? ev.price);
    this.scale = Math.max(1.1, Math.min(1.7, ctx.m.height / 440));
    this.thief.scale.set(this.scale);
    const from = Math.max(ev.fromIndex ?? ev.index - 12, ev.index - 40);
    const tex = getAtlas().orb;
    const n = Math.round(14 + 10 * ctx.q);
    for (let k = 0; k < n; k++) {
      const s = new Sprite(tex);
      s.anchor.set(0.5);
      s.blendMode = 'add';
      s.tint = k % 3 ? C.gold : 0xfff1b8;
      s.width = s.height = rand(10, 18);
      this.orbs.push({ s, i: from + ((ev.index - from) * k) / n + rand(-0.3, 0.3), delay: (n - k) * 0.03 + rand(0, 0.1), t: 0, done: false, wob: rand(0, 6) });
      this.root.addChild(s);
    }
    this.label = new Text({
      text: 'LIQUIDITY STOLEN',
      style: { fontFamily: 'Orbitron, Rajdhani, system-ui, sans-serif', fontWeight: '900', fontSize: 15, fill: C.gold, letterSpacing: 2, stroke: { color: 0x1a0d00, width: 4 }, dropShadow: { color: C.gold, blur: 8, distance: 0, alpha: 0.8 } },
    });
    this.label.anchor.set(0.5);
    this.label.alpha = 0;
    this.aura.anchor.set(0.5);
    this.aura.blendMode = 'add';
    this.aura.tint = C.violet;
    this.root.addChild(this.line, this.aura, this.thief, this.label);
    ctx.layer.addChild(this.root);
    ctx.sfx('whoosh', 0.5);
  }

  update(dt: number, ctx: FxCtx): boolean {
    this.t += dt;
    const t = this.t;
    const m = ctx.m;
    const lv = this.level.resolve(m, ctx.frame);
    const wk = this.wick.resolve(m, ctx.frame);
    const th = this.thief;
    const from = this.orbs[0]?.i ?? this.ev.index - 10;
    const fx = m.x(from) ?? lv.sx - 200;
    // Thief always stands on the level line; orbs/labels flip with the sweep side.
    const footY = lv.sy;
    const flip = this.up ? 1 : -1;

    // Level line draining as liquidity is stolen.
    const drain = clamp01((t - 1.2) / 1.0);
    this.line.clear();
    const lineA = t < 3.6 ? 1 - drain * 0.7 : clamp01(1 - (t - 3.6) / 0.4) * 0.3;
    this.line.moveTo(fx, lv.sy).lineTo(lv.sx + m.barW, lv.sy).stroke({ width: 8, color: C.gold, alpha: 0.18 * lineA });
    this.line.moveTo(fx, lv.sy).lineTo(lv.sx + m.barW, lv.sy).stroke({ width: 1.5, color: 0xfff1b8, alpha: 0.85 * lineA });
    // Reach beam from hand to wick tip during the grab.
    if (t > 1.2 && t < 2.2) {
      const k = Math.sin(((t - 1.2) / 1.0) * Math.PI);
      this.line.moveTo(th.x, th.y - 30 * this.scale).lineTo(wk.sx, wk.sy).stroke({ width: 3, color: C.gold, alpha: 0.6 * k });
    }

    if (t < 1.2) {
      th.pose = 'sneak';
      th.speed = 1.3;
      const p = easeOutCubic(t / 1.2);
      th.x = fx + (lv.sx - 14 - fx) * p;
      th.y = footY;
      th.alpha = clamp01(t / 0.25);
    } else if (t < 2.2) {
      th.pose = 'grab';
      th.x = lv.sx - 14;
      th.y = footY;
      th.reach = clamp01((t - 1.2) / 0.25);
      th.reachAngle = Math.atan2(wk.sy - (th.y - 36 * this.scale), wk.sx - th.x);
      if (!this.stoleFx && t > 1.35) {
        this.stoleFx = true;
        ctx.sfx('steal');
        flashGlow(ctx.ps, wk, C.gold, 140, 0.4);
        sparks(ctx.ps, wk, Math.round(30 * ctx.q), C.gold, { speed: 380, gravity: 500 });
      }
    } else {
      // Escape into the unrevealed future on the right.
      th.pose = t < 3.0 ? 'run' : 'leap';
      th.speed = 1;
      const e = t - 2.2;
      this.escapeX = e * e * 160 + e * 260;
      this.escapeY = t < 3.0 ? 0 : -((t - 3.0) * 420 - (t - 3.0) * (t - 3.0) * 120);
      th.x = lv.sx - 14 + this.escapeX;
      th.y = footY + this.escapeY;
      this.dustT += dt;
      if (t < 3.0 && this.dustT > 0.06) {
        this.dustT = 0;
        ctx.ps.emit({ shape: 'smoke', anchor: lv, x: th.x - lv.sx - 6, y: (footY - lv.sy), vx: rand(-80, -20), vy: rand(-40, -10), life: 0.6, size: 14, size1: 40, alpha: 0.45, color: 0x6c5a8c, fadeIn: 0.1 }, 'normal');
        ctx.ps.emit({ shape: 'spark', anchor: lv, x: th.x - lv.sx - 20, y: (footY - lv.sy) - 30, vx: -500, vy: 0, life: 0.25, size: 26, stretch: 4, color: C.violet, alpha: 0.7 });
      }
      if (!this.vanished && t >= 3.75) {
        this.vanished = true;
        for (let k = 0; k < Math.round(16 * ctx.q); k++)
          ctx.ps.emit({ shape: 'smoke', anchor: lv, x: th.x - lv.sx + rand(-10, 10), y: th.y - lv.sy - 24 + rand(-10, 10), vx: rand(-90, 90), vy: rand(-90, 50), drag: 0.05, life: rand(0.8, 1.4), size: 30, size1: 110, alpha: 0.75, color: 0x55407a, fadeIn: 0.05, rot: rand(0, 6) }, 'normal');
        ctx.ps.emit({ shape: 'glow', anchor: lv, x: th.x - lv.sx, y: th.y - lv.sy - 24, life: 0.35, size: 120, size1: 200, color: C.violet });
        ctx.sfx('whoosh', 0.6);
      }
      th.alpha = this.vanished ? 0 : 1;
    }
    this.aura.position.set(th.x, th.y - 28 * this.scale);
    this.aura.width = this.aura.height = (90 + th.loot * 50) * this.scale;
    this.aura.alpha = th.alpha * (0.55 + Math.sin(t * 8) * 0.1);
    this.aura.tint = th.loot > 0.5 ? C.gold : C.violet;
    th.loot = clamp01(this.orbs.filter((o) => o.done).length / this.orbs.length);
    th.update(dt);

    // Orbs lift off the level, then curve into the sack.
    const bagX = th.x - 13 * this.scale;
    const bagY = th.y - 30 * this.scale;
    for (const o of this.orbs) {
      const ox = m.x(o.i) ?? lv.sx;
      if (t < 1.25 + o.delay) {
        o.s.x = ox;
        o.s.y = lv.sy - (4 + Math.sin(t * 4 + o.wob) * 3) * flip;
        o.s.alpha = clamp01(t / 0.4) * (0.6 + Math.sin(t * 7 + o.wob) * 0.3);
      } else if (!o.done) {
        o.t += dt / 0.45;
        const p = easeOutCubic(o.t);
        const cx = (ox + bagX) / 2;
        const cy = Math.min(lv.sy, bagY) - 60;
        const u = 1 - p;
        o.s.x = u * u * ox + 2 * u * p * cx + p * p * bagX;
        o.s.y = u * u * lv.sy + 2 * u * p * cy + p * p * bagY;
        o.s.alpha = 1;
        if (o.t >= 1) {
          o.done = true;
          o.s.alpha = 0;
          ctx.sfx('tick', 0.6);
          ctx.ps.emit({ shape: 'star', anchor: lv, x: bagX - lv.sx, y: bagY - lv.sy, life: 0.3, size: 40, size1: 10, color: C.gold });
        }
      }
    }

    // Floating callout above the swept wick.
    const lt = t - 1.5;
    if (lt > 0) {
      this.label.alpha = lt < 2.4 ? clamp01(lt / 0.2) : clamp01(1 - (lt - 2.4) / 0.4);
      const s = easeOutBack(clamp01(lt / 0.35));
      this.label.scale.set(s);
      this.label.x = wk.sx;
      this.label.y = wk.sy - (40 + lt * 10) * flip;
    }
    if (t > 1.35 && t < 1.4) shockRing(ctx.ps, wk, C.gold, 140, 0.5);
    return t < 4.3;
  }

  destroy() {
    this.root.destroy({ children: true });
  }
}
