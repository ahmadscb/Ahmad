import type { Dir, EventKind } from '@/core/types';

/** Hex-framed SVG crest per event family (bespoke glyphs, no icon font). */
const GLYPH: Record<EventKind, string> = {
  liquidity_sweep: 'M7 13c0-4 3-6 5-6s5 2 5 6v1H7z M9 11h2 M13 11h2 M10 16l2 2 2-2', // masked hood
  bos: 'M6 17h4v-4H6z M10 17h4v-4h-4z M14 17h4v-4h-4z M8 13h4V9H8z M14 9l2-3 M12 8l1-3', // wall + debris
  choch: 'M5 15c3-6 5 2 7-3s4-4 7-4 M15 6l4 2-2 4', // reversal swirl
  fvg: 'M12 5a7 3.5 0 1 0 .01 0 M12 8a4 2 0 1 0 .01 0', // portal
  trend: 'M4 17l5-5 3 3 7-8 M15 7h4v4', // trail arrow
  spike: 'M12 3l2 6 5-2-3 5 4 3-6 0-2 6-2-6-6 0 4-3-3-5 5 2z', // starburst
  trendline_break: 'M4 18L11 11 M13 9L20 4 M10 7l3 3-2 1 3 3', // fractured line + bolt
  liquidity_pool: 'M12 4c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z M10 14a2 2 0 0 0 2 2', // droplet
  consolidation: 'M5 6h14 M5 18h14 M7 6v12 M17 6v12', // arena
  breakout: 'M5 16h14 M12 16V5 M8 9l4-4 4 4 M7 19h10', // burst through
};

export function Emblem({ kind, dir, size = 34 }: { kind: EventKind; dir: Dir; size?: number }) {
  const col = kind === 'liquidity_sweep' || kind === 'liquidity_pool' ? '#ffc940' : kind === 'fvg' ? (dir === 'bull' ? '#2de2ff' : '#a66bff') : kind === 'consolidation' ? '#8c9bff' : dir === 'bull' ? '#22ffa6' : '#ff2e5b';
  const id = `g-${kind}-${dir}`;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="cq-emblem" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity="0.35" />
          <stop offset="1" stopColor="#05060d" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <path d="M12 1.5l9 5.2v10.6l-9 5.2-9-5.2V6.7z" fill={`url(#${id})`} stroke={col} strokeWidth="1" />
      <path d="M12 3.6l7.2 4.1v8.6L12 20.4l-7.2-4.1V7.7z" fill="none" stroke={col} strokeOpacity="0.35" strokeWidth="0.5" />
      <path d={GLYPH[kind]} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(2.4 2.4) scale(0.8)" style={{ filter: `drop-shadow(0 0 2px ${col})` }} />
    </svg>
  );
}
