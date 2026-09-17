// node tools/dedupe.js g3  -> removes word entries from js/data/g3.js whose english already appears in an earlier level
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js', 'data');
const LEVELS = ['g5', 'g4', 'g3', 'p2', 'g2'];
const level = process.argv[2];
if (LEVELS.indexOf(level) < 0) { console.error('usage: node tools/dedupe.js <g4|g3|p2|g2>'); process.exit(2); }
const sandbox = { window: {} };
const earlier = new Set();
for (const lv of LEVELS) {
  if (lv === level) break;
  const fp = path.join(dir, lv + '.js');
  if (!fs.existsSync(fp)) continue;
  vm.runInNewContext(fs.readFileSync(fp, 'utf8'), sandbox, { filename: lv + '.js' });
  sandbox.window.ENG_DATA[lv].words.forEach(w => earlier.add(w[0].toLowerCase()));
}
const fp = path.join(dir, level + '.js');
const src = fs.readFileSync(fp, 'utf8');
const start = src.indexOf('words: ['), end = src.indexOf('\n  ]', start);
const before = src.slice(0, start), block = src.slice(start, end), after = src.slice(end);
let removed = 0;
const lines = block.split('\n').filter(line => {
  const m = /^\s*\["([^"]+)",\s*"[^"]*",\s*"[^"]*",\s*"[a-z]+",\s*"[a-z0-9_]+"\],?\s*(\/\/.*)?$/.exec(line);
  if (m && earlier.has(m[1].toLowerCase())) { removed++; return false; }
  return true;
});
let out = lines.join('\n');
// make sure the last entry has no trailing comma problems (a trailing comma before ] is fine in JS)
fs.writeFileSync(fp, before + out + after);
console.log(level + ': removed ' + removed + ' duplicate word entries');
