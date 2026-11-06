import { atr, ema } from '../indicators';
import type { Candle, MarketEvent } from '../types';
import { detectFVG } from './fvg';
import { detectLiquidity } from './liquidity';
import { detectSpikes, detectTrends } from './momentum';
import { detectRanges } from './range';
import { detectStructure } from './structure';
import { findSwings } from './swings';
import { detectTrendlineBreaks } from './trendline';

export { findSwings } from './swings';

/**
 * Run every rule-based detector. All detectors are causal: an event with confirmIndex k is
 * derived from candles[0..k] only (verified by tests/causality.test.ts).
 */
export function detectAll(candles: Candle[]): MarketEvent[] {
  const a = atr(candles, 14);
  const e21 = ema(candles, 21);
  const swings = findSwings(candles, 3, 3);
  const events = [
    ...detectStructure(candles, swings, a),
    ...detectLiquidity(candles, swings, a),
    ...detectFVG(candles, a),
    ...detectTrends(candles, a, e21),
    ...detectSpikes(candles, a),
    ...detectRanges(candles, a),
    ...detectTrendlineBreaks(candles, swings, a),
  ];
  return events.sort((x, y) => x.confirmIndex - y.confirmIndex || x.index - y.index || x.id.localeCompare(y.id));
}
