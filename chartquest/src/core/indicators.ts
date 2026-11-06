import type { Candle } from './types';

/** Wilder ATR. Value at i uses candles[0..i] only (causal). */
export function atr(c: Candle[], period = 14): number[] {
  const out = new Array<number>(c.length).fill(0);
  let prev = 0;
  for (let i = 0; i < c.length; i++) {
    const tr =
      i === 0
        ? c[i].high - c[i].low
        : Math.max(c[i].high - c[i].low, Math.abs(c[i].high - c[i - 1].close), Math.abs(c[i].low - c[i - 1].close));
    if (i < period) {
      prev = (prev * i + tr) / (i + 1);
    } else {
      prev = (prev * (period - 1) + tr) / period;
    }
    out[i] = prev;
  }
  return out;
}

/** Exponential moving average of closes (causal). */
export function ema(c: Candle[], period: number): number[] {
  const k = 2 / (period + 1);
  const out = new Array<number>(c.length).fill(0);
  for (let i = 0; i < c.length; i++) out[i] = i === 0 ? c[0].close : c[i].close * k + out[i - 1] * (1 - k);
  return out;
}
