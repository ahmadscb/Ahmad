import type { Candle, MarketEvent } from '../types';

/**
 * Consolidation & breakout.
 * Consolidation rule: the last 14 bars span ≤ 3.2×ATR(50 avg) and ≥ 70% of closes sit inside
 *   the middle 80% of that span. Fires once; the range then extends while bars close inside.
 * Breakout rule: a close beyond the range by ≥ 0.2×ATR ends the range → breakout event.
 * A range left for 120 bars without a breakout expires silently.
 */
export function detectRanges(c: Candle[], atr: number[], w = 14): MarketEvent[] {
  const out: MarketEvent[] = [];
  let range: MarketEvent | null = null;
  let cooldown = 0;
  const atrAvg: number[] = [];
  let s = 0;
  for (let i = 0; i < c.length; i++) {
    s += atr[i];
    if (i >= 50) s -= atr[i - 50];
    atrAvg.push(s / Math.min(i + 1, 50));
  }
  for (let k = w; k < c.length; k++) {
    const a = Math.max(atrAvg[k], 1e-9);
    if (range) {
      const top = range.price;
      const bot = range.price2!;
      const close = c[k].close;
      if (close > top + 0.2 * atr[k] || close < bot - 0.2 * atr[k]) {
        const dir = close > top ? 'bull' : 'bear';
        range.endIndex = k;
        out.push({
          id: `breakout-${dir}-${k}`,
          kind: 'breakout',
          dir,
          index: k,
          confirmIndex: k,
          fromIndex: range.fromIndex,
          price: dir === 'bull' ? top : bot,
          price2: dir === 'bull' ? bot : top,
          strength: Math.min(1, 0.5 + Math.abs(close - (dir === 'bull' ? top : bot)) / atr[k] / 3),
          label: dir === 'bull' ? 'Bullish range breakout' : 'Bearish range breakdown',
          rule: `Closed ${dir === 'bull' ? 'above' : 'below'} the ${k - range.fromIndex!}-bar range (${bot.toFixed(
            2,
          )}–${top.toFixed(2)}) by ≥0.2×ATR.`,
        });
        range = null;
        cooldown = 6;
      } else if (k - range.fromIndex! > 120) {
        range.endIndex = k;
        range = null;
      }
      continue;
    }
    if (cooldown > 0) {
      cooldown--;
      continue;
    }
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = k - w + 1; j <= k; j++) {
      hi = Math.max(hi, c[j].high);
      lo = Math.min(lo, c[j].low);
    }
    const span = hi - lo;
    if (span > 3.2 * a) continue;
    const inner = [lo + span * 0.1, hi - span * 0.1];
    let inside = 0;
    for (let j = k - w + 1; j <= k; j++) if (c[j].close >= inner[0] && c[j].close <= inner[1]) inside++;
    if (inside / w < 0.7) continue;
    range = {
      id: `range-${k}`,
      kind: 'consolidation',
      dir: c[k].close >= c[k - w + 1].open ? 'bull' : 'bear',
      index: k,
      confirmIndex: k,
      fromIndex: k - w + 1,
      price: hi,
      price2: lo,
      strength: Math.min(1, 1 - span / (3.2 * a) + 0.4),
      label: 'Consolidation arena',
      rule: `${w} bars confined to ${span.toFixed(2)} points (${(span / a).toFixed(1)}×avg ATR) with ${inside}/${w} closes in the core.`,
    };
    out.push(range);
  }
  return out;
}
