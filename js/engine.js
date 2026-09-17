/* engine.js — game rules: unlocks, daily loop, spaced repetition, exercise generation, battles, rewards */
(function () {
  'use strict';
  const E = {};
  const INTERVALS = [0, 1, 3, 7, 14, 30, 60];      // days until the next review, by box
  const RETRY_LIMIT = 1;
  const C = () => window.Content;
  const D = () => window.ENG_DATA;

  // ---------- player level ----------
  E.xpForLevel = (L) => Math.round(40 * Math.pow(Math.max(0, L - 1), 1.6));
  E.levelFor = (xp) => { let L = 1; while (xp >= E.xpForLevel(L + 1)) L++; return L; };
  E.levelProgress = function (xp) {
    const L = E.levelFor(xp), a = E.xpForLevel(L), b = E.xpForLevel(L + 1);
    return { level: L, cur: xp - a, need: b - a, pct: Math.round(100 * (xp - a) / (b - a)) };
  };
  E.title = function (L) { let t = D().titles[0][1]; D().titles.forEach(x => { if (L >= x[0]) t = x[1]; }); return t; };
  E.questTier = (p) => { const L = E.levelFor(p.xp); return L < 5 ? 0 : (L < 12 ? 1 : 2); };

  // ---------- words / SRS ----------
  E.wordState = (p, key) => p.words[key];
  E.isNew = (p, key) => !p.words[key] || !p.words[key].s;
  function ws(p, key) { return p.words[key] || (p.words[key] = { b: 0, d: U.today(), s: 0, c: 0, w: 0 }); }
  E.markSeen = function (p, key) {
    const w = ws(p, key);
    if (!w.s) { p.stats.newWords++; E.questProgress(p, 'newword', 1); }
    w.s++;
  };
  E.srsCorrect = function (p, key) {
    const w = ws(p, key);
    if (!w.s) E.markSeen(p, key); else w.s++;
    w.c++; w.b = Math.min(INTERVALS.length - 1, w.b + 1); w.d = U.today(INTERVALS[w.b]);
  };
  E.srsWrong = function (p, key) {
    const w = ws(p, key);
    if (!w.s) E.markSeen(p, key); else w.s++;
    w.w++; w.b = Math.max(0, w.b - 2); w.d = U.today();
  };
  E.isCountable = (key) => { const w = C().words[key]; return w && w.lv !== 'abc'; };
  E.dueWords = function (p) {
    const t = U.today();
    return Object.keys(p.words).filter(k => E.isCountable(k) && p.words[k].s > 0 && p.words[k].d <= t)
      .sort((a, b) => (p.words[a].b - p.words[b].b) || (p.words[a].d < p.words[b].d ? -1 : 1));
  };
  E.weakWords = function (p, n) {
    return Object.keys(p.words).filter(k => E.isCountable(k) && p.words[k].s > 0)
      .sort((a, b) => (p.words[a].b - p.words[b].b) || ((p.words[b].w - p.words[b].c) - (p.words[a].w - p.words[a].c))).slice(0, n || 10);
  };
  E.learnedCount = (p) => Object.keys(p.words).filter(k => E.isCountable(k) && p.words[k].b >= 3).length;
  E.seenCount = (p) => Object.keys(p.words).filter(k => E.isCountable(k) && p.words[k].s > 0).length;

  // ---------- daily loop ----------
  E.ensureDaily = function (p) {
    const today = U.today();
    if (p.daily.date === today) return false;
    const yesterday = U.today(-1);
    // streak: a missed day breaks it unless a freeze covers exactly one missed day
    if (p.streak.last && p.streak.last !== today && p.streak.last !== yesterday) {
      if (p.items.freezes > 0 && p.streak.last === U.today(-2)) { p.items.freezes--; p.streak.frozen = today; }
      else { p.streak.count = 0; }
    }
    p.daily.login = (p.daily.date === yesterday) ? (p.daily.login || 0) + 1 : 1;
    p.daily.date = today; p.daily.xp = 0; p.daily.chest = false; p.daily.goalDone = false;
    p.daily.quests = E.rollQuests(p);
    return true;
  };
  E.rollQuests = function (p) {
    const tier = E.questTier(p);
    const pool = D().quests.filter(q => q[0] !== 'battle');
    const usable = pool.filter(q => !(q[0] === 'review' && E.dueWords(p).length === 0));
    const picked = [D().quests.find(q => q[0] === 'battle')].concat(U.sample(usable, 2));
    return picked.map(q => {
      const n = q[3][tier];
      return { id: q[0], text: q[1].replace('{n}', n), key: q[2], target: n, p: 0, done: false, claimed: false };
    });
  };
  E.questProgress = function (p, key, n) {
    (p.daily.quests || []).forEach(q => {
      if (q.key !== key || q.done) return;
      q.p = key === 'combo' ? Math.max(q.p, n) : q.p + n;
      if (q.p >= q.target) { q.p = q.target; q.done = true; }
    });
  };
  E.claimQuest = function (p, q) {
    if (!q.done || q.claimed) return null;
    q.claimed = true; p.coins += 15;
    const all = p.daily.quests.every(x => x.claimed);
    let bonus = null;
    if (all && !p.daily.chest) { p.daily.chest = true; bonus = { chest: E.makeChest('rare'), egg: E.makeEgg('normal') }; p.eggs.push(bonus.egg); }
    return { coins: 15, bonus };
  };
  E.touchStreak = function (p) {
    const today = U.today();
    if (p.streak.last === today) return false;
    p.streak.count = (p.streak.last === U.today(-1) || p.streak.frozen === today) ? p.streak.count + 1 : 1;
    p.streak.last = today; p.streak.best = Math.max(p.streak.best || 0, p.streak.count);
    return true;
  };

  // ---------- unlocks ----------
  E.worldUnlocked = function (p, key) {
    const i = C().worldIndex(key), s = C().worldIndex(p.startLevel);
    if (i <= s) return true;
    const prev = C().worlds[i - 1];
    return !!(p.tests[prev.key] && p.tests[prev.key].passed);
  };
  E.stageUnlocked = function (p, st) {
    if (!E.worldUnlocked(p, st.world)) return false;
    if (C().worldIndex(st.world) < C().worldIndex(p.startLevel)) return true;
    if (st.idx === 0) return true;
    const prev = C().world(st.world).stages[st.idx - 1];
    return E.stageCleared(p, prev);
  };
  E.stageCleared = (p, st) => !!(p.stages[st.id] && p.stages[st.id].boss);
  E.lessonsDone = (p, st) => st.lessons.filter(l => p.lessons[l.id] && p.lessons[l.id].n > 0).length;
  E.stageStars = (p, st) => st.lessons.reduce((a, l) => a + ((p.lessons[l.id] && p.lessons[l.id].s) || 0), 0);
  E.testUnlocked = (p, w) => E.worldUnlocked(p, w.key) && w.stages.every(st => E.stageCleared(p, st));
  E.testPassed = (p, key) => !!(p.tests[key] && p.tests[key].passed);
  E.worldProgress = function (p, w) {
    const total = w.stages.reduce((a, st) => a + st.lessons.length + 1, 0);
    const done = w.stages.reduce((a, st) => a + E.lessonsDone(p, st) + (E.stageCleared(p, st) ? 1 : 0), 0);
    return { done, total, pct: Math.round(100 * done / total) };
  };
  E.nextAction = function (p) {
    const worlds = C().worlds, start = C().worldIndex(p.startLevel);
    const order = worlds.slice(start).concat(worlds.slice(0, start));
    for (const w of order) {
      if (!E.worldUnlocked(p, w.key)) continue;
      for (const st of w.stages) {
        if (!E.stageUnlocked(p, st)) break;
        const done = E.lessonsDone(p, st);
        if (done < st.lessons.length) return { kind: 'lesson', stage: st, lesson: done, world: w };
        if (!E.stageCleared(p, st)) return { kind: 'boss', stage: st, world: w };
      }
      if (E.testUnlocked(p, w) && !E.testPassed(p, w.key)) return { kind: 'test', world: w };
    }
    return { kind: 'done' };
  };

  // ---------- exercise generators ----------
  const G = {};
  const W = (k) => C().words[k];
  const shuffledChoices = (correctKey, keys, map) => {
    const choices = U.shuffle([correctKey].concat(keys)).map(map);
    return { choices, answer: choices.findIndex(c => c.key === correctKey) };
  };
  function distinctBy(keys, fn, n, exclude) {
    const used = new Set(exclude || []); const out = [];
    for (const k of keys) { const v = fn(k); if (!v || used.has(v)) continue; used.add(v); out.push(k); if (out.length === n) break; }
    return out;
  }

  G.intro = (p, key) => ({ type: 'intro', word: key, gen: ['intro', key] });

  G.pic4 = function (p, key) {
    const w = W(key);
    if (!w.e) return G.ja4(p, key);
    const pool = U.shuffle(C().pool(key, { emoji: true }));
    const same = pool.filter(k => W(k).theme === w.theme && W(k).lv === w.lv);
    const ds = distinctBy(same.slice(0, 2).concat(pool), k => W(k).e, 3, [w.e]);
    if (ds.length < 3) return G.ja4(p, key);
    const r = shuffledChoices(key, ds, k => ({ key: k, emoji: W(k).e }));
    return { type: 'pic4', word: key, gen: ['pic4', key], prompt: { text: w.w, tts: w.w, label: 'どの えが あう？' }, choices: r.choices, answer: r.answer, ja: w.ja };
  };
  G.ja4 = function (p, key) {
    const w = W(key);
    const ds = distinctBy(U.shuffle(C().pool(key, { pos: true })), k => W(k).ja, 3, [w.ja]);
    const r = shuffledChoices(key, ds, k => ({ key: k, label: W(k).ja }));
    return { type: 'choice', word: key, gen: ['ja4', key], prompt: { text: w.w, tts: w.w, emoji: w.e, label: 'いみは どれ？' }, choices: r.choices, answer: r.answer, ja: w.ja };
  };
  G.en4 = function (p, key) {
    const w = W(key);
    const ds = distinctBy(U.shuffle(C().pool(key, { pos: true })), k => W(k).w, 3, [w.w]);
    const r = shuffledChoices(key, ds, k => ({ key: k, label: W(k).w, tts: W(k).w }));
    return { type: 'choice', word: key, gen: ['en4', key], prompt: { text: w.ja, emoji: w.e, label: 'えいごで どれ？' }, choices: r.choices, answer: r.answer, ja: w.ja, ttsAfter: w.w };
  };
  G.listen4 = function (p, key) {
    const w = W(key);
    const pool = U.shuffle(C().pool(key));
    const similar = pool.filter(k => W(k).w[0] === w.w[0] || Math.abs(W(k).w.length - w.w.length) <= 1);
    const ds = distinctBy(similar.concat(pool), k => W(k).w, 3, [w.w]);
    const r = shuffledChoices(key, ds, k => ({ key: k, label: W(k).w }));
    return { type: 'choice', word: key, gen: ['listen4', key], prompt: { tts: w.w, listen: true, label: 'きこえた たんごは？' }, choices: r.choices, answer: r.answer, ja: w.ja, reveal: w.w };
  };
  G.spellable = (key) => { const w = W(key); return /^[a-z]{2,9}$/.test(w.w); };
  G.spell = function (p, key) {
    const w = W(key);
    if (!G.spellable(key)) return G.en4(p, key);
    const letters = w.w.split('');
    const extra = (w.lv === 'g5' || w.lv === 'ph') ? 1 : 2;
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    const distract = [];
    while (distract.length < extra) { const ch = alphabet[U.rand(26)]; if (letters.indexOf(ch) < 0 && distract.indexOf(ch) < 0) distract.push(ch); }
    return { type: 'spell', word: key, gen: ['spell', key], target: w.w, tiles: U.shuffle(letters.concat(distract)), prompt: { emoji: w.e, text: w.ja, tts: w.w, label: 'つづりを つくろう' }, ja: w.ja };
  };
  G.speak = function (p, key) {
    const w = W(key);
    return { type: 'speak', word: key, gen: ['speak', key], target: w.w, prompt: { emoji: w.e, text: w.w, tts: w.w, ja: w.ja, label: 'こえに 出して いってみよう' } };
  };
  G.phraseJa = function (p, key) {          // hear a travel phrase, choose its meaning
    const w = W(key);
    const pool = (C().levelWords.travel || []).filter(k => k !== key);
    const ds = distinctBy(U.shuffle(pool), k => W(k).ja, 3, [w.ja]);
    const r = shuffledChoices(key, ds, k => ({ key: k, label: W(k).ja }));
    return { type: 'choice', word: key, gen: ['phraseJa', key], prompt: { tts: w.w, listen: true, label: 'きこえた いみは？' }, choices: r.choices, answer: r.answer, reveal: w.w, ja: w.ja };
  };
  G.phraseEn = function (p, key) {          // see Japanese, choose the English phrase
    const w = W(key);
    const pool = (C().levelWords.travel || []).filter(k => k !== key && W(k).theme === w.theme);
    const ds = distinctBy(U.shuffle(pool.concat(C().levelWords.travel)), k => W(k).w, 3, [w.w]);
    const r = shuffledChoices(key, ds, k => ({ key: k, label: W(k).w, tts: W(k).w }));
    return { type: 'choice', word: key, gen: ['phraseEn', key], prompt: { text: w.ja, label: 'えいごで どう いう？' }, choices: r.choices, answer: r.answer, ttsAfter: w.w, ja: w.ja };
  };

  // question banks
  const bankItem = (lv, kind, idx) => C().bank[lv][kind][idx];
  const BANK_LABEL = { blank: '___ に はいるのは？', reply: 'へんじは どれ？', build: 'ならべて 文を つくろう', read: 'よんで こたえよう' };
  G.blank = function (p, lv, idx) {
    const it = bankItem(lv, 'blank', idx);
    const opts = it[1].map((o, i) => ({ label: o, correct: i === it[2] }));
    const choices = U.shuffle(opts);
    return { type: 'choice', gen: ['blank', lv, idx], bank: lv + ':blank:' + idx, prompt: { text: it[0], label: BANK_LABEL.blank, ja: it[3] }, choices, answer: choices.findIndex(c => c.correct), explain: it[3], ttsAfter: it[0].replace('___', it[1][it[2]]) };
  };
  G.reply = function (p, lv, idx, listening) {
    const it = bankItem(lv, 'reply', idx);
    const choices = U.shuffle(it[1].map((o, i) => ({ label: o, correct: i === it[2], tts: o })));
    return { type: 'choice', gen: ['reply', lv, idx, listening], bank: lv + ':reply:' + idx, prompt: { text: listening ? '' : it[0], tts: it[0], listen: !!listening, speaker: true, label: listening ? 'きいて へんじを えらぼう' : BANK_LABEL.reply, ja: it[3] }, choices, answer: choices.findIndex(c => c.correct), reveal: it[0], explain: it[3] };
  };
  G.build = function (p, lv, idx) {
    const it = bankItem(lv, 'build', idx);
    const sentence = it[1].trim();
    const core = sentence.replace(/[.?!]+$/, '');
    const tokens = core.split(/\s+/);
    const others = C().bank[lv].build.filter((b, i) => i !== idx);
    let distract = null;
    for (let tries = 0; tries < 8 && !distract; tries++) {
      const o = U.pick(others); if (!o) break;
      const t = U.pick(o[1].replace(/[.?!]+$/, '').split(/\s+/));
      if (tokens.map(x => x.toLowerCase()).indexOf(t.toLowerCase()) < 0) distract = t;
    }
    const tiles = U.shuffle(tokens.concat(distract ? [distract] : []));
    return { type: 'build', gen: ['build', lv, idx], bank: lv + ':build:' + idx, target: core, display: sentence, tokens, tiles, prompt: { text: it[0], label: BANK_LABEL.build, tts: sentence } };
  };
  G.read = function (p, lv, idx, qi) {
    const it = bankItem(lv, 'read', idx); const q = it.qs[qi];
    const choices = U.shuffle(q[1].map((o, i) => ({ label: o, correct: i === q[2] })));
    return { type: 'choice', gen: ['read', lv, idx, qi], bank: lv + ':read:' + idx, passage: { title: it.title || '', p: it.p }, prompt: { text: q[0], label: BANK_LABEL.read }, choices, answer: choices.findIndex(c => c.correct) };
  };
  // pick bank items the player has seen least often
  E.pickBank = function (p, lv, kind, n, exclude) {
    const items = C().bank[lv] ? C().bank[lv][kind] : [];
    const ex = new Set(exclude || []);
    const idx = items.map((_, i) => i).filter(i => !ex.has(i));
    idx.sort((a, b) => ((p.bankUse[lv + ':' + kind + ':' + a] || 0) - (p.bankUse[lv + ':' + kind + ':' + b] || 0)) || (Math.random() - 0.5));
    return idx.slice(0, n);
  };

  // alphabet
  const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const abcEntry = (L) => D().abc.find(x => x[0] === L);
  const letterTts = (L) => 'The letter ' + L + '.';
  function letterChoices(L, lower, poolLetters) {
    const pool = U.shuffle((poolLetters || LETTERS).filter(x => x !== L));
    const ds = pool.slice(0, 3);
    while (ds.length < 3) { const x = U.pick(LETTERS); if (x !== L && ds.indexOf(x) < 0) ds.push(x); }
    const r = shuffledChoices(L, ds, k => ({ key: k, label: lower ? k.toLowerCase() : k, letter: true }));
    return r;
  }
  G.abcIntro = (p, L) => ({ type: 'abcIntro', word: 'abc:' + L, letter: L, entry: abcEntry(L), gen: ['abcIntro', L] });
  G.abcHear = function (p, L, lower, poolLetters) {
    const r = letterChoices(L, lower, poolLetters);
    return { type: 'choice', word: 'abc:' + L, gen: ['abcHear', L, lower, poolLetters], prompt: { tts: letterTts(L), listen: true, label: lower ? 'きこえた もじ（こもじ）は？' : 'きこえた もじは？' }, choices: r.choices, answer: r.answer, reveal: L + ' ' + L.toLowerCase(), big: true };
  };
  G.abcCase = function (p, L, toUpper, poolLetters) {
    const r = letterChoices(L, !toUpper, poolLetters);
    return { type: 'choice', word: 'abc:' + L, gen: ['abcCase', L, toUpper, poolLetters], prompt: { text: toUpper ? L.toLowerCase() : L, tts: letterTts(L), label: toUpper ? 'おおもじは どれ？' : 'こもじは どれ？', bigText: true }, choices: r.choices, answer: r.answer, big: true };
  };
  G.abcFirst = function (p, L, poolLetters) {
    const e = abcEntry(L);
    const cand = [[e[2], e[3]]].concat(e[5]);
    const pickd = U.pick(cand);
    const r = letterChoices(L, false, poolLetters);
    return { type: 'choice', word: 'abc:' + L, gen: ['abcFirst', L, poolLetters], prompt: { emoji: pickd[1], text: pickd[0], tts: pickd[0], label: 'さいしょの もじは？' }, choices: r.choices, answer: r.answer, big: true };
  };
  G.abcNext = function (p, L) {
    const i = LETTERS.indexOf(L);
    if (i >= LETTERS.length - 1) return G.abcHear(p, L);
    const next = LETTERS[i + 1];
    const prev = i > 0 ? LETTERS[i - 1] + ' → ' : '';
    const r = letterChoices(next, false, LETTERS.filter(x => Math.abs(LETTERS.indexOf(x) - i) <= 4));
    return { type: 'choice', word: 'abc:' + next, gen: ['abcNext', L], prompt: { text: prev + L + ' → ？', label: 'つぎの もじは？', bigText: true }, choices: r.choices, answer: r.answer, big: true, ttsAfter: letterTts(next) };
  };
  G.abcTrace = (p, L, lower) => ({ type: 'trace', word: 'abc:' + L, letter: lower ? L.toLowerCase() : L, gen: ['abcTrace', L, lower], prompt: { tts: letterTts(L), label: 'ゆびで なぞって かこう' }, entry: abcEntry(L) });

  // phonics
  G.rhyme = function (p, key) {
    const w = W(key);
    const rime = w.w.slice(-2);
    const group = (C().levelWords.ph || []).filter(k => k !== key);
    const rhymes = group.filter(k => W(k).w.slice(-2) === rime && W(k).w !== w.w);
    if (!rhymes.length) return G.listen4(p, key);
    const ans = U.pick(rhymes);
    const ds = U.sample(group.filter(k => W(k).w.slice(-2) !== rime), 3);
    const r = shuffledChoices(ans, ds, k => ({ key: k, label: W(k).w, emoji: W(k).e, tts: W(k).w }));
    return { type: 'choice', word: key, gen: ['rhyme', key], prompt: { text: w.w, emoji: w.e, tts: w.w, label: 'おなじ おとで おわるのは？' }, choices: r.choices, answer: r.answer, ttsAfter: W(ans).w };
  };

  E.gens = G;
  E.regen = function (p, ex) { const g = G[ex.gen[0]]; const n = g.apply(null, [p].concat(ex.gen.slice(1))); n.retry = true; return n; };

  // ---------- session builders ----------
  function newSession(p, o) {
    const s = Object.assign({
      kind: 'lesson', title: '', steps: [], i: 0, combo: 0, maxCombo: 0, correct: 0, wrong: 0, answered: 0, kills: 0, overkill: 0,
      xp: 0, wrongKeys: {}, retries: {}, startedAt: Date.now(), results: [], hasHp: true, waves: true, dmgMul: 1
    }, o);
    s.scored = s.steps.filter(x => x.type !== 'intro' && x.type !== 'abcIntro').length;
    const hpMul = s.kind === 'boss' ? 0.7 : 1;
    s.monster = Object.assign({ hp: 0 }, s.monster || {});
    s.monster.max = Math.max(10, Math.round(s.scored * 10 * hpMul)); s.monster.hp = s.monster.max;
    s.player = { hp: 100, max: 100 };
    s.buddy = p.buddy ? C().buddyById[p.buddy] : null;
    s.buddyBonus = s.buddy ? ({ c: 1, r: 2, e: 3 })[s.buddy.rarity] || 0 : 0;
    return s;
  }
  const mon = (m, extra) => Object.assign({ name: m[0], emoji: m[1] }, extra || {});

  function vocabPractice(p, key) {
    const opts = ['listen4', 'en4'];
    if (G.spellable(key)) opts.push('spell');
    if (p.settings.speech) opts.push('speak');
    return G[U.pick(opts)](p, key);
  }
  function grammarSteps(p, lv, n, forTest) {
    const out = [];
    if (!C().isVocabLevel(lv)) return out;
    const kinds = U.shuffle(['blank', 'build', 'reply', 'blank']).slice(0, n);
    kinds.forEach(k => { const idx = E.pickBank(p, lv, k, 1)[0]; if (idx !== undefined) out.push(G[k](p, lv, idx)); });
    return out;
  }

  E.startLesson = function (p, stageId, li) {
    const st = C().stage(stageId), lesson = st.lessons[li];
    let steps = [];
    if (st.kind === 'abc') steps = abcLessonSteps(p, st, lesson);
    else if (st.kind === 'phonics') {
      lesson.words.forEach(k => { if (E.isNew(p, k)) steps.push(G.intro(p, k)); steps.push(U.pick([G.pic4, G.listen4])(p, k)); });
      steps = steps.concat(U.shuffle(lesson.words.map(k => U.pick([G.spell, G.rhyme, G.listen4, G.pic4])(p, k))));
    } else {
      lesson.words.forEach(k => { if (E.isNew(p, k)) steps.push(G.intro(p, k)); steps.push(W(k).e ? G.pic4(p, k) : G.ja4(p, k)); });
      steps = steps.concat(U.shuffle(lesson.words.map(k => vocabPractice(p, k))), grammarSteps(p, st.world, 2));
    }
    return newSession(p, { kind: 'lesson', stageId, lessonId: lesson.id, lessonIdx: li, world: st.world, title: st.name + ' ' + (li + 1), steps, monster: mon(st.monster), waveList: C().world(st.world).monsters });
  };
  function abcLessonSteps(p, st, lesson) {
    const Ls = st.letters, pool = Ls;
    const steps = [];
    if (lesson.focus === 'hear') Ls.forEach(L => { steps.push(G.abcIntro(p, L)); steps.push(G.abcHear(p, L, false, pool)); });
    else if (lesson.focus === 'case') { Ls.forEach(L => steps.push(G.abcCase(p, L, false, pool))); U.sample(Ls, 3).forEach(L => steps.push(G.abcHear(p, L, true, pool))); }
    else if (lesson.focus === 'trace') { Ls.forEach(L => steps.push(G.abcTrace(p, L, false))); U.sample(Ls, 2).forEach(L => steps.push(G.abcCase(p, L, true, pool))); }
    else { Ls.forEach(L => steps.push(G.abcFirst(p, L, pool))); U.sample(Ls, 3).forEach(L => steps.push(G.abcNext(p, L))); }
    return steps;
  }
  E.startBoss = function (p, stageId) {
    const st = C().stage(stageId);
    let steps = [];
    if (st.kind === 'abc') steps = U.shuffle(st.letters.flatMap(L => [G.abcHear(p, L, U.rand(2) === 0, st.letters), U.pick([G.abcCase, G.abcFirst])(p, L, false, st.letters)])).slice(0, 10);
    else if (st.kind === 'phonics') steps = U.shuffle(st.words.map(k => U.pick([G.pic4, G.listen4, G.spell, G.rhyme])(p, k))).slice(0, 10);
    else {
      const ks = U.sample(st.words, Math.min(10, st.words.length));
      steps = ks.map(k => U.pick([G.pic4, G.ja4, G.en4, G.listen4, G.spell])(p, k)).concat(grammarSteps(p, st.world, 3));
    }
    return newSession(p, { kind: 'boss', stageId, world: st.world, title: st.boss[0], steps, monster: mon(st.boss, { boss: true }), waves: false });
  };
  E.startReview = function (p) {
    let keys = E.dueWords(p).slice(0, 12);
    if (keys.length < 4) keys = U.uniq(keys.concat(E.weakWords(p, 8))).slice(0, 8);
    if (!keys.length) return null;
    const steps = keys.map(k => {
      const w = W(k), b = p.words[k].b;
      if (w.lv === 'travel') return U.pick([G.phraseJa, G.phraseEn])(p, k);
      if (w.lv === 'ph') return U.pick([G.pic4, G.listen4, G.spell])(p, k);
      const pool = b >= 3 ? [G.en4, G.spell, G.listen4] : [G.ja4, G.pic4, G.listen4];
      return U.pick(pool)(p, k);
    });
    return newSession(p, { kind: 'review', title: 'ゾンビたいじ', steps, monster: mon(['ゾンビたんご', '🧟']), waveList: [['ゾンビたんご', '🧟'], ['ゾンビたんご', '🧟‍♀️'], ['ゾンビたんご', '🧟‍♂️']] });
  };
  E.startPractice = function (p, stageId) {
    const st = C().stage(stageId);
    let steps;
    if (st.kind === 'abc') steps = U.shuffle(st.letters.flatMap(L => [G.abcHear(p, L, U.rand(2) === 0, st.letters), G.abcFirst(p, L, st.letters)])).slice(0, 8);
    else steps = U.sample(st.words, Math.min(8, st.words.length)).map(k => st.kind === 'phonics' ? U.pick([G.pic4, G.listen4, G.spell, G.rhyme])(p, k) : vocabPractice(p, k));
    return newSession(p, { kind: 'practice', stageId, world: st.world, title: st.name + ' れんしゅう', steps, monster: mon(st.monster), waveList: C().world(st.world).monsters });
  };
  E.startTravel = function (p, sceneKey) {
    const sc = C().travelByKey[sceneKey];
    const keys = sc.phrases.map(ph => 'tr:' + sc.key + ':' + ph[0]);
    const steps = [];
    U.sample(keys, 4).forEach(k => { steps.push(G.intro(p, k)); steps.push(p.settings.speech ? G.speak(p, k) : G.phraseJa(p, k)); });
    U.sample(keys, 3).forEach(k => steps.push(U.pick([G.phraseJa, G.phraseEn])(p, k)));
    U.sample(sc.dialogs.map((d, i) => i), 3).forEach(i => {
      const d = sc.dialogs[i];
      const choices = U.shuffle(d[1].map((o, j) => ({ label: o, correct: j === d[2], tts: o })));
      steps.push({ type: 'choice', gen: ['travelDialog', sceneKey, i], prompt: { text: d[0], tts: d[0], speaker: true, label: 'なんて こたえる？', ja: d[3] }, choices, answer: choices.findIndex(c => c.correct), explain: d[3] });
    });
    U.sample(sc.phrases.filter(ph => ph[0].split(' ').length >= 3), 2).forEach(ph => {
      const core = ph[0].replace(/[.?!]+$/, ''); const tokens = core.split(/\s+/);
      const other = U.pick(sc.phrases.filter(x => x !== ph))[0].replace(/[.?!]+$/, '').split(/\s+/).find(t => tokens.indexOf(t) < 0);
      steps.push({ type: 'build', gen: ['travelBuild', sceneKey, ph[0]], target: core, display: ph[0], tokens, tiles: U.shuffle(tokens.concat(other ? [other] : [])), prompt: { text: ph[1], label: 'ならべて 文を つくろう', tts: ph[0] } });
    });
    return newSession(p, { kind: 'travel', scene: sceneKey, title: sc.name, steps, monster: mon(['ドキドキおばけ', '🙈']), waveList: [['ドキドキおばけ', '🙈'], ['モジモジおばけ', '🙊'], ['はずかしおばけ', '🙉']] });
  };
  G.travelDialog = function (p, sceneKey, i) { const s = E.startTravel(p, sceneKey); return s.steps.find(x => x.gen[0] === 'travelDialog' && x.gen[2] === i) || s.steps.find(x => x.type === 'choice'); };
  G.travelBuild = function (p, sceneKey, text) {
    const sc = C().travelByKey[sceneKey]; const ph = sc.phrases.find(x => x[0] === text);
    const core = ph[0].replace(/[.?!]+$/, ''); const tokens = core.split(/\s+/);
    return { type: 'build', gen: ['travelBuild', sceneKey, text], target: core, display: ph[0], tokens, tiles: U.shuffle(tokens.slice()), prompt: { text: ph[1], label: 'ならべて 文を つくろう', tts: ph[0] } };
  };

  E.startTest = function (p, worldKey) {
    const w = C().world(worldKey);
    let steps = [];
    if (worldKey === 'abc') {
      steps = U.sample(LETTERS, 15).map(L => { const k = U.rand(3); return k === 0 ? G.abcHear(p, L, U.rand(2) === 0) : (k === 1 ? G.abcCase(p, L, U.rand(2) === 0) : G.abcFirst(p, L)); });
    } else if (worldKey === 'ph') {
      steps = U.sample(C().levelWords.ph, 15).map(k => U.pick([G.pic4, G.listen4, G.spell, G.rhyme])(p, k));
    } else {
      const lv = worldKey, keys = C().levelWords[lv];
      const vocab = U.sample(keys, 5).map(k => U.pick([G.ja4, G.en4])(p, k));
      const part1 = E.pickBank(p, lv, 'blank', 8).map(i => G.blank(p, lv, i));
      const part2 = E.pickBank(p, lv, 'reply', 4).map(i => G.reply(p, lv, i, false));
      const part3 = E.pickBank(p, lv, 'build', 3).map(i => G.build(p, lv, i));
      const listenWords = U.sample(keys, 4).map(k => G.listen4(p, k));
      const listenReply = E.pickBank(p, lv, 'reply', 3, part2.map(x => x.gen[2])).map(i => G.reply(p, lv, i, true));
      let reading = [];
      const rb = C().bank[lv].read || [];
      if (rb.length) U.sample(rb.map((_, i) => i), Math.min(2, rb.length)).forEach(ri => rb[ri].qs.slice(0, 2).forEach((_, qi) => reading.push(G.read(p, lv, ri, qi))));
      steps = [].concat(vocab, part1, part2, part3, listenWords, listenReply, reading);
    }
    return newSession(p, { kind: 'test', world: worldKey, title: w.test, steps, monster: mon(w.boss, { boss: true }), hasHp: false, waves: false });
  };

  // ---------- answering ----------
  E.current = (s) => s.steps[s.i];
  E.progress = (s) => ({ i: s.i, n: s.steps.length, pct: Math.round(100 * s.i / s.steps.length) });
  E.skipIntro = function (p, s) { const ex = s.steps[s.i]; if (ex.word) E.markSeen(p, ex.word); s.i++; };

  E.answer = function (p, s, ex, correct, meta) {
    meta = meta || {};
    const res = { correct, dmg: 0, crit: false, killed: false, newMonster: null, rescued: false, potion: false, retryQueued: false, xp: 0 };
    s.answered++; p.stats.answered++;
    const t = ex.type; p.stats.byType[t] = (p.stats.byType[t] || 0) + 1;
    if (correct) {
      s.combo++; s.maxCombo = Math.max(s.maxCombo, s.combo); p.stats.maxCombo = Math.max(p.stats.maxCombo, s.combo);
      if (!ex.retry) s.correct++;
      p.stats.correct++;
      let dmg = 10 + Math.min(10, Math.max(0, s.combo - 1) * 2) + s.buddyBonus;
      if (Math.random() < 0.12) { dmg *= 2; res.crit = true; }
      res.dmg = dmg;
      s.monster.hp -= dmg;
      if (s.monster.hp <= 0) {
        s.overkill += -s.monster.hp; s.monster.hp = 0;
        if (!s.monster.dead) { s.kills++; s.monster.dead = true; res.killed = true; }
        const remaining = s.steps.slice(s.i + 1).filter(x => x.type !== 'intro' && x.type !== 'abcIntro').length;
        if (s.waves && remaining > 0) {
          const next = s.waveList[(s.kills) % s.waveList.length];
          s.monster = { name: next[0], emoji: next[1], max: Math.max(10, remaining * 10), hp: Math.max(10, remaining * 10) };
          res.newMonster = s.monster;
        }
      }
      let xp = s.kind === 'test' ? 2 : 1;
      if (s.combo >= 5) xp += 1;
      if (ex.retry) xp = 0;
      s.xp += xp; res.xp = xp;
      if (ex.word && !ex.retry) E.srsCorrect(p, ex.word); else if (ex.word) E.markSeen(p, ex.word);
      E.questProgress(p, 'correct', 1);
      if (ex.prompt && ex.prompt.listen) E.questProgress(p, 'listen', 1);
      if (t === 'speak') { p.stats.speak++; E.questProgress(p, 'speak', 1); }
      E.questProgress(p, 'combo', s.combo);
    } else {
      s.combo = 0; s.wrong++;
      if (ex.word) { s.wrongKeys[ex.word] = true; if (!ex.retry) E.srsWrong(p, ex.word); }
      if (s.hasHp) {
        s.player.hp -= (s.kind === 'boss' ? 20 : 15);
        if (s.player.hp <= 0) {
          if (p.items.potions > 0) { p.items.potions--; s.player.hp = s.player.max; res.potion = true; }
          else { s.player.hp = 50; res.rescued = true; }
        }
      }
      if (s.kind !== 'test' && !ex.retry && (s.retries[ex.gen.join('|')] || 0) < RETRY_LIMIT) {
        s.retries[ex.gen.join('|')] = 1;
        try { s.steps.push(E.regen(p, ex)); res.retryQueued = true; } catch (e) { /* ignore */ }
      }
    }
    if (ex.bank) p.bankUse[ex.bank] = (p.bankUse[ex.bank] || 0) + 1;
    s.results.push({ ex, correct, retry: !!ex.retry });
    s.i++;
    return res;
  };
  E.isOver = (s) => s.i >= s.steps.length;

  // ---------- rewards ----------
  E.makeChest = function (force) {
    const r = Math.random();
    const tier = force || (r < 0.6 ? 'common' : (r < 0.9 ? 'rare' : 'epic'));
    const chest = { tier, coins: 0, gems: 0, egg: null, opened: false };
    if (tier === 'common') chest.coins = 10 + U.rand(21);
    else if (tier === 'rare') { chest.coins = 40 + U.rand(41); chest.gems = 1; }
    else { chest.coins = 100; chest.gems = 3; chest.egg = E.makeEgg('normal'); }
    return chest;
  };
  E.makeEgg = (kind) => ({ id: U.uid(), kind: kind || 'normal', p: 0, need: kind === 'gold' ? 3 : 5 });
  E.openChest = function (p, chest) {
    if (chest.opened) return chest;
    chest.opened = true; p.coins += chest.coins; p.gems += chest.gems;
    if (chest.egg) p.eggs.push(chest.egg);
    Store.save();
    return chest;
  };
  E.rollBuddy = function (p, kind) {
    const r = Math.random();
    const rarity = kind === 'gold' ? (r < 0.6 ? 'r' : 'e') : (r < 0.65 ? 'c' : (r < 0.93 ? 'r' : 'e'));
    const all = C().buddies.filter(b => b.rarity === rarity);
    const notOwned = all.filter(b => p.buddies.indexOf(b.id) < 0);
    const b = notOwned.length && Math.random() < 0.8 ? U.pick(notOwned) : U.pick(all);
    return b;
  };
  E.hatch = function (p, egg) {
    const b = E.rollBuddy(p, egg.kind);
    const dup = p.buddies.indexOf(b.id) >= 0;
    if (!dup) { p.buddies.push(b.id); if (!p.buddy) p.buddy = b.id; } else p.coins += 50;
    p.eggs = p.eggs.filter(e => e.id !== egg.id);
    return { buddy: b, dup };
  };
  E.progressEggs = function (p) {
    const hatched = [];
    p.eggs.forEach(e => { e.p++; });
    p.eggs.filter(e => e.p >= e.need).forEach(e => hatched.push(E.hatch(p, e)));
    return hatched;
  };

  E.finish = function (p, s) {
    const today = U.today();
    const acc = s.scored ? s.correct / s.scored : 0;
    const r = { kind: s.kind, title: s.title, acc, correct: s.correct, total: s.scored, stars: acc >= 1 ? 3 : (acc >= 0.8 ? 2 : 1), xp: s.xp, coins: 0, chest: null, egg: null, hatched: [], newBadges: [], levelUp: null, passed: true, first: false, kills: s.kills, maxCombo: s.maxCombo, perfect: s.wrong === 0 && s.scored >= 5, questsDone: [], streak: null };
    p.stats.timeMs += Date.now() - s.startedAt;
    const questBefore = (p.daily.quests || []).filter(q => q.done).length;
    let countsAsBattle = false;

    if (s.kind === 'lesson') {
      const L = p.lessons[s.lessonId] || (p.lessons[s.lessonId] = { n: 0, s: 0 });
      r.first = L.n === 0; L.n++; L.s = Math.max(L.s, r.stars);
      const st = p.stages[s.stageId] || (p.stages[s.stageId] = { boss: false, done: 0 });
      st.done = E.lessonsDone(p, C().stage(s.stageId));
      r.xp += 10; r.coins = 20 + r.stars * 5 + s.kills * 3 + Math.floor(s.overkill / 10);
      if (r.first) { r.coins *= 2; r.chest = E.makeChest(); } else if (Math.random() < 0.25) r.chest = E.makeChest();
      countsAsBattle = true;
    } else if (s.kind === 'boss') {
      r.passed = acc >= 0.7;
      const st = p.stages[s.stageId] || (p.stages[s.stageId] = { boss: false, done: 0 });
      if (r.passed) {
        r.first = !st.boss; st.boss = true; p.stats.bosses++;
        r.xp += 20; r.coins = 50 + r.stars * 10;
        if (r.first) { r.chest = E.makeChest(Math.random() < 0.5 ? 'rare' : undefined); if (Math.random() < 0.5) r.egg = E.makeEgg('normal'); }
        countsAsBattle = true;
      } else { r.xp += 5; r.coins = 5; }
    } else if (s.kind === 'test') {
      r.passed = acc >= 0.7;
      const T = p.tests[s.world] || (p.tests[s.world] = { passed: false, best: 0, tries: 0, date: '' });
      T.tries++; T.best = Math.max(T.best, Math.round(acc * 100));
      if (r.passed) {
        r.first = !T.passed; T.passed = true; T.date = today;
        r.xp += r.first ? 50 : 15; r.coins = r.first ? 200 : 40;
        if (r.first) { r.egg = E.makeEgg('gold'); r.chest = E.makeChest('epic'); }
      } else { r.xp += 5; r.coins = 10; }
    } else if (s.kind === 'review') {
      r.xp += 8; r.coins = 15 + s.kills * 2; p.stats.reviews++; E.questProgress(p, 'review', 1); countsAsBattle = true;
    } else if (s.kind === 'travel') {
      r.xp += 8; r.coins = 15; p.travel.done[s.scene] = (p.travel.done[s.scene] || 0) + 1; E.questProgress(p, 'travel', 1); countsAsBattle = true;
    } else if (s.kind === 'practice') {
      r.xp += 5; r.coins = 10 + s.kills * 2; countsAsBattle = true;
    }
    if (countsAsBattle) { p.stats.battles++; E.questProgress(p, 'battle', 1); }
    if (r.perfect && countsAsBattle) { p.stats.perfect++; E.questProgress(p, 'perfect', 1); }
    if (r.egg) p.eggs.push(r.egg);
    if (countsAsBattle || s.kind === 'test') r.hatched = E.progressEggs(p);

    // XP, level, coins, daily goal
    const before = E.levelFor(p.xp);
    p.xp += r.xp; p.coins += r.coins;
    const after = E.levelFor(p.xp);
    if (after > before) { r.levelUp = { from: before, to: after, coins: 50 * (after - before), title: E.title(after) }; p.coins += r.levelUp.coins; }
    p.daily.xp += r.xp; E.questProgress(p, 'xp', r.xp);
    p.stats.days[today] = (p.stats.days[today] || 0) + r.xp;
    if (!p.daily.goalDone && p.daily.xp >= p.settings.dailyGoal) { p.daily.goalDone = true; r.goalDone = true; }
    if (E.touchStreak(p)) r.streak = p.streak.count;
    r.questsDone = (p.daily.quests || []).filter(q => q.done).length - questBefore;
    r.newBadges = E.checkBadges(p);
    p.log.unshift({ t: Date.now(), kind: s.kind, title: s.title, acc: Math.round(acc * 100), xp: r.xp, n: s.scored });
    if (p.log.length > 60) p.log.length = 60;
    Store.save();
    return r;
  };

  E.checkBadges = function (p) {
    const st = p.stats, have = new Set(p.badges), out = [];
    const learned = E.learnedCount(p);
    const scenes = Object.keys(p.travel.done).length;
    const cond = {
      first: st.battles >= 1, b10: st.battles >= 10, b50: st.battles >= 50, b200: st.battles >= 200,
      s3: p.streak.best >= 3, s7: p.streak.best >= 7, s30: p.streak.best >= 30, s100: p.streak.best >= 100,
      w50: learned >= 50, w200: learned >= 200, w500: learned >= 500, w1000: learned >= 1000,
      c10: st.maxCombo >= 10, c20: st.maxCombo >= 20, p5: st.perfect >= 5, p25: st.perfect >= 25,
      boss1: st.bosses >= 1, boss10: st.bosses >= 10,
      abc: E.testPassed(p, 'abc'), ph: E.testPassed(p, 'ph'), g5: E.testPassed(p, 'g5'), g4: E.testPassed(p, 'g4'), g3: E.testPassed(p, 'g3'), p2: E.testPassed(p, 'p2'), g2: E.testPassed(p, 'g2'),
      col5: p.buddies.length >= 5, col15: p.buddies.length >= 15, colall: p.buddies.length >= C().buddies.length,
      sp10: st.speak >= 10, sp100: st.speak >= 100, tr1: scenes >= 1, tr8: scenes >= C().travel.length,
      tsu1: p.travel.tsuujita >= 1, tsu5: p.travel.tsuujita >= 5, rev10: st.reviews >= 10, rev50: st.reviews >= 50
    };
    C().badges.forEach(b => { if (cond[b.id] && !have.has(b.id)) { p.badges.push(b.id); out.push(b); } });
    return out;
  };

  // ---------- shop ----------
  E.shop = [
    { id: 'potion', emoji: '🧪', name: 'かいふくポーション', desc: 'HPが 0になったとき じどうで ぜんかいふく', price: 50, cur: 'coins' },
    { id: 'freeze', emoji: '🧊', name: 'れんぞくキープ', desc: '1日 やすんでも れんぞく日数が きえない', price: 150, cur: 'coins' },
    { id: 'egg', emoji: '🥚', name: 'たまご', desc: '5回 バトルすると なかまが うまれる', price: 8, cur: 'gems' },
    { id: 'goldegg', emoji: '🪺', name: 'きんのたまご', desc: 'レア以上の なかまが かならず うまれる', price: 20, cur: 'gems' }
  ];
  E.buy = function (p, item) {
    if (p[item.cur] < item.price) return { ok: false, reason: item.cur === 'coins' ? 'コインが たりない' : 'ジェムが たりない' };
    p[item.cur] -= item.price;
    if (item.id === 'potion') p.items.potions++;
    else if (item.id === 'freeze') p.items.freezes++;
    else if (item.id === 'egg') p.eggs.push(E.makeEgg('normal'));
    else if (item.id === 'goldegg') p.eggs.push(E.makeEgg('gold'));
    else if (item.hat) { p.items.hats.push(item.id); p.items.hat = item.id; }
    Store.save();
    return { ok: true };
  };

  E.tsuujita = function (p, sceneKey, mi) {
    const k = sceneKey + ':' + mi;
    if (p.travel.missions[k]) return null;
    p.travel.missions[k] = U.today(); p.travel.tsuujita++;
    p.coins += 100; p.gems += 2;
    const badges = E.checkBadges(p);
    Store.save();
    return { coins: 100, gems: 2, badges };
  };

  window.Engine = E;
})();
