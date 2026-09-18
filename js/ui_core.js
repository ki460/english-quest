/* ui_core.js — app shell: routing, HUD, tab bar, modals, sheets, toasts, confetti */
(function () {
  'use strict';
  const h = U.h;
  const App = { screen: '', params: null, p: null, screens: {}, sfxOn: true };
  const root = () => U.$('#app');

  App.save = () => Store.save();
  App.sfx = (name, arg) => { if (App.sfxOn && Audio2.sfx[name]) Audio2.sfx[name](arg); };
  App.say = (text, opt) => Audio2.speak(text, Object.assign({ rate: (App.p && App.p.settings.ttsRate) || 0.9 }, opt || {}));

  App.go = function (name, params) {
    const def = App.screens[name];
    if (!def) return;
    Audio2.stopSpeaking(); Audio2.stopListening();
    App.screen = name; App.params = params || {};
    const r = root(); U.clear(r);
    if (App.p) Engine.ensureDaily(App.p);
    if (def.hud && App.p) r.appendChild(App.hud());
    const sc = h('div.screen' + (def.center ? '.center' : ''));
    r.appendChild(sc);
    def.render(sc, App.params);
    if (def.tab && App.p) r.appendChild(App.tabbar(def.tab));
    sc.scrollTop = 0;
    window.scrollTo(0, 0);
  };
  App.refresh = () => App.go(App.screen, App.params);

  App.avatarEl = function (p, big) {
    const hat = p.items && p.items.hat ? Content.hatById[p.items.hat] : null;
    return h('span.avatar' + (big ? '.big' : ''), p.avatar, hat ? h('span.hat', hat.emoji) : null);
  };
  App.stars = (n, max) => { max = max || 3; let s = ''; for (let i = 0; i < max; i++) s += i < n ? '★' : '☆'; return s; };

  App.hud = function () {
    const p = App.p, lp = Engine.levelProgress(p.xp);
    return h('div.hud',
      h('div.who', App.avatarEl(p),
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div.row', h('span.name', p.name), h('span.lvl', 'Lv.' + lp.level, h('span.ttl', ' ' + Engine.title(lp.level)))),
          h('div.xpbar', h('i', { style: { width: lp.pct + '%' } })))),
      h('span.stat', { title: 'れんぞく日数' }, '🔥', h('span.num', p.streak.count)),
      h('span.stat', { title: 'コイン' }, '🪙', h('span.num', U.fmt(p.coins))),
      h('span.stat', { title: 'ジェム' }, '💎', h('span.num', p.gems)),
      h('button.iconbtn', { title: 'おと', on: { click: (e) => { App.sfxOn = !App.sfxOn; Audio2.muted = !App.sfxOn; p.settings.sfx = App.sfxOn; App.save(); e.currentTarget.textContent = App.sfxOn ? '🔊' : '🔇'; } } }, App.sfxOn ? '🔊' : '🔇'),
      h('button.iconbtn', { title: 'おうちのひと', on: { click: () => App.go('parentGate') } }, '⚙️'));
  };

  App.tabbar = function (active) {
    const due = App.p ? Engine.dueWords(App.p).length : 0;
    const tabs = [['home', '🏠', 'ホーム'], ['map', '🗺️', 'マップ'], ['talk', '🗣️', 'はなす'], ['review', '🧟', 'ふくしゅう'], ['travel', '✈️', 'たび'], ['book', '📖', 'ずかん']];
    return h('nav.tabbar', tabs.map(t => h('button', { class: t[0] === active ? 'on' : '', on: { click: () => { App.sfx('tap'); App.go(t[0]); } } },
      h('span.ic', t[1]), t[2], t[0] === 'review' && due ? h('span.dot', due > 99 ? '99+' : due) : null)));
  };

  // ---- overlays ----
  App.modal = function (o) {
    const bg = h('div.modal-bg');
    const close = () => { if (bg.parentNode) bg.parentNode.removeChild(bg); if (o.onClose) o.onClose(); };
    const box = h('div.modal', { role: 'dialog' },
      o.emoji ? h('div.big-emoji', o.emoji) : null,
      o.title ? h('h2', o.title) : null,
      o.body ? (typeof o.body === 'string' ? h('p', o.body) : o.body) : null,
      h('div.col', (o.buttons || [{ label: 'OK', cls: 'primary' }]).map(b => h('button.btn.' + (b.cls || 'primary'), { on: { click: () => { App.sfx('tap'); if (!b.keep) close(); if (b.onClick) b.onClick(close); } } }, b.label))));
    bg.appendChild(box);
    if (!o.locked) bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    return close;
  };
  App.sheet = function (content) {
    const bg = h('div.sheet-bg');
    const close = () => { if (bg.parentNode) bg.parentNode.removeChild(bg); };
    const sh = h('div.sheet', h('div.grip'), content);
    bg.appendChild(sh);
    bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    return close;
  };
  App.toast = function (text, cls) {
    let wrap = U.$('.toast-wrap');
    if (!wrap) { wrap = h('div.toast-wrap'); document.body.appendChild(wrap); }
    const t = h('div.toast' + (cls ? '.' + cls : ''), text);
    wrap.appendChild(t);
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 2900);
  };
  App.flash = function (cls) {
    const f = h('div.flash' + (cls ? '.' + cls : ''));
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 400);
  };
  App.confetti = function (n) {
    if (U.reducedMotion()) return;
    let cv = U.$('#confetti');
    if (!cv) { cv = h('canvas#confetti'); document.body.appendChild(cv); }
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const ctx = cv.getContext('2d');
    const colors = ['#FF7A1A', '#2E86FF', '#22B85B', '#FFC531', '#8B5CF6', '#FF5FA2'];
    const parts = Array.from({ length: n || 120 }, () => ({ x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, r: 5 + Math.random() * 7, c: U.pick(colors), vy: 2 + Math.random() * 4, vx: -1.5 + Math.random() * 3, a: Math.random() * 6.28, va: -0.2 + Math.random() * 0.4 }));
    const t0 = performance.now();
    function frame(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.a += pt.va; ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.a); ctx.fillStyle = pt.c; ctx.fillRect(-pt.r / 2, -pt.r / 2, pt.r, pt.r * 0.6); ctx.restore(); });
      if (t - t0 < 2600) requestAnimationFrame(frame); else ctx.clearRect(0, 0, cv.width, cv.height);
    }
    requestAnimationFrame(frame);
  };

  App.speakBtn = function (text, o) {
    o = o || {};
    const b = h('button.speakbtn' + (o.xl ? '.xl' : ''), { type: 'button', on: { click: (e) => { e.stopPropagation(); App.say(text, { rate: o.rate }); } } }, o.icon || '🔊', o.label !== undefined ? o.label : ' きく');
    return b;
  };
  App.slowBtn = (text) => App.speakBtn(text, { icon: '🐢', label: ' ゆっくり', rate: 0.6 });

  // level-up / badge / hatch popups used by several screens
  App.showLevelUp = function (lu, then) {
    App.sfx('levelup'); App.confetti(160);
    App.modal({ emoji: '🎉', title: 'レベルアップ！', body: h('div', h('p', { style: { fontSize: '1.6rem', fontWeight: 900 } }, 'Lv.' + lu.from + ' → Lv.' + lu.to), h('p.muted', 'しょうごう：' + lu.title), h('p', '🪙 +' + lu.coins + ' コイン')), buttons: [{ label: 'やったー！', onClick: then }], locked: true });
  };
  App.showBadges = function (badges, then) {
    if (!badges || !badges.length) { if (then) then(); return; }
    App.sfx('fanfare');
    App.modal({ emoji: badges[0].emoji, title: 'バッジ ゲット！', body: h('div', badges.map(b => h('p', h('b', b.emoji + ' ' + b.name), h('span.muted', ' — ' + b.desc)))), buttons: [{ label: 'すごい！', onClick: then }], locked: true });
  };
  App.showHatch = function (hatched, then) {
    if (!hatched || !hatched.length) { if (then) then(); return; }
    const x = hatched[0];
    App.sfx('hatch'); App.confetti(100);
    const rar = { c: 'ノーマル', r: 'レア ✨', e: 'エピック 🌟' }[x.buddy.rarity];
    App.modal({ emoji: x.buddy.emoji, title: x.dup ? 'また あえた！' : 'たまごが かえった！', body: h('div', h('p', { style: { fontSize: '1.4rem' } }, h('span.en', x.buddy.name), ' / ' + x.buddy.ja), h('p.muted', rar), x.dup ? h('p', 'もう なかまなので 🪙 +50 コイン') : h('p', 'あたらしい なかまだ！ 「ずかん」で えらべるよ')), buttons: [{ label: 'よろしくね！', onClick: () => { App.say(x.buddy.name); App.showHatch(hatched.slice(1), then); } }], locked: true });
  };

  window.App = App;
})();
