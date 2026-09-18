/* store.js — profiles + persistence (localStorage, with safe fallbacks) */
(function () {
  'use strict';
  const KEY = 'englishQuest.v1';
  const S = { data: null, memoryOnly: false };

  function blank() { return { version: 1, profiles: [], current: null, createdAt: Date.now() }; }

  S.load = function () {
    try {
      const raw = localStorage.getItem(KEY);
      S.data = raw ? JSON.parse(raw) : blank();
    } catch (e) { S.data = blank(); S.memoryOnly = true; }
    if (!S.data || !Array.isArray(S.data.profiles)) S.data = blank();
    S.data.profiles.forEach(S.migrate);
    return S.data;
  };
  S.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(S.data)); S.memoryOnly = false; }
    catch (e) { S.memoryOnly = true; }
  };

  S.defaultSettings = () => ({ dailyGoal: 30, ttsRate: 0.9, sfx: true, speech: true, pin: '', hintJa: true });

  S.newProfile = function (name, avatar, startLevel) {
    return {
      id: U.uid(), name: name || 'ぼうけんしゃ', avatar: avatar || '😀', createdAt: Date.now(),
      startLevel: startLevel || 'abc',
      xp: 0, coins: 0, gems: 0,
      streak: { count: 0, last: '', best: 0 },
      daily: { date: '', xp: 0, quests: [], chest: false, goalDone: false, login: 0 },
      words: {},       // key -> {b:box, d:due ymd, s:seen, c:correct, w:wrong}
      lessons: {},     // lessonId -> {n:times cleared, s:best stars}
      stages: {},      // stageId -> {boss:true/false, stars, done:lessons cleared count}
      tests: {},       // levelKey -> {passed, best, tries, date}
      buddies: [],     // buddy ids owned
      buddy: '',       // active buddy id
      eggs: [],        // {id, rarity, p, need}
      items: { hats: [], hat: '', potions: 0, freezes: 1 },
      badges: [],
      travel: { done: {}, missions: {}, tsuujita: 0 },
      talk: { rung: 0, logs: [], homework: null, done: {}, sessions: 0, said: 0, hwDone: 0 },   // conversation practice: ladder, learning log, homework
      stats: { answered: 0, correct: 0, battles: 0, bosses: 0, speak: 0, perfect: 0, maxCombo: 0, newWords: 0, reviews: 0, days: {}, timeMs: 0, byType: {} },
      bankUse: {},     // question bank item usage counts (to avoid repeats)
      settings: S.defaultSettings(),
      log: []          // recent events for the parent view
    };
  };

  S.migrate = function (p) {
    const d = S.newProfile();
    for (const k in d) if (p[k] === undefined) p[k] = d[k];
    ['settings', 'stats', 'items', 'travel', 'talk', 'streak', 'daily'].forEach(sec => {
      if (!p[sec] || typeof p[sec] !== 'object') p[sec] = d[sec];
      for (const k in d[sec]) if (p[sec][k] === undefined) p[sec][k] = d[sec][k];
    });
    return p;
  };

  S.profile = function () {
    if (!S.data) S.load();
    return S.data.profiles.find(p => p.id === S.data.current) || null;
  };
  S.setCurrent = function (id) { S.data.current = id; S.save(); };
  S.addProfile = function (p) { S.data.profiles.push(p); S.data.current = p.id; S.save(); return p; };
  S.removeProfile = function (id) {
    S.data.profiles = S.data.profiles.filter(p => p.id !== id);
    if (S.data.current === id) S.data.current = S.data.profiles[0] ? S.data.profiles[0].id : null;
    S.save();
  };

  S.exportJSON = () => JSON.stringify({ app: 'EnglishQuest', version: 1, exportedAt: new Date().toISOString(), data: S.data });
  S.importJSON = function (text, mode) {
    let obj;
    try { obj = JSON.parse(text); } catch (e) { throw new Error('JSONとして読めませんでした'); }
    const data = obj && obj.app === 'EnglishQuest' ? obj.data : obj;
    if (!data || !Array.isArray(data.profiles)) throw new Error('English Quest のデータではありません');
    data.profiles.forEach(S.migrate);
    if (mode === 'replace') { S.data = data; }
    else {
      data.profiles.forEach(p => {
        const i = S.data.profiles.findIndex(q => q.id === p.id);
        if (i >= 0) S.data.profiles[i] = p; else S.data.profiles.push(p);
      });
      if (!S.data.current) S.data.current = data.current;
    }
    S.save();
    return data.profiles.length;
  };

  window.Store = S;
})();
