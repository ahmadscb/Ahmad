import { type Container, Particle, ParticleContainer, Rectangle } from 'pixi.js';
import type { Anchor, ChartMapper } from './anchor';
import { getAtlas, type Shape } from './textures';

export interface Emit {
  shape: Shape;
  anchor: Anchor;
  /** Offset from the anchor in pixels. */
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  ax?: number;
  ay?: number;
  drag?: number;
  life: number;
  size: number;
  size1?: number;
  /** Non-uniform stretch along velocity (sparks). */
  stretch?: number;
  alpha?: number;
  color: number;
  color1?: number;
  spin?: number;
  rot?: number;
  /** Align rotation to velocity. */
  align?: boolean;
  /** 0..1 fraction of life spent fading in. */
  fadeIn?: number;
}

interface Live extends Required<Omit<Emit, 'color1'>> {
  p: Particle;
  age: number;
  color1: number;
}

const lerpColor = (a: number, b: number, t: number) => {
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * t);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * t);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * t);
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
};

/**
 * Pooled particle system on two ParticleContainers (additive light + normal-blend debris/smoke).
 * Particles live in anchor-relative pixel space, so they stay attached to their candle.
 */
export class ParticleSystem {
  readonly add: ParticleContainer;
  readonly normal: ParticleContainer;
  private live: { add: Live[]; normal: Live[] } = { add: [], normal: [] };
  private pool: Particle[] = [];
  budget = 2600;

  constructor(parent: Container) {
    const opts = {
      dynamicProperties: { position: true, rotation: true, vertex: true, color: true, uvs: true },
      boundsArea: new Rectangle(-4000, -4000, 12000, 12000),
    };
    this.normal = new ParticleContainer(opts);
    this.add = new ParticleContainer(opts);
    this.add.blendMode = 'add';
    parent.addChild(this.normal, this.add);
  }

  get count() {
    return this.live.add.length + this.live.normal.length;
  }

  emit(e: Emit, blend: 'add' | 'normal' = 'add') {
    if (this.count >= this.budget) return;
    const tex = getAtlas()[e.shape];
    const p = this.pool.pop() ?? new Particle({ texture: tex, anchorX: 0.5, anchorY: 0.5 });
    p.texture = tex;
    p.anchorX = 0.5;
    p.anchorY = 0.5;
    const l: Live = {
      shape: e.shape,
      anchor: e.anchor,
      x: e.x ?? 0,
      y: e.y ?? 0,
      vx: e.vx ?? 0,
      vy: e.vy ?? 0,
      ax: e.ax ?? 0,
      ay: e.ay ?? 0,
      drag: e.drag ?? 0,
      life: e.life,
      size: e.size,
      size1: e.size1 ?? e.size,
      stretch: e.stretch ?? 1,
      alpha: e.alpha ?? 1,
      color: e.color,
      color1: e.color1 ?? e.color,
      spin: e.spin ?? 0,
      rot: e.rot ?? 0,
      align: e.align ?? false,
      fadeIn: e.fadeIn ?? 0,
      p,
      age: 0,
    };
    p.alpha = 0;
    this.live[blend].push(l);
    (blend === 'add' ? this.add : this.normal).particleChildren.push(p);
  }

  update(dt: number, m: ChartMapper, frame: number) {
    for (const key of ['add', 'normal'] as const) {
      const arr = this.live[key];
      const container = key === 'add' ? this.add : this.normal;
      let w = 0;
      for (let i = 0; i < arr.length; i++) {
        const l = arr[i];
        l.age += dt;
        if (l.age >= l.life) {
          this.pool.push(l.p);
          continue;
        }
        const t = l.age / l.life;
        const damp = Math.pow(1 - Math.min(0.99, l.drag), dt * 60);
        l.vx = (l.vx + l.ax * dt) * damp;
        l.vy = (l.vy + l.ay * dt) * damp;
        l.x += l.vx * dt;
        l.y += l.vy * dt;
        l.rot += l.spin * dt;
        const a = l.anchor.resolve(m, frame);
        const p = l.p;
        p.x = a.sx + l.x;
        p.y = a.sy + l.y;
        const s = (l.size + (l.size1 - l.size) * t) / 126;
        if (l.align) {
          p.rotation = Math.atan2(l.vy, l.vx);
          const sp = Math.min(3, Math.hypot(l.vx, l.vy) / 260);
          p.scaleX = s * l.stretch * (0.6 + sp);
          p.scaleY = s;
        } else {
          p.rotation = l.rot;
          p.scaleX = s * l.stretch;
          p.scaleY = s;
        }
        const fin = l.fadeIn > 0 ? Math.min(1, t / l.fadeIn) : 1;
        p.alpha = l.alpha * fin * (1 - t) * (1 - t * 0.2);
        p.tint = l.color1 === l.color ? l.color : lerpColor(l.color, l.color1, t);
        arr[w++] = l;
      }
      arr.length = w;
      container.particleChildren.length = 0;
      for (let i = 0; i < w; i++) container.particleChildren.push(arr[i].p);
      container.update();
    }
  }

  clear() {
    for (const key of ['add', 'normal'] as const) {
      for (const l of this.live[key]) this.pool.push(l.p);
      this.live[key].length = 0;
      (key === 'add' ? this.add : this.normal).particleChildren.length = 0;
      (key === 'add' ? this.add : this.normal).update();
    }
  }
}
