import type { Candle } from './types';

/** Deterministic PRNG so the sample series (and its events) are identical on every run. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Regime = { drift: number; vol: number; bars: number; revert?: number };

/**
 * SAMPLE DATA — a synthetic NASDAQ-100-like hourly series (regular session, 7 bars/day).
 * Regime-switching drift + clustered volatility + occasional news shocks, so every
 * market-structure rule has something real to detect. It is NOT historical market data.
 */
export function generateSampleNdx(bars = 1400, seed = 20260306): Candle[] {
  const rnd = mulberry32(seed);
  const gauss = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = rnd();
    while (v === 0) v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const pickRegime = (): Regime => {
    const r = rnd();
    if (r < 0.28) return { drift: 0.0007 + rnd() * 0.0007, vol: 0.0032, bars: 18 + Math.floor(rnd() * 40) };
    if (r < 0.56) return { drift: -(0.0007 + rnd() * 0.0007), vol: 0.0038, bars: 16 + Math.floor(rnd() * 34) };
    return { drift: 0, vol: 0.0022, bars: 18 + Math.floor(rnd() * 30), revert: 0.18 };
  };

  const out: Candle[] = [];
  let price = 19480;
  let regime = pickRegime();
  let left = regime.bars;
  let anchor = price;
  let volState = 1;
  // Session bars start 09:30 New York (14:30 UTC, standard time approximation).
  let day = Date.UTC(2026, 2, 2);
  let slot = 0;

  for (let i = 0; i < bars; i++) {
    if (left-- <= 0) {
      regime = pickRegime();
      left = regime.bars;
      anchor = price;
    }
    volState = Math.max(0.6, Math.min(2.6, volState * 0.93 + 0.07 + Math.abs(gauss()) * 0.06 - 0.04));
    const shock = rnd() < 0.012 ? (rnd() < 0.5 ? -1 : 1) * (0.008 + rnd() * 0.01) : 0;
    const open = price;
    let hi = open;
    let lo = open;
    let p = open;
    const ticks = 12;
    for (let t = 0; t < ticks; t++) {
      const rev = regime.revert ? (regime.revert * (anchor - p)) / anchor / ticks : 0;
      const step = (regime.drift / ticks + rev + (shock / ticks) * (t < 4 ? 2.5 : 0.1)) + (gauss() * regime.vol * volState) / Math.sqrt(ticks);
      p *= 1 + step;
      hi = Math.max(hi, p);
      lo = Math.min(lo, p);
    }
    // Wick extension: occasional stop-runs beyond the body.
    if (rnd() < 0.12) {
      const ext = open * regime.vol * volState * (0.6 + rnd());
      if (rnd() < 0.5) hi += ext;
      else lo -= ext;
    }
    const time = day / 1000 + (14 * 3600 + 30 * 60) + slot * 3600;
    out.push({
      time,
      open: round(open),
      high: round(hi),
      low: round(lo),
      close: round(p),
      volume: Math.round((1.4e6 + rnd() * 1.2e6) * volState * (shock ? 3 : 1)),
    });
    price = p;
    slot++;
    if (slot >= 7) {
      slot = 0;
      do {
        day += 86400000;
      } while ([0, 6].includes(new Date(day).getUTCDay()));
    }
  }
  return out;
}

const round = (x: number) => Math.round(x * 100) / 100;
