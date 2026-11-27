// Frame-exact export of a Bang Motion page (window.OPENER contract) to MP4, CPU only.
//   node tools/export.mjs <project-dir> <out.mp4> [fps=30]
// Seeks every frame (no screen recording, no dropped frames), screenshots it and pipes
// the stills straight into ffmpeg. Size comes from OPENER.W/H (1080x1920 for reels).
// WebGL runs on SwiftShader, so no GPU is needed.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.BM_PLAYWRIGHT || 'playwright');  // global install (VPS: npm i -g playwright)
import { spawn } from 'node:child_process';
import path from 'node:path';

const [dir, out, fpsArg] = process.argv.slice(2);
if (!dir || !out) { console.error('usage: node tools/export.mjs <project-dir> <out.mp4> [fps]'); process.exit(2); }
const FPS = Number(fpsArg || 30);
import { pageUrl } from './serve.mjs';
const srv = await pageUrl(dir), url = srv.url;

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'] });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(url);
await page.waitForFunction('window.OPENER && window.OPENER.ready', null, { timeout: 120000 });
const { W, H, D } = await page.evaluate(() => ({ W: OPENER.W, H: OPENER.H, D: OPENER.DURATION }));
await page.setViewportSize({ width: W, height: H });
const total = Math.round(D * FPS);
console.log(`${W}x${H} ${D}s @ ${FPS} fps = ${total} frames -> ${out}`);

const ff = spawn('ffmpeg', ['-v', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-r', String(FPS), '-movflags', '+faststart', out],
  { stdio: ['pipe', 'inherit', 'inherit'] });
const t0 = Date.now();
for (let i = 0; i < total; i++) {
  await page.evaluate(async t => { await (OPENER.seekFrame || OPENER.seek)(t); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, i / FPS);
  const png = await page.screenshot({ type: 'png' });
  if (!ff.stdin.write(png)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % FPS === 0) process.stdout.write(`\r${i}/${total}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on('close', c => (c ? rej(new Error('ffmpeg exit ' + c)) : res())));
await browser.close(); srv.close();
console.log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)} s` + (errors.length ? `  PAGE ERRORS: ${errors.join(' | ')}` : ''));
if (errors.length) process.exit(1);
