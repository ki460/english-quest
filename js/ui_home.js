/* ui_home.js — profile select/create, home, quests, review entry, shop, badges, collection (ずかん) */
(function () {
  'use strict';
  const h = U.h;
  const D = window.ENG_DATA;

  // ---------- profiles ----------
  App.screens.profiles = {
    center: true,
    render(sc) {
      const profiles = Store.data.profiles;
      sc.appendChild(h('div.logo', 'English Quest', h('small', 'えいごクエスト — たたかって おぼえる えいご')));
      sc.appendChild(h('div.col', { style: { width: 'min(100%, 420px)' } },
        profiles.map(p => h('button.profile-card', { on: { click: () => { App.sfx('tap'); App.p = p; App.applySettings(p); Store.setCurrent(p.id); App.go('home'); } } },
          App.avatarEl(p), h('div', h('div.n', p.name), h('div.s', 'Lv.' + Engine.levelFor(p.xp) + ' ・ 🔥' + p.streak.count + 'にち ・ たんご ' + Engine.learnedCount(p))))),
        h('button.btn' + (profiles.length ? '' : '.primary.big'), { on: { click: () => App.go('newProfile') } }, profiles.length ? '＋ あたらしい ぼうけんしゃ' : 'ぼうけんを はじめる！')));
      sc.appendChild(h('p.tiny.muted', 'iPadの Safari で ひらいて、共有 → ホーム画面に追加 すると アプリみたいに つかえるよ ・ 版 ' + (window.EQ_BUILD || '?')));
    }
  };

  App.screens.newProfile = {
    render(sc) {
      let avatar = U.pick(D.avatars), start = 'abc';
      const grid = h('div.avatar-grid');
      const draw = () => { U.clear(grid); D.avatars.forEach(a => grid.appendChild(h('button', { class: a === avatar ? 'on' : '', on: { click: () => { avatar = a; App.sfx('pop'); draw(); } } }, a))); };
      draw();
      const name = h('input', { id: 'newName', type: 'text', maxLength: 12, placeholder: 'なまえ（12もじまで）', autocomplete: 'off' });
      const starts = [['abc', '🔤 ABCから（はじめて）'], ['ph', '🐸 フォニックスから'], ['g5', '🌳 英検5級から'], ['g4', '🏖️ 英検4級から'], ['g3', '🏰 英検3級から'], ['p2', '☁️ 英検準2級から'], ['g2', '🐉 英検2級から']];
      const seg = h('div.col');
      const drawStart = () => { U.clear(seg); starts.forEach(s => seg.appendChild(h('button.btn' + (s[0] === start ? '.blue' : ''), { on: { click: () => { start = s[0]; App.sfx('tap'); drawStart(); } } }, s[1]))); };
      drawStart();
      // how vocabulary questions answer: Japanese text for a child who reads kana, pictures for one who does not yet
      let mode = 'ja';
      const modes = [['ja', '🇯🇵 にほんごで こたえる（ひらがなが よめる）'], ['pic', '🖼️ えで こたえる（まだ よめない）']];
      const modeSeg = h('div.col');
      const drawMode = () => { U.clear(modeSeg); modes.forEach(m => modeSeg.appendChild(h('button.btn' + (m[0] === mode ? '.blue' : ''), { on: { click: () => { mode = m[0]; App.sfx('tap'); drawMode(); } } }, m[1]))); };
      drawMode();
      sc.appendChild(h('h1', 'ぼうけんしゃ とうろく'));
      sc.appendChild(h('div.card.col', h('div.field', h('label', 'なまえ'), name), h('div.field', h('label', 'アバターを えらぼう'), grid)));
      sc.appendChild(h('div.card.col', h('div.field', h('label', 'どこから はじめる？（あとで まえの ステージも あそべるよ）'), seg)));
      sc.appendChild(h('div.card.col', h('div.field', h('label', 'たんごの こたえかた（おうちのひとメニューで あとから かえられるよ）'), modeSeg)));
      sc.appendChild(h('div.row', h('button.btn.ghost', { on: { click: () => App.go('profiles') } }, 'もどる'), h('button.btn.primary', { style: { flex: 1 }, on: { click: () => {
        const n = name.value.trim(); if (!n) { name.focus(); App.toast('なまえを いれてね'); return; }
        const p = Store.newProfile(n, avatar, start);
        p.settings.answerMode = mode;
        p.eggs.push({ id: U.uid(), kind: 'normal', p: 0, need: 3 });   // a starter egg: the first buddy hatches in session one
        Store.addProfile(p); App.p = p; App.applySettings(p);
        Engine.ensureDaily(p); App.save(); App.sfx('win'); App.confetti(); App.go('home');
        setTimeout(() => App.toast('🥚 たまごを もらった！ 3かい たたかうと かえるよ', 'gold'), 900);
      } } }, 'スタート！')));
    }
  };

  // ---------- home ----------
  App.screens.home = {
    hud: true, tab: 'home',
    render(sc) {
      const p = App.p;
      const na = Engine.nextAction(p);
      const buddy = p.buddy ? Content.buddyById[p.buddy] : null;
      const due = Engine.dueWords(p).length;
      let line = U.pick(D.buddyLines);
      const readyEgg = p.eggs.find(e => e.need - e.p <= 1);
      if (due >= 5) line = 'ゾンビたんごが ' + due + 'たい あらわれた！ ふくしゅう しよう！';
      else if (readyEgg) line = 'たまごが もうすぐ かえりそう…！';
      else if (p.daily.goalDone) line = 'きょうの もくひょう クリア！ すごい！';
      const goalPct = Math.min(100, Math.round(100 * p.daily.xp / p.settings.dailyGoal));
      const nextEgg = p.eggs.slice().sort((a, b) => (a.need - a.p) - (b.need - b.p))[0];
      const eggChip = nextEgg ? h('span.egg-chip' + (nextEgg.need - nextEgg.p <= 1 ? '.ready' : ''), (nextEgg.kind === 'gold' ? '🪺' : '🥚') + ' あと ' + (nextEgg.need - nextEgg.p) + 'かい') : null;

      // the goal ring fills from where it was last time this screen was shown
      const ringFrom = App._ringPct && App._ringPct.id === p.id ? App._ringPct.pct : goalPct;
      const ring = h('div.goal-ring' + (p.daily.goalDone ? '.done' : ''), { style: { '--p': ringFrom } }, h('span', p.daily.xp + '/' + p.settings.dailyGoal, h('br'), 'XP'));
      if (ringFrom !== goalPct && !U.reducedMotion()) { const t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / 700); ring.style.setProperty('--p', Math.round(ringFrom + (goalPct - ringFrom) * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }
      else ring.style.setProperty('--p', goalPct);
      App._ringPct = { id: p.id, pct: goalPct };
      if (p.daily.goalDone && !p.daily.goalCelebrated) { p.daily.goalCelebrated = true; App.save(); setTimeout(() => { if (ring.isConnected) { App.sfx('star', 3); App.anim(ring, 'ripple', 1100); } }, 500); }

      sc.appendChild(h('div.hero',
        h('div.buddy', { on: { click: () => { App.sfx('pop'); if (buddy) App.say(buddy.name); } } }, buddy ? buddy.emoji : '🥚'),
        h('div.bubble', line, h('div.tiny.muted', buddy ? [h('span.en', buddy.name), ' / ' + buddy.ja, eggChip ? ' ' : null, eggChip] : (eggChip ? ['たまごが そだっているよ ', eggChip] : 'たまごを かえすと なかまが できるよ'))),
        ring));

      // no English voice on this device: say so before anything else (English is not spoken at all in that case)
      if (Audio2.noEnglishVoice && Audio2.noEnglishVoice()) {
        sc.appendChild(h('div.card', { style: { borderColor: 'var(--bad)', background: 'var(--bad-soft)' } }, h('div.bold', '⚠️ この たんまつには えいごの こえが ありません'), h('div.small', 'えいごを まちがった おとで よまないように、よみあげは おやすみしています。おうちのひとメニュー（⚙️）→ 設定 に なおしかたが あります')));
      }
      // continue button. A lesson that did not reach ★★ is replayed; when zombies pile up before new words, review first.
      const nextL = na.kind === 'lesson' ? na.stage.lessons[na.lesson] : null;
      const retryLesson = !!(nextL && p.lessons[nextL.id] && p.lessons[nextL.id].n > 0);
      const nudge = nextL && !retryLesson && nextL.focus !== 'study' ? Engine.suggestReview(p) : 0;
      const label = nudge ? '🧟 ゾンビを たおしてから すすもう！（' + nudge + 'たい）'
        : nextL ? (nextL.focus === 'study' ? '📖 ' + na.stage.name + ' の ' + (na.stage.kind === 'abc' ? 'もじ' : 'たんご') + 'を おぼえる' : retryLesson ? '🔁 おぼえてから ' + na.stage.name + ' ' + nextL.label + ' を もういちど' : '⚔️ ' + na.stage.name + ' ' + nextL.label + ' へ すすむ')
        : na.kind === 'boss' ? '👑 ボス「' + na.stage.boss[0] + '」に ちょうせん'
        : na.kind === 'practice' ? '💪 ' + na.stage.name + ' を れんしゅうして ボスに そなえる'
        : na.kind === 'test' ? '🧙 ' + na.world.test + ' に ちょうせん' : '🏆 ぜんぶ クリア！ れんしゅうしよう';
      sc.appendChild(h('button.btn.primary.big.pulse', { on: { click: () => { App.sfx('tap'); if (nudge) { const s = Engine.startReview(p); if (s) { App.go('battle', { session: s }); return; } } App.startAction(na); } } }, label));

      // streak strip
      const days = [];
      for (let i = 6; i >= 0; i--) { const d = U.today(-i); days.push(h('span', { class: (p.stats.days[d] ? 'on' : '') + (i === 0 ? ' today' : '') }, ['日', '月', '火', '水', '木', '金', '土'][new Date(d.replace(/-/g, '/')).getDay()])); }
      sc.appendChild(h('div.card.col', h('div.row.between', h('div.bold', '🔥 ' + p.streak.count + '日 れんぞく'), h('div.tiny.muted', 'さいこう ' + (p.streak.best || 0) + '日' + (p.items.freezes ? ' ・ 🧊キープ×' + p.items.freezes : ''))), h('div.streak-days', { style: { justifyContent: 'space-between' } }, days)));

      // quests
      const qcard = h('div.card', h('div.section-title', h('h2', '📜 きょうの クエスト'), h('span.pill' + (p.daily.chest ? '.gold' : ''), p.daily.chest ? '🎁 うけとりずみ' : '3つで 🎁+🥚')));
      (p.daily.quests || []).forEach(q => {
        const row = h('div.quest' + (q.done ? '.done' : ''),
          h('div.q', h('div.t', (q.claimed ? '✅ ' : q.done ? '🌟 ' : '') + q.text), h('div.bar.blue', { style: { marginTop: '4px' } }, h('i', { style: { width: Math.round(100 * q.p / q.target) + '%' } })), h('div.tiny.muted.num', q.p + ' / ' + q.target)),
          q.done && !q.claimed ? h('button.btn.gold.sm.pulse', { on: { click: (e) => { e.currentTarget.disabled = true; App.questClaim(q, () => App.refresh()); } } }, 'うけとる') : null);
        qcard.appendChild(row);
      });
      sc.appendChild(qcard);

      // tiles
      sc.appendChild(h('div.grid3',
        h('button.tile-btn', { on: { click: () => App.go('map') } }, h('span.ic', '🗺️'), 'マップ'),
        h('button.tile-btn' + (due ? '' : '.dim'), { on: { click: () => App.go('review') } }, h('span.ic', '🧟'), 'ふくしゅう', due ? h('span.badge', due) : null),
        h('button.tile-btn', { on: { click: () => App.go('travel') } }, h('span.ic', '✈️'), 'たびの じゅんび'),
        h('button.tile-btn', { on: { click: () => App.go('book') } }, h('span.ic', '📖'), 'ずかん', p.eggs.length ? h('span.badge', '🥚' + p.eggs.length) : null),
        h('button.tile-btn', { on: { click: () => App.go('shop') } }, h('span.ic', '🛒'), 'ショップ'),
        h('button.tile-btn', { on: { click: () => App.go('badges') } }, h('span.ic', '🏅'), 'バッジ', h('span.tiny.muted', p.badges.length + '/' + Content.badges.length))));

      sc.appendChild(h('div.row.center', h('button.btn.ghost.sm', { on: { click: () => App.go('profiles') } }, '👤 ぼうけんしゃを かえる')));

      // once, after the first battle: let the child decide about battle music
      if (!p.tips.musicAsked && p.stats.battles >= 1 && window.Music && !App._musicPrompt) {
        App._musicPrompt = true;
        setTimeout(() => {
          App._musicPrompt = false;
          if (App.screen !== 'home' || p.tips.musicAsked) return;
          p.tips.musicAsked = true; App.save();
          const decide = (on) => { p.settings.music = on; App.save(); Music.setEnabled(on); if (on) App.sfx('coin'); };
          App.modal({ emoji: '🎶', title: p.stats.battles <= 1 ? 'バトルに おんがくを つける？' : 'あたらしい おとが きたよ！', body: 'バトルの ときに おんがくを ならす？（バトルがめんの 🎵 で いつでも かえられるよ）',
            buttons: [{ label: '🎵 ならす！', cls: 'primary', onClick: () => decide(true) }, { label: 'いまは いい', cls: 'ghost', onClick: () => decide(false) }], locked: true });
        }, 700);
      }
    }
  };

  App.startAction = function (na) {
    const p = App.p;
    if (na.kind === 'lesson') App.go('battle', { session: Engine.startLesson(p, na.stage.id, na.lesson) });
    else if (na.kind === 'boss') App.go('battle', { session: Engine.startBoss(p, na.stage.id) });
    else if (na.kind === 'practice') App.go('battle', { session: Engine.startPractice(p, na.stage.id) });
    else if (na.kind === 'test') App.go('testIntro', { world: na.world.key });
    else App.go('map');
  };

  // ---------- review ----------
  App.screens.review = {
    hud: true, tab: 'review',
    render(sc) {
      const p = App.p, due = Engine.dueWords(p), seen = Engine.seenCount(p), learned = Engine.learnedCount(p);
      sc.appendChild(h('h1', '🧟 ゾンビたいじ（ふくしゅう）'));
      sc.appendChild(h('div.card.col',
        h('p', 'わすれかけた たんごは ゾンビになって もどってくる！ たおして おぼえなおそう。'),
        h('div.stat-grid', h('div.st', h('div.k', 'いま でている ゾンビ'), h('div.v', due.length)), h('div.st', h('div.k', 'であった たんご'), h('div.v', seen)), h('div.st', h('div.k', 'おぼえた たんご'), h('div.v', learned))),
        due.length ? h('div.wordchips', due.slice(0, 12).map(k => h('span', '🧟 ' + Content.words[k].w))) : null,
        seen ? h('button.btn.primary.big', { on: { click: () => { const s = Engine.startReview(p); if (s) App.go('battle', { session: s }); } } }, due.length ? '⚔️ ゾンビを たおす！（' + Math.min(12, due.length) + 'たい）' : '💪 にがてな たんごを れんしゅう') : h('p.muted', 'まずは マップで バトルして たんごを おぼえよう！')));
      if (!due.length && seen) sc.appendChild(h('p.muted.small', 'いまは ゾンビは いないよ。おぼえた たんごは 1日・3日・7日・14日・30日 あとに ゾンビになって もどってくるよ（くりかえすと わすれにくくなる）。'));
    }
  };

  // ---------- shop ----------
  App.screens.shop = {
    hud: true, tab: 'home',
    render(sc) {
      const p = App.p;
      const buy = (item) => { const r = Engine.buy(p, item); if (!r.ok) { App.sfx('pop'); App.toast(r.reason); return; } App.sfx('coin'); App.toast(item.emoji + ' ' + item.name + ' を かった！', 'good'); App.refresh(); };
      sc.appendChild(h('h1', '🛒 ショップ'));
      sc.appendChild(h('div.row', h('span.stat', '🪙 ' + U.fmt(p.coins)), h('span.stat', '💎 ' + p.gems), h('span.stat', '🧪 ×' + p.items.potions), h('span.stat', '🧊 ×' + p.items.freezes)));
      sc.appendChild(h('h2', 'アイテム'));
      Engine.shop.forEach(it => sc.appendChild(h('div.shop-item', h('div.e', it.emoji), h('div.d', h('div.t', it.name), h('div.s', it.desc)), h('button.btn.sm' + (p[it.cur] >= it.price ? '.gold' : ''), { on: { click: () => buy(it) } }, (it.cur === 'coins' ? '🪙 ' : '💎 ') + it.price))));
      sc.appendChild(h('h2', 'ぼうし（アバターに つける）'));
      Content.hats.forEach(hat => {
        const owned = p.items.hats.indexOf(hat.id) >= 0, on = p.items.hat === hat.id;
        sc.appendChild(h('div.shop-item', h('div.e', hat.emoji), h('div.d', h('div.t', hat.name), h('div.s', owned ? (on ? 'つけているよ' : 'もっている') : 'コインで かえる')),
          owned ? h('button.btn.sm' + (on ? '.ghost' : '.blue'), { on: { click: () => { p.items.hat = on ? '' : hat.id; App.save(); App.sfx('pop'); App.refresh(); } } }, on ? 'はずす' : 'つける')
            : h('button.btn.sm' + (p.coins >= hat.price ? '.gold' : ''), { on: { click: () => buy(Object.assign({ hat: true, cur: 'coins' }, hat)) } }, '🪙 ' + hat.price)));
      });
    }
  };

  // ---------- badges ----------
  App.screens.badges = {
    hud: true, tab: 'home',
    render(sc) {
      const p = App.p;
      sc.appendChild(h('h1', '🏅 バッジ ' + p.badges.length + ' / ' + Content.badges.length));
      sc.appendChild(h('div.grid4', Content.badges.map(b => h('div.badge-card' + (p.badges.indexOf(b.id) >= 0 ? '' : '.off'), h('div.e', b.emoji), h('div.n', b.name), h('div.d', b.desc)))));
    }
  };

  // ---------- collection ----------
  App.screens.book = {
    hud: true, tab: 'book',
    render(sc, params) {
      const p = App.p; const tab = params.tab || 'buddies';
      sc.appendChild(h('h1', '📖 ずかん'));
      sc.appendChild(h('div.seg', [['buddies', '🐣 なかま'], ['words', '📚 たんご'], ['profile', '👤 プロフィール']].map(t => h('button', { class: t[0] === tab ? 'on' : '', on: { click: () => App.go('book', { tab: t[0] }) } }, t[1]))));
      if (tab === 'buddies') {
        if (p.eggs.length) {
          sc.appendChild(h('h2', '🥚 たまご（バトルすると そだつ）'));
          sc.appendChild(h('div.egg-row', p.eggs.map(e => h('div.egg', h('div.e', e.kind === 'gold' ? '🪺' : '🥚'), h('div.bar.gold', h('i', { style: { width: Math.round(100 * e.p / e.need) + '%' } })), h('div.tiny.muted', 'あと ' + (e.need - e.p) + 'かい')))));
        }
        sc.appendChild(h('h2', '🐣 なかま ' + p.buddies.length + ' / ' + Content.buddies.length));
        sc.appendChild(h('p.tiny.muted', 'タップすると いっしょに たたかう なかまに できるよ（レア: +2 / エピック: +3 ダメージ）'));
        sc.appendChild(h('div.grid4', Content.buddies.map(b => {
          const own = p.buddies.indexOf(b.id) >= 0;
          return h('div.buddy-card.' + b.rarity + (own ? '' : '.unknown') + (p.buddy === b.id ? '.active' : ''), { on: { click: () => { if (!own) { App.toast('まだ みつけていない なかまだよ'); return; } p.buddy = b.id; App.save(); App.sfx('pop'); App.say(b.name); App.refresh(); } } },
            h('div.e', b.emoji), h('div.n.en', own ? b.name : '???'), h('div.j', own ? b.ja : ({ c: 'ノーマル', r: 'レア', e: 'エピック' })[b.rarity]));
        })));
      } else if (tab === 'words') {
        const lv = params.lv || (Content.worldIndex(p.startLevel) >= 2 ? p.startLevel : 'g5');
        sc.appendChild(h('div.worldtabs', Content.worlds.filter(w => w.key !== 'abc').concat([{ key: 'travel', emoji: '✈️', sub: 'たび' }]).map(w => h('button', { class: w.key === lv ? 'on' : '', on: { click: () => App.go('book', { tab: 'words', lv: w.key }) } }, w.emoji, w.sub))));
        const keys = (Content.levelWords[lv] || []);
        const seen = keys.filter(k => p.words[k] && p.words[k].s), learned = keys.filter(k => p.words[k] && p.words[k].b >= 3);
        sc.appendChild(h('div.card', h('div.row.between', h('span', 'であった ' + seen.length + ' / ' + keys.length), h('span', 'おぼえた ' + learned.length)), h('div.bar', { style: { marginTop: '8px' } }, h('i', { style: { width: Math.round(100 * learned.length / Math.max(1, keys.length)) + '%' } }))));
        const list = h('div.card');
        const rows = seen.length ? seen : [];
        if (!rows.length) list.appendChild(h('p.muted', 'まだ このレベルの たんごには であっていないよ'));
        rows.sort((a, b) => Content.words[a].w.localeCompare(Content.words[b].w)).forEach(k => {
          const w = Content.words[k], st = p.words[k];
          list.appendChild(h('div.wordbook-row', h('span', { style: { fontSize: '1.6rem', width: '2rem', textAlign: 'center' } }, w.e || '・'), h('div.w', h('div.en', w.w), h('div.ja', w.ja)), h('span.box-dots', [0, 1, 2, 3, 4, 5].map(i => h('i', { class: i < st.b ? 'on' : '' }))), App.speakBtn(w.w, { label: '' })));
        });
        sc.appendChild(list);
      } else {
        const lp = Engine.levelProgress(p.xp);
        sc.appendChild(h('div.card.col', { style: { alignItems: 'center', textAlign: 'center' } }, App.avatarEl(p, true), h('h2', p.name), h('p.muted', 'Lv.' + lp.level + ' ' + Engine.title(lp.level) + ' ・ つぎのレベルまで あと ' + (lp.need - lp.cur) + ' XP'),
          h('div.stat-grid', { style: { width: '100%' } }, h('div.st', h('div.k', 'XP'), h('div.v', U.fmt(p.xp))), h('div.st', h('div.k', 'バトル'), h('div.v', p.stats.battles)), h('div.st', h('div.k', 'おぼえた たんご'), h('div.v', Engine.learnedCount(p))), h('div.st', h('div.k', 'さいこうコンボ'), h('div.v', p.stats.maxCombo)), h('div.st', h('div.k', 'ノーミス'), h('div.v', p.stats.perfect)), h('div.st', h('div.k', 'つうじた！'), h('div.v', p.travel.tsuujita))),
          h('div.field', { style: { width: '100%' } }, h('label', 'アバターを かえる'), h('div.avatar-grid', D.avatars.map(a => h('button', { class: a === p.avatar ? 'on' : '', on: { click: () => { p.avatar = a; App.save(); App.sfx('pop'); App.refresh(); } } }, a))))));
      }
    }
  };
})();
