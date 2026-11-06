import type { Container } from 'pixi.js';
import type { ChartMapper } from '../anchor';
import type { Sfx } from '../audio';
import type { ParticleSystem } from '../particles';

export interface FxCtx {
  m: ChartMapper;
  frame: number;
  ps: ParticleSystem;
  /** Layer for effect-owned display objects (masked to the chart pane). */
  layer: Container;
  /** Layer above everything (banners) — not masked. */
  hud: Container;
  shake(trauma: number): void;
  flash(color: number, alpha: number): void;
  sfx(s: Sfx, vol?: number): void;
  banner(title: string, subtitle: string, color: number): void;
  setEnv(dir: 'bull' | 'bear'): void;
  /** Particle quality multiplier (0.35 low … 1 high). */
  q: number;
}

export interface Effect {
  /** Return false when finished. */
  update(dt: number, ctx: FxCtx): boolean;
  destroy(): void;
  heavy?: boolean;
}
