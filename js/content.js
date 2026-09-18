/* content.js — turns the raw data files into a curriculum: worlds → stages → lessons, plus word lookups */
(function () {
  'use strict';
  const D = window.ENG_DATA;
  const C = { worlds: [], worldByKey: {}, words: {}, stages: {}, lessons: {}, levelWords: {}, bank: {} };
  const VOCAB_LEVELS = ['g5', 'g4', 'g3', 'p2', 'g2'];
  const WORDS_PER_LESSON = 5;

  function addWord(key, w, ja, e, pos, lv, theme) {
    C.words[key] = { key, w, ja, e: e || '', pos: pos || 'n', lv, theme };
    (C.levelWords[lv] = C.levelWords[lv] || []).push(key);
    return key;
  }

  function makeStage(world, idx, name, emoji, wordKeys, kind, extra) {
    const st = Object.assign({
      id: world.key + '-' + (extra && extra.slug ? extra.slug : idx), world: world.key, idx, name, emoji, kind: kind || 'vocab',
      words: wordKeys, lessons: [], color: world.color
    }, extra || {});
    st.monster = world.monsters[idx % world.monsters.length];
    st.boss = idx === -1 ? world.boss : [st.monster[0] + 'のボス', st.monster[1]];
    const chunks = kind === 'abc' ? [wordKeys, wordKeys, wordKeys, wordKeys] : U.chunkEven(wordKeys, WORDS_PER_LESSON);
    chunks.forEach((ws, i) => {
      const lesson = { id: st.id + '-L' + (i + 1), stage: st.id, idx: i, words: ws, kind: st.kind };
      if (kind === 'abc') lesson.focus = ['hear', 'case', 'trace', 'first'][i];
      st.lessons.push(lesson);
      C.lessons[lesson.id] = lesson;
    });
    C.stages[st.id] = st;
    world.stages.push(st);
    return st;
  }

  C.build = function () {
    C.worlds = D.worlds.map(w => Object.assign({ stages: [] }, w));
    C.worlds.forEach(w => { C.worldByKey[w.key] = w; });

    // --- ABC world: 26 letters in 5 stages
    const abcWorld = C.worldByKey.abc;
    D.abc.forEach(l => addWord('abc:' + l[0], l[0], l[4], l[3], 'letter', 'abc', 'abc'));
    const groups = [['A', 'B', 'C', 'D', 'E'], ['F', 'G', 'H', 'I', 'J'], ['K', 'L', 'M', 'N', 'O'], ['P', 'Q', 'R', 'S', 'T'], ['U', 'V', 'W', 'X', 'Y', 'Z']];
    groups.forEach((g, i) => makeStage(abcWorld, i, g[0] + '〜' + g[g.length - 1], '🔤', g.map(x => 'abc:' + x), 'abc', { letters: g }));

    // --- Phonics world: one stage per sound pattern
    const phWorld = C.worldByKey.ph;
    D.phonics.forEach((grp, i) => {
      const keys = grp.words.map(w => addWord('ph:' + w[0], w[0], w[1], w[2], 'n', 'ph', grp.key));
      makeStage(phWorld, i, grp.name, grp.emoji, keys, 'phonics', { hint: grp.hint, pattern: grp.key });
    });

    // --- Vocabulary worlds (Eiken levels); duplicates across levels keep the earliest level only
    const seen = new Set();
    VOCAB_LEVELS.forEach(lv => {
      const data = D[lv];
      const world = C.worldByKey[lv];
      if (!data || !world) return;
      C.bank[lv] = { blank: data.blank || [], reply: data.reply || [], build: data.build || [], read: data.read || [] };
      const themeMeta = {}; data.themes.forEach(t => { themeMeta[t[0]] = t; });
      const byTheme = {};
      (data.words || []).concat(data.wordsExtra || []).forEach(w => {
        const key = w[0].toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        addWord(key, w[0], w[1], w[2], w[3], lv, w[4]);
        (byTheme[w[4]] = byTheme[w[4]] || []).push(key);
      });
      let idx = 0;
      data.themes.forEach(t => {
        const keys = byTheme[t[0]] || [];
        if (!keys.length) return;
        const parts = keys.length > 26 ? U.chunkEven(keys, Math.ceil(keys.length / 2)) : [keys];
        parts.forEach((ks, pi) => {
          makeStage(world, idx, t[1] + (parts.length > 1 ? ' ' + (pi + 1) : ''), t[2], ks, 'vocab', { slug: t[0] + (pi ? '-' + (pi + 1) : ''), theme: t[0] });
          idx++;
        });
      });
    });

    // travel phrases become words too (for stats/SRS), keyed by scene
    D.travel.forEach(sc => sc.phrases.forEach(ph => addWord('tr:' + sc.key + ':' + ph[0], ph[0], ph[1], '', 'phrase', 'travel', sc.key)));

    // conversation phrases the coach teaches — same treatment, so they come back as review
    (D.talk || []).forEach(sc => sc.phrases.forEach(ph => addWord('tk:' + sc.key + ':' + ph[0], ph[0], ph[1], '', 'phrase', 'talk', sc.key)));

    C.buddies = D.buddies.map(b => ({ id: b[0], emoji: b[1], ja: b[2], rarity: b[3], name: b[0] }));
    C.buddyById = {}; C.buddies.forEach(b => { C.buddyById[b.id] = b; });
    C.badges = D.badges.map(b => ({ id: b[0], emoji: b[1], name: b[2], desc: b[3] }));
    C.hats = D.hats.map(h => ({ id: h[0], emoji: h[1], name: h[2], price: h[3] }));
    C.hatById = {}; C.hats.forEach(h => { C.hatById[h.id] = h; });
    C.travel = D.travel;
    C.travelByKey = {}; D.travel.forEach(s => { C.travelByKey[s.key] = s; });
    C.talk = D.talk || [];
    C.talkByKey = {}; C.talk.forEach(s => { C.talkByKey[s.key] = s; });
    return C;
  };

  C.word = (key) => C.words[key];
  C.stage = (id) => C.stages[id];
  C.lesson = (id) => C.lessons[id];
  C.world = (key) => C.worldByKey[key];
  C.worldIndex = (key) => C.worlds.findIndex(w => w.key === key);
  C.isVocabLevel = (key) => VOCAB_LEVELS.indexOf(key) >= 0;
  C.vocabLevels = VOCAB_LEVELS;

  // pool of candidate distractor keys for a word
  C.pool = function (key, opt) {
    opt = opt || {};
    const w = C.words[key];
    let pool = (C.levelWords[w.lv] || []).filter(k => k !== key);
    if (opt.emoji) pool = pool.filter(k => C.words[k].e);
    if (opt.pos) { const same = pool.filter(k => C.words[k].pos === w.pos); if (same.length >= 6) pool = same; }
    if (pool.length < 3) {
      let all = Object.keys(C.words).filter(k => k !== key && C.words[k].lv !== 'abc' && C.words[k].lv !== 'travel' && C.words[k].lv !== 'talk');
      if (opt.emoji) all = all.filter(k => C.words[k].e);
      pool = pool.concat(all);
    }
    return pool;
  };
  C.levelName = (key) => { const w = C.worldByKey[key]; return w ? w.sub : key; };
  C.countWords = (lv) => (C.levelWords[lv] || []).length;

  window.Content = C;
})();
