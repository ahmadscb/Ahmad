import type { Candle } from './types';

/**
 * Parse OHLC(V) CSV. Header must contain time|date|datetime, open, high, low, close[, volume].
 * Time may be unix seconds/ms or any Date-parsable string. Rows are sorted and de-duplicated.
 */
export function parseCsv(text: string): Candle[] {
  const lines = text.trim().split(/\r?\n/);
  const head = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim().replace(/"/g, ''));
  const col = (...names: string[]) => head.findIndex((h) => names.includes(h));
  const ti = col('time', 'date', 'datetime', 'timestamp');
  const [oi, hi, li, ci, vi] = [col('open'), col('high'), col('low'), col('close', 'adj close'), col('volume', 'vol')];
  if ([ti, oi, hi, li, ci].some((i) => i < 0)) throw new Error('CSV needs time/date, open, high, low, close columns');
  const rows: Candle[] = [];
  for (const line of lines.slice(1)) {
    const f = line.split(/[,;\t]/).map((x) => x.trim().replace(/"/g, ''));
    const raw = f[ti];
    let t = Number(raw);
    if (!Number.isFinite(t)) t = Date.parse(raw) / 1000;
    else if (t > 1e12) t = t / 1000;
    const c = { time: Math.floor(t), open: +f[oi], high: +f[hi], low: +f[li], close: +f[ci], volume: vi >= 0 ? +f[vi] || 0 : 0 };
    if ([c.time, c.open, c.high, c.low, c.close].every(Number.isFinite) && c.high >= c.low) rows.push(c);
  }
  rows.sort((a, b) => a.time - b.time);
  return rows.filter((r, i) => i === 0 || r.time !== rows[i - 1].time);
}
