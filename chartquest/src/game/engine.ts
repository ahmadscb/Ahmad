import { Application, Container, Graphics, Text } from 'pixi.js';
import type { Candle, EventKind, MarketEvent } from '@/core/types';
import { Anchor, type ChartMapper } from './anchor';
import { AudioFx, type Sfx } from './audio';
import { BreakoutFx, PulseFx, SpikeFx, TrendIgniteFx, TrendlineBreakFx } from './effects/impacts';
import { ChochFx, StructureBreakFx } from './effects/structure';
import { SweepFx } from './effects/sweep';
import type { Effect, FxCtx } from './effects/types';
import { Environment } from './environment';
import { C, clamp01, easeOutBack } from './palette';
import { ParticleSystem } from './particles';
import { PersistentLayer } from './persistent';

export type Quality = 'high' | 'low';

export interface EngineStats {
  fps: number;
  particles: number;
  effects: number;
}

/**
 * ChartQuest game engine: two Pixi canvases sandwich the (transparent) Lightweight Chart.
 *  back  → environment (nebula, floor, ambient motes)
 *  front → persistent overlays, cinematic effects, particles, banners
 * The chart owns time/price; every frame the engine reads the chart mapping and positions all
 * effects from (candle index, price), which keeps them synchronised through zoom, pan and replay.
 */
export class GameEngine {
  private back = new Application();
  private front = new Application();
  private env = new Environment();
  private world = new Container(); // shaken + masked to the pane
  private fxLayer = new Container();
  private hud = new Container();
  private mask = new Graphics();
  private flashG = new Graphics();
  private persistent = new PersistentLayer();
  private ps!: ParticleSystem;
  private effects: Effect[] = [];
  private audio = new AudioFx();
  private candles: Candle[] = [];
  private events: MarketEvent[] = [];
  private head = -1;
  private regime: 'bull' | 'bear' | null = null;
  private mapperFn: (() => ChartMapper | null) | null = null;
  private trauma = 0;
  private flashA = 0;
  private flashC = 0xffffff;
  private frame = 0;
  private now = 0;
  private bannerQ: { title: string; sub: string; color: number }[] = [];
  private bannerObj: { c: Container; t: number } | null = null;
  private ready = false;
  private destroyed = false;
  private fpsAcc = { t: 0, n: 0, fps: 60 };
  playing = false;
  enabled: Record<EventKind, boolean> = {
    liquidity_sweep: true,
    bos: true,
    choch: true,
    fvg: true,
    trend: true,
    spike: true,
    trendline_break: true,
    liquidity_pool: true,
    consolidation: true,
    breakout: true,
  };
  quality: Quality = 'high';
  onEventFired?: (ev: MarketEvent) => void;

