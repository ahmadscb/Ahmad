import type { Candle, MarketEvent } from '../types';

/**
 * Strong trend.
 * Rule: over the last 10 bars the Kaufman efficiency ratio ≥ 0.55 AND net move ≥ 3×ATR AND the
 * close is on the trend side of EMA(21). Fires on the rising edge; stays active until the
 * efficiency ratio drops below 0.3 or price closes across EMA(21) (endIndex).
 */
export function detectTrends(c: Candle[], atr: number[], ema21: number[], n = 10): MarketEvent[] {
  const out: MarketEvent[] = [];
  let active: MarketEvent | null = null;
  let cooldown = 0;
  for (let k = n; k < c.length; k++) {
    let path = 0;
    for (let j = k - n + 1; j <= k; j++) path += Math.abs(c[j].close - c[j - 1].close);
    const net = c[k].close - c[k - n].close;
    const er = path > 0 ? Math.abs(net) / path : 0;
    const a = Math.max(atr[k], 1e-9);
    if (active) {
      const up = active.dir === 'bull';
      if (er < 0.3 || (up ? c[k].close < ema21[k] : c[k].close > ema21[k])) {
        active.endIndex = k;
        active = null;
        cooldown = 5;
      }
      continue;
    }
    if (cooldown > 0) {
      cooldown--;
      continue;
    }
    const dir = net > 0 ? 'bull' : 'bear';
    if (er >= 0.55 && Math.abs(net) >= 3 * a && (dir === 'bull' ? c[k].close > ema21[k] : c[k].close < ema21[k])) {
      active = {
        id: `trend-${dir}-${k}`,
        kind: 'trend',
        dir,
        index: k,
        confirmIndex: k,
        fromIndex: k - n,
        price: c[k].close,
        strength: Math.min(1, er),
        label: dir === 'bull' ? 'Strong bullish trend' : 'Strong bearish trend',
        rule: `Efficiency ratio ${er.toFixed(2)} over ${n} bars with a ${(Math.abs(net) / a).toFixed(1)}×ATR ${
          dir === 'bull' ? 'advance' : 'decline'
        } and price ${dir === 'bull' ? 'above' : 'below'} EMA(21).`,
      };
      out.push(active);
    }
  }
  return out;
}

/**
 * Sudden price spike.
 * Rule: candle range ≥ 2.6×ATR of the previous bar AND body ≥ 55% of the range.
 */
export function detectSpikes(c: Candle[], atr: number[]): MarketEvent[] {
  const out: MarketEvent[] = [];
  for (let k = 15; k < c.length; k++) {
    const a = Math.max(atr[k - 1], 1e-9);
    const range = c[k].high - c[k].low;
    const body = Math.abs(c[k].close - c[k].open);
    if (range >= 2.6 * a && body >= 0.55 * range) {
      const dir = c[k].close > c[k].open ? 'bull' : 'bear';
      out.push({
        id: `spike-${dir}-${k}`,
        kind: 'spike',
        dir,
        index: k,
        confirmIndex: k,
        price: dir === 'bull' ? c[k].high : c[k].low,
        price2: c[k].open,
        strength: Math.min(1, range / a / 4),
        label: dir === 'bull' ? 'Upside price spike' : 'Downside price spike',
        rule: `Range ${range.toFixed(2)} = ${(range / a).toFixed(1)}×ATR with a ${Math.round((body / range) * 100)}% body.`,
      });
    }
  }
  return out;
}
