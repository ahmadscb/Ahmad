import type { Candle, MarketEvent } from '../types';
import type { Swing } from './swings';

/**
 * Trendline break.
 * Line rule: connect the two most recent confirmed swing lows where the second is higher
 *   (rising support) — or swing highs where the second is lower (falling resistance) — at
 *   least 8 bars apart. No close may have crossed the line between the anchors.
 * Break rule: after the second anchor is confirmed, a close beyond the projected line by
 *   ≥ 0.25×ATR. Each line can break once.
 */
export function detectTrendlineBreaks(c: Candle[], swings: Swing[], atr: number[]): MarketEvent[] {
  const out: MarketEvent[] = [];
  const known: Swing[] = [];
  let si = 0;
  const lines: { type: 'high' | 'low'; a: Swing; b: Swing; dead: boolean }[] = [];
  const used = new Set<string>();

  for (let k = 0; k < c.length; k++) {
    // Check breaks with lines known before this candle.
    for (const L of lines) {
      if (L.dead) continue;
      const slope = (L.b.price - L.a.price) / (L.b.index - L.a.index);
      const v = L.b.price + slope * (k - L.b.index);
      if (k - L.b.index > 120) {
        L.dead = true;
        continue;
      }
      const brk = L.type === 'low' ? c[k].close < v - 0.25 * atr[k] : c[k].close > v + 0.25 * atr[k];
      if (brk) {
        L.dead = true;
        const dir = L.type === 'low' ? 'bear' : 'bull';
        out.push({
          id: `tl-${dir}-${k}`,
          kind: 'trendline_break',
          dir,
          index: k,
          confirmIndex: k,
          fromIndex: L.a.index,
          price: v,
          line: { i1: L.a.index, p1: L.a.price, i2: L.b.index, p2: L.b.price },
          strength: 0.75,
          label: dir === 'bear' ? 'Rising trendline broken' : 'Falling trendline broken',
          rule: `Close ${c[k].close.toFixed(2)} pierced the ${L.type === 'low' ? 'support' : 'resistance'} line through swings at bars ${
            L.a.index
          } and ${L.b.index} (projected ${v.toFixed(2)}).`,
        });
      }
    }
    // Add swings confirmed at k and build new lines.
    for (const s of pending(k)) {
      known.push(s);
      const prev = [...known].reverse().find((x) => x !== s && x.type === s.type && s.index - x.index >= 8);
      if (!prev) continue;
      const ok = s.type === 'low' ? s.price > prev.price : s.price < prev.price;
      if (!ok) continue;
      const slope = (s.price - prev.price) / (s.index - prev.index);
      let clean = true;
      for (let j = prev.index + 1; j <= k; j++) {
        const v = prev.price + slope * (j - prev.index);
        if (s.type === 'low' ? c[j].close < v : c[j].close > v) {
          clean = false;
          break;
        }
      }
      const key = `${prev.index}-${s.index}`;
      if (clean && !used.has(key)) {
        used.add(key);
        // A newer line of the same type replaces the older one.
        for (const L of lines) if (L.type === s.type) L.dead = true;
        lines.push({ type: s.type, a: prev, b: s, dead: false });
      }
    }
  }
  return out;

  function pending(k: number): Swing[] {
    const r: Swing[] = [];
    while (si < swings.length && swings[si].confirmIndex <= k) r.push(swings[si++]);
    return r;
  }
}
