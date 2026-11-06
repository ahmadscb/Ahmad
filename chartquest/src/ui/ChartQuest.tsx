'use client';

import { CandlestickSeries, ColorType, CrosshairMode, createChart, type IChartApi, type ISeriesApi, type Logical, type UTCTimestamp } from 'lightweight-charts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { parseCsv } from '@/core/csv';
import { detectAll } from '@/core/detect';
import type { Candle, EventKind, MarketEvent, MarketMeta, MarketPayload } from '@/core/types';
import type { ChartMapper } from '@/game/anchor';
import type { EngineStats, GameEngine, Quality } from '@/game/engine';
import { Emblem } from './Emblem';
import { FX_GROUPS, KIND_META } from './kinds';

const SPEEDS = [0.5, 1, 2, 4, 8];
const BARS_PER_SEC = 2.2;
const START_HEAD = 160;

const toBar = (c: Candle) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close });
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtTime = (t: number) =>
  new Date(t * 1000).toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

interface LogItem {
  ev: MarketEvent;
  at: number;
}

export default function ChartQuest() {
  const stageRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const series = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const engine = useRef<GameEngine | null>(null);
  const headRef = useRef(-1);

  const [data, setData] = useState<MarketPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [head, setHead] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState<Quality>('high');
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [log, setLog] = useState<LogItem[]>([]);
  const [xp, setXp] = useState(0);
  const [selected, setSelected] = useState<MarketEvent | null>(null);
  const [hover, setHover] = useState<Candle | null>(null);
  const [stats, setStats] = useState<EngineStats>({ fps: 0, particles: 0, effects: 0 });
  const [regime, setRegime] = useState<'bull' | 'bear' | null>(null);
  const [engineReady, setEngineReady] = useState(false);

  // ── Load market payload (server ingest + detection) ─────────────────────────────
  useEffect(() => {
    fetch('/api/market?symbol=NDX-SAMPLE')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((p: MarketPayload) => setData(p))
      .catch((e) => setError(String(e)));
  }, []);

  // ── Chart + engine bootstrap ────────────────────────────────────────────────────
  useEffect(() => {
    const host = chartRef.current!;
    const c = createChart(host, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8f9bd0', fontFamily: 'Rajdhani, system-ui, sans-serif', fontSize: 12, attributionLogo: false },
      grid: { vertLines: { color: 'rgba(110,120,255,0.06)' }, horzLines: { color: 'rgba(110,120,255,0.07)' } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(45,226,255,0.45)', labelBackgroundColor: '#1b1f52', width: 1, style: 3 },
        horzLine: { color: 'rgba(45,226,255,0.45)', labelBackgroundColor: '#1b1f52', width: 1, style: 3 },
      },
      rightPriceScale: { borderColor: 'rgba(120,130,255,0.18)', scaleMargins: { top: 0.14, bottom: 0.12 } },
      timeScale: { borderColor: 'rgba(120,130,255,0.18)', timeVisible: true, rightOffset: 22, barSpacing: 10, shiftVisibleRangeOnNewBar: true },
      localization: { priceFormatter: (p: number) => fmt(p) },
    });
    const s = c.addSeries(CandlestickSeries, {
      upColor: '#19f5a0',
      downColor: '#ff2e5b',
      wickUpColor: '#7dffcf',
      wickDownColor: '#ff7d99',
      borderVisible: false,
      priceLineColor: '#2de2ff',
      priceLineStyle: 2,
    });
    chart.current = c;
    series.current = s;
    c.subscribeCrosshairMove((p) => {
      const d = p.seriesData.get(s) as { open: number; high: number; low: number; close: number; time: number } | undefined;
      setHover(d ? { time: d.time, open: d.open, high: d.high, low: d.low, close: d.close, volume: 0 } : null);
    });

    let eng: GameEngine | null = null;
    let cancelled = false;
    (async () => {
      await document.fonts?.ready;
      const { GameEngine } = await import('@/game/engine');
      if (cancelled) return;
      eng = new GameEngine();
      await eng.init(backRef.current!, frontRef.current!);
      if (cancelled) {
        eng.destroy();
        return;
      }
      eng.setMapper((): ChartMapper | null => {
        const ts = c.timeScale();
        const x0 = ts.logicalToCoordinate(0 as Logical);
        const x1 = ts.logicalToCoordinate(1 as Logical);
        if (x0 === null || x1 === null) return null;
        // Bars are laid out uniformly, so x is linear in the logical index. (Lightweight
        // Charts does not interpolate fractional logicals, which zones/portals rely on.)
        const bw = x1 - x0;
        return {
          x: (i) => x0 + i * bw,
          y: (p) => s.priceToCoordinate(p),
          barW: bw,
          width: ts.width(),
          height: c.paneSize(0).height,
          head: headRef.current,
        };
      });
      engine.current = eng;
      setEngineReady(true);
    })();

    return () => {
      cancelled = true;
      eng?.destroy();
      engine.current = null;
      c.remove();
    };
  }, []);

  const candles = data?.candles ?? [];
  const events = data?.events ?? [];

  // Feed data to the engine once both exist; start the replay at START_HEAD.
  useEffect(() => {
    if (!data || !engineReady || !engine.current) return;
    const eng = engine.current;
    eng.setData(data.candles, data.events);
    eng.onEventFired = (ev) => {
      setLog((l) => [{ ev, at: Date.now() }, ...l].slice(0, 60));
      setXp((x) => x + KIND_META[ev.kind].xp);
    };
    seek(Math.min(START_HEAD, data.candles.length - 1));
    chart.current?.timeScale().setVisibleLogicalRange({ from: START_HEAD - 90, to: START_HEAD + 22 });
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, engineReady]);

  /** Jump the replay head without cinematics (events appear already formed). */
  const seek = useCallback(
    (h: number) => {
      if (!data || !series.current) return;
      const clamped = Math.max(0, Math.min(data.candles.length - 1, h));
      series.current.setData(data.candles.slice(0, clamped + 1).map(toBar));
      headRef.current = clamped;
      setHead(clamped);
      engine.current?.setHead(clamped, false);
      setRegime(engine.current?.regimeAt(clamped) ?? null);
      setLog(data.events.filter((e) => e.confirmIndex <= clamped).slice(-14).reverse().map((ev) => ({ ev, at: 0 })));
    },
    [data],
  );

  /** Reveal the next candle(s) with cinematics. */
  const advance = useCallback(
    (n = 1) => {
      if (!data || !series.current) return false;
      let h = headRef.current;
      for (let k = 0; k < n && h < data.candles.length - 1; k++) {
        h++;
        series.current.update(toBar(data.candles[h]));
      }
      if (h === headRef.current) return false;
      headRef.current = h;
      setHead(h);
      engine.current?.setHead(h, true);
      setRegime(engine.current?.regimeAt(h) ?? null);
      return true;
    },
    [data],
  );

  // Test/debug hook (only with ?debug=1): lets the e2e script seek and probe sync.
  useEffect(() => {
    if (typeof window === 'undefined' || !new URLSearchParams(window.location.search).has('debug')) return;
    (window as unknown as Record<string, unknown>).__cq = {
      seek,
      advance,
      setPlaying,
      setSpeed,
      events: () => data?.events ?? [],
      head: () => headRef.current,
      chart: () => chart.current,
      probe: (i: number, p: number) => ({
        chartX: chart.current?.timeScale().logicalToCoordinate(i as Logical),
        chartY: series.current?.priceToCoordinate(p),
        engine: engine.current?.probe(i, p),
      }),
      stats: () => engine.current?.stats(),
    };
  }, [seek, advance, data]);

  // ── Replay clock ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (engine.current) engine.current.playing = playing;
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      acc += ((now - last) / 1000) * BARS_PER_SEC * speed;
      last = now;
      if (acc >= 1) {
        const n = Math.floor(acc);
        acc -= n;
        if (!advance(n)) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, advance]);

  useEffect(() => {
    const id = setInterval(() => engine.current && setStats(engine.current.stats()), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => engine.current?.setMuted(muted), [muted, engineReady]);
  useEffect(() => engine.current?.setQuality(quality), [quality, engineReady]);
  useEffect(() => {
    for (const [k, v] of Object.entries(enabled)) engine.current?.setEnabled(k as EventKind, v);
  }, [enabled, engineReady]);

  // Keyboard: space play/pause, ←/→ step, M mute.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        engine.current?.unlockAudio();
        setPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') advance(1);
      else if (e.code === 'ArrowLeft') seek(headRef.current - 1);
      else if (e.code === 'KeyM') setMuted((m) => !m);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [advance, seek]);

  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const lvlBase = (level - 1) ** 2 * 60;
  const lvlNext = level ** 2 * 60;
  const lvlPct = ((xp - lvlBase) / (lvlNext - lvlBase)) * 100;

  const majorTicks = useMemo(() => events.filter((e) => KIND_META[e.kind].major), [events]);
  const counts = useMemo(() => {
    const c: Partial<Record<EventKind, number>> = {};
    for (const e of events) if (e.confirmIndex <= head) c[e.kind] = (c[e.kind] ?? 0) + 1;
    return c;
  }, [events, head]);

  const cur = hover ?? candles[head];
  const prevClose = head > 0 ? candles[head - 1]?.close : undefined;

  const focusEvent = (ev: MarketEvent) => {
    setSelected(ev);
    const ts = chart.current?.timeScale();
    const r = ts?.getVisibleLogicalRange();
    if (ts && r) {
      const span = Math.max(40, r.to - r.from);
      ts.setVisibleLogicalRange({ from: ev.index - span * 0.6, to: ev.index + span * 0.4 });
    }
    engine.current?.unlockAudio();
    setTimeout(() => engine.current?.replayEvent(ev), 60);
  };

  const onCsv = async (f: File) => {
    try {
      const c = parseCsv(await f.text());
      if (c.length < 50) throw new Error('need at least 50 candles');
      const meta: MarketMeta = { symbol: f.name.replace(/\.csv$/i, ''), name: `${f.name} · local file`, timeframe: '', source: f.name, isSample: false };
      setPlaying(false);
      setLog([]);
      setXp(0);
      setData({ meta, candles: c, events: detectAll(c) });
    } catch (e) {
      setError(`CSV: ${(e as Error).message}`);
    }
  };

  return (
    <div className={`cq-root realm-${regime ?? 'neutral'}`}>
      <header className="cq-top">
        <div className="cq-logo">
          <span className="cq-logo-mark" />
          <span className="cq-logo-text">CHART<b>QUEST</b></span>
        </div>
        <div className="cq-symbol">
          <div className="cq-symbol-main">
            <span className="cq-ticker">{data?.meta.symbol ?? 'NDX'}</span>
            <span className="cq-tf">{data?.meta.timeframe || '—'}</span>
          </div>
          <div className="cq-symbol-sub">{data?.meta.name ?? 'Loading market…'}</div>
        </div>
        {data?.meta.isSample && (
          <div className="cq-sample" title={data.meta.source}>
            SAMPLE DATA · SYNTHETIC
          </div>
        )}
        <div className={`cq-realm cq-realm-${regime ?? 'neutral'}`}>
          <span className="cq-realm-k">REALM</span>
          <span className="cq-realm-v">{regime === 'bull' ? 'BULL DOMINION' : regime === 'bear' ? 'BEAR DOMINION' : 'UNCLAIMED'}</span>
        </div>
        <div className="cq-xp">
          <div className="cq-lvl">
            <span>LV</span>
            <b>{level}</b>
          </div>
          <div className="cq-xp-bar">
            <div className="cq-xp-fill" style={{ width: `${lvlPct}%` }} />
            <span className="cq-xp-text">
              {xp} / {lvlNext} XP
            </span>
          </div>
        </div>
        <div className="cq-perf">
          <span>{stats.fps} FPS</span>
          <span>{stats.particles} PTCL</span>
          <span>{stats.effects} FX</span>
        </div>
      </header>

      <main className="cq-main">
        <section className="cq-stage" ref={stageRef} onPointerDown={() => engine.current?.unlockAudio()}>
          <div className="cq-layer" ref={backRef} />
          <div className="cq-layer cq-chart" ref={chartRef} />
          <div className="cq-layer cq-front" ref={frontRef} />
          <div className="cq-ohlc">
            {cur && (
              <>
                <span className="cq-ohlc-t">{fmtTime(cur.time)} ET</span>
                <span>O <b>{fmt(cur.open)}</b></span>
                <span>H <b>{fmt(cur.high)}</b></span>
                <span>L <b>{fmt(cur.low)}</b></span>
                <span>
                  C <b className={cur.close >= cur.open ? 'up' : 'dn'}>{fmt(cur.close)}</b>
                </span>
                {!hover && prevClose !== undefined && (
                  <span className={cur.close >= prevClose ? 'up' : 'dn'}>
                    {cur.close >= prevClose ? '+' : ''}
                    {(((cur.close - prevClose) / prevClose) * 100).toFixed(2)}%
                  </span>
                )}
              </>
            )}
          </div>
          {error && <div className="cq-error">{error}</div>}
          {!data && !error && <div className="cq-loading">FORGING THE ARENA…</div>}
        </section>

        <aside className="cq-side">
          <div className="cq-panel-title">
            <span>QUEST LOG</span>
            <small>{events.filter((e) => e.confirmIndex <= head).length} events revealed</small>
          </div>
          <ul className="cq-log">
            {log.map(({ ev, at }) => (
              <li key={ev.id + at} data-confirm={ev.confirmIndex} className={`cq-log-item dir-${ev.dir} ${at ? 'fresh' : ''} ${selected?.id === ev.id ? 'sel' : ''}`} onClick={() => focusEvent(ev)}>
                <Emblem kind={ev.kind} dir={ev.dir} />
                <div className="cq-log-body">
                  <div className="cq-log-name">{ev.label}</div>
                  <div className="cq-log-meta">
                    {fmtTime(candles[ev.index]?.time ?? 0)} · {fmt(ev.price)}
                  </div>
                </div>
                <div className="cq-log-xp">+{KIND_META[ev.kind].xp}</div>
              </li>
            ))}
          </ul>
          <div className="cq-rule">
            <div className="cq-panel-title">
              <span>RULE CODEX</span>
            </div>
            {selected ? (
              <>
                <div className="cq-rule-name">
                  <Emblem kind={selected.kind} dir={selected.dir} size={26} /> {selected.label}
                </div>
                <p>{selected.rule}</p>
                <p className="cq-rule-conf">
                  Anchored on bar #{selected.index} · confirmed at close of bar #{selected.confirmIndex}
                  {selected.confirmIndex > selected.index ? ` (+${selected.confirmIndex - selected.index} bars to confirm)` : ''}
                </p>
              </>
            ) : (
              <p className="cq-dim">Select a quest entry to see the trading rule that fired and replay its effect.</p>
            )}
          </div>
          <div className="cq-bestiary">
            {(Object.keys(KIND_META) as EventKind[]).map((k) => (
              <div key={k} className="cq-best" title={`${KIND_META[k].name} — ${KIND_META[k].fx}`}>
                <Emblem kind={k} dir={k === 'bos' || k === 'choch' || k === 'trend' || k === 'breakout' || k === 'spike' ? 'bull' : 'bear'} size={22} />
                <b>{counts[k] ?? 0}</b>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <footer className="cq-deck">
        <div className="cq-transport">
          <button className="cq-btn" onClick={() => seek(START_HEAD)} title="Restart replay">
            <svg viewBox="0 0 24 24"><path d="M6 5v14M19 5l-10 7 10 7z" /></svg>
          </button>
          <button className="cq-btn" onClick={() => seek(head - 1)} title="Step back (←)">
            <svg viewBox="0 0 24 24"><path d="M17 5l-10 7 10 7z" /></svg>
          </button>
          <button
            className={`cq-play ${playing ? 'on' : ''}`}
            onClick={() => {
              engine.current?.unlockAudio();
              if (!playing && head >= candles.length - 1) seek(START_HEAD);
              setPlaying(!playing);
            }}
            title="Play / pause (space)"
          >
            {playing ? <svg viewBox="0 0 24 24"><path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /></svg> : <svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" /></svg>}
          </button>
          <button className="cq-btn" onClick={() => advance(1)} title="Step forward (→)">
            <svg viewBox="0 0 24 24"><path d="M7 5l10 7-10 7z" /></svg>
          </button>
          <div className="cq-speeds">
            {SPEEDS.map((s) => (
              <button key={s} className={`cq-chip ${speed === s ? 'on' : ''}`} onClick={() => setSpeed(s)}>
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="cq-timeline">
          <div className="cq-tl-track">
            <div className="cq-tl-fill" style={{ width: `${candles.length ? (head / (candles.length - 1)) * 100 : 0}%` }} />
            {majorTicks.map((e) => (
              <i key={e.id} className={`cq-tl-tick k-${e.kind} d-${e.dir} ${e.confirmIndex <= head ? 'seen' : ''}`} style={{ left: `${(e.confirmIndex / Math.max(1, candles.length - 1)) * 100}%` }} />
            ))}
            <input
              type="range"
              min={0}
              max={Math.max(0, candles.length - 1)}
              value={Math.max(0, head)}
              onChange={(e) => seek(+e.target.value)}
              aria-label="Replay position"
            />
          </div>
          <div className="cq-tl-meta">
            <span>BAR {head + 1} / {candles.length}</span>
            <span>{candles[head] ? fmtTime(candles[head].time) + ' ET' : ''}</span>
          </div>
        </div>

        <div className="cq-fx">
          <div className="cq-fx-list">
            {FX_GROUPS.map((g) => {
              const on = g.kinds.every((k) => enabled[k] !== false);
              return (
                <button
                  key={g.label}
                  className={`cq-toggle ${on ? 'on' : ''}`}
                  onClick={() => setEnabled((e) => ({ ...e, ...Object.fromEntries(g.kinds.map((k) => [k, !on])) }))}
                >
                  <i />
                  {g.label}
                </button>
              );
            })}
          </div>
          <div className="cq-fx-sys">
            <button className={`cq-chip ${muted ? '' : 'on'}`} onClick={() => { engine.current?.unlockAudio(); setMuted(!muted); }} title="Mute (M)">
              {muted ? 'SOUND OFF' : 'SOUND ON'}
            </button>
            <button className={`cq-chip ${quality === 'high' ? 'on' : ''}`} onClick={() => setQuality(quality === 'high' ? 'low' : 'high')}>
              {quality === 'high' ? 'FX ULTRA' : 'FX LITE'}
            </button>
            <label className="cq-chip cq-file" title="Load your own OHLC CSV (time,open,high,low,close[,volume]) — parsed locally">
              LOAD CSV
              <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && onCsv(e.target.files[0])} />
            </label>
          </div>
        </div>
      </footer>
    </div>
  );
}
