// Usage: node tools/validate.js js/data/g5.js g5
// Loads a content file (which assigns to window.ENG_DATA[level]) and checks its shape.
const fs = require('fs');
const vm = require('vm');
const [,, file, level] = process.argv;
if (!file || !level) { console.error('usage: node tools/validate.js <file> <level>'); process.exit(2); }
const src = fs.readFileSync(file, 'utf8');
const sandbox = { window: {} };
try { vm.runInNewContext(src, sandbox, { filename: file }); }
catch (e) { console.error('SYNTAX/RUNTIME ERROR:', e.message); process.exit(1); }
const d = sandbox.window.ENG_DATA && sandbox.window.ENG_DATA[level];
const errors = [], warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
if (!d) { console.error(`window.ENG_DATA.${level} is missing`); process.exit(1); }
if (Array.isArray(d.wordsExtra)) d.words = (d.words || []).concat(d.wordsExtra);   // extra words appended later live in wordsExtra
const POS = new Set(['n','v','adj','adv','prep','pron','conj','int','num','aux','det','other']);
const EMOJI_RE = /^(\p{Extended_Pictographic}|\p{Emoji_Component}|‍|️)+$/u;
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;

// themes
const themeKeys = new Set();
if (!Array.isArray(d.themes) || d.themes.length === 0) err('themes must be a non-empty array');
else d.themes.forEach((t, i) => {
  if (!Array.isArray(t) || t.length !== 3) return err(`themes[${i}] must be [key, 日本語名, emoji]`);
  const [k, ja, e] = t;
  if (!isStr(k) || !/^[a-z0-9_]+$/.test(k)) err(`themes[${i}] key "${k}" must be lowercase a-z/0-9/_`);
  if (themeKeys.has(k)) err(`duplicate theme key "${k}"`);
  themeKeys.add(k);
  if (!isStr(ja)) err(`themes[${i}] (${k}) needs a Japanese name`);
  if (!isStr(e) || !EMOJI_RE.test(e)) err(`themes[${i}] (${k}) needs an emoji, got "${e}"`);
});

