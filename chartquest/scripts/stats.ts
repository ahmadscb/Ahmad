import { detectAll } from '../src/core/detect';
import { generateSampleNdx } from '../src/core/sample';
const c = generateSampleNdx();
const ev = detectAll(c);
const counts: Record<string, number> = {};
for (const e of ev) counts[e.kind + ':' + e.dir] = (counts[e.kind + ':' + e.dir] ?? 0) + 1;
console.log('bars', c.length, 'first', c[0], 'last', c[c.length - 1]);
console.log(counts, 'total', ev.length);
console.log(ev.slice(0, 25).map((e) => `${e.confirmIndex} ${e.kind} ${e.dir} ${e.price.toFixed(1)}`).join('\n'));
