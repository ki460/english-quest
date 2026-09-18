// Usage: node tools/talk-check.js
// Checks js/data/talk.js (shape of every scene/turn) and runs simulated はなす sessions
// through the real engine, so the scoring, the ladder and the logs can be sanity-checked
// without a browser.
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.join(__dirname, '..');

// --- a browser-ish sandbox: `window` is the global object, plus a memory localStorage
const store = {};
const sandbox = {
  localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; } },
  console, performance: { now: () => Date.now() }, setTimeout, Math, Date, JSON
};
sandbox.window = sandbox;
vm.createContext(sandbox);
['js/util.js', 'js/store.js', 'js/data/game.js', 'js/data/abc.js', 'js/data/phonics.js', 'js/data/travel.js', 'js/data/talk.js',
  'js/data/g5.js', 'js/data/g4.js', 'js/data/g3.js', 'js/data/p2.js', 'js/data/g2.js', 'js/content.js', 'js/engine.js']
  .forEach(f => vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f }));
const { U, Store, Content, Engine } = sandbox;
Content.build();

const errors = [], warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;

// ---------- data shape ----------
const scenes = sandbox.window.ENG_DATA.talk;
const keys = new Set();
if (!Array.isArray(scenes) || !scenes.length) err('ENG_DATA.talk must be a non-empty array');
scenes.forEach((s, i) => {
  const at = `talk[${i}] (${s.key})`;
  ['key', 'name', 'emoji', 'color'].forEach(k => { if (!isStr(s[k])) err(`${at}: ${k} missing`); });
  if (keys.has(s.key)) err(`${at}: duplicate scene key`);
  keys.add(s.key);
  if (!/^#[0-9A-Fa-f]{6}$/.test(s.color || '')) err(`${at}: color must be #rrggbb`);
  if (!Array.isArray(s.phrases) || s.phrases.length < 3) err(`${at}: needs at least 3 key phrases`);
  (s.phrases || []).forEach((ph, j) => {
    if (!Array.isArray(ph) || ph.length !== 2 || !isStr(ph[0]) || !isStr(ph[1])) return err(`${at}.phrases[${j}] must be [english, 日本語]`);
    if (/\{name\}/.test(ph[0])) err(`${at}.phrases[${j}] must not use {name} (phrases are stored as review items)`);
    if (!/[.!?]$/.test(ph[0])) warn(`${at}.phrases[${j}] "${ph[0]}" has no end punctuation`);
  });
  if (!Array.isArray(s.turns) || s.turns.length < 4) err(`${at}: needs at least 4 turns`);
  (s.turns || []).forEach((t, j) => {
    const tat = `${at}.turns[${j}]`;
    if (!isStr(t.q)) err(`${tat}: q missing`);
    if (!isStr(t.ja)) err(`${tat}: ja missing`);
    if (!Array.isArray(t.a) || !t.a.length || !t.a.every(isStr)) err(`${tat}: a must be a non-empty list of model answers`);
    if (t.a && t.a.length < 2) warn(`${tat}: only one model answer`);
    if (t.yn && (!Array.isArray(t.yn) || t.yn.length !== 2)) err(`${tat}: yn must be [yes answer, no answer]`);
    if (t.loose && (!Array.isArray(t.loose) || !t.loose.every(isStr))) err(`${tat}: loose must be a list of strings`);
    if (t.pick) {
      if (!Array.isArray(t.pick) || t.pick.length !== 2) err(`${tat}: pick must be [pattern, options]`);
      else {
        const [pattern, opts] = t.pick;
        if (!isStr(pattern) || pattern.indexOf('___') < 0) err(`${tat}: pick pattern needs a ___ slot`);
        if (!Array.isArray(opts) || opts.length < 2) err(`${tat}: pick needs at least 2 options`);
        (opts || []).forEach((o, k) => {
          if (!Array.isArray(o) || o.length !== 2 || !isStr(o[0]) || !isStr(o[1])) err(`${tat}.pick[${k}] must be [word, 意味]`);
          else {
            const filled = pattern.replace('___', o[0]);
            if (!/^[A-Z]/.test(filled)) warn(`${tat}.pick[${k}] "${filled}" does not start with a capital`);
            if (/\s{2,}/.test(filled)) err(`${tat}.pick[${k}] "${filled}" has double spaces`);
          }
        });
      }
    }
    const usesName = /\{name\}/.test(t.a.join(' '));
    if (usesName && !t.loose) err(`${tat}: an answer with {name} needs loose (the fixed part to match on)`);
  });
  if (!Array.isArray(s.homework) || !s.homework.length || !s.homework.every(isStr)) err(`${at}: needs homework ideas`);
});

// every phrase must have become a review item
scenes.forEach(s => s.phrases.forEach(ph => {
  if (!Content.words['tk:' + s.key + ':' + ph[0]]) err(`phrase not registered as a word: ${s.key} / ${ph[0]}`);
}));

// ---------- simulated sessions ----------
function fresh() {
  const p = Store.newProfile('テスト', '😀', 'g5');
  Store.data = { version: 1, profiles: [p], current: p.id };
  Engine.ensureDaily(p);
  return p;
}
function play(p, sceneKey, how) {
  const ts = Engine.startTalk(p, sceneKey);
  const modes = ts.turns.map(t => t.mode);
  while (ts.i < ts.turns.length) {
    const t = ts.turns[ts.i];
    const target = t.mode === 'echo' ? t.target : (t.options ? t.options[0] : (t.pattern ? t.pattern.replace('___', t.words[0][0]) : t.hint));
    if (how === 'perfect') Engine.talkSay(p, ts, { text: target, heard: target, score: 0.95 });
    else if (how === 'struggling') Engine.talkSay(p, ts, { text: target, heard: 'banana banana', score: 0.2, helped: true });
    else if (how === 'silent') Engine.talkSay(p, ts, { text: target, skipped: true });
    else Engine.talkSay(p, ts, { text: target, heard: '', score: null });   // no microphone
  }
  return { r: Engine.finishTalk(p, ts), modes };
}
const out = [];
[1, 2, 3, 4, 5].forEach(rung => {
  const p = fresh();
  p.talk.rung = rung;
  const { r, modes } = play(p, 'self', 'perfect');
  out.push(`rung ${rung}: modes ${modes.join(',')} → ${r.score}/25, ladder ${r.rungBefore}→${r.rungAfter}, xp ${r.xp}`);
  if (r.score < 20) err(`a perfect session at rung ${rung} scored only ${r.score}/25`);
  if (r.rungAfter < r.rungBefore) err(`a perfect session at rung ${rung} lowered the ladder`);
  if (!r.homework || !r.homework.text) err(`rung ${rung}: no homework`);
  if (!r.next) err(`rung ${rung}: no next task`);
  if (!r.better) err(`rung ${rung}: nothing encouraging to say`);
});
['struggling', 'silent', 'nomic'].forEach(how => {
  const p = fresh();
  const { r } = play(p, 'school', how);
  out.push(`${how}: ${r.score}/25 axes ${JSON.stringify(r.axes)}, ladder ${r.rungBefore}→${r.rungAfter}, mistakes ${r.mistakes.length}`);
  if (how === 'struggling' && !r.mistakes.length) err('a struggling session produced no corrections');
  if (how === 'struggling' && r.mistakes.length > 2) err('more than two corrections at once');
  if (how === 'silent' && r.rungAfter >= r.rungBefore) err('a silent session did not make the next one easier');
  if (how === 'nomic' && r.axes.pron != null) err('pronunciation was scored without a microphone');
  if (r.score < 0 || r.score > 25) err(`${how}: score out of range (${r.score})`);
});
// a week of sessions → weekly review
const p = fresh();
for (let i = 0; i < 4; i++) play(p, Content.talk[i % Content.talk.length].key, i % 2 ? 'perfect' : 'struggling');
const w = Engine.talkWeekly(p);
out.push(`weekly: ${w.count} sessions, avg ${w.score}/25, ${w.mistakes.length} repeated slips, focus "${w.focus}"`);
if (w.count !== 4) err('weekly review lost sessions');
if (!Engine.talkWeeklyText(p).includes('英会話ふりかえり')) err('weekly text did not render');
if (!p.talk.homework || p.talk.homework.done) err('no pending homework after a session');
Engine.talkHomeworkDone(p);
if (!p.talk.homework.done) err('homework could not be completed');

out.forEach(l => console.log('  ' + l));
warns.forEach(w => console.log('WARN  ' + w));
errors.forEach(e => console.log('ERROR ' + e));
console.log(errors.length ? `FAILED: ${errors.length} error(s), ${warns.length} warning(s)` : `OK: ${scenes.length} scenes, ${scenes.reduce((a, s) => a + s.turns.length, 0)} turns, ${warns.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
