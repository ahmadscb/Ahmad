import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCsv } from '@/core/csv';
import type { MarketDataProvider } from './types';

/** Every `data/*.csv` file becomes a selectable symbol (e.g. data/QQQ-1h.csv → "QQQ-1h"). */
export async function csvProviders(dir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'data')): Promise<MarketDataProvider[]> {
  let files: string[] = [];
  try {
    files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith('.csv'));
  } catch {
    return [];
  }
  return files.map((f) => {
    const id = f.replace(/\.csv$/i, '');
    return {
      id,
      meta: { symbol: id, name: `${id} · local CSV`, timeframe: '', source: `data/${f}`, isSample: false },
      load: async () => parseCsv(await readFile(path.join(/*turbopackIgnore: true*/ dir, f), 'utf8')),
    };
  });
}
