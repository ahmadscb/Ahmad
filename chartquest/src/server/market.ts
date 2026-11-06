import { detectAll } from '@/core/detect';
import type { MarketPayload } from '@/core/types';
import { csvProviders } from './providers/csv';
import { sampleNdxProvider } from './providers/sample';
import type { MarketDataProvider } from './providers/types';

export async function listProviders(): Promise<MarketDataProvider[]> {
  return [sampleNdxProvider, ...(await csvProviders())];
}

const cache = new Map<string, MarketPayload>();

/** Ingest → detect pipeline. Detection runs server-side; the client only replays. */
export async function getMarket(id: string): Promise<MarketPayload | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = (await listProviders()).find((x) => x.id === id);
  if (!p) return null;
  const candles = await p.load();
  const payload = { meta: p.meta, candles, events: detectAll(candles) };
  cache.set(id, payload);
  return payload;
}
