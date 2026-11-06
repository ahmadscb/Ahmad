import { BlurFilter, Container, Graphics, Text } from 'pixi.js';
import type { Candle, EventKind, MarketEvent } from '@/core/types';
import { Anchor, type ChartMapper } from './anchor';
import { C, clamp01, easeOutBack, rand } from './palette';
import type { ParticleSystem } from './particles';

/**
 * Persistent, state-derived overlays. Re-drawn every frame purely from (events visible at the
 * replay head, chart mapping), so seeking/zooming never desynchronises them:
 * FVG portals, liquidity pools, consolidation arenas, trend energy trails, structure tags.
 */
export class PersistentLayer {
  readonly root = new Container();
  private glowG = new Graphics(); // blurred additive pass (bloom-lite)
  private coreG = new Graphics(); // crisp additive pass
  private fillG = new Graphics(); // normal-blend fills
  private labels = new Map<string, Text>();
  private labelLayer = new Container();
  private blur = new BlurFilter({ strength: 6, quality: 2 });
  private born = new Map<string, number>();
  private emitClock = 0;
  bloom = true;
  enabled: Record<string, boolean> = {};

  constructor() {
    const glowWrap = new Container();
    glowWrap.addChild(this.glowG);
    glowWrap.blendMode = 'add';
    glowWrap.filters = [this.blur];
    this.coreG.blendMode = 'add';
    this.root.addChild(this.fillG, glowWrap, this.coreG, this.labelLayer);
  }

  /** Mark when an event appeared, to drive its intro animation. `instant` skips the intro. */
  markBorn(id: string, now: number, instant: boolean) {
    if (!this.born.has(id)) this.born.set(id, instant ? -1e9 : now);
  }
  resetBorn() {
    this.born.clear();
  }

  setBloom(on: boolean) {
    this.bloom = on;
    (this.glowG.parent as Container).filters = on ? [this.blur] : [];
  }