  async init(backHost: HTMLElement, frontHost: HTMLElement) {
    const opts = { backgroundAlpha: 0, antialias: true, resizeTo: backHost, autoDensity: true, resolution: Math.min(window.devicePixelRatio || 1, 2), preference: 'webgl' as const };
    await this.back.init({ ...opts });
    await this.front.init({ ...opts, resizeTo: frontHost });
    if (this.destroyed) {
      this.back.destroy(true);
      this.front.destroy(true);
      return;
    }
    backHost.appendChild(this.back.canvas);
    frontHost.appendChild(this.front.canvas);
    for (const c of [this.back.canvas, this.front.canvas]) Object.assign(c.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none' });

    this.back.stage.addChild(this.env.root);
    this.ps = new ParticleSystem(this.fxLayer);
    this.world.addChild(this.persistent.root, this.fxLayer);
    this.world.mask = this.mask;
    this.front.stage.addChild(this.mask, this.world, this.flashG, this.hud);
    this.persistent.enabled = this.enabled;
    this.front.ticker.add((tk) => this.tick(Math.min(tk.deltaMS / 1000, 0.05)));
    this.back.ticker.add((tk) => this.env.update(Math.min(tk.deltaMS / 1000, 0.05), this.back.screen.width, this.back.screen.height, this.quality === 'high' ? 1 : 0.4));
    this.ready = true;
  }

  setMapper(fn: () => ChartMapper | null) {
    this.mapperFn = fn;
  }

  setData(candles: Candle[], events: MarketEvent[]) {
    this.candles = candles;
    this.events = events;
    this.head = -1;
    this.clearTransient();
    this.persistent.resetBorn();
  }

  /**
   * Advance the replay head. Events whose confirmIndex falls in (prevHead, head] are new.
   * With `animate` they trigger cinematics; when seeking they appear instantly without FX.
   */
  setHead(head: number, animate: boolean) {
    const prev = this.head;
    this.head = head;
    if (head < prev || !animate) {
      this.clearTransient();
      if (head < prev) this.persistent.resetBorn();
      for (const e of this.events) if (e.confirmIndex <= head) this.persistent.markBorn(e.id, this.now, true);
      this.regime = this.regimeAt(head);
      this.env.setRegime(this.regime, true);
      return;
    }
    const fresh = this.events.filter((e) => e.confirmIndex > prev && e.confirmIndex <= head);
    for (const ev of fresh) {
      this.persistent.markBorn(ev.id, this.now, false);
      if (!this.enabled[ev.kind]) continue;
      this.spawn(ev);
      this.onEventFired?.(ev);
    }
    const r = this.regimeAt(head);
    if (r !== this.regime) {
      this.regime = r;
      this.env.setRegime(r, false);
    }
  }

  /** Regime = direction of the latest structure break known at `head`. */
  regimeAt(head: number): 'bull' | 'bear' | null {
    let r: 'bull' | 'bear' | null = null;
    for (const e of this.events) {
      if (e.confirmIndex > head) break;
      if (e.kind === 'bos' || e.kind === 'choch') r = e.dir;
    }
    return r;
  }

  /** Replay one event's cinematic on demand (Quest Log "replay FX"). */
  replayEvent(ev: MarketEvent) {
    if (ev.confirmIndex <= this.head) this.spawn(ev);
  }

  private spawn(ev: MarketEvent) {
    const m = this.mapperFn?.();
    if (!m || !this.ready) return;
    const ctx = this.ctx(m);
    const heavyCount = this.effects.filter((e) => e.heavy).length;
    const busy = heavyCount >= (this.quality === 'high' ? 6 : 3);
    let fx: Effect | null = null;
    switch (ev.kind) {
      case 'liquidity_sweep':
        if (!this.effects.some((e) => e instanceof SweepFx)) fx = new SweepFx(ev, ctx);
        else fx = new PulseFx(ev, ctx, C.gold, 'pool');
        break;
      case 'bos':
        if (!busy) fx = new StructureBreakFx(ev, ctx);
        break;
      case 'choch':
        fx = new ChochFx(ev, ctx);
        break;
      case 'spike':
        if (!busy) fx = new SpikeFx(ev, ctx);
        break;
      case 'trendline_break':
        if (!busy) fx = new TrendlineBreakFx(ev, ctx);
        break;
      case 'breakout':
        if (!busy) fx = new BreakoutFx(ev, ctx);
        break;
      case 'fvg':
        fx = new PulseFx(ev, ctx, ev.dir === 'bull' ? C.cyan : C.violet, 'portal');
        break;
      case 'liquidity_pool':
        fx = new PulseFx(ev, ctx, C.gold, 'pool');
        break;
      case 'consolidation':
        fx = new PulseFx(ev, ctx, 0x7c8cff, 'arena');
        break;
      case 'trend':
        fx = new TrendIgniteFx(ev, this.candles, ctx);
        break;
    }
    if (fx) this.effects.push(fx);
  }

  private ctx(m: ChartMapper): FxCtx {
    return {
      m,
      frame: this.frame,
      ps: this.ps,
      layer: this.fxLayer,
      hud: this.hud,
      q: this.quality === 'high' ? 1 : 0.4,
      shake: (t) => (this.trauma = Math.min(1, this.trauma + t)),
      flash: (c, a) => {
        this.flashC = c;
        this.flashA = Math.max(this.flashA, a);
      },
      sfx: (s: Sfx, v?: number) => this.audio.play(s, v),
      banner: (title, sub, color) => {
        this.bannerQ = [{ title, sub, color }];
      },
      setEnv: (d) => this.env.setRegime(d, false),
    };
  }

  private tick(dt: number) {
    if (!this.ready) return;
    this.now += dt;
    this.frame++;
    this.fpsAcc.t += dt;
    this.fpsAcc.n++;
    if (this.fpsAcc.t > 0.5) {
      this.fpsAcc.fps = this.fpsAcc.n / this.fpsAcc.t;
      this.fpsAcc.t = 0;
      this.fpsAcc.n = 0;
    }
    const m = this.mapperFn?.();
    if (!m) return;
    m.head = this.head;
    const W = this.front.screen.width;
    const H = this.front.screen.height;
    this.mask.clear().rect(0, 0, m.width, m.height).fill(0xffffff);

    const visible = this.head >= 0 ? this.events.filter((e) => e.confirmIndex <= this.head) : [];
    const q = this.quality === 'high' ? 1 : 0.4;
    this.persistent.draw(this.now, dt, m, this.frame, this.candles, visible, this.ps, this.playing, q);

    const ctx = this.ctx(m);
    this.effects = this.effects.filter((e) => {
      const alive = e.update(dt, ctx);
      if (!alive) e.destroy();
      return alive;
    });
    this.ps.update(dt, m, this.frame);

    // Trauma-based camera shake (squared for punch), applied to the world only.
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    const s = this.trauma * this.trauma;
    this.world.x = Math.sin(this.now * 47) * 10 * s;
    this.world.y = Math.cos(this.now * 41) * 7 * s;

    this.flashA = Math.max(0, this.flashA - dt * 1.8);
    this.flashG.clear();
    if (this.flashA > 0.005) {
      this.flashG.blendMode = 'add';
      this.flashG.rect(0, 0, W, H).fill({ color: this.flashC, alpha: this.flashA });
    }
    this.updateBanner(dt, W, H);
  }

  private updateBanner(dt: number, W: number, H: number) {
    if (!this.bannerObj && this.bannerQ.length) {
      const b = this.bannerQ.shift()!;
      const c = new Container();
      const plate = new Graphics();
      const title = new Text({
        text: b.title,
        style: { fontFamily: 'Orbitron, Rajdhani, system-ui, sans-serif', fontWeight: '900', fontSize: Math.min(38, W / 22), fill: 0xffffff, letterSpacing: 6, stroke: { color: b.color, width: 2 }, dropShadow: { color: b.color, blur: 18, distance: 0, alpha: 1 } },
        resolution: 2,
      });
      const ghostR = new Text({ text: b.title, style: { ...title.style, fill: 0xff2e5b, dropShadow: false, stroke: undefined }, resolution: 2 });
      const ghostB = new Text({ text: b.title, style: { ...title.style, fill: 0x2de2ff, dropShadow: false, stroke: undefined }, resolution: 2 });
      ghostR.blendMode = ghostB.blendMode = 'add';
      const sub = new Text({
        text: b.sub,
        style: { fontFamily: 'Rajdhani, Orbitron, system-ui, sans-serif', fontWeight: '700', fontSize: Math.min(18, W / 40), fill: b.color, letterSpacing: 8 },
        resolution: 2,
      });
      for (const t of [title, ghostR, ghostB, sub]) t.anchor.set(0.5);
      sub.y = title.height * 0.75;
      c.addChild(plate, ghostR, ghostB, title, sub);
      (c as Container & { parts?: unknown }).parts = { plate, title, ghostR, ghostB, sub, color: b.color };
      this.hud.addChild(c);
      this.bannerObj = { c, t: 0 };
    }
    const bo = this.bannerObj;
    if (!bo) return;
    bo.t += dt;
    const t = bo.t;
    const p = (bo.c as Container & { parts: { plate: Graphics; title: Text; ghostR: Text; ghostB: Text; sub: Text; color: number } }).parts;
    bo.c.position.set(W * 0.42, H * 0.14);
    const inT = easeOutBack(clamp01(t / 0.45));
    const out = clamp01((t - 2.1) / 0.4);
    bo.c.alpha = clamp01(t / 0.15) * (1 - out);
    bo.c.scale.set(0.6 + inT * 0.4 + out * 0.3, 0.6 + inT * 0.4 - out * 0.4);
    const glitch = t < 0.6 ? (1 - t / 0.6) * 10 : Math.random() < 0.04 ? 4 : 0;
    p.ghostR.x = -glitch;
    p.ghostB.x = glitch;
    p.ghostR.alpha = p.ghostB.alpha = 0.6;
    const w = p.title.width + 120;
    const h = p.title.height + p.sub.height + 30;
    const sweep = clamp01(t / 0.5);
    p.plate.clear();
    p.plate.rect((-w / 2) * sweep, -h / 2 + 6, w * sweep, h).fill({ color: 0x05060d, alpha: 0.55 });
    p.plate.rect((-w / 2) * sweep, -h / 2 + 6, w * sweep, 2).fill({ color: p.color, alpha: 0.9 });
    p.plate.rect((-w / 2) * sweep, h / 2 + 4, w * sweep, 2).fill({ color: p.color, alpha: 0.9 });
    // Light streak sweeping across the title.
    const lx = -w / 2 + ((t * 1.2) % 1.4) * w;
    p.plate.rect(lx, -h / 2 + 8, 30, h - 4).fill({ color: 0xffffff, alpha: 0.07 });
    if (t > 2.6) {
      bo.c.destroy({ children: true });
      this.bannerObj = null;
    }
  }

  private clearTransient() {
    for (const e of this.effects) e.destroy();
    this.effects = [];
    this.ps?.clear();
    this.trauma = 0;
    this.flashA = 0;
    this.bannerQ = [];
    if (this.bannerObj) {
      this.bannerObj.c.destroy({ children: true });
      this.bannerObj = null;
    }
  }

  setEnabled(kind: EventKind, on: boolean) {
    this.enabled[kind] = on;
  }
  setMuted(m: boolean) {
    this.audio.muted = m;
  }
  unlockAudio() {
    this.audio.unlock();
  }
  setQuality(q: Quality) {
    this.quality = q;
    if (this.ps) this.ps.budget = q === 'high' ? 2600 : 900;
    this.persistent.setBloom(q === 'high');
  }
  /** Where the engine would draw (index, price) right now — used by the sync test. */
  probe(i: number, p: number) {
    const m = this.mapperFn?.();
    if (!m) return null;
    const a = new Anchor(i, p).resolve(m, -1);
    return { x: a.sx + this.world.x, y: a.sy + this.world.y, shakeX: this.world.x, shakeY: this.world.y };
  }

  stats(): EngineStats {
    return { fps: Math.round(this.fpsAcc.fps), particles: this.ps?.count ?? 0, effects: this.effects.length };
  }

  destroy() {
    this.destroyed = true;
    if (!this.ready) return;
    this.clearTransient();
    this.back.destroy(true, { children: true });
    this.front.destroy(true, { children: true });
  }
}
