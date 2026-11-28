'use strict';
// Оценка покрытия строк по данным V8 (без внешних зависимостей).
// Запуск:  npm run coverage
const { spawnSync } = require('node:child_process');
const fs = require('node:fs'); const path = require('node:path'); const os = require('node:os');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cov-'));
const r = spawnSync(process.execPath, ['--test', path.join(__dirname, 'auth.test.js'), path.join(__dirname, 'feed.test.js'), path.join(__dirname, 'profile.test.js')],
  { env: { ...process.env, NODE_V8_COVERAGE: dir }, encoding: 'utf8' });
const jsDir = path.resolve(__dirname, '../js'); const per = {};
for (const f of fs.readdirSync(dir)) {
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  for (const sc of data.result) {
    if (!sc.url.startsWith('file://') || !decodeURIComponent(sc.url).includes('/frontend/js/')) continue;
    const file = path.basename(decodeURIComponent(sc.url)); const src = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const counts = (per[file] ||= { src, hit: new Uint8Array(src.length) });
    const ranges = sc.functions.flatMap(fn => fn.ranges).sort((a, b) => a.startOffset - b.startOffset || (b.endOffset - b.startOffset) - (a.endOffset - a.startOffset));
    const cur = new Int32Array(src.length).fill(-1);
    for (const g of ranges) for (let i = g.startOffset; i < Math.min(g.endOffset, src.length); i++) cur[i] = g.count;
    for (let i = 0; i < src.length; i++) if (cur[i] > 0) counts.hit[i] = 1;
  }
}
let T = 0, C = 0; console.log('Покрытие строк (оценка по V8):');
for (const [file, { src, hit }] of Object.entries(per)) {
  let off = 0, t = 0, c = 0, inBlock = false;
  for (const line of src.split('\n')) {
    const tr = line.trim(); const first = off + line.search(/\S|$/); off += line.length + 1;
    if (inBlock) { if (tr.includes('*/')) inBlock = false; continue; }
    if (!tr || tr.startsWith('//') || /^[}\])\s;,]*$/.test(tr)) continue;
    if (tr.startsWith('/*')) { if (!tr.includes('*/')) inBlock = true; continue; }
    t++; if (hit[first]) c++;
  }
  T += t; C += c; console.log(`  ${file.padEnd(12)} ${c}/${t}  ${(c / t * 100).toFixed(1)}%`);
}
console.log(`  ИТОГО        ${C}/${T}  ${(C / T * 100).toFixed(1)}%`);
fs.rmSync(dir, { recursive: true, force: true });
