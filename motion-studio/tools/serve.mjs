// Serve the studio folder on 127.0.0.1 (random port) so pages can load ES modules (three.js);
// browsers block module scripts over file://. Read-only, local-only, no directory listing, no path escape.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
  '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };

export async function pageUrl(projectDir) {
  const server = http.createServer(async (req, res) => {
    const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const file = path.resolve(ROOT, '.' + rel);
    if (!file.startsWith(ROOT + path.sep)) { res.writeHead(403).end(); return; }
    try { const body = await readFile(file); res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(body); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const rel = path.relative(ROOT, path.resolve(projectDir)).split(path.sep).join('/');
  if (rel.startsWith('..')) throw new Error('project must live inside ' + ROOT);
  return { url: `http://127.0.0.1:${server.address().port}/${rel}/index.html?clean=1`, close: () => server.close() };
}
