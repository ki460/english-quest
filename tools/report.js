// Prints a content summary across all levels: counts, emoji coverage, cross-level duplicates (kept in the earliest level).
const fs = require('fs'), vm = require('vm'), path = require('path');
const dir = path.join(__dirname, '..', 'js', 'data');
const sandbox = { window: {} };
['game.js', 'abc.js', 'phonics.js', 'travel.js', 'g5.js', 'g4.js', 'g3.js', 'p2.js', 'g2.js'].forEach(f => {
  const fp = path.join(dir, f);
  if (!fs.existsSync(fp)) { console.log('MISSING', f); return; }
  vm.runInNewContext(fs.readFileSync(fp, 'utf8'), sandbox, { filename: f });
});
const D = sandbox.window.ENG_DATA;
const seen = new Map(); let total = 0, totalEmoji = 0, dups = 0;
const rows = [];
['g5', 'g4', 'g3', 'p2', 'g2'].forEach(lv => {
  const d = D[lv]; if (!d) { rows.push([lv, 'missing']); return; }
  if (Array.isArray(d.wordsExtra)) d.words = d.words.concat(d.wordsExtra);
  let kept = 0, emoji = 0, dupList = [];
  d.words.forEach(w => { const k = w[0].toLowerCase(); if (seen.has(k)) { dupList.push(k + '(' + seen.get(k) + ')'); return; } seen.set(k, lv); kept++; if (w[2]) emoji++; });
  total += kept; totalEmoji += emoji; dups += dupList.length;
  rows.push([lv, 'themes=' + d.themes.length, 'words=' + d.words.length, 'kept=' + kept, 'emoji=' + emoji, 'blank=' + d.blank.length, 'reply=' + d.reply.length, 'build=' + d.build.length, 'read=' + d.read.length, dupList.length ? 'dups(dropped)=' + dupList.length + ': ' + dupList.slice(0, 12).join(', ') + (dupList.length > 12 ? '…' : '') : 'dups=0']);
});
rows.forEach(r => console.log(r.join('  ')));
console.log('phonics words:', D.phonics.reduce((a, g) => a + g.words.length, 0), ' abc letters:', D.abc.length, ' travel phrases:', D.travel.reduce((a, s) => a + s.phrases.length, 0), ' travel dialogs:', D.travel.reduce((a, s) => a + s.dialogs.length, 0));
console.log('vocabulary total (after dedupe):', total, ' with emoji:', totalEmoji, ' dropped duplicates:', dups);
