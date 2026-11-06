import { describe, expect, it } from 'vitest';
import { detectAll } from '../src/core/detect';
import { generateSampleNdx } from '../src/core/sample';
import type { MarketEvent } from '../src/core/types';

const candles = generateSampleNdx();
const full = detectAll(candles);

/** Drop information that is only valid after `k` (it is gated at render time). */
function knownAt(events: MarketEvent[], k: number) {
  return events
    .filter((e) => e.confirmIndex <= k)
    .map((e) => ({ ...e, endIndex: e.endIndex !== undefined && e.endIndex <= k ? e.endIndex : undefined }));
}

describe('rule-based detection', () => {
  it('finds every event family on the sample series', () => {
    const kinds = new Set(full.map((e) => e.kind));
    for (const k of ['liquidity_sweep', 'bos', 'choch', 'fvg', 'trend', 'spike', 'trendline_break', 'liquidity_pool', 'consolidation', 'breakout'])
      expect(kinds.has(k as MarketEvent['kind'])).toBe(true);
  });

  it('never confirms an event before its anchor candle', () => {
    for (const e of full) {
      expect(e.confirmIndex).toBeGreaterThanOrEqual(e.index);
      if (e.fromIndex !== undefined) expect(e.fromIndex).toBeLessThanOrEqual(e.index);
    }
  });

  it('is causal: running on a prefix reproduces exactly the events known at that point', () => {
    // If any detector peeked at future candles, its output on a truncated series would differ.
    for (let k = 40; k < candles.length; k += 37) {
      const prefix = detectAll(candles.slice(0, k + 1));
      expect(knownAt(prefix, k)).toEqual(knownAt(full, k));
    }
  });

  it('gives every event a unique id', () => {
    expect(new Set(full.map((e) => e.id)).size).toBe(full.length);
  });

  it('is deterministic', () => {
    expect(detectAll(generateSampleNdx())).toEqual(full);
  });
});