  draw(now: number, dt: number, m: ChartMapper, frame: number, candles: Candle[], visible: MarketEvent[], ps: ParticleSystem, playing: boolean, q: number) {
    const gG = this.glowG.clear();
    const cG = this.coreG.clear();
    const fG = this.fillG.clear();
    const head = m.head;
    const used = new Set<string>();
    this.emitClock += dt;
    const emit = playing && this.emitClock > 0.05;
    if (emit) this.emitClock = 0;
    const W = m.width;

    const on = (k: EventKind) => this.enabled[k] !== false;
    const age = (id: string) => now - (this.born.get(id) ?? -1e9);

    // Keep the arena readable: only the 5 most recent live portals per side stay open.
    const liveFvg = new Set<string>();
    for (const d of ['bull', 'bear'] as const)
      visible
        .filter((e) => e.kind === 'fvg' && e.dir === d && (e.endIndex === undefined || e.endIndex > head - 6) && head - e.index < 160)
        .slice(-5)
        .forEach((e) => liveFvg.add(e.id));

    for (const ev of visible) {
      const ended = ev.endIndex !== undefined && ev.endIndex <= head;
      const endI = ended ? ev.endIndex! : head;
      switch (ev.kind) {
        case 'fvg': {
          if (!on('fvg') || !liveFvg.has(ev.id)) break;
          // Portal stays open until mitigated; fades out over 6 bars afterwards.
          const fade = ended ? clamp01(1 - (head - ev.endIndex!) / 6) : 1;
          if (fade <= 0) break;
          const x0 = m.x(ev.index - 0.5);
          const x1 = m.x(endI + 0.5);
          const yT = m.y(ev.price);
          const yB = m.y(ev.price2!);
          if (x0 === null || x1 === null || yT === null || yB === null || x1 < 0 || x0 > W) break;
          const intro = easeOutBack(clamp01(age(ev.id) / 0.6));
          const mid = (yT + yB) / 2;
          const h = Math.max(2, (yB - yT) * intro);
          const top = mid - h / 2;
          const col = ev.dir === 'bull' ? C.cyan : C.violet;
          const pulse = 0.75 + Math.sin(now * 3 + ev.index) * 0.25;
          fG.rect(x0, top, x1 - x0, h).fill({ color: col, alpha: 0.1 * fade });
          // Energy striations flowing through the gap.
          for (let k = 1; k < 4; k++) {
            const yy = top + (h * k) / 4;
            cG.moveTo(x0, yy).lineTo(x1, yy).stroke({ width: 1, color: col, alpha: 0.12 * fade * pulse });
          }
          gG.rect(x0, top, x1 - x0, h).stroke({ width: 4, color: col, alpha: 0.55 * fade * pulse });
          cG.rect(x0, top, x1 - x0, h).stroke({ width: 1.2, color: 0xe8fbff, alpha: 0.7 * fade });
          // Spinning portal ring at the origin.
          const rx = Math.max(5, Math.min(18, m.barW * 1.2));
          for (let k = 0; k < 3; k++) {
            const r = (now * 2 + k * 2.1) % (Math.PI * 2);
            gG.ellipse(x0, mid, rx * (0.6 + 0.4 * Math.abs(Math.cos(r))), h / 2 + 3).stroke({ width: 2.5, color: col, alpha: 0.6 * fade });
          }
          cG.ellipse(x0, mid, rx * 0.5, h / 2).stroke({ width: 1.5, color: C.white, alpha: 0.85 * fade });
          if (emit && Math.random() < 0.6 * q && fade > 0.5) {
            const a = new Anchor(ev.index + Math.random() * (endI - ev.index + 0.5), ev.price2! + Math.random() * (ev.price - ev.price2!));
            ps.emit({ shape: 'orb', anchor: a, vx: rand(10, 40), vy: rand(-8, 8), life: rand(0.8, 1.6), size: rand(4, 9), color: C.white, color1: col, fadeIn: 0.3 });
          }
          break;
        }
        case 'liquidity_pool': {
          if (!on('liquidity_pool')) break;
          if (ended) break;
          const x0 = m.x(ev.fromIndex ?? ev.index);
          const x1 = m.x(head + 1.5);
          const y = m.y(ev.price);
          if (x0 === null || x1 === null || y === null) break;
          const intro = clamp01(age(ev.id) / 0.5);
          const xe = x0 + (x1 - x0) * intro;
          const pulse = 0.6 + Math.sin(now * 4 + ev.index) * 0.4;
          gG.moveTo(x0, y).lineTo(xe, y).stroke({ width: 10, color: C.gold, alpha: 0.35 * pulse });
          cG.moveTo(x0, y).lineTo(xe, y).stroke({ width: 1.5, color: 0xfff1b8, alpha: 0.9 });
          for (let k = 0; k < 3; k++) {
            const r = ((now * 0.8 + k / 3) % 1) * 22;
            gG.circle(x0, y, r).stroke({ width: 2, color: C.gold, alpha: (1 - r / 22) * 0.7 });
          }
          this.tag(used, ev.id, ev.dir === 'bear' ? 'BUY-SIDE LIQUIDITY' : 'SELL-SIDE LIQUIDITY', C.gold, xe - 4, y + (ev.dir === 'bear' ? -12 : 12), 1, 'right');
          if (emit && Math.random() < 0.7 * q) {
            const a = new Anchor((ev.fromIndex ?? ev.index) + Math.random() * (head - (ev.fromIndex ?? ev.index)), ev.price);
            ps.emit({ shape: 'orb', anchor: a, vx: rand(-6, 6), vy: ev.dir === 'bear' ? rand(-40, -14) : rand(14, 40), life: rand(1, 2), size: rand(5, 10), color: 0xfff1b8, color1: C.gold, fadeIn: 0.3 });
          }
          break;
        }
        case 'consolidation': {
          if (!on('consolidation')) break;
          const fade = ended ? clamp01(1 - (head - ev.endIndex!) / 4) : 1;
          if (fade <= 0) break;
          const x0 = m.x((ev.fromIndex ?? ev.index) - 0.6);
          const x1 = m.x(endI + 0.6);
          const yT = m.y(ev.price);
          const yB = m.y(ev.price2!);
          if (x0 === null || x1 === null || yT === null || yB === null || x1 < 0 || x0 > W) break;
          const rise = clamp01(age(ev.id) / 0.7);
          const col = 0x7c8cff;
          const pulse = 0.7 + Math.sin(now * 2.5) * 0.3;
          fG.rect(x0, yT, x1 - x0, yB - yT).fill({ color: 0x5b6cff, alpha: 0.06 * fade });
          // Arena floor hex-grid hint.
          for (let x = x0; x < x1; x += 14) fG.moveTo(x, yT).lineTo(x + 8, yB).stroke({ width: 1, color: col, alpha: 0.05 * fade });
          // Top and bottom force walls.
          gG.moveTo(x0, yT).lineTo(x1, yT).stroke({ width: 7, color: col, alpha: 0.5 * fade * pulse * rise });
          gG.moveTo(x0, yB).lineTo(x1, yB).stroke({ width: 7, color: col, alpha: 0.5 * fade * pulse * rise });
          cG.moveTo(x0, yT).lineTo(x1, yT).stroke({ width: 1.5, color: 0xdfe4ff, alpha: 0.9 * fade * rise });
          cG.moveTo(x0, yB).lineTo(x1, yB).stroke({ width: 1.5, color: 0xdfe4ff, alpha: 0.9 * fade * rise });
          // Pillars rise from the floor.
          const ph = (yB - yT) * rise;
          for (const px of [x0, x1]) {
            fG.rect(px - 3, yB - ph, 6, ph).fill({ color: 0x1b2050, alpha: 0.9 * fade });
            gG.rect(px - 2, yB - ph, 4, ph).fill({ color: col, alpha: 0.6 * fade });
            cG.circle(px, yB - ph, 3).fill({ color: C.white, alpha: 0.9 * fade });
          }
          // Scanning beam.
          if (!ended) {
            const sx = x0 + ((now * 0.35) % 1) * (x1 - x0);
            gG.rect(sx - 3, yT, 6, yB - yT).fill({ color: col, alpha: 0.25 * fade });
          }
          this.tag(used, ev.id, 'ARENA', 0xb9c3ff, x0 + 6, yT - 10, fade, 'left');
          break;
        }
        case 'trend': {
          if (!on('trend')) break;
          const fade = ended ? clamp01(1 - (head - ev.endIndex!) / 25) : 1;
          if (fade <= 0) break;
          const i0 = ev.fromIndex ?? ev.index - 10;
          const bull = ev.dir === 'bull';
          const col = bull ? C.bull : C.fire;
          const core = bull ? C.bullCore : C.fireCore;
          const intro = clamp01(age(ev.id) / 0.8);
          const last = Math.min(endI, i0 + (endI - i0) * intro);
          const pts: number[] = [];
          for (let i = i0; i <= Math.floor(last); i++) {
            const x = m.x(i);
            const y = m.y(bull ? candles[i].low - (candles[i].high - candles[i].low) * 0.15 : candles[i].high + (candles[i].high - candles[i].low) * 0.15);
            if (x !== null && y !== null) pts.push(x, y);
          }
          if (pts.length < 4) break;
          for (const [w, a, g] of [[16, 0.35, gG], [6, 0.6, gG], [2.2, 0.95, cG]] as const) {
            g.moveTo(pts[0], pts[1]);
            for (let p = 2; p < pts.length; p += 2) g.lineTo(pts[p], pts[p + 1]);
            g.stroke({ width: w, color: w < 3 ? core : col, alpha: a * fade, cap: 'round', join: 'round' });
          }
          if (emit && !ended && fade > 0.9) {
            const a = new Anchor(Math.floor(last), bull ? candles[Math.floor(last)].low : candles[Math.floor(last)].high);
            for (let k = 0; k < Math.ceil(2 * q); k++)
              ps.emit(
                bull
                  ? { shape: 'spark', anchor: a, x: rand(-6, 6), vx: rand(-90, -20), vy: rand(-60, 40), drag: 0.02, life: rand(0.4, 0.9), size: rand(6, 12), stretch: 2, align: true, color: C.white, color1: C.bull }
                  : { shape: 'flame', anchor: a, x: rand(-6, 6), vx: rand(-60, 10), vy: rand(-100, -30), ay: -60, life: rand(0.4, 0.8), size: rand(14, 24), size1: 36, color: C.fireCore, color1: 0xff1e00, rot: rand(-0.3, 0.3) },
              );
          }
          break;
        }
        case 'bos':
        case 'choch': {
          if (!on(ev.kind)) break;
          if (head - ev.index > 60) break;
          const fade = clamp01(1 - (head - ev.index - 40) / 20);
          const x0 = m.x(ev.fromIndex!);
          const x1 = m.x(ev.index);
          const y = m.y(ev.price);
          if (x0 === null || x1 === null || y === null) break;
          const col = ev.dir === 'bull' ? C.bull : C.bear;
          for (let x = x0; x < x1; x += 8) cG.moveTo(x, y).lineTo(Math.min(x + 4, x1), y).stroke({ width: 1.3, color: col, alpha: 0.85 * fade });
          gG.moveTo(x0, y).lineTo(x1, y).stroke({ width: 5, color: col, alpha: 0.25 * fade });
          this.tag(used, ev.id, ev.kind === 'bos' ? 'BOS' : 'CHoCH', col, (x0 + x1) / 2, y + (ev.dir === 'bull' ? -11 : 11), fade, 'center', ev.kind === 'choch');
          break;
        }
        case 'trendline_break': {
          if (!on('trendline_break') || !ev.line) break;
          if (head - ev.index > 30) break;
          const fade = clamp01(1 - (head - ev.index) / 30);
          const L = ev.line;
          const slope = (L.p2 - L.p1) / (L.i2 - L.i1);
          const xa = m.x(L.i1);
          const ya = m.y(L.p1);
          const xb = m.x(ev.index);
          const yb = m.y(L.p1 + slope * (ev.index - L.i1));
          if (xa === null || ya === null || xb === null || yb === null) break;
          gG.moveTo(xa, ya).lineTo(xb, yb).stroke({ width: 5, color: C.cyan, alpha: 0.3 * fade });
          cG.moveTo(xa, ya).lineTo(xb, yb).stroke({ width: 1.2, color: 0xd8f6ff, alpha: 0.8 * fade });
          break;
        }
      }
    }
    for (const [id, t] of this.labels) {
      if (!used.has(id)) {
        t.destroy();
        this.labels.delete(id);
      }
    }
  }

  private tag(used: Set<string>, id: string, text: string, color: number, x: number, y: number, alpha: number, align: 'left' | 'right' | 'center', big = false) {
    used.add(id);
    let t = this.labels.get(id);
    if (!t) {
      t = new Text({
        text,
        style: { fontFamily: 'Orbitron, Rajdhani, system-ui, sans-serif', fontWeight: '800', fontSize: big ? 12 : 10, fill: color, letterSpacing: 1.5, stroke: { color: 0x05060d, width: 3 }, dropShadow: { color, blur: 6, distance: 0, alpha: 0.7 } },
        resolution: 2,
      });
      this.labels.set(id, t);
      this.labelLayer.addChild(t);
    }
    t.anchor.set(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, 0.5);
    t.position.set(x, y);
    t.alpha = alpha;
  }
}
