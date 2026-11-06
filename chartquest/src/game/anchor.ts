/**
 * Chart ↔ game coordinate bridge. Every effect is positioned from (candle index, price) through
 * the live chart mapping each frame, so zoom/pan/replay keep effects glued to candles.
 */
export interface ChartMapper {
  /** Logical (candle index) → x pixel in the chart pane. Works for fractional/future indices. */
  x(index: number): number | null;
  /** Price → y pixel in the chart pane. */
  y(price: number): number | null;
  /** Pixel width of one bar at current zoom. */
  barW: number;
  /** Pane size (excludes price/time axes). */
  width: number;
  height: number;
  /** Current replay head (last revealed candle index). */
  head: number;
}

export class Anchor {
  sx = 0;
  sy = 0;
  visible = true;
  private stamp = Number.NaN;
  constructor(
    public index: number,
    public price: number,
  ) {}
  resolve(m: ChartMapper, frame: number) {
    if (this.stamp === frame) return this;
    this.stamp = frame;
    const x = m.x(this.index);
    const y = m.y(this.price);
    this.visible = x !== null && y !== null;
    if (x !== null) this.sx = x;
    if (y !== null) this.sy = y;
    return this;
  }
}
