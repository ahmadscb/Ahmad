// Key-frame check: seek to given seconds, screenshot, and tile a contact sheet (ffmpeg).
//   node tools/snap.mjs <project-dir> <out-dir> <t1> <t2> ...   -> out-dir/sheet.jpg (+ per-frame PNGs)
// Also prints the page's cue lists (OPENER.SFX / OPENER.MUSIC) to out-dir/cues.json for the sound step.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.BM_PLAYWRIGHT || 'playwright');  // global install (VPS: npm i -g playwright)
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { pageUrl } from './serve.mjs';
import path from 'node:path';

const [dir, outDir, ...times] = process.argv.slice(2);
if (!dir || !outDir) { console.error('usage: node tools/snap.mjs <project-dir> <out-dir> <t...>'); process.exit(2); }
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
const srv = await pageUrl(dir); await page.goto(srv.url);
await page.waitForFunction('window.OPENER && window.OPENER.ready', null, { timeout: 120000 });
const { W, H, D } = await page.evaluate(() => ({ W: OPENER.W, H: OPENER.H, D: OPENER.DURATION }));
await page.setViewportSize({ width: W, height: H });
writeFileSync(path.join(outDir, 'cues.json'), JSON.stringify(await page.evaluate(() => ({ duration: OPENER.DURATION, sfx: OPENER.SFX || [], music: OPENER.MUSIC || [] })), null, 1));
const files = [];
for (const ts of times) {
  const t = Math.min(Number(ts), D - 0.001);
  await page.evaluate(async t => { await (OPENER.seekFrame || OPENER.seek)(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, t);
  const f = path.join(outDir, `t${t.toFixed(2).padStart(6, '0')}.png`);
  await page.screenshot({ path: f }); files.push(f);
}
await browser.close(); srv.close();
const cols = Math.min(files.length, W < H ? 6 : 4), tw = W < H ? 270 : 480;
const inputs = files.flatMap(f => ['-i', f]);
const fc = files.map((_, i) => `[${i}:v]scale=${tw}:-1,drawtext=text='${Number(times[i]).toFixed(2)}s':x=8:y=8:fontsize=22:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(';')
  + ';' + files.map((_, i) => `[v${i}]`).join('') + `xstack=inputs=${files.length}:layout=${files.map((_, i) => `${(i % cols) ? Array.from({ length: i % cols }, () => 'w0').join('+') : 0}_${Math.floor(i / cols) ? Array.from({ length: Math.floor(i / cols) }, () => 'h0').join('+') : 0}`).join('|')}:fill=black`;
if (files.length > 1) execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', fc, '-frames:v', '1', path.join(outDir, 'sheet.jpg')]);
console.log(path.join(outDir, 'sheet.jpg') + (errors.length ? `\nPAGE ERRORS: ${errors.join(' | ')}` : ''));
