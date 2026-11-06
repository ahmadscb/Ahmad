import type { Candle, MarketEvent } from '../types';
import { type Swing, swingsByConfirm } from './swings';

interface Level {
  swing: Swing;
  /** Other swings that formed an equal-high/low cluster with this one. */
  cluster: Swing[];
  poolId?: string;
  pending?: number; // candle index of a wick through the level awaiting confirmation
  dead: boolean;
}

/**
 * Liquidity.
 * Pool rule: two or more confirmed swing highs (lows) within 0.25×ATR of each other, at most
 *   60 bars apart, with no close beyond them in between → resting buy-side (sell-side) liquidity.
 *   Known when the second swing is confirmed.
 * Sweep rule: a candle trades through an unbroken swing level by ≥0.05×ATR but CLOSES back
 *   inside, and the NEXT candle also closes inside → stop-run / liquidity sweep.
 *   Confirmed at the close of that next candle. A close beyond the level kills it (a break, not
 *   a sweep). Levels expire after 150 bars.
 */
export function detectLiquidity(c: Candle[], swings: Swing[], atr: number[]): MarketEvent[] {
  const byConf = swingsByConfirm(swings);
  const out: MarketEvent[] = [];
  const levels: Level[] = [];
  const pools = new Map<string, MarketEvent>();

  for (let k = 0; k < c.length; k++) {
    const a = Math.max(atr[k], 1e-9);
    const bar = c[k];
    for (const L of levels) {
      if (L.dead) continue;
      const s = L.swing;
      const top = Math.max(s.price, ...L.cluster.map((x) => x.price));
      const bot = Math.min(s.price, ...L.cluster.map((x) => x.price));
      const lvl = s.type === 'high' ? top : bot;
      if (k - s.index > 150) {
        L.dead = true;
        continue;
      }
      const beyondClose = s.type === 'high' ? bar.close > lvl : bar.close < lvl;
      if (L.pending !== undefined) {
        const p = L.pending;
        L.pending = undefined;
        if (!beyondClose) {
          const w = c[p];
          const extreme = s.type === 'high' ? w.high : w.low;
          const dir = s.type === 'high' ? 'bear' : 'bull';
          // One sweep per candle and side: if several levels were run by the same wick, the
          // first (oldest) level reported stands for the stop-run.
          if (out.some((e) => e.kind === 'liquidity_sweep' && e.index === p && e.dir === dir)) {
            if (L.poolId) {
              const pool = pools.get(L.poolId);
              if (pool) pool.endIndex = k;
            }
            L.dead = true;
            continue;
          }
          out.push({
            id: `sweep-${dir}-${p}`,
            kind: 'liquidity_sweep',
            dir,
            index: p,
            confirmIndex: k,
            price: lvl,
            price2: extreme,
            fromIndex: Math.min(s.index, ...L.cluster.map((x) => x.index)),
            strength: Math.min(1, 0.45 + Math.abs(extreme - lvl) / a / 2 + L.cluster.length * 0.15),
            label: `${s.type === 'high' ? 'Buy-side' : 'Sell-side'} liquidity sweep`,
            rule: `Wick ran ${s.type === 'high' ? 'above' : 'below'} the ${
              L.cluster.length ? 'equal-' + s.type + 's pool' : 'swing ' + s.type
            } at ${lvl.toFixed(2)} to ${extreme.toFixed(2)}, then closed back inside on that bar and the next.`,
          });
          if (L.poolId) {
            const pool = pools.get(L.poolId);
            if (pool) pool.endIndex = k; // known only once the sweep is confirmed
          }
          L.dead = true;
          continue;
        }
      }
      if (beyondClose) {
        L.dead = true;
        if (L.poolId) {
          const pool = pools.get(L.poolId);
          if (pool) pool.endIndex = k;
        }
        continue;
      }
      const pierce = s.type === 'high' ? bar.high - lvl : lvl - bar.low;
      if (k - s.index >= 5 && k > s.confirmIndex && pierce >= 0.05 * a) L.pending = k;
    }

    for (const s of byConf.get(k) ?? []) {
      if (c.slice(s.index + 1, k + 1).some((x) => (s.type === 'high' ? x.close > s.price : x.close < s.price))) continue;
      // Equal highs / lows: merge with a live level of the same type.
      const match = levels.find(
        (L) =>
          !L.dead &&
          L.swing.type === s.type &&
          s.index - L.swing.index <= 60 &&
          s.index - L.swing.index >= 4 &&
          Math.abs(L.swing.price - s.price) <= 0.25 * a,
      );
      if (match) {
        match.cluster.push(s);
        if (!match.poolId) {
          const all = [match.swing, ...match.cluster];
          const lvl = s.type === 'high' ? Math.max(...all.map((x) => x.price)) : Math.min(...all.map((x) => x.price));
          const ev: MarketEvent = {
            id: `pool-${s.type}-${s.index}`,
            kind: 'liquidity_pool',
            dir: s.type === 'high' ? 'bear' : 'bull',
            index: s.index,
            confirmIndex: k,
            price: lvl,
            fromIndex: match.swing.index,
            strength: 0.7,
            label: s.type === 'high' ? 'Buy-side liquidity pool' : 'Sell-side liquidity pool',
            rule: `Equal ${s.type}s at ${match.swing.price.toFixed(2)} and ${s.price.toFixed(2)} (within 0.25×ATR) — resting stops cluster ${
              s.type === 'high' ? 'above' : 'below'
            }.`,
          };
          match.poolId = ev.id;
          pools.set(ev.id, ev);
          out.push(ev);
        }
      } else {
        levels.push({ swing: s, cluster: [], dead: false });
      }
    }
  }
  return out;
}
