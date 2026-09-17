/* ui_battle.js — the battle screen (every exercise type) and the result screen */
(function () {
  'use strict';
  const h = U.h;

  App.screens.battle = {
    render(sc, params) {
      const s = params.session, p = App.p;
      sc.classList.add('battle');
      const isTest = s.kind === 'test';
      let ex = null, locked = false;

      // ----- top bar + arena -----
      const prog = h('div.progress', h('i', { style: { width: '0%' } }));
      const quit = h('button.iconbtn', { title: 'やめる', on: { click: () => App.modal({ emoji: '🏃', title: 'バトルを やめる？', body: 'ここまでの けっかは のこらないよ', buttons: [{ label: 'つづける', cls: 'primary' }, { label: 'やめる', cls: 'ghost', onClick: () => App.go('home') }] }) } }, '✕');
      const counter = h('span.pill.num', '');
      sc.appendChild(h('div.battle-top', quit, prog, counter));

      const mSprite = h('div.sprite', s.monster.emoji), mName = h('div.nm', s.monster.name), mHp = h('i'), mHpLb = h('span.lb');
      const pSprite = h('div.sprite', App.avatarEl(p)), pHp = h('i'), pHpLb = h('span.lb');
      const buddyEl = s.buddy ? h('span', { style: { fontSize: '1.8rem', marginLeft: '-6px' } }, s.buddy.emoji) : null;
      const arena = h('div.arena', { style: { position: 'relative' } },
        h('div.fighter.player', h('div.row', pSprite, buddyEl), h('div.nm', p.name), s.hasHp ? h('div.hpbar', pHp, pHpLb) : null),
        h('div.vs', 'VS'),
        h('div.fighter.monster' + (s.monster.boss ? '.boss' : ''), mSprite, mName, isTest ? h('div.nm', 'テストちゅう') : h('div.hpbar.m', mHp, mHpLb)));
      sc.appendChild(arena);
      const qarea = h('div.qarea');
      sc.appendChild(qarea);

      function bars() {
        mHp.style.width = Math.max(0, 100 * s.monster.hp / s.monster.max) + '%'; mHpLb.textContent = Math.max(0, s.monster.hp) + ' / ' + s.monster.max;
        pHp.style.width = Math.max(0, 100 * s.player.hp / s.player.max) + '%'; pHpLb.textContent = s.player.hp + ' / ' + s.player.max;
        const pr = Engine.progress(s); prog.firstChild.style.width = pr.pct + '%';
        counter.textContent = Math.min(pr.i + 1, pr.n) + ' / ' + pr.n;
      }
      function floatDmg(text, crit) {
        const el = h('div.floatdmg' + (crit ? '.crit' : ''), text);
        el.style.right = '18%'; el.style.top = '10%';
        arena.appendChild(el); setTimeout(() => el.remove(), 900);
      }
      function comboPop(n) {
        const el = h('div.combo', n + ' COMBO!', h('small', n >= 5 ? 'XPボーナス！' : 'ダメージアップ！'));
        arena.appendChild(el); setTimeout(() => el.remove(), 800);
      }
      function anim(el, cls, ms) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms || 500); }

      // ----- question rendering -----
      function next() {
        if (Engine.isOver(s)) return finish();
        ex = Engine.current(s); locked = false;
        U.clear(qarea); bars();
        const R = renderers[ex.type] || renderers.choice;
        R(ex);
        qarea.scrollTop = 0;
      }
      function finish() {
        const r = Engine.finish(p, s);
        App.go('result', { r, s });
      }

      function promptCard(ex, extra) {
        const pr = ex.prompt || {};
        const card = h('div.qcard');
        if (ex.passage) card.appendChild(h('div.passage', ex.passage.title ? h('h3', ex.passage.title) : null, ex.passage.p));
        if (pr.label) card.appendChild(h('div.label', pr.label));
        if (pr.emoji) card.appendChild(h('div.emoji', pr.emoji));
        if (pr.text) {
          if (pr.text.indexOf('___') >= 0) { const parts = pr.text.split('___'); card.appendChild(h('div.sentence.en', parts[0], h('b', '____'), parts[1])); }
          else if (pr.bigText) card.appendChild(h('div.word.big.en', pr.text));
          else if (/[a-zA-Z]/.test(pr.text) && pr.text.length < 18) card.appendChild(h('div.word.en', pr.text));
          else card.appendChild(h('div.sentence' + (/^[\x00-\x7F]+$/.test(pr.text) ? '.en' : ''), pr.text));
        }
        if (pr.tts) {
          const row = h('div.row.center.wrap', App.speakBtn(pr.tts, { xl: !!pr.listen, label: pr.listen ? ' もういちど' : ' きく' }), pr.listen ? App.slowBtn(pr.tts) : null);
          card.appendChild(row);
          if (pr.listen || pr.speaker) setTimeout(() => App.say(pr.tts), 250);
        }
        if (extra) card.appendChild(extra);
        return card;
      }

      function feedback(correct, ex, details) {
        const box = h('div.feedback' + (correct ? '.ok' : '.ng'));
        const body = h('div.fb-body');
        let correctText = '';
        if (ex.choices) { const c = ex.choices[ex.answer]; correctText = c.label || c.emoji || ''; }
        else if (ex.display || ex.target) correctText = ex.display || ex.target;
        else if (ex.letter) correctText = ex.letter;
        if (!correct && correctText) body.appendChild(h('b', 'こたえ：' + correctText));
        if (ex.reveal && correct) body.appendChild(h('b.en', ex.reveal));
        if (ex.ja && (ex.type === 'pic4' || ex.type === 'spell' || (ex.prompt && ex.prompt.listen))) body.appendChild(h('div', ex.ja));
        if (ex.explain) body.appendChild(h('div.small', ex.explain));
        if (details) body.appendChild(h('div.small', details));
        box.appendChild(h('div.fb-title', correct ? (U.pick(['せいかい！', 'すごい！', 'Great!', 'Nice!', 'やったね！'])) : 'ざんねん…'));
        box.appendChild(body);
        const btn = h('button.btn' + (correct ? '.good' : '.blue'), { on: { click: () => { App.sfx('tap'); next(); } } }, 'つぎへ');
        box.appendChild(btn);
        qarea.appendChild(box);
        btn.focus({ preventScroll: true });
        setTimeout(() => btn.scrollIntoView({ block: 'nearest' }), 50);
        return btn;
      }

      function submit(correct, details) {
        if (locked) return; locked = true;
        const res = Engine.answer(p, s, ex, correct);
        if (correct) {
          App.sfx(res.crit ? 'crit' : 'correct');
          if (!isTest) {
            anim(pSprite, 'attack', 400); anim(mSprite, 'hit', 450);
            floatDmg((res.crit ? 'CRIT! ' : '') + '-' + res.dmg, res.crit);
            if (s.combo >= 2) { comboPop(s.combo); if (s.combo >= 3) App.sfx('combo', s.combo); }
            if (res.killed) {
              setTimeout(() => { anim(mSprite, 'dead', 800); App.sfx('win'); }, 350);
              if (res.newMonster) setTimeout(() => { mSprite.classList.remove('dead'); mSprite.textContent = res.newMonster.emoji; mName.textContent = res.newMonster.name; anim(mSprite, 'hit', 10); bars(); App.toast('🪙 たおした！ つぎの ' + res.newMonster.name + ' が あらわれた！', 'good'); }, 1200);
            }
          }
          const ttsAfter = ex.ttsAfter || (ex.type === 'pic4' && ex.prompt.text) || (ex.type === 'spell' && ex.target) || (ex.type === 'build' && ex.display) || null;
          const btn = feedback(true, ex, details);
          if (ttsAfter && !(ex.prompt && ex.prompt.listen)) setTimeout(() => App.say(ttsAfter), 300);
          const wait = ttsAfter ? 1500 + ttsAfter.length * 55 : 1000;
          setTimeout(() => { if (btn.isConnected) next(); }, Math.min(3600, wait));
        } else {
          App.sfx('wrong'); App.flash();
          if (s.hasHp) { anim(pSprite, 'hit', 450); setTimeout(() => App.sfx('hurt'), 150); }
          if (res.potion) App.toast('🧪 ポーションで ぜんかいふく！', 'good');
          else if (res.rescued) App.toast('なかまが たすけてくれた！ HPかいふく', 'good');
          feedback(false, ex, res.retryQueued ? 'あとで もういちど でるよ' : details);
          const ct = ex.choices ? (ex.choices[ex.answer].tts || (ex.choices[ex.answer].label && /[a-zA-Z]/.test(ex.choices[ex.answer].label) ? ex.choices[ex.answer].label : null)) : (ex.display || ex.target || null);
          if (ct) setTimeout(() => App.say(ct), 400);
        }
        bars();
      }

      // ----- renderers -----
      const renderers = {};
      renderers.intro = function (ex) {
        const w = Content.words[ex.word];
        const isPhrase = w.lv === 'travel';
        qarea.appendChild(h('div.intro-card', h('span.newtag', 'NEW!'), w.e ? h('div.emoji', w.e) : null,
          h('div.word.en' + (isPhrase ? '' : ''), { style: isPhrase ? { fontSize: '1.9rem' } : null }, w.w), h('div.ja', w.ja),
          h('div.row.center.wrap', App.speakBtn(w.w, { xl: true }), App.slowBtn(w.w)),
          h('button.btn.primary.big', { on: { click: () => { App.sfx('tap'); Engine.skipIntro(p, s); next(); } } }, 'おぼえた！ つぎへ')));
        setTimeout(() => App.say(w.w), 300);
      };
      renderers.abcIntro = function (ex) {
        const e = ex.entry, L = ex.letter;
        const say = () => App.say(L + '. ' + L.toLowerCase() + '. ' + e[2] + '.');
        qarea.appendChild(h('div.intro-card', h('span.newtag', 'NEW!'), h('div.letter-pair', L, h('small', L.toLowerCase())), h('div.emoji', e[3]), h('div.word.en', e[2]), h('div.ja', e[4]),
          h('div.row.center.wrap', App.speakBtn('The letter ' + L + '.', { xl: true, label: ' ' + L }), App.speakBtn(e[2], { label: ' ' + e[2] })),
          h('button.btn.primary.big', { on: { click: () => { App.sfx('tap'); Engine.skipIntro(p, s); next(); } } }, 'おぼえた！ つぎへ')));
        setTimeout(say, 300);
      };
      renderers.choice = function (ex) {
        qarea.appendChild(promptCard(ex));
        const grid = h('div.choices');
        const btns = ex.choices.map((c, i) => h('button.choice' + (ex.big ? '.big' : '') + (c.emoji && !c.label ? '' : ''), { on: { click: () => pick(i) } }, c.emoji ? h('span.emoji', c.emoji) : null, c.label ? h('span' + (/[a-zA-Z]/.test(c.label) && !/[ぁ-んァ-ン一-龥]/.test(c.label) ? '.en' : ''), c.label) : null));
        btns.forEach(b => grid.appendChild(b));
        qarea.appendChild(grid);
        function pick(i) {
          if (locked) return;
          const ok = i === ex.answer;
          btns.forEach((b, j) => { b.disabled = true; if (j === ex.answer) b.classList.add('ok'); else if (j === i) b.classList.add('ng'); else b.classList.add('dim'); });
          submit(ok);
        }
      };
      renderers.pic4 = renderers.choice;
      renderers.spell = function (ex) {
        qarea.appendChild(promptCard(ex));
        const box = h('div.answerbox'); const tiles = h('div.tiles');
        let picked = [];
        const tileEls = ex.tiles.map((ch, i) => h('button.tile', { on: { click: () => { if (locked || picked.some(x => x.i === i)) return; App.sfx('tick'); picked.push({ ch, i }); draw(); if (picked.length === ex.target.length) check(); } } }, ch));
        tileEls.forEach(t => tiles.appendChild(t));
        function draw() {
          U.clear(box);
          picked.forEach((pk, k) => box.appendChild(h('button.tile', { on: { click: () => { if (locked) return; picked.splice(k, 1); App.sfx('tick'); draw(); } } }, pk.ch)));
          tileEls.forEach((t, i) => t.classList.toggle('used', picked.some(x => x.i === i)));
        }
        function check() {
          const ans = picked.map(x => x.ch).join('');
          const ok = ans === ex.target;
          box.classList.add(ok ? 'ok' : 'ng');
          submit(ok);
        }
        qarea.appendChild(box); qarea.appendChild(tiles);
        qarea.appendChild(h('div.row.center', h('button.btn.sm.ghost', { on: { click: () => { if (locked) return; picked.pop(); draw(); } } }, '⌫ ひとつ けす'), h('button.btn.sm.ghost', { on: { click: () => { if (locked) return; picked = []; draw(); } } }, 'ぜんぶ けす')));
        draw();
      };
      renderers.build = function (ex) {
        qarea.appendChild(promptCard(ex));
        const box = h('div.answerbox'); const tiles = h('div.tiles');
        let picked = [];
        const tileEls = ex.tiles.map((t, i) => h('button.tile.sentence', { on: { click: () => { if (locked || picked.some(x => x.i === i)) return; App.sfx('tick'); picked.push({ t, i }); draw(); } } }, t));
        tileEls.forEach(t => tiles.appendChild(t));
        const checkBtn = h('button.btn.primary.block', { on: { click: check } }, 'こたえる');
        function draw() {
          U.clear(box);
          picked.forEach((pk, k) => box.appendChild(h('button.tile.sentence', { on: { click: () => { if (locked) return; picked.splice(k, 1); App.sfx('tick'); draw(); } } }, pk.t)));
          tileEls.forEach((t, i) => t.classList.toggle('used', picked.some(x => x.i === i)));
          checkBtn.disabled = picked.length < ex.tokens.length;
        }
        function check() {
          if (locked) return;
          const ans = picked.map(x => x.t).join(' ');
          const ok = U.norm(ans) === U.norm(ex.target);
          box.classList.add(ok ? 'ok' : 'ng');
          submit(ok);
        }
        qarea.appendChild(box); qarea.appendChild(tiles); qarea.appendChild(checkBtn);
        draw();
      };
      renderers.speak = function (ex) {
        const useSR = Audio2.srAvailable() && p.settings.speech;
        const heard = h('div.heard', useSR ? 'マイクを おして、はなしてね' : '🔊 きいて、おなじように いってみよう');
        const mic = h('button.mic', { title: 'マイク' }, '🎤');
        let tries = 0;
        const doneBtn = h('button.btn.sm.ghost', { on: { click: () => submit(true, useSR ? 'じぶんで いえたら OK！' : null) } }, useSR ? 'マイクが つかえない → いえた！' : '✅ いえた！');
        if (!useSR) doneBtn.className = 'btn good big'; else doneBtn.hidden = true;
        qarea.appendChild(promptCard(ex, h('div.col', { style: { alignItems: 'center', width: '100%' } }, useSR ? mic : null, heard, doneBtn)));
        setTimeout(() => App.say(ex.target), 300);
        mic.addEventListener('click', async () => {
          if (locked || mic.classList.contains('listening')) return;
          Audio2.stopSpeaking();
          mic.classList.add('listening'); heard.textContent = 'きいているよ… はなして！';
          const res = await Audio2.listen({ timeout: 6000 });
          mic.classList.remove('listening'); doneBtn.hidden = false;
          if (!res.ok) {
            if (res.error === 'not-allowed' || res.error === 'service-not-allowed') { heard.textContent = 'マイクが つかえないみたい。きいて まねして「いえた！」を おそう'; doneBtn.className = 'btn good'; doneBtn.textContent = '✅ いえた！'; return; }
            heard.textContent = res.error === 'no-speech' || res.error === 'timeout' ? 'きこえなかった… もういちど マイクを おして はなしてね' : 'うまく きけなかった… もういちど'; return;
          }
          const m = Audio2.matchSpeech(res.alts, ex.target);
          tries++;
          if (m.ok) { heard.textContent = 'きこえた： ' + m.heard + ' ✅'; submit(true); }
          else { heard.textContent = 'きこえた：「' + m.heard + '」… もういちど ゆっくり いってみよう'; App.sfx('pop'); if (tries >= 3) { doneBtn.className = 'btn blue'; doneBtn.textContent = 'むずかしい… つぎへ（いえた ことにする）'; } }
        });
      };
      renderers.trace = function (ex) {
        const wrap = h('div.trace-wrap'); const guide = h('canvas'); const draw = h('canvas');
        wrap.appendChild(guide); wrap.appendChild(draw);
        const size = 320; guide.width = draw.width = size; guide.height = draw.height = size;
        const g = guide.getContext('2d'), d = draw.getContext('2d');
        const ink = getComputedStyle(document.documentElement).getPropertyValue('--line').trim() || '#ccc';
        const acc = getComputedStyle(document.documentElement).getPropertyValue('--acc').trim() || '#f70';
        g.fillStyle = ink; g.font = '700 260px Fredoka, "Arial Rounded MT Bold", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(ex.letter, size / 2, size / 2 + 14);
        d.lineCap = 'round'; d.lineJoin = 'round'; d.lineWidth = 26; d.strokeStyle = acc;
        let drawing = false, strokes = 0;
        const pos = (e) => { const r = draw.getBoundingClientRect(); return [(e.clientX - r.left) * size / r.width, (e.clientY - r.top) * size / r.height]; };
        draw.addEventListener('pointerdown', (e) => { drawing = true; strokes++; const [x, y] = pos(e); d.beginPath(); d.moveTo(x, y); d.lineTo(x + 0.1, y); d.stroke(); draw.setPointerCapture(e.pointerId); });
        draw.addEventListener('pointermove', (e) => { if (!drawing) return; const [x, y] = pos(e); d.lineTo(x, y); d.stroke(); });
        const up = () => { drawing = false; };
        draw.addEventListener('pointerup', up); draw.addEventListener('pointercancel', up);
        const e = ex.entry;
        qarea.appendChild(promptCard(ex, h('div.col', { style: { alignItems: 'center', width: '100%' } }, h('div.letter-pair', ex.letter), h('div.small.muted', e[3] + ' ' + e[2] + '（' + e[4] + '）'), wrap,
          h('div.row.center', h('button.btn.sm.ghost', { on: { click: () => { d.clearRect(0, 0, size, size); strokes = 0; } } }, 'けす'), h('button.btn.primary', { on: { click: check } }, 'できた！')))));
        setTimeout(() => App.say(ex.prompt.tts), 300);
        function check() {
          if (locked) return;
          const gi = g.getImageData(0, 0, size, size).data, di = d.getImageData(0, 0, size, size).data;
          let letter = 0, covered = 0, outside = 0;
          for (let i = 3; i < gi.length; i += 4) {
            const onLetter = gi[i] > 80, drawn = di[i] > 80;
            if (onLetter) { letter++; if (drawn) covered++; } else if (drawn) outside++;
          }
          const cov = letter ? covered / letter : 0;
          if (cov >= 0.5 && strokes > 0) submit(true, 'きれいに かけた！');
          else { App.sfx('pop'); App.toast(strokes ? 'もうすこし もじを なぞってみよう' : 'ゆびで もじを なぞってね'); }
        }
      };

      next();
    }
  };

  // ---------- result ----------
  App.screens.result = {
    render(sc, params) {
      const r = params.r, s = params.s, p = App.p;
      const na = Engine.nextAction(p);
      const win = r.passed;
      const kindLabel = { lesson: 'レッスン クリア！', boss: win ? 'ボス げきは！' : 'ボスは つよかった…', test: win ? 'ごうかく！' : 'あと すこし！', review: 'ゾンビ たいじ かんりょう！', travel: 'たびの れんしゅう クリア！', practice: 'れんしゅう クリア！' }[s.kind];
      if (win) { App.sfx(s.kind === 'test' || s.kind === 'boss' ? 'fanfare' : 'win'); App.confetti(win && (s.kind === 'test' || s.kind === 'boss') ? 200 : 90); } else App.sfx('lose');

      sc.appendChild(h('div.result-hero', h('div.mon' + (win ? '.dead' : ''), s.monster.emoji), h('div.big', win ? (s.kind === 'test' ? 'PASS!' : 'WIN!') : 'RETRY'), h('h1', kindLabel),
        s.kind !== 'test' && win && s.kind !== 'boss' ? h('div.stars-big', [1, 2, 3].map(i => h('span', { class: i <= r.stars ? 'on' : '' }, '★'))) : null,
        h('p.muted', 'せいかい ' + r.correct + ' / ' + r.total + '（' + Math.round(r.acc * 100) + '%）' + (r.maxCombo >= 3 ? ' ・ さいこう ' + r.maxCombo + 'コンボ' : ''))));

      if (s.kind === 'test' && win) {
        const w = Content.world(s.world);
        sc.appendChild(h('div.certificate', h('div.t', 'CERTIFICATE'), h('div.g', '🏆 ' + w.test.replace(' ボステスト', '') + ' ごうかく'), h('div.n', p.name), h('p.muted', U.today().replace(/-/g, '/') + ' ・ ' + Math.round(r.acc * 100) + '点'), r.first && Content.worlds[Content.worldIndex(s.world) + 1] ? h('p', { style: { marginTop: '8px' } }, '🔓 「' + Content.worlds[Content.worldIndex(s.world) + 1].name + '」が ひらいた！') : null));
      }
      if (s.kind === 'test' && !win) sc.appendChild(h('div.card', h('p', '70点で ごうかく。まちがえた ところを ふくしゅうして、また ちょうせんしよう！'), h('p.small.muted', 'まちがえた もんだい： ' + s.results.filter(x => !x.correct).map(x => x.ex.prompt && (x.ex.prompt.text || x.ex.reveal) ? (x.ex.prompt.text || x.ex.reveal) : x.ex.target || '').filter(Boolean).slice(0, 6).join(' / '))));
      if (s.kind === 'boss' && !win) sc.appendChild(h('div.card', 'ボスは 70%いじょう せいかいで たおせるよ。ステージの たんごを れんしゅうして もういちど！'));

      // rewards
      const xpEl = h('span.v.num', '0'), coinEl = h('span.v.num', '0');
      const rewards = h('div.card', h('div.reward', h('span', '⭐ XP'), xpEl), h('div.reward', h('span', '🪙 コイン'), coinEl));
      if (r.kills > 1) rewards.appendChild(h('div.reward', h('span', '👾 たおした モンスター'), h('span.v.num', r.kills)));
      if (r.streak) rewards.appendChild(h('div.reward', h('span', '🔥 れんぞく'), h('span.v.num', r.streak + '日目！')));
      if (r.goalDone) rewards.appendChild(h('div.reward', h('span', '🎯 きょうの もくひょう'), h('span.v', 'たっせい！')));
      if (r.questsDone > 0) rewards.appendChild(h('div.reward', h('span', '📜 クエスト ' + r.questsDone + 'つ たっせい！'), h('span.v', '🏠で うけとる')));
      if (r.egg) rewards.appendChild(h('div.reward', h('span', r.egg.kind === 'gold' ? '🪺 きんのたまご' : '🥚 たまご'), h('span.v', 'ゲット！')));
      sc.appendChild(rewards);
      setTimeout(() => { U.countUp(xpEl, r.xp, 700); U.countUp(coinEl, r.coins, 900); App.sfx('coin'); }, 300);

      if (r.chest) {
        const chestEl = h('div.chest', '🎁');
        const chestCard = h('div.card', { style: { textAlign: 'center' } }, h('div.bold', r.chest.tier === 'epic' ? '🌟 エピック たからばこ！' : r.chest.tier === 'rare' ? '✨ レア たからばこ！' : 'たからばこ を みつけた！'), chestEl, h('div.tiny.muted', 'タップして あけよう'));
        chestEl.addEventListener('click', () => {
          if (r.chest.opened) return;
          Engine.openChest(p, r.chest); App.sfx('chest'); App.confetti(80);
          chestEl.textContent = '🎉'; chestEl.classList.add('open');
          const got = ['🪙 +' + r.chest.coins, r.chest.gems ? '💎 +' + r.chest.gems : '', r.chest.egg ? '🥚 たまご' : ''].filter(Boolean).join('  ');
          chestCard.appendChild(h('div.bold', { style: { fontSize: '1.3rem', marginTop: '6px' } }, got));
          chestCard.querySelector('.tiny').remove();
        });
        sc.appendChild(chestCard);
      }

      // words in this session
      const keys = U.uniq(s.results.map(x => x.ex.word).filter(k => k && Content.words[k] && Content.words[k].lv !== 'abc'));
      if (keys.length) sc.appendChild(h('div.card', h('h3', '📚 このバトルの たんご'), h('div.wordchips', { style: { marginTop: '8px' } }, keys.map(k => { const w = Content.words[k]; return h('span', { class: s.wrongKeys[k] ? '' : 'known', on: { click: () => App.say(w.w) } }, (w.e ? w.e + ' ' : '') + w.w + ' ' + w.ja); }))));

      const btns = h('div.col');
      if (!win && s.kind === 'boss') btns.appendChild(h('button.btn.primary.big', { on: { click: () => App.go('battle', { session: Engine.startBoss(p, s.stageId) }) } }, '👑 もういちど ちょうせん'));
      else if (!win && s.kind === 'test') btns.appendChild(h('button.btn.primary.big', { on: { click: () => App.go('battle', { session: Engine.startTest(p, s.world) }) } }, '🧙 もういちど ちょうせん'));
      else if (na.kind !== 'done') btns.appendChild(h('button.btn.primary.big', { on: { click: () => App.startAction(na) } }, na.kind === 'lesson' ? '⚔️ つぎの バトルへ' : na.kind === 'boss' ? '👑 ボスに ちょうせん' : '🧙 テストに ちょうせん'));
      btns.appendChild(h('div.row', h('button.btn', { style: { flex: 1 }, on: { click: () => App.go('map', s.world ? { world: s.world } : {}) } }, '🗺️ マップ'), h('button.btn', { style: { flex: 1 }, on: { click: () => App.go('home') } }, '🏠 ホーム')));
      sc.appendChild(btns);

      // popups: level up → badges → hatched
      const chain = () => App.showBadges(r.newBadges, () => App.showHatch(r.hatched));
      if (r.levelUp) setTimeout(() => App.showLevelUp(r.levelUp, chain), 900); else setTimeout(chain, 700);
    }
  };
})();
