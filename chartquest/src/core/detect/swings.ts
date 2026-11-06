import type { Candle } from '../types';

export interface Swing {
  type: 'high' | 'low';
  index: number;
  price: number;
  /** A fractal pivot needs `right` later candles before it can be known. */
  confirmIndex: number;
}

/**
 * Fractal pivots: a swing high at i is strictly higher than the `left` candles before it and
 * not exceeded by the `right` candles after it. Confirmed only at i + right.
 */
export function findSwings(c: Candle[], left = 3, right = 3): Swing[] {
  const out: Swing[] = [];
  for (let i = left; i + right < c.length; i++) {
    let isHigh = true;
    let isLow = true;
    for (let j = i - left; j <= i + right; j++) {
      if (j === i) continue;
      if (j < i ? c[j].high >= c[i].high : c[j].high > c[i].high) isHigh = false;
      if (j < i ? c[j].low <= c[i].low : c[j].low < c[i].low) isLow = false;
    }
    if (isHigh) out.push({ type: 'high', index: i, price: c[i].high, confirmIndex: i + right });
    if (isLow) out.push({ type: 'low', index: i, price: c[i].low, confirmIndex: i + right });
  }
  return out.sort((a, b) => a.confirmIndex - b.confirmIndex || a.index - b.index);
}

/** Group swings by the candle at which they become known. */
export function swingsByConfirm(swings: Swing[]): Map<number, Swing[]> {
  const m = new Map<number, Swing[]>();
  for (const s of swings) {
    const arr = m.get(s.confirmIndex) ?? [];
    arr.push(s);
    m.set(s.confirmIndex, arr);
  }
  return m;
}
