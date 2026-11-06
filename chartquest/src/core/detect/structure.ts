import type { Candle, Dir, MarketEvent } from '../types';
import { type Swing, swingsByConfirm } from './swings';

/**
 * Market structure.
 * Rule: a CLOSE beyond the most recent confirmed, unbroken swing high (low) is a break.
 *  - break in the direction of the current structure (or first break) → BOS
 *  - break against the current structure → CHoCH (change of character), which flips structure.
 * Breaks are checked against swings confirmed on earlier candles only, so the event is known
 * at the close of the breaking candle.
 */
export function detectStructure(c: Candle[], swings: Swing[], atr: number[]): MarketEvent[] {
  const byConf = swingsByConfirm(swings);
  const out: MarketEvent[] = [];
  let trend: Dir | null = null;
  let hi: Swing | null = null;
  let lo: Swing | null = null;

  for (let k = 0; k < c.length; k++) {
    const close = c[k].close;
    if (hi && close > hi.price) {
      const kind = trend === 'bear' ? 'choch' : 'bos';
      out.push(mk(kind, 'bull', k, hi, atr[k], close));
      trend = 'bull';
      hi = null;
    }
    if (lo && close < lo.price) {
      const kind = trend === 'bull' ? 'choch' : 'bos';
      out.push(mk(kind, 'bear', k, lo, atr[k], close));
      trend = 'bear';
      lo = null;
    }
    for (const s of byConf.get(k) ?? []) {
      // A swing that the confirming candles already closed through is not a valid level.
      if (s.type === 'high') {
        if (!c.slice(s.index + 1, k + 1).some((x) => x.close > s.price)) hi = s;
      } else if (!c.slice(s.index + 1, k + 1).some((x) => x.close < s.price)) lo = s;
    }
  }
  return out;
}

function mk(kind: 'bos' | 'choch', dir: Dir, k: number, s: Swing, a: number, close: number): MarketEvent {
  const strength = Math.min(1, Math.abs(close - s.price) / Math.max(a, 1e-9) / 1.5 + 0.35);
  const name = kind === 'bos' ? 'Break of Structure' : 'Change of Character';
  return {
    id: `${kind}-${dir}-${k}`,
    kind,
    dir,
    index: k,
    confirmIndex: k,
    price: s.price,
    fromIndex: s.index,
    strength,
    label: `${dir === 'bull' ? 'Bullish' : 'Bearish'} ${kind === 'bos' ? 'BOS' : 'CHoCH'}`,
    rule: `${name}: candle closed ${dir === 'bull' ? 'above' : 'below'} the confirmed swing ${
      s.type
    } at ${s.price.toFixed(2)} (formed ${k - s.index} bars earlier)${
      kind === 'choch' ? ', against the prevailing structure' : ''
    }.`,
  };
}
