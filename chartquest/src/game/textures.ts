import { Rectangle, Texture } from 'pixi.js';

/**
 * All particle shapes are painted procedurally into ONE atlas so every particle shares a
 * texture source (required by ParticleContainer batching) and no image assets are needed.
 */
export type Shape = 'glow' | 'spark' | 'ring' | 'smoke' | 'flame' | 'shard' | 'block' | 'star' | 'dot' | 'orb' | 'ember' | 'bolt';
const ORDER: Shape[] = ['glow', 'spark', 'ring', 'smoke', 'flame', 'shard', 'block', 'star', 'dot', 'orb', 'ember', 'bolt'];
const CELL = 128;

let atlas: Record<Shape, Texture> | null = null;

export function getAtlas(): Record<Shape, Texture> {
  if (atlas) return atlas;
  const cols = 4;
  const cv = document.createElement('canvas');
  cv.width = CELL * cols;
  cv.height = CELL * Math.ceil(ORDER.length / cols);
  const g = cv.getContext('2d')!;
  ORDER.forEach((s, i) => {
    g.save();
    g.translate((i % cols) * CELL, Math.floor(i / cols) * CELL);
    paint(g, s);
    g.restore();
  });
  const base = Texture.from(cv);
  const out = {} as Record<Shape, Texture>;
  ORDER.forEach((s, i) => {
    out[s] = new Texture({ source: base.source, frame: new Rectangle((i % cols) * CELL + 1, Math.floor(i / cols) * CELL + 1, CELL - 2, CELL - 2) });
  });
  atlas = out;
  return out;
}

function radial(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: [number, string][]) {
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [o, c] of stops) gr.addColorStop(o, c);
  g.fillStyle = gr;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
}

function paint(g: CanvasRenderingContext2D, s: Shape) {
  const c = CELL / 2;
  switch (s) {
    case 'glow':
      radial(g, c, c, c - 2, [[0, 'rgba(255,255,255,1)'], [0.18, 'rgba(255,255,255,0.75)'], [0.45, 'rgba(255,255,255,0.22)'], [1, 'rgba(255,255,255,0)']]);
      break;
    case 'spark': {
      g.save();
      g.translate(c, c);
      g.scale(1, 0.12);
      radial(g, 0, 0, c - 2, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]);
      g.restore();
      break;
    }
    case 'ring':
      g.strokeStyle = 'white';
      for (let w = 10; w >= 2; w -= 2) {
        g.globalAlpha = 0.12 + (10 - w) * 0.1;
        g.lineWidth = w;
        g.beginPath();
        g.arc(c, c, c - 8, 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    case 'smoke':
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const r = 14 + (i % 3) * 6;
        radial(g, c + Math.cos(a) * r, c + Math.sin(a) * r, 30, [[0, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']]);
      }
      radial(g, c, c, 40, [[0, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
      break;
    case 'flame': {
      const gr = g.createRadialGradient(c, c + 18, 2, c, c + 6, 54);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.3, 'rgba(255,255,255,0.85)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(c, 6);
      g.bezierCurveTo(c + 36, c - 6, c + 40, CELL - 20, c, CELL - 8);
      g.bezierCurveTo(c - 40, CELL - 20, c - 36, c - 6, c, 6);
      g.fill();
      break;
    }
    case 'shard':
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.moveTo(c - 6, 8);
      g.lineTo(CELL - 14, c + 10);
      g.lineTo(c - 18, CELL - 10);
      g.lineTo(14, c - 4);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath();
      g.moveTo(CELL - 14, c + 10);
      g.lineTo(c - 18, CELL - 10);
      g.lineTo(c, c);
      g.closePath();
      g.fill();
      break;
    case 'block': {
      const m = 8;
      const w = CELL - m * 2;
      const gr = g.createLinearGradient(m, m, m + w, m + w);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(1, 'rgba(150,150,150,1)');
      g.fillStyle = gr;
      g.fillRect(m, m, w, w);
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(m, m, w, 7);
      g.fillRect(m, m, 7, w);
      g.fillStyle = 'rgba(0,0,0,0.45)';
      g.fillRect(m, m + w - 9, w, 9);
      g.fillRect(m + w - 9, m, 9, w);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(m + 20, m + 30);
      g.lineTo(m + 50, m + 52);
      g.lineTo(m + 44, m + 86);
      g.stroke();
      break;
    }
    case 'star':
      radial(g, c, c, 22, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
      for (const [sx, sy] of [[1, 0.06], [0.06, 1]] as const) {
        g.save();
        g.translate(c, c);
        g.scale(sx, sy);
        radial(g, 0, 0, c - 2, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,0.5)'], [1, 'rgba(255,255,255,0)']]);
        g.restore();
      }
      break;
    case 'dot':
      radial(g, c, c, 20, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
      break;
    case 'orb':
      radial(g, c, c, c - 4, [[0, 'rgba(255,255,255,1)'], [0.22, 'rgba(255,255,255,0.95)'], [0.3, 'rgba(255,255,255,0.4)'], [1, 'rgba(255,255,255,0)']]);
      break;
    case 'ember':
      radial(g, c, c, 30, [[0, 'rgba(255,255,255,1)'], [0.3, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
      break;
    case 'bolt': {
      g.strokeStyle = 'white';
      g.lineCap = 'round';
      const pts = [[4, c], [30, c - 12], [52, c + 8], [76, c - 6], [100, c + 10], [CELL - 4, c]];
      for (const [w, a] of [[10, 0.25], [5, 0.6], [2, 1]] as const) {
        g.globalAlpha = a;
        g.lineWidth = w;
        g.beginPath();
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
        g.stroke();
      }
      g.globalAlpha = 1;
      break;
    }
  }
}
