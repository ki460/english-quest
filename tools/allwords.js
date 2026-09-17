// node tools/allwords.js            -> prints every vocabulary word across all levels, one per line ("word\tlevel")
// node tools/allwords.js check g3   -> lists words in g3 that already exist in an earlier level (these are ignored by the app)
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js', 'data');
const LEVELS = ['g5', 'g4', 'g3', 'p2', 'g2'];
const sandbox = { window: {} };
LEVELS.forEach(lv => { const fp = path.join(dir, lv + '.js'); if (fs.existsSync(fp)) vm.runInNewContext(fs.readFileSync(fp, 'utf8'), sandbox, { filename: lv + '.js' }); });
const D = sandbox.window.ENG_DATA;
LEVELS.forEach(lv => { if (D[lv] && Array.isArray(D[lv].wordsExtra)) D[lv].words = D[lv].words.concat(D[lv].wordsExtra); });
const [mode, level] = process.argv.slice(2);
if (mode === 'check') {
  const earlier = new Set();
  for (const lv of LEVELS) {
    if (lv === level) break;
    if (D[lv]) D[lv].words.forEach(w => earlier.add(w[0].toLowerCase()));
  }
  const dups = (D[level] ? D[level].words : []).filter(w => earlier.has(w[0].toLowerCase()));
  dups.forEach(w => console.log(w[0] + '\t(theme ' + w[4] + ')'));
  console.log('duplicates in ' + level + ' vs earlier levels: ' + dups.length);
  process.exit(dups.length ? 1 : 0);
} else {
  LEVELS.forEach(lv => { if (D[lv]) D[lv].words.forEach(w => console.log(w[0].toLowerCase() + '\t' + lv)); });
}
