import type { Candle, MarketEvent } from '../types';

/**
 * Fair Value Gap (3-candle imbalance).
 * Bullish: low[i] > high[i-2]; bearish: high[i] < low[i-2]. Gap must be ≥ 0.5×ATR.
 * Known at the close of candle i; anchored on the middle (displacement) candle i-1.
 * Mitigated (endIndex) when a later candle trades back to the far edge of the gap.
 */
export function detectFVG(c: Candle[], atr: number[]): MarketEvent[] {
  const out: MarketEvent[] = [];
  for (let i = 2; i < c.length; i++) {
    const a = Math.max(atr[i - 1], 1e-9);
    const bull = c[i].low - c[i - 2].high;
    const bear = c[i - 2].low - c[i].high;
    if (bull >= 0.5 * a || bear >= 0.5 * a) {
      const isBull = bull > 0;
      const top = isBull ? c[i].low : c[i - 2].low;
      const bot = isBull ? c[i - 2].high : c[i].high;
      const ev: MarketEvent = {
        id: `fvg-${isBull ? 'bull' : 'bear'}-${i - 1}`,
        kind: 'fvg',
        dir: isBull ? 'bull' : 'bear',
        index: i - 1,
        confirmIndex: i,
        fromIndex: i - 1,
        price: top,
        price2: bot,
        strength: Math.min(1, (top - bot) / a / 1.5),
        label: `${isBull ? 'Bullish' : 'Bearish'} fair value gap`,
        rule: `Three-candle imbalance: ${isBull ? 'candle low' : 'candle high'} left a ${(top - bot).toFixed(2)}-point gap (${(
          (top - bot) /
          a
        ).toFixed(2)}×ATR) between ${bot.toFixed(2)} and ${top.toFixed(2)}.`,
      };
      for (let j = i + 1; j < c.length; j++) {
        if (isBull ? c[j].low <= bot : c[j].high >= top) {
          ev.endIndex = j;
          break;
        }
        if (j - i > 200) {
          ev.endIndex = j;
          break;
        }
      }
      out.push(ev);
    }
  }
  return out;
}
