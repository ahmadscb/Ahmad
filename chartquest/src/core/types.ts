/** Shared domain types. Framework-free so they can be reused by a future ingestion service. */

export interface Candle {
  /** Unix time in seconds (bar open). */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Dir = 'bull' | 'bear';

export type EventKind =
  | 'liquidity_sweep'
  | 'bos'
  | 'choch'
  | 'fvg'
  | 'trend'
  | 'spike'
  | 'trendline_break'
  | 'liquidity_pool'
  | 'consolidation'
  | 'breakout';

export interface MarketEvent {
  id: string;
  kind: EventKind;
  dir: Dir;
  /** Candle index the event is visually anchored to. */
  index: number;
  /**
   * First candle index at whose CLOSE the event is fully knowable.
   * Replay never reveals an event before this candle has closed.
   */
  confirmIndex: number;
  /** Primary price level (broken level, swept level, zone top, range top...). */
  price: number;
  /** Secondary price level (zone bottom, range bottom, wick extreme...). */
  price2?: number;
  /** Origin candle (swing that formed the level, range start, trend start). */
  fromIndex?: number;
  /**
   * Index at which a persistent object ended (FVG mitigated, range broken, trend faded,
   * pool swept). Only valid in replay once currentIndex >= endIndex.
   */
  endIndex?: number;
  /** Trendline anchor points (for trendline_break). */
  line?: { i1: number; p1: number; i2: number; p2: number };
  strength: number;
  label: string;
  /** Human-readable description of the rule that fired. */
  rule: string;
}

export interface MarketMeta {
  symbol: string;
  name: string;
  timeframe: string;
  source: string;
  isSample: boolean;
}

export interface MarketPayload {
  meta: MarketMeta;
  candles: Candle[];
  events: MarketEvent[];
}
