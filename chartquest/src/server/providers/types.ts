import type { Candle, MarketMeta } from '@/core/types';

/**
 * A market-data source. The prototype ships a synthetic sample and a local CSV reader;
 * a live feed (websocket/REST vendor) can implement the same interface later.
 */
export interface MarketDataProvider {
  id: string;
  meta: MarketMeta;
  load(): Promise<Candle[]>;
}