// words
const seen = new Map();
const perTheme = {};
const emojiUse = {};
if (!Array.isArray(d.words)) err('words must be an array');
else d.words.forEach((w, i) => {
  if (!Array.isArray(w) || w.length !== 5) return err(`words[${i}] must have 5 fields: ${JSON.stringify(w)}`);
  const [en, ja, e, pos, th] = w;
  if (!isStr(en)) return err(`words[${i}] english missing`);
  if (!/^[a-zA-Z][a-zA-Z' .-]*$/.test(en)) err(`words[${i}] "${en}" has unexpected characters`);
  if (en !== en.trim()) err(`words[${i}] "${en}" has surrounding spaces`);
  if (/[A-Z]/.test(en) && en !== 'I' && !en.startsWith("I'") && !en.startsWith('I ')) warn(`words[${i}] "${en}" contains uppercase (only "I" should)`);
  const key = en.toLowerCase();
  if (seen.has(key)) err(`duplicate word "${en}" (words[${seen.get(key)}] and words[${i}])`);
  seen.set(key, i);
  if (!isStr(ja)) err(`words[${i}] "${en}" japanese missing`);
  else if (ja.length > 16) warn(`words[${i}] "${en}" japanese is long (${ja.length} chars): ${ja}`);
  if (typeof e !== 'string') err(`words[${i}] "${en}" emoji must be a string ("" if none)`);
  else if (e !== '' && !EMOJI_RE.test(e)) err(`words[${i}] "${en}" emoji "${e}" is not an emoji`);
  else if (e !== '') { (emojiUse[e] = emojiUse[e] || []).push(en); }
  if (!POS.has(pos)) err(`words[${i}] "${en}" pos "${pos}" not in ${[...POS].join(',')}`);
  if (!themeKeys.has(th)) err(`words[${i}] "${en}" theme "${th}" is not defined in themes`);
  perTheme[th] = (perTheme[th] || 0) + 1;
});
for (const [e, list] of Object.entries(emojiUse)) if (list.length > 1) warn(`emoji ${e} used by ${list.length} words: ${list.join(', ')} (keep only one, set others to "")`);
for (const k of themeKeys) {
  const n = perTheme[k] || 0;
  if (n === 0) err(`theme "${k}" has no words`);
  else if (n < 10) warn(`theme "${k}" has only ${n} words (aim 15-24)`);
  else if (n > 30) warn(`theme "${k}" has ${n} words (aim 15-24; split it)`);
}

// question banks
function checkChoice(arr, name, minLen) {
  if (!Array.isArray(arr)) return err(`${name} must be an array`);
  arr.forEach((q, i) => {
    if (!Array.isArray(q) || q.length !== 4) return err(`${name}[${i}] must be [text, [4 options], answerIndex, japanese]`);
    const [text, opts, ans, ja] = q;
    if (!isStr(text)) err(`${name}[${i}] text missing`);
    if (name === 'blank' && !text.includes('___')) err(`${name}[${i}] text must contain ___ : ${text}`);
    if (!Array.isArray(opts) || opts.length !== 4) err(`${name}[${i}] needs exactly 4 options`);
    else {
      if (new Set(opts.map(o => String(o).trim().toLowerCase())).size !== 4) err(`${name}[${i}] options must be distinct: ${opts.join(' | ')}`);
      opts.forEach(o => { if (!isStr(o)) err(`${name}[${i}] empty option`); });
    }
    if (!(Number.isInteger(ans) && ans >= 0 && ans <= 3)) err(`${name}[${i}] answerIndex must be 0-3`);
    if (!isStr(ja)) err(`${name}[${i}] japanese missing`);
  });
}
checkChoice(d.blank, 'blank');
checkChoice(d.reply, 'reply');
if (!Array.isArray(d.build)) err('build must be an array');
else d.build.forEach((b, i) => {
  if (!Array.isArray(b) || b.length !== 2) return err(`build[${i}] must be [japanese, english]`);
  const [ja, en] = b;
  if (!isStr(ja) || !isStr(en)) return err(`build[${i}] missing text`);
  const n = en.trim().split(/\s+/).length;
  if (n < 3 || n > 10) warn(`build[${i}] has ${n} words (aim 3-9): ${en}`);
  if (!/[.?!]$/.test(en.trim())) warn(`build[${i}] should end with . ? or ! : ${en}`);
});
if (!Array.isArray(d.read)) err('read must be an array (may be empty)');
else d.read.forEach((r, i) => {
  if (!r || typeof r !== 'object') return err(`read[${i}] must be an object`);
  if (!isStr(r.p)) err(`read[${i}].p (passage) missing`);
  if (!isStr(r.title)) warn(`read[${i}].title missing`);
  if (!Array.isArray(r.qs) || r.qs.length === 0) return err(`read[${i}].qs must be a non-empty array`);
  r.qs.forEach((q, j) => {
    if (!Array.isArray(q) || q.length !== 3) return err(`read[${i}].qs[${j}] must be [question, [4 options], answerIndex]`);
    const [text, opts, ans] = q;
    if (!isStr(text)) err(`read[${i}].qs[${j}] question missing`);
    if (!Array.isArray(opts) || opts.length !== 4) err(`read[${i}].qs[${j}] needs 4 options`);
    else if (new Set(opts.map(o => String(o).trim().toLowerCase())).size !== 4) err(`read[${i}].qs[${j}] options must be distinct`);
    if (!(Number.isInteger(ans) && ans >= 0 && ans <= 3)) err(`read[${i}].qs[${j}] answerIndex must be 0-3`);
  });
});

console.log(`== ${file} (${level}) ==`);
console.log(`themes: ${d.themes ? d.themes.length : 0}, words: ${d.words ? d.words.length : 0}, blank: ${d.blank ? d.blank.length : 0}, reply: ${d.reply ? d.reply.length : 0}, build: ${d.build ? d.build.length : 0}, read: ${d.read ? d.read.length : 0}`);
const withEmoji = (d.words || []).filter(w => Array.isArray(w) && w[2]).length;
console.log(`words with emoji: ${withEmoji}`);
if (Object.keys(perTheme).length) console.log('per theme: ' + Object.entries(perTheme).map(([k, n]) => `${k}=${n}`).join(', '));
warns.forEach(w => console.log('WARN: ' + w));
errors.forEach(e => console.log('ERROR: ' + e));
console.log(errors.length ? `FAILED with ${errors.length} error(s)` : 'OK (no errors)');
process.exit(errors.length ? 1 : 0);
