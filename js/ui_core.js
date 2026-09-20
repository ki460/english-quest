/* ui_core.js — app shell: routing, HUD, tab bar, modals, sheets, toasts, confetti */
(function () {
  'use strict';
  const h = U.h;
  const App = { screen: '', params: null, p: null, screens: {}, sfxOn: true, screenHidden: null };
  const root = () => U.$('#app');

  App.save = () => Store.save();
  // Sound effects go through here so a muted app never creates an audio session, and every sound nudges the context.
  App.sfx = (name, arg) => {
    if (!App.sfxOn || !Audio2.sfx[name]) return;
    Audio2.poke();
    Audio2.sfx[name](arg);
  };
  App.say = (text, opt) => Audio2.speak(text, Object.assign({ rate: (App.p && App.p.settings.ttsRate) || 0.9 }, opt || {}));
  // Push a profile's sound settings into the audio engines (called on boot, profile switch, import)
  App.applySettings = function (p) {
    const s = p.settings;
    App.sfxOn = s.sfx !== false;
    Audio2.setMuted(!App.sfxOn);
    Audio2.rate = s.ttsRate || 0.9;
    Audio2.setVolume(s.volume == null ? 1 : s.volume);
    if (window.Music) Music.setEnabled(!!s.music);
  };

  App.go = function (name, params, opt) {
    const def = App.screens[name];
    if (!def) return;
    opt = opt || {};
    Audio2.stopSpeaking(); Audio2.stopListening();
    App.screenHidden = null;
    const changed = App.screen !== name;
    App.screen = name; App.params = params || {};
    if (window.Music) {
      Music.hush(false);
      const track = name === 'battle' ? Music.trackFor(App.params.session) : null;
      if (track) Music.play(track); else Music.stop();
    }
    document.body.classList.toggle('in-battle', name === 'battle');
    const r = root(); U.clear(r);
    if (App.p) Engine.ensureDaily(App.p);
    if (def.hud && App.p) r.appendChild(App.hud());
    const sc = h('div.screen' + (def.center ? '.center' : '') + (changed && !opt.quiet ? '' : '.still'));
    r.appendChild(sc);
    def.render(sc, App.params);
    if (def.tab && App.p) r.appendChild(App.tabbar(def.tab));
    sc.scrollTop = 0;
    window.scrollTo(0, 0);
    if (App.updateReady && !BUSY[name]) App.applyUpdate();
  };
  App.refresh = () => App.go(App.screen, App.params, { quiet: true });

  // ---- updates ----
  // sw.js refreshes the offline copy in the background and says when a newer version has arrived. A home-screen app has
  // no reload button and iOS resumes rather than relaunches it, so the app reloads itself at the next quiet moment:
  // never mid-battle, on the result ceremony or while a name is being typed (App.go retries when the screen changes).
  const BUSY = { battle: true, result: true, newProfile: true };
  App.updateReady = false;
  App.updateArrived = function () { App.updateReady = true; if (!BUSY[App.screen]) App.applyUpdate(); };
  App.applyUpdate = function () {
    try { const t = +sessionStorage.getItem('eqReloadAt') || 0; if (Date.now() - t < 120000) return; sessionStorage.setItem('eqReloadAt', String(Date.now())); } catch (e) { /* ignore */ }
    App.updateReady = false;
    App.toast('🆕 あたらしい バージョンに きりかえるよ', 'gold');
    setTimeout(() => location.reload(), 900);
  };
  // ask the worker to re-download the shell now (it answers eq-refreshed) and to look for a newer sw.js
  App.askRefresh = function () {
    const c = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!c) return false;
    try { c.postMessage({ type: 'eq-refresh' }); } catch (e) { return false; }
    try { navigator.serviceWorker.getRegistration().then(r => r && r.update()).catch(() => { /* ignore */ }); } catch (e) { /* ignore */ }
    return true;
  };
  // the build stamp of the copy a reload would load (through the worker: the cache; without one: the server)
  App.latestBuild = () => fetch('js/app.js', { cache: 'no-store' }).then(r => r.text()).then(t => (/EQ_BUILD = '([^']+)'/.exec(t) || [])[1] || '').catch(() => '');
  // parent menu: check now → { latest, current, newer }
  App.checkUpdate = function (onResult) {
    const finish = () => App.latestBuild().then(b => onResult({ latest: b, current: window.EQ_BUILD || '', newer: !!b && b !== window.EQ_BUILD }));
    if (!App.askRefresh()) { finish(); return; }
    let done = false;
    const once = () => { if (done) return; done = true; App._refreshWait = null; finish(); };
    App._refreshWait = once;
    setTimeout(once, 12000);                       // an old worker without the message handler never answers
  };

  App.avatarEl = function (p, big) {
    const hat = p.items && p.items.hat ? Content.hatById[p.items.hat] : null;
    return h('span.avatar' + (big ? '.big' : ''), p.avatar, hat ? h('span.hat', hat.emoji) : null);
  };
  App.stars = (n, max) => { max = max || 3; let s = ''; for (let i = 0; i < max; i++) s += i < n ? '★' : '☆'; return s; };

  App.toggleSound = function (btn) {
    const p = App.p;
    App.sfxOn = !App.sfxOn; p.settings.sfx = App.sfxOn; App.save();
    Audio2.setMuted(!App.sfxOn);
    if (btn) btn.textContent = App.sfxOn ? '🔊' : '🔇';
    if (App.sfxOn) {
      Audio2.unlock({ type: 'click' });
      App.sfx('pop'); App.toast('おとを つけたよ 🔊', 'good');
      if (window.Music && App.screen === 'battle') { const t = Music.trackFor(App.params.session); if (t) Music.play(t); }
    } else App.toast('おとを けしたよ 🔇（もういちど おすと もどるよ）');
  };
  App.toggleMusic = function (btn) {
    const p = App.p;
    if (!App.sfxOn && !p.settings.music) { App.toast('おとが けしてあるよ。ホームの 🔇 を おして おとを つけてね'); return; }
    p.settings.music = !p.settings.music; p.tips.musicAsked = true; App.save();
    if (window.Music) {
      Music.setEnabled(p.settings.music);
      if (p.settings.music && App.screen === 'battle') { const t = Music.trackFor(App.params.session); if (t) Music.play(t); }
    }
    if (btn) btn.classList.toggle('off', !p.settings.music);
    App.toast(p.settings.music ? 'おんがく ON 🎵' : 'おんがく OFF');
  };

  App.hud = function () {
    const p = App.p, lp = Engine.levelProgress(p.xp);
    const xpFrom = App._xpPct && App._xpPct.id === p.id ? App._xpPct.pct : lp.pct;
    const xpBar = h('i', { style: { width: xpFrom + '%' } });
    if (xpFrom !== lp.pct) requestAnimationFrame(() => { xpBar.style.width = lp.pct + '%'; });
    App._xpPct = { id: p.id, pct: lp.pct };
    const today = !!p.stats.days[U.today()];
    return h('div.hud',
      h('div.who', App.avatarEl(p),
        h('div', { style: { minWidth: 0, flex: 1 } },
          h('div.row', h('span.name', p.name), h('span.lvl', 'Lv.' + lp.level, h('span.ttl', ' ' + Engine.title(lp.level)))),
          h('div.xpbar', xpBar))),
      h('span.stat' + (today ? '.fire' : ''), { title: 'れんぞく日数' }, h('span.ic', '🔥'), h('span.num', p.streak.count)),
      h('span.stat', { title: 'コイン' }, '🪙', h('span.num', U.fmt(p.coins))),
      h('span.stat', { title: 'ジェム' }, '💎', h('span.num', p.gems)),
      h('button.iconbtn', { title: 'おと', on: { click: (e) => App.toggleSound(e.currentTarget) } }, App.sfxOn ? '🔊' : '🔇'),
      h('button.iconbtn', { title: 'おうちのひと', on: { click: () => App.go('parentGate') } }, '⚙️'));
  };

  App.tabbar = function (active) {
    const due = App.p ? Engine.dueWords(App.p).length : 0;
    const tabs = [['home', '🏠', 'ホーム'], ['map', '🗺️', 'マップ'], ['review', '🧟', 'ふくしゅう'], ['travel', '✈️', 'たび'], ['book', '📖', 'ずかん']];
    return h('nav.tabbar', tabs.map(t => h('button', { class: t[0] === active ? 'on' : '', on: { click: () => { if (t[0] !== App.screen) App.sfx('swoosh'); App.go(t[0]); } } },
      h('span.ic', t[1]), t[2], t[0] === 'review' && due ? h('span.dot', due > 99 ? '99+' : due) : null)));
  };

  // ---- overlays ----
  // o.emoji may be a string or an element; o.fanfare adds the rays backdrop; o.cls adds a class to the box
  App.modal = function (o) {
    const bg = h('div.modal-bg' + (o.fanfare ? '.fanfare' : ''));
    const close = () => { if (bg.parentNode) bg.parentNode.removeChild(bg); if (o.onClose) o.onClose(); };
    const box = h('div.modal' + (o.fanfare ? '.fanfare' : '') + (o.cls ? '.' + o.cls : ''), { role: 'dialog' },
      o.emoji ? (o.emoji instanceof Node ? o.emoji : h('div.big-emoji', o.emoji)) : null,
      o.title ? h('h2', o.title) : null,
      o.body ? (typeof o.body === 'string' ? h('p', o.body) : o.body) : null,
      h('div.col', (o.buttons || [{ label: 'OK', cls: 'primary' }]).map(b => h('button.btn.' + (b.cls || 'primary'), { on: { click: () => { App.sfx('tap'); if (!b.keep) close(); if (b.onClick) b.onClick(close); } } }, b.label))));
    bg.appendChild(box);
    if (!o.locked) bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
    document.body.appendChild(bg);
    close.box = box;
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
    if (U.reducedMotion()) return;
    const f = h('div.flash' + (cls ? '.' + cls : ''));
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 400);
  };
  App.confetti = function (n) {
    if (U.reducedMotion()) return;
    const now = performance.now();
    if (App._lastConfetti && now - App._lastConfetti < 1200) return;   // bursts that stack only look like noise
    App._lastConfetti = now;
    let cv = U.$('#confetti');
    if (!cv) { cv = h('canvas#confetti'); document.body.appendChild(cv); }
    if (cv.width !== window.innerWidth || cv.height !== window.innerHeight) { cv.width = window.innerWidth; cv.height = window.innerHeight; }
    const ctx = cv.getContext('2d');
    const colors = ['#FF7A1A', '#2E86FF', '#22B85B', '#FFC531', '#8B5CF6', '#FF5FA2'];
    const born = now;
    const fresh = Array.from({ length: n || 120 }, () => ({ born, x: Math.random() * cv.width, y: -20 - Math.random() * cv.height * 0.5, r: 5 + Math.random() * 7, c: U.pick(colors), vy: 2 + Math.random() * 4, vx: -1.5 + Math.random() * 3, a: Math.random() * 6.28, va: -0.2 + Math.random() * 0.4 }));
    App._confetti = (App._confetti || []).concat(fresh);
    if (App._confettiLoop) return;                    // one loop draws every live burst
    App._confettiLoop = true;
    function frame(t) {
      const parts = App._confetti = App._confetti.filter(pt => t - pt.born < 2600);
      ctx.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(pt => { pt.x += pt.vx; pt.y += pt.vy; pt.a += pt.va; ctx.save(); ctx.translate(pt.x, pt.y); ctx.rotate(pt.a); ctx.fillStyle = pt.c; ctx.fillRect(-pt.r / 2, -pt.r / 2, pt.r, pt.r * 0.6); ctx.restore(); });
      if (parts.length) requestAnimationFrame(frame); else App._confettiLoop = false;
    }
    requestAnimationFrame(frame);
  };
  // re-trigger a CSS animation class on an element
  App.anim = function (el, cls, ms) { if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 500); };

  App.speakBtn = function (text, o) {
    o = o || {};
    const b = h('button.speakbtn' + (o.xl ? '.xl' : ''), { type: 'button', on: { click: (e) => { e.stopPropagation(); App.say(text, { rate: o.rate }); } } }, o.icon || '🔊', o.label !== undefined ? o.label : ' きく');
    return b;
  };
  App.slowBtn = (text) => App.speakBtn(text, { icon: '🐢', label: ' ゆっくり', rate: 0.6 });

  // level-up / badge / hatch popups used by several screens
  App.showLevelUp = function (lu, then) {
    App.sfx('levelup'); App.confetti(160);
    App.modal({ fanfare: true, emoji: '🎉', title: 'レベルアップ！', body: h('div', h('p.lvl-jump', { style: { fontSize: '1.6rem', fontWeight: 900 } }, 'Lv.' + lu.from + ' → Lv.' + lu.to), h('p.muted', 'しょうごう：' + lu.title), h('p', '🪙 +' + lu.coins + ' コイン')), buttons: [{ label: 'やったー！', onClick: then }], locked: true });
    setTimeout(() => { if (!Audio2.isSpeaking()) App.say('Level up!'); }, 1500);
  };
  App.showBadges = function (badges, then) {
    if (!badges || !badges.length) { if (then) then(); return; }
    App.sfx('badge');
    App.modal({ fanfare: true, cls: 'badge', emoji: badges[0].emoji, title: 'バッジ ゲット！', body: h('div', badges.map(b => h('p', h('b', b.emoji + ' ' + b.name), h('span.muted', ' — ' + b.desc)))), buttons: [{ label: 'すごい！', onClick: then }], locked: true });
  };
  App.showHatch = function (hatched, then) {
    if (!hatched || !hatched.length) { if (then) then(); return; }
    const x = hatched[0];
    const rar = { c: 'ノーマル', r: 'レア ✨', e: 'エピック 🌟' }[x.buddy.rarity];
    const quick = U.reducedMotion();
    const emoji = h('div.big-emoji' + (quick ? '' : '.crack'), quick ? x.buddy.emoji : '🥚');
    const title = h('span', quick ? (x.dup ? 'また あえた！' : 'たまごが かえった！') : 'たまごが…');
    const body = h('div', { style: { opacity: quick ? 1 : 0, transition: 'opacity .3s' } }, h('p', { style: { fontSize: '1.4rem' } }, h('span.en', x.buddy.name), ' / ' + x.buddy.ja), h('p.muted', rar), x.dup ? h('p', 'もう なかまなので 🪙 +50 コイン') : h('p', 'あたらしい なかまだ！ 「ずかん」で えらべるよ'));
    App.sfx('hatch');
    App.modal({ fanfare: true, emoji, title, body, buttons: [{ label: 'よろしくね！', onClick: () => { App.say(x.buddy.name); App.showHatch(hatched.slice(1), then); } }], locked: true });
    if (!quick) setTimeout(() => {
      emoji.classList.remove('crack'); emoji.textContent = x.buddy.emoji; App.anim(emoji, 'pop', 600);
      title.textContent = x.dup ? 'また あえた！' : 'たまごが かえった！';
      body.style.opacity = 1; App.confetti(100);
    }, 650);
    else App.confetti(100);
  };

  // claim a finished daily quest (home and result screen)
  App.questClaim = function (q, onDone) {
    const p = App.p;
    const r = Engine.claimQuest(p, q);
    if (!r) { if (onDone) onDone(); return; }
    App.sfx('quest'); App.toast('🪙 +15 コイン', 'gold');
    if (r.bonus) {
      const chest = h('div.big-emoji.chest-modal', '🎁');
      let opened = false;
      setTimeout(() => { App.sfx('chestShake'); App.anim(chest, 'shake', 600); }, 400);
      App.modal({ fanfare: true, emoji: chest, title: 'クエスト ぜんぶ クリア！', body: 'たからばこ と たまご を もらった！', buttons: [{ label: 'あける！', keep: true, onClick: (close) => {
        if (opened) return; opened = true;
        App.sfx('chestShake'); App.anim(chest, 'shake', 600);
        setTimeout(() => {
          Engine.openChest(p, r.bonus.chest); App.sfx('chestOpen', 'rare'); App.confetti(120);
          chest.textContent = '🎉'; App.anim(chest, 'pop', 600);
          App.toast('🪙 +' + r.bonus.chest.coins + '  💎 +' + r.bonus.chest.gems + '  🥚 たまご', 'gold');
          setTimeout(() => { close(); if (onDone) onDone(); }, 900);
        }, 600);
      } }], locked: true });
    } else if (onDone) onDone();
  };

  window.App = App;
})();
