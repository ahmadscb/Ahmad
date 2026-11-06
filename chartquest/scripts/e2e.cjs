/**
 * End-to-end check against a running ChartQuest (default http://127.0.0.1:3100).
 *   node scripts/e2e.cjs [baseUrl] [outDir]
 * 1. Sync test: compares where the game engine anchors (candle index, price) with the chart's own
 *    coordinates across zoom/pan states. Fails if they drift by more than 0.5 px.
 * 2. Causality test in the UI: after seeking to bar k, no revealed event has confirmIndex > k.
 * 3. Captures screenshots of each effect family mid-animation.
 * Requires Playwright (pre-installed in the dev container; otherwise `npx playwright install chromium`).
 */
const { chromium } = require('playwright');

const base = process.argv[2] || 'http://127.0.0.1:3100';
const out = process.argv[3] || 'docs/screenshots';
const DSF = Number(process.env.DSF || 1);

(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: DSF });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}/?debug=1`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__cq && window.__cq.head() > 0 && window.__cq.stats());
  await page.evaluate(() => window.__cq.setPlaying(false));

  // ── 1. Sync ──────────────────────────────────────────────────────────────────
  const sync = await page.evaluate(async () => {
    const cq = window.__cq;
    cq.seek(700);
    const ts = cq.chart().timeScale();
    const views = [
      ['default', () => ts.setVisibleLogicalRange({ from: 600, to: 720 })],
      ['zoom-in', () => ts.setVisibleLogicalRange({ from: 660, to: 705 })],
      ['zoom-out', () => ts.setVisibleLogicalRange({ from: 300, to: 720 })],
      ['pan-left', () => ts.scrollToPosition(-180, false)],
    ];
    const res = [];
    for (const [name, apply] of views) {
      apply();
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      let max = 0;
      const evs = cq.events().filter((e) => e.confirmIndex <= 700).slice(-40);
      for (const e of evs) {
        const p = cq.probe(e.index, e.price);
        if (p.chartX == null || p.chartY == null || !p.engine) continue;
        const dx = Math.abs(p.engine.x - p.engine.shakeX - p.chartX);
        const dy = Math.abs(p.engine.y - p.engine.shakeY - p.chartY);
        max = Math.max(max, dx, dy);
      }
      res.push({ view: name, samples: evs.length, maxErrorPx: +max.toFixed(4) });
    }
    return res;
  });
  console.log('SYNC', JSON.stringify(sync));
  const syncOk = sync.every((s) => s.maxErrorPx < 0.5);

  // ── 2. Causality in UI ─────────────────────────────────────────────────────
  const causal = await page.evaluate(async () => {
    const cq = window.__cq;
    const bad = [];
    const check = (k) => {
      for (const li of document.querySelectorAll('.cq-log-item')) if (+li.dataset.confirm > k) bad.push(`log shows event confirmed at ${li.dataset.confirm} while head=${k}`);
    };
    for (const k of [250, 512, 901, 1203]) {
      cq.seek(k);
      await new Promise((r) => setTimeout(r, 50));
      check(k);
      for (let n = 0; n < 12; n++) {
        cq.advance(1);
        await new Promise((r) => setTimeout(r, 30));
        check(cq.head());
      }
    }
    return bad;
  });

  // ── 3. Effect screenshots ──────────────────────────────────────────────────
  const shots = [
    { name: '01-thief-approach', kind: 'liquidity_sweep', ms: 700 },
    { name: '02-thief-grab', kind: 'liquidity_sweep', ms: 1650 },
    { name: '03-thief-escape', kind: 'liquidity_sweep', ms: 2850 },
    { name: '04-bos-bull-wall-break', kind: 'bos', dir: 'bull', ms: 560 },
    { name: '05-bos-bear-floor-collapse', kind: 'bos', dir: 'bear', ms: 800 },
    { name: '06-choch-realm-shift', kind: 'choch', ms: 450 },
    { name: '07-spike-explosion', kind: 'spike', ms: 260 },
    { name: '08-trendline-fracture', kind: 'trendline_break', ms: 380 },
    { name: '09-breakout-burst', kind: 'breakout', ms: 300 },
    { name: '10-fvg-portal', kind: 'fvg', ms: 900, after: 4 },
    { name: '11-trend-trail', kind: 'trend', dir: 'bull', ms: 900, after: 5 },
    { name: '12-arena-pool', kind: 'consolidation', ms: 900, after: 6 },
  ];
  const used = new Set();
  for (const s of shots) {
    const ev = await page.evaluate(
      ({ kind, dir, skip }) => window.__cq.events().find((e) => e.kind === kind && (!dir || e.dir === dir) && e.confirmIndex > 230 && !skip.includes(e.id) && (kind !== 'liquidity_sweep' || e.confirmIndex - (e.fromIndex ?? e.index) > 12)),
      { kind: s.kind, dir: s.dir, skip: s.name.startsWith('0') && s.kind === 'liquidity_sweep' ? [] : [...used] },
    );
    if (!ev) {
      console.log('no event for', s.name);
      continue;
    }
    used.add(ev.id);
    await page.evaluate(({ ev, after }) => {
      const cq = window.__cq;
      cq.seek(ev.confirmIndex - 1);
      cq.chart().timeScale().setVisibleLogicalRange({ from: ev.index - 75, to: ev.index + 30 });
      cq.advance(1 + (after || 0));
    }, { ev, after: s.after });
    await page.waitForTimeout(s.ms);
    await page.screenshot({ path: `${out}/${s.name}.png` });
    console.log('shot', s.name, ev.id, ev.label);
  }

  // Overview while playing.
  await page.evaluate(() => {
    const cq = window.__cq;
    cq.seek(560);
    cq.chart().timeScale().setVisibleLogicalRange({ from: 470, to: 585 });
    cq.setSpeed(2);
    cq.setPlaying(true);
  });
  await page.waitForTimeout(4500);
  await page.screenshot({ path: `${out}/00-overview-playing.png` });
  const stats = await page.evaluate(() => window.__cq.stats());
  console.log('STATS', JSON.stringify(stats));
  console.log('ERRORS', JSON.stringify(errors));
  console.log('CAUSAL', JSON.stringify(causal));
  await browser.close();
  process.exit(syncOk && errors.length === 0 && causal.length === 0 ? 0 : 1);
})();
