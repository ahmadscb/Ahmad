import type { EventKind } from '@/core/types';

export const KIND_META: Record<EventKind, { name: string; fx: string; xp: number; major: boolean }> = {
  liquidity_sweep: { name: 'Liquidity Sweep', fx: 'Thief steals liquidity', xp: 60, major: true },
  bos: { name: 'Break of Structure', fx: 'Wall breaks / floor collapses', xp: 40, major: true },
  choch: { name: 'Change of Character', fx: 'Realm transition', xp: 90, major: true },
  fvg: { name: 'Fair Value Gap', fx: 'Energy portal', xp: 10, major: false },
  trend: { name: 'Strong Trend', fx: 'Energy trail', xp: 30, major: false },
  spike: { name: 'Price Spike', fx: 'Explosion & flames', xp: 70, major: true },
  trendline_break: { name: 'Trendline Break', fx: 'Electric fracture', xp: 35, major: false },
  liquidity_pool: { name: 'Liquidity Pool', fx: 'Pulsing energy', xp: 20, major: false },
  consolidation: { name: 'Consolidation', fx: 'Arena forms', xp: 20, major: false },
  breakout: { name: 'Range Breakout', fx: 'Energy burst', xp: 50, major: true },
};

/** Toggle groups shown in the effects panel. */
export const FX_GROUPS: { label: string; kinds: EventKind[] }[] = [
  { label: 'Thief sweeps', kinds: ['liquidity_sweep'] },
  { label: 'BOS walls', kinds: ['bos'] },
  { label: 'CHoCH realms', kinds: ['choch'] },
  { label: 'FVG portals', kinds: ['fvg'] },
  { label: 'Trend trails', kinds: ['trend'] },
  { label: 'Spikes', kinds: ['spike'] },
  { label: 'Trendlines', kinds: ['trendline_break'] },
  { label: 'Liquidity pools', kinds: ['liquidity_pool'] },
  { label: 'Arenas & breakouts', kinds: ['consolidation', 'breakout'] },
];
