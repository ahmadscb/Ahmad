import { Anchor } from '../anchor';
import { C, rand } from '../palette';
import type { ParticleSystem } from '../particles';

/** Reusable particle recipes. Counts are scaled by quality `q`. */
export function shockRing(ps: ParticleSystem, a: Anchor, color: number, size = 260, life = 0.7) {
  ps.emit({ shape: 'ring', anchor: a, life, size: 20, size1: size, color, alpha: 0.9 });
  ps.emit({ shape: 'ring', anchor: a, life: life * 1.3, size: 10, size1: size * 0.7, color: C.white, alpha: 0.5 });
}

export function flashGlow(ps: ParticleSystem, a: Anchor, color: number, size = 220, life = 0.45) {
  ps.emit({ shape: 'glow', anchor: a, life, size, size1: size * 1.4, color, alpha: 1 });
  ps.emit({ shape: 'star', anchor: a, life: life * 0.8, size: size * 1.2, size1: size * 0.4, color: C.white, alpha: 0.9, rot: rand(0, 1) });
}

export function sparks(ps: ParticleSystem, a: Anchor, n: number, color: number, opts: { speed?: number; up?: number; spread?: number; dir?: number; gravity?: number; life?: number } = {}) {
  const sp = opts.speed ?? 520;
  for (let i = 0; i < n; i++) {
    const ang = (opts.dir ?? -Math.PI / 2) + rand(-1, 1) * (opts.spread ?? Math.PI);
    const v = sp * rand(0.3, 1);
    ps.emit({
      shape: 'spark',
      anchor: a,
      vx: Math.cos(ang) * v,
      vy: Math.sin(ang) * v - (opts.up ?? 0),
      ay: opts.gravity ?? 700,
      drag: 0.02,
      life: (opts.life ?? 0.9) * rand(0.5, 1.2),
      size: rand(10, 22),
      stretch: 2.2,
      align: true,
      color: C.white,
      color1: color,
    });
  }
}

export function fireball(ps: ParticleSystem, a: Anchor, n: number, scale = 1) {
  for (let i = 0; i < n; i++) {
    const ang = rand(0, Math.PI * 2);
    const v = rand(40, 260) * scale;
    ps.emit({
      shape: 'flame',
      anchor: a,
      x: rand(-8, 8),
      y: rand(-8, 8),
      vx: Math.cos(ang) * v,
      vy: Math.sin(ang) * v - 60,
      ay: -180,
      drag: 0.06,
      life: rand(0.5, 1.1),
      size: rand(40, 80) * scale,
      size1: rand(80, 140) * scale,
      color: C.fireCore,
      color1: 0xff2a00,
      spin: rand(-2, 2),
      rot: rand(0, 6),
    });
  }
}

export function smoke(ps: ParticleSystem, a: Anchor, n: number, color = C.smoke, scale = 1) {
  for (let i = 0; i < n; i++) {
    const ang = rand(0, Math.PI * 2);
    const v = rand(20, 120) * scale;
    ps.emit(
      {
        shape: 'smoke',
        anchor: a,
        x: rand(-10, 10),
        y: rand(-10, 10),
        vx: Math.cos(ang) * v,
        vy: Math.sin(ang) * v - 40,
        ay: -30,
        drag: 0.04,
        life: rand(1.0, 2.0),
        size: rand(40, 70) * scale,
        size1: rand(120, 200) * scale,
        alpha: 0.7,
        color,
        spin: rand(-0.6, 0.6),
        rot: rand(0, 6),
        fadeIn: 0.1,
      },
      'normal',
    );
  }
}

export function embers(ps: ParticleSystem, a: Anchor, n: number, color: number, spread = 60) {
  for (let i = 0; i < n; i++) {
    ps.emit({
      shape: 'ember',
      anchor: a,
      x: rand(-spread, spread),
      y: rand(-spread * 0.4, spread * 0.4),
      vx: rand(-30, 30),
      vy: rand(-140, -40),
      ay: -20,
      drag: 0.01,
      life: rand(1.2, 2.6),
      size: rand(5, 12),
      color: C.white,
      color1: color,
      fadeIn: 0.15,
    });
  }
}

export const at = (i: number, p: number) => new Anchor(i, p);
