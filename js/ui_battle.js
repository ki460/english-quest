/* ui_battle.js — the battle screen (every exercise type) and the result screen */
(function () {
  'use strict';
  const h = U.h;
  const PRAISE = ['Great!', 'Nice!', 'Perfect!', 'Awesome!', 'You did it!', 'Excellent!', 'Wow!', 'Super!'];
  const MILESTONES = { 3: 'Nice!', 5: 'Awesome!', 8: 'Perfect!', 10: 'Excellent!', 15: 'Excellent!' };
  let lastPraiseAt = 0;

  App.screens.battle = {
    render(sc, params) {
      const s = params.session, p = App.p;
      sc.classList.add('battle');
      const isTest = s.kind === 'test';
      const quick = U.reducedMotion();
      const anim = App.anim;
      let ex = null, locked = false, qid = 0, breaking = false, lowWarned = false;
      // timers that must die with the screen
      const later = (ms, fn) => setTimeout(() => { if (sc.isConnected) fn(); }, quick ? Math.min(ms, 250) : ms);

      // ----- top bar + arena -----
      const prog = h('div.progress', h('i', { style: { width: '0%' } }));
      const quit = h('button.iconbtn', { title: 'やめる', on: { click: () => App.modal({ emoji: '🏃', title: 'バトルを やめる？', body: 'ここまでの けっかは のこらないよ', buttons: [{ label: 'つづける', cls: 'primary' }, { label: 'やめる', cls: 'ghost', onClick: () => App.go('home') }] }) } }, '✕');
      const counter = h('span.pill.num', '');
      const comboPill = h('span.pill.combo-pill.num', '');
      const musicBtn = isTest ? null : h('button.iconbtn.music' + (p.settings.music ? '' : '.off'), { title: 'おんがく', on: { click: (e) => App.toggleMusic(e.currentTarget) } }, '🎵');
      const top = h('div.battle-top', quit, prog, comboPill, counter, musicBtn);
      sc.appendChild(top);

      const mSprite = h('div.sprite', s.monster.emoji), mName = h('div.nm', s.monster.name), mHp = h('i'), mGhost = h('i.ghost'), mHpLb = h('span.lb');
      const pSprite = h('div.sprite', App.avatarEl(p)), pHp = h('i'), pGhost = h('i.ghost'), pHpLb = h('span.lb');
      const pHpBar = s.hasHp ? h('div.hpbar', pGhost, pHp, pHpLb) : null;
      const buddyEl = s.buddy ? h('span.buddy-sm', s.buddy.emoji) : null;
      const arena = h('div.arena',
        h('div.fighter.player', h('div.row', pSprite, buddyEl), h('div.nm', p.name), pHpBar),
        h('div.vs', 'VS'),
        h('div.fighter.monster' + (s.monster.boss ? '.boss' : ''), mSprite, mName, isTest ? h('div.nm', 'テストちゅう') : h('div.hpbar.m', mGhost, mHp, mHpLb)));
      sc.appendChild(arena);
      const qarea = h('div.qarea');
      sc.appendChild(qarea);

      function bars(opt) {
        opt = opt || {};
        if (!opt.keepMonster) {
          const mw = Math.max(0, 100 * s.monster.hp / s.monster.max) + '%';
          mHp.style.width = mw; mGhost.style.width = mw; mHpLb.textContent = Math.max(0, s.monster.hp) + ' / ' + s.monster.max;
        }
        const pw = Math.max(0, 100 * s.player.hp / s.player.max) + '%';
        pHp.style.width = pw; pGhost.style.width = pw; pHpLb.textContent = s.player.hp + ' / ' + s.player.max;
        if (pHpBar) pHpBar.classList.toggle('low', s.player.hp / s.player.max <= 0.3);
        const pr = Engine.progress(s); prog.firstChild.style.width = pr.pct + '%';
        counter.textContent = Math.min(pr.i + 1, pr.n) + ' / ' + pr.n;
        if (!breaking) {
          comboPill.textContent = s.combo >= 2 ? '🔥' + s.combo : '';
          comboPill.classList.toggle('hot', s.combo >= 5); comboPill.classList.toggle('mega', s.combo >= 10);
        }
      }
      // place an element over the monster sprite (damage numbers, bursts)
      function overMonster(el) {
        const r = mSprite.getBoundingClientRect(), a = arena.getBoundingClientRect();
        const x = Math.max(70, Math.min(a.width - 70, r.left - a.left + r.width / 2));
        el.style.left = x + 'px'; el.style.top = (r.top - a.top + r.height * 0.15) + 'px';
        arena.appendChild(el);
        return el;
      }
      function floatDmg(text, crit) {
        const el = h('div.floatdmg' + (crit ? '.crit' : ''), text);
        el.style.setProperty('--n', Math.min(s.combo, 10));
        overMonster(el); setTimeout(() => el.remove(), 900);
      }
      function floatXp(n) {
        const el = h('span.floatxp', '+' + n + ' XP');
        top.appendChild(el); setTimeout(() => el.remove(), 800);
      }
      function comboPop(n) {
        const text = { 3: 'いいね！', 5: 'すごい！', 8: 'さいこう！', 10: 'MAX!', 15: 'でんせつ！' }[n];
        if (!text) return;
        const el = h('div.combo', text + ' ' + n + ' COMBO', h('small', n === 5 ? '⭐ XP アップ！' : n === 10 ? '🌩️' : 'ダメージ アップ！'));
        el.style.setProperty('--n', Math.min(n, 10));
        arena.appendChild(el); setTimeout(() => el.remove(), 900);
        if (n === 10) App.confetti(40);
        if (buddyEl) anim(buddyEl, 'spin', 600);
      }
      // a transparent shield that swallows taps for a moment (encounter beat, fresh questions)
      function shield(ms) { const g = h('div.qgate'); sc.appendChild(g); setTimeout(() => g.remove(), ms); }

      // ----- question rendering -----
      function next() {
        if (Engine.isOver(s)) return finish();
        ex = Engine.current(s); locked = false; qid++;
        if (window.Music) { Music.hush(false); if (p.settings.music && App.sfxOn && !Music.playing) { const t = Music.trackFor(s); if (t) Music.play(t); } }
        U.clear(qarea); bars();
        const R = renderers[ex.type] || renderers.choice;
        R(ex);
        qarea.scrollTop = 0;
        qarea.classList.add('fresh'); setTimeout(() => qarea.classList.remove('fresh'), 350);
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
          if (pr.listen && window.Music) Music.hush(true);          // listening questions get silence under the voice
          if (pr.listen || pr.speaker) setTimeout(() => App.say(pr.tts), 250);
        }
        if (extra) card.appendChild(extra);
        return card;
      }

      function feedback(correct, ex, details, title) {
        const box = h('div.feedback' + (correct ? '.ok' : '.ng'));
        const body = h('div.fb-body');
        let correctText = '';
        if (ex.choices) { const c = ex.choices[ex.answer]; correctText = c.label || c.emoji || ''; }
        else if (ex.display || ex.target) correctText = ex.display || ex.target;
        else if (ex.letter) correctText = ex.letter;
        if (!correct && correctText) body.appendChild(h('b', '🔊 こたえ：' + correctText));
        if (ex.reveal && correct) body.appendChild(h('b.en', ex.reveal));
        if (ex.ja && (ex.type === 'pic4' || ex.type === 'spell' || (ex.prompt && ex.prompt.listen))) body.appendChild(h('div', ex.ja));
        if (ex.explain) body.appendChild(h('div.small', ex.explain));
        if (details) body.appendChild(h('div.small', details));
        box.appendChild(h('div.fb-title', title || (correct ? U.pick(['せいかい！', 'やったね！', 'いいね！', 'すごい！']) : U.pick(['だいじょうぶ！', 'つぎは できる！']))));
        box.appendChild(body);
        const btn = h('button.btn' + (correct ? '.good' : '.blue'), { on: { click: () => { App.sfx('tap'); next(); } } }, 'つぎへ');
        box.appendChild(btn);
        qarea.appendChild(box);
        btn.focus({ preventScroll: true });
        setTimeout(() => btn.scrollIntoView({ block: 'nearest' }), 50);
        return { btn, box };
      }

      // spoken English praise: milestones always, otherwise sometimes; never in tests, listening drills or retries
      function praiseFor(res) {
        if (isTest || ex.retry || (ex.prompt && ex.prompt.listen) || !Audio2.voiceName()) return '';
        const now = Date.now();
        if (MILESTONES[s.combo]) { lastPraiseAt = now; return MILESTONES[s.combo]; }
        if (res.killed) { lastPraiseAt = now; return 'You did it!'; }
        if (now - lastPraiseAt < 10000 || Math.random() > 0.25) return '';
        lastPraiseAt = now;
        return U.pick(PRAISE);
      }

      function submit(correct, details) {
        if (locked) return; locked = true;
        const myQ = qid, prevCombo = s.combo, prevHp = s.player.hp, oldMax = s.monster.max;
        const res = Engine.answer(p, s, ex, correct);
        if (correct) {
          // beat 1 (0 ms): ピンポーン + green vignette + the answer pops + XP floats
          App.sfx('correct', isTest ? Math.min(s.combo, 5) : s.combo);
          App.flash('good');
          if (res.xp > 0) floatXp(res.xp);
          if (s.combo >= 2) anim(comboPill, 'bump', 350);
          if (!isTest) {
            anim(pSprite, 'attack', 400);
            if (buddyEl) anim(buddyEl, 'hop', 400);
            // beat 2 (140 ms): the hit lands on the lunge — impact sound, damage number, HP bar drops
            later(140, () => {
              anim(mSprite, 'hit', 450);
              floatDmg((res.crit ? 'CRIT! ' : '') + '-' + res.dmg, res.crit);
              if (res.crit) { App.sfx('crit'); anim(arena, 'quake', 320); const b = overMonster(h('span.burst', '💥')); setTimeout(() => b.remove(), 500); }
              else if (res.dmg >= 14) App.sfx('hit');
              if (res.newMonster) { mHp.style.width = mGhost.style.width = '0%'; mHpLb.textContent = '0 / ' + oldMax; bars({ keepMonster: true }); }
              else bars();
            });
            // beat 3 (260 ms): combo milestones
            if (!ex.retry && MILESTONES[s.combo]) later(260, () => { App.sfx('comboHit', s.combo); comboPop(s.combo); });
            if (res.killed) {
              later(350, () => { anim(mSprite, 'dead', 800); App.sfx('monsterDown'); const ko = h('div.ko', '👾 たおした！'); arena.appendChild(ko); setTimeout(() => ko.remove(), 1200); });
              if (res.newMonster) later(1200, () => {
                mSprite.classList.remove('dead'); mSprite.textContent = res.newMonster.emoji; mName.textContent = res.newMonster.name;
                anim(mSprite, 'enter', 500); App.sfx('waveIn');
                mHp.classList.add('nofx'); mGhost.classList.add('nofx'); bars(); void mHp.offsetWidth; mHp.classList.remove('nofx'); mGhost.classList.remove('nofx');
              });
            }
          }
          const praise = praiseFor(res);
          const ttsAfter = ex.ttsAfter || (ex.type === 'pic4' && ex.prompt.text) || (ex.type === 'spell' && ex.target) || (ex.type === 'build' && ex.display) || null;
          const readBack = ttsAfter && !(ex.prompt && ex.prompt.listen) ? ttsAfter : null;
          const spoken = praise ? praise + (readBack ? ' ' + readBack + (/[.!?]$/.test(readBack) ? '' : '.') : '') : readBack;
          const fb = feedback(true, ex, details, praise || null);
          // auto-advance: long enough to read the card, extended while the voice is still talking, cancelled by a touch.
          // Cards with an explanation never auto-advance: the child reads at their own pace and taps つぎへ.
          const readLen = ((ex.reveal || '') + (ex.ja || '') + (details || '')).length;
          const base = 900 + readLen * 60;
          let wait = spoken ? Math.max(base, 1720 + spoken.length * 55) : Math.max(1500, base);
          if (res.killed && res.newMonster) wait = Math.max(wait, 1900);
          wait = Math.min(4000, wait);
          let cancelled = !!ex.explain, waited = false, ttsDone = !spoken, advanced = false, polls = 0;
          const tryNext = () => {
            if (advanced || cancelled || !waited || !ttsDone || qid !== myQ || !fb.btn.isConnected) return;
            if (Audio2.isSpeaking() && polls++ < 20) { setTimeout(tryNext, 150); return; }   // let the voice finish (≤3 s more)
            advanced = true; next();
          };
          qarea.addEventListener('pointerdown', () => { cancelled = true; }, { once: true });
          setTimeout(() => { waited = true; tryNext(); }, wait);
          if (spoken) {
            later(520, () => { if (qid !== myQ) return; App.say(spoken).then(() => setTimeout(() => { ttsDone = true; tryNext(); }, 400)); });
            setTimeout(() => { ttsDone = true; tryNext(); }, 4200);           // hard cap even if the voice never reports back
          }
        } else {
          // gentle: soft ブッブー, thin red vignette, shake; the right answer is pointed out a beat later
          App.sfx('wrong'); App.flash();
          if (s.hasHp) anim(pSprite, 'hit', 450);
          if (res.potion) { App.toast('🧪 ポーションで ぜんかいふく！', 'good'); later(500, () => App.sfx('heal')); }
          else if (res.rescued) { App.toast('なかまが たすけてくれた！ HPかいふく', 'good'); later(500, () => App.sfx('heal')); }
          else if (s.hasHp && s.player.hp / s.player.max <= 0.3) later(150, () => App.sfx('oof'));
          if (s.hasHp && !lowWarned && prevHp / s.player.max > 0.3 && s.player.hp / s.player.max <= 0.3 && s.player.hp > 0) {
            lowWarned = true;
            later(450, () => { App.sfx('cheer'); App.toast((s.buddy ? s.buddy.emoji + ' ' : '') + 'おうえんしてるよ！ おちついて いこう', 'good'); if (buddyEl) anim(buddyEl, 'hop', 400); });
          }
          if (prevCombo >= 2) { breaking = true; anim(comboPill, 'break', 600); later(600, () => { breaking = false; bars({ keepMonster: true }); }); }
          feedback(false, ex, res.retryQueued ? '🔁 あとで もういちど チャンス！' : details, res.retryQueued ? 'もういちど チャンス！' : U.pick(['だいじょうぶ！', 'つぎは できる！', 'おしい！']));
          const ct = ex.choices ? (ex.choices[ex.answer].tts || (ex.choices[ex.answer].label && /[a-zA-Z]/.test(ex.choices[ex.answer].label) ? ex.choices[ex.answer].label : null)) : (ex.display || ex.target || null);
          if (ct) later(550, () => { if (qid === myQ) App.say(ct); });
        }
        bars({ keepMonster: correct && !isTest });
      }

      // ----- renderers -----
      const renderers = {};
      // new word card: hear it, say it, then move on
      function introCard(parts, sayIt) {
        const btn = h('button.btn.primary.big', { disabled: true, on: { click: () => { App.sfx('pop'); Engine.skipIntro(p, s); next(); } } }, 'いえた！ つぎへ');
        const hint = h('div.tiny.muted.say-hint', '🔊 きいてから、まねして いってみよう 🗣️');
        const card = h('div.intro-card', parts, hint, btn);
        qarea.appendChild(card);
        let enabled = false;
        const enable = () => { if (enabled) return; enabled = true; btn.disabled = false; hint.classList.add('go'); };
        setTimeout(() => sayIt().then(enable), 300);
        setTimeout(enable, 1200);
      }
      renderers.intro = function (ex) {
        const w = Content.words[ex.word];
        const isPhrase = w.lv === 'travel';
        const emoji = w.e ? h('div.emoji', { on: { click: () => { App.sfx('pop'); App.say(w.w); } } }, w.e) : null;
        introCard([h('span.newtag', 'NEW!'), emoji,
          h('div.word.en', { style: isPhrase ? { fontSize: '1.9rem' } : null }, w.w), h('div.ja', w.ja),
          h('div.row.center.wrap', App.speakBtn(w.w, { xl: true }), App.slowBtn(w.w))], () => App.say(w.w));
      };
      renderers.abcIntro = function (ex) {
        const e = ex.entry, L = ex.letter;
        const say = () => App.say(L + '. ' + L.toLowerCase() + '. ' + e[2] + '.', { rate: 0.8 });
        introCard([h('span.newtag', 'NEW!'), h('div.letter-pair', L, h('small', L.toLowerCase())), h('div.emoji', { on: { click: () => { App.sfx('pop'); App.say(e[2]); } } }, e[3]), h('div.word.en', e[2]), h('div.ja', e[4]),
          h('div.row.center.wrap', App.speakBtn('The letter ' + L + '.', { xl: true, label: ' ' + L }), App.speakBtn(e[2], { label: ' ' + e[2] }))], say);
      };
      renderers.choice = function (ex) {
        qarea.appendChild(promptCard(ex));
        const grid = h('div.choices');
        const btns = ex.choices.map((c, i) => h('button.choice' + (ex.big ? '.big' : ''), { on: { click: () => pick(i) } }, c.emoji ? h('span.emoji', c.emoji) : null, c.label ? h('span' + (/[a-zA-Z]/.test(c.label) && !/[ぁ-んァ-ン一-龥]/.test(c.label) ? '.en' : ''), c.label) : null));
        btns.forEach(b => grid.appendChild(b));
        qarea.appendChild(grid);
        function pick(i) {
          if (locked) return;
          const ok = i === ex.answer;
          btns.forEach((b, j) => { b.disabled = true; if (ok && j === i) b.classList.add('ok'); else if (!ok && j === i) b.classList.add('ng'); else b.classList.add('dim'); });
          if (!ok) later(350, () => { btns[ex.answer].classList.remove('dim'); btns[ex.answer].classList.add('reveal'); App.sfx('pop'); });
          submit(ok);
        }
      };
      renderers.pic4 = renderers.choice;
      renderers.spell = function (ex) {
        qarea.appendChild(promptCard(ex));
        const box = h('div.answerbox'); const tiles = h('div.tiles');
        let picked = [];
        const tileEls = ex.tiles.map((ch, i) => h('button.tile', { on: { click: () => { if (locked || picked.some(x => x.i === i)) return; App.sfx('tilePick', picked.length); picked.push({ ch, i }); draw(); if (picked.length === ex.target.length) check(); } } }, ch));
        tileEls.forEach(t => tiles.appendChild(t));
        function draw() {
          U.clear(box);
          picked.forEach((pk, k) => box.appendChild(h('button.tile', { on: { click: () => { if (locked) return; picked.splice(k, 1); App.sfx('tileUnpick'); draw(); } } }, pk.ch)));
          tileEls.forEach((t, i) => t.classList.toggle('used', picked.some(x => x.i === i)));
        }
        function check() {
          const ans = picked.map(x => x.ch).join('');
          const ok = ans === ex.target;
          box.classList.add(ok ? 'ok' : 'ng');
          submit(ok);
        }
        qarea.appendChild(box); qarea.appendChild(tiles);
        qarea.appendChild(h('div.row.center', h('button.btn.sm.ghost', { on: { click: () => { if (locked || !picked.length) return; picked.pop(); App.sfx('tileUnpick'); draw(); } } }, '⌫ ひとつ けす'), h('button.btn.sm.ghost', { on: { click: () => { if (locked || !picked.length) return; picked = []; App.sfx('tileUnpick'); draw(); } } }, 'ぜんぶ けす')));
        draw();
      };
      renderers.build = function (ex) {
        qarea.appendChild(promptCard(ex));
        const box = h('div.answerbox'); const tiles = h('div.tiles');
        let picked = [];
        const tileEls = ex.tiles.map((t, i) => h('button.tile.sentence', { on: { click: () => { if (locked || picked.some(x => x.i === i)) return; App.sfx('tilePick', picked.length); picked.push({ t, i }); draw(); } } }, t));
        tileEls.forEach(t => tiles.appendChild(t));
        const checkBtn = h('button.btn.primary.block', { on: { click: check } }, 'こたえる');
        function draw() {
          U.clear(box);
          picked.forEach((pk, k) => box.appendChild(h('button.tile.sentence', { on: { click: () => { if (locked) return; picked.splice(k, 1); App.sfx('tileUnpick'); draw(); } } }, pk.t)));
          tileEls.forEach((t, i) => t.classList.toggle('used', picked.some(x => x.i === i)));
          checkBtn.disabled = picked.length < ex.tokens.length;
        }
        function check() {
          if (locked) return;
          App.sfx('tap');
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
          App.sfx('micOn');
          mic.classList.add('listening'); heard.textContent = 'きいているよ… はなして！';
          const res = await Audio2.listen({ timeout: 6000 });
          if (!sc.isConnected) return;
          mic.classList.remove('listening'); doneBtn.hidden = false; doneBtn.textContent = '✅ いえた！（じぶんで OK）';
          App.sfx('micOff');
          if (!res.ok) {
            if (res.error === 'not-allowed' || res.error === 'service-not-allowed') { heard.textContent = 'マイクが つかえないみたい。きいて まねして「いえた！」を おそう'; doneBtn.className = 'btn good'; doneBtn.textContent = '✅ いえた！'; return; }
            heard.textContent = res.error === 'no-speech' || res.error === 'timeout' ? 'きこえなかった… もういちど マイクを おして はなしてね' : 'うまく きけなかった… もういちど'; return;
          }
          const m = Audio2.matchSpeech(res.alts, ex.target);
          tries++;
          if (m.ok) { heard.textContent = 'きこえた： ' + m.heard + ' ✅'; submit(true); }
          else { heard.textContent = 'きこえた：「' + m.heard + '」… もういちど ゆっくり いってみよう'; App.sfx('pop'); if (tries >= 3) { doneBtn.className = 'btn blue'; doneBtn.textContent = 'よく がんばった！ つぎへ'; } }
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
          h('div.row.center', h('button.btn.sm.ghost', { on: { click: () => { App.sfx('tileUnpick'); d.clearRect(0, 0, size, size); strokes = 0; } } }, 'けす'), h('button.btn.primary', { on: { click: check } }, 'できた！')))));
        setTimeout(() => App.say(ex.prompt.tts), 300);
        function check() {
          if (locked) return;
          App.sfx('tap');
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

      // ----- encounter beat, then the first question -----
      if (isTest) { App.sfx('pop'); next(); }
      else if (s.monster.boss && !quick) {
        const banner = h('div.banner', '👑 BOSS!', h('small', s.monster.name));
        sc.appendChild(banner);
        App.sfx('bossAppear'); anim(mSprite, 'enter', 650); later(600, () => anim(arena, 'quake', 320));
        next(); shield(1100); later(1400, () => banner.remove());
      } else {
        const ov = h('div.encounter', s.monster.emoji + ' ' + s.monster.name + ' が あらわれた！');
        arena.appendChild(ov);
        App.sfx('battleStart'); anim(mSprite, 'enter', 500);
        next(); if (!quick) shield(700); later(quick ? 400 : 900, () => ov.remove());
      }
      // the app went to the background: never let a queued auto-advance swap the question while nobody is looking
      App.screenHidden = () => { qid++; };
    }
  };

  // ---------- result ----------
  App.screens.result = {
    render(sc, params) {
      const r = params.r, s = params.s, p = App.p;
      const na = Engine.nextAction(p);
      const win = r.passed, quick = U.reducedMotion();
      const big = s.kind === 'test' || s.kind === 'boss';
      const kindLabel = { lesson: 'レッスン クリア！', boss: win ? 'ボス げきは！' : 'ボスは つよかった…', test: win ? 'ごうかく！' : 'あと すこし！', review: 'ゾンビ たいじ かんりょう！', travel: 'たびの れんしゅう クリア！', practice: 'れんしゅう クリア！' }[s.kind];

      // --- a timeline of reveals; a tap anywhere (not on a button) jumps to the end ---
      const steps = [], timers = []; let skipped = false, tEnd = 0;
      // o.keep: keep the delay on a lost battle too; o.noSkip: a tap-to-skip cancels this step instead of running it
      const at = (ms, run, o) => { o = o || {}; const m = win || o.keep ? ms : 0; steps.push({ ms: m, run, done: false, noSkip: !!o.noSkip }); if (!o.noSkip) tEnd = Math.max(tEnd, m); };
      // staged blocks stay untappable until their reveal animation starts (a stray tap must not hit an invisible button)
      const rv = (el, ms) => {
        el.classList.add('rv'); el.style.setProperty('--i', win && !quick ? ms : 0);
        if (!quick) { el.style.pointerEvents = 'none'; el.addEventListener('animationstart', () => { el.style.pointerEvents = ''; }, { once: true }); }
        return el;
      };
      // a lost battle (everything at 0 ms) and reduced motion reveal silently: no pile of reward sounds over the sting
      function startTimeline() { steps.forEach(st => timers.push(setTimeout(() => { if (st.done) return; st.done = true; if (sc.isConnected) st.run(quick || st.ms === 0); }, quick ? Math.min(st.ms, 40) : st.ms))); }
      function skipToEnd(byTap) {
        if (skipped) return; skipped = true;
        timers.forEach(clearTimeout);
        steps.forEach(st => { if (!st.done) { st.done = true; if (sc.isConnected && !st.noSkip) st.run(true); } });
        U.$$('.rv', sc).forEach(el => { el.style.setProperty('--i', 0); el.style.pointerEvents = ''; });
        if (byTap) setTimeout(() => { if (sc.isConnected) popups(); }, 400);   // the rewards still get their moment
      }
      sc.addEventListener('pointerdown', (e) => { if (!e.target.closest('button, .chest-wrap, .wordchips')) skipToEnd(true); });

      // sting (waits up to 300 ms for a context that speech may have interrupted)
      const sting = () => { if (win) { App.sfx(big ? 'fanfare' : 'win'); App.confetti(big ? 200 : 90); } else App.sfx('lose'); };

      const starsEl = s.kind !== 'test' && win && s.kind !== 'boss' ? h('div.stars-big', [1, 2, 3].map(i => h('span', '★'))) : null;
      sc.appendChild(rv(h('div.result-hero', h('div.mon' + (win ? '.dead' : ''), s.monster.emoji), rv(h('div.big', win ? (s.kind === 'test' ? 'PASS!' : 'WIN!') : 'RETRY'), 250), h('h1', kindLabel),
        starsEl, h('p.muted', 'せいかい ' + r.correct + ' / ' + r.total + '（' + Math.round(r.acc * 100) + '%）' + (r.maxCombo >= 3 ? ' ・ さいこう ' + r.maxCombo + 'コンボ' : ''))), 0));
      if (starsEl) [1, 2, 3].forEach(i => { if (i <= r.stars) at(700 + (i - 1) * 250, (silent) => { starsEl.children[i - 1].classList.add('on'); if (!silent) App.sfx('star', i); }); });

      if (s.kind === 'test' && win) {
        const w = Content.world(s.world);
        sc.appendChild(rv(h('div.certificate', h('div.t', 'CERTIFICATE'), h('div.g', '🏆 ' + w.test.replace(' ボステスト', '') + ' ごうかく'), h('div.n', p.name), h('p.muted', U.today().replace(/-/g, '/') + ' ・ ' + Math.round(r.acc * 100) + '点'), r.first && Content.worlds[Content.worldIndex(s.world) + 1] ? h('p', { style: { marginTop: '8px' } }, '🔓 「' + Content.worlds[Content.worldIndex(s.world) + 1].name + '」が ひらいた！') : null), 900));
      }
      if (s.kind === 'test' && !win) sc.appendChild(h('div.card', h('p', '70点で ごうかく。まちがえた ところを ふくしゅうして、また ちょうせんしよう！'), h('p.small.muted', 'まちがえた もんだい： ' + s.results.filter(x => !x.correct).map(x => x.ex.prompt && (x.ex.prompt.text || x.ex.reveal) ? (x.ex.prompt.text || x.ex.reveal) : x.ex.target || '').filter(Boolean).slice(0, 6).join(' / '))));
      if (s.kind === 'boss' && !win) sc.appendChild(h('div.card', 'ボスは 70%いじょう せいかいで たおせるよ。ステージの たんごを れんしゅうして もういちど！'));

      // rewards: XP + coins count up, then the extra rows pop in one by one
      const xpEl = h('span.v.num', '0'), coinEl = h('span.v.num', '0');
      const rewards = rv(h('div.card', h('div.reward', h('span', '⭐ XP'), xpEl), h('div.reward', h('span', '🪙 コイン'), coinEl)), 1300);
      sc.appendChild(rewards);
      at(1400, (silent) => { U.countUp(xpEl, r.xp, silent ? 0 : 700); U.countUp(coinEl, r.coins, silent ? 0 : 900, silent ? null : (k) => App.sfx('tickCount', k)); });
      at(2300, (silent) => { if (!silent) App.sfx('ding'); });
      const rows = [];
      const row = (el, sfx) => rows.push({ el, sfx });
      if (r.kills > 1) row(h('div.reward', h('span', '👾 たおした モンスター'), h('span.v.num', r.kills)), 'coin');
      if (r.first && s.kind === 'lesson') row(h('div.reward', h('span', '🎉 はじめて クリア！'), h('span.v', 'コイン 2ばい')), 'coin');
      if (r.streak) row(h('div.reward.streak-row', h('span', h('span.fire', '🔥'), ' れんぞく'), h('span.v.num', r.streak + '日目！')), 'streak');
      if (r.goalDone) {
        const ring = h('div.goal-ring.sm', { style: { '--p': 0 } }, h('span', '🎯'));
        const goalRow = h('div.reward.goal-row', h('span', ring, ' きょうの もくひょう'), h('span.v', 'たっせい！'));
        goalRow.reveal = (silent) => { if (silent || quick) { ring.style.setProperty('--p', 100); return; } const t0 = performance.now(); const tick = (t) => { const k = Math.min(1, (t - t0) / 800); ring.style.setProperty('--p', Math.round(100 * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); App.confetti(120); };
        row(goalRow, 'goal');
      }
      const unclaimed = (p.daily.quests || []).filter(q => q.done && !q.claimed);
      unclaimed.forEach(q => {
        const btn = h('button.btn.gold.sm.pulse', 'うけとる');
        const qr = h('div.reward', h('span', '📜 ' + q.text), btn);
        btn.addEventListener('click', () => { btn.disabled = true; App.questClaim(q, () => { qr.replaceChild(h('span.v', '✅ うけとった'), btn); }); });
        row(qr, 'quest');
      });
      if (r.egg) row(h('div.reward', h('span', r.egg.kind === 'gold' ? '🪺 きんのたまご' : '🥚 たまご'), h('span.v', 'ゲット！')), 'egg');
      rows.forEach((x, i) => at(2500 + i * 300, (silent) => { rewards.appendChild(x.el); if (!silent) { x.el.classList.add('popIn'); App.sfx(x.sfx); } if (x.el.reveal) x.el.reveal(silent); }));
      let T = 2500 + rows.length * 300;

      // eggs growing (the "one more battle" hook)
      if (r.eggs && r.eggs.length) {
        const strip = h('div.card.egg-strip', r.eggs.map(e => {
          const before = Math.round(100 * Math.max(0, e.p - 1) / e.need), after = Math.round(100 * e.p / e.need);
          const bar = h('i', { style: { width: before + '%' } }), em = h('div.e', e.kind === 'gold' ? '🪺' : '🥚');
          const left = e.need - e.p;
          const eg = h('div.egg' + (left === 1 ? '.ready' : ''), em, h('div.bar.gold', bar), h('div.tiny', left <= 0 ? 'かえった！' : left === 1 ? 'つぎで かえる！' : 'あと ' + left + 'かい'));
          eg.reveal = (silent) => { requestAnimationFrame(() => { bar.style.width = after + '%'; }); if (!silent) App.anim(em, 'crack', 400); };
          return eg;
        }));
        at(T, (silent) => { sc.insertBefore(strip, wordsCard); if (!silent) { strip.classList.add('popIn'); App.sfx('egg'); } U.$$('.egg', strip).forEach(eg => eg.reveal && eg.reveal(silent)); });
        T += 350;
      }

      // chest: shake → open → loot
      if (r.chest) {
        const chestEl = h('div.chest', '🎁'), wrap = h('div.chest-wrap', chestEl);
        const chestCard = h('div.card.chest-card', h('div.bold', 'たからばこ を みつけた！'), wrap, h('div.tiny.muted.hint', 'タップして あけよう'));
        let opening = false;
        chestEl.addEventListener('click', () => {
          if (opening || r.chest.opened) return; opening = true;
          skipToEnd();
          chestEl.classList.remove('wiggle');
          App.sfx('chestShake'); App.anim(chestEl, 'shake', 600);
          setTimeout(() => {
            Engine.openChest(p, r.chest);
            if (!sc.isConnected) return;
            App.sfx('chestOpen', r.chest.tier); App.confetti(r.chest.tier === 'epic' ? 200 : r.chest.tier === 'rare' ? 120 : 60);
            chestEl.textContent = '🎉'; wrap.classList.add('open'); App.anim(chestEl, 'open', 600);
            const tier = r.chest.tier === 'epic' ? '🌟 エピック たからばこ！' : r.chest.tier === 'rare' ? '✨ レア たからばこ！' : '';
            if (tier) chestCard.appendChild(h('div.bold.loot', tier));
            const coinsN = h('span.num', '0');
            chestCard.appendChild(h('div.bold.loot', { style: { fontSize: '1.3rem', marginTop: '6px' } }, '🪙 +', coinsN, r.chest.gems ? '  💎 +' + r.chest.gems : '', r.chest.egg ? '  🥚 たまご' : ''));
            U.countUp(coinsN, r.chest.coins, 500, (k) => App.sfx('tickCount', k), 0);
            setTimeout(() => { if (sc.isConnected) { App.sfx('coin'); U.countUp(coinEl, r.coins + r.chest.coins, 500); } }, 550);
            if (r.chest.egg) setTimeout(() => { if (sc.isConnected) App.sfx('egg'); }, 800);
            const hint = chestCard.querySelector('.hint'); if (hint) hint.remove();
          }, 600);
        });
        at(T, (silent) => { sc.insertBefore(chestCard, wordsCard); if (!silent) { chestCard.classList.add('popIn'); App.sfx('chestShake'); } chestEl.classList.add('wiggle'); });
        T += 300;
      }

      // words in this session
      const keys = U.uniq(s.results.map(x => x.ex.word).filter(k => k && Content.words[k] && Content.words[k].lv !== 'abc'));
      const wordsCard = keys.length ? rv(h('div.card', h('h3', '📚 このバトルの たんご'), h('div.wordchips', { style: { marginTop: '8px' } }, keys.map(k => { const w = Content.words[k]; return h('span', { class: s.wrongKeys[k] ? '' : 'known', on: { click: () => App.say(w.w) } }, (w.e ? w.e + ' ' : '') + w.w + ' ' + w.ja); }))), 1200) : h('div');
      sc.appendChild(wordsCard);

      // popups: level up → badges → hatched — always shown before leaving, even when the child taps ahead
      let popupsDone = !(r.levelUp || (r.newBadges && r.newBadges.length) || (r.hatched && r.hatched.length));
      function popups(then) {
        if (popupsDone) { if (then) then(); return; }
        popupsDone = true;
        const chain = () => App.showBadges(r.newBadges, () => App.showHatch(r.hatched, then));
        if (r.levelUp) App.showLevelUp(r.levelUp, chain); else chain();
      }
      const leave = (fn) => {
        skipToEnd();
        if (r.chest && !r.chest.opened) { Engine.openChest(p, r.chest); App.toast('🎁 たからばこ: 🪙 +' + r.chest.coins + (r.chest.gems ? '  💎 +' + r.chest.gems : '') + (r.chest.egg ? '  🥚 たまご' : ''), 'gold'); }
        popups(fn);
      };
      const btns = h('div.col');
      if (!win && s.kind === 'boss') btns.appendChild(h('button.btn.primary.big', { on: { click: () => leave(() => App.go('battle', { session: Engine.startBoss(p, s.stageId) })) } }, '👑 もういちど ちょうせん'));
      else if (!win && s.kind === 'test') btns.appendChild(h('button.btn.primary.big', { on: { click: () => leave(() => App.go('battle', { session: Engine.startTest(p, s.world) })) } }, '🧙 もういちど ちょうせん'));
      else if (na.kind !== 'done') btns.appendChild(h('button.btn.primary.big', { on: { click: () => leave(() => App.startAction(na)) } }, na.kind === 'lesson' ? '⚔️ つぎの バトルへ' : na.kind === 'boss' ? '👑 ボスに ちょうせん' : '🧙 テストに ちょうせん'));
      btns.appendChild(h('div.row', h('button.btn', { style: { flex: 1 }, on: { click: () => leave(() => App.go('map', s.world ? { world: s.world } : {})) } }, '🗺️ マップ'), h('button.btn', { style: { flex: 1 }, on: { click: () => leave(() => App.go('home')) } }, '🏠 ホーム')));
      sc.appendChild(rv(btns, win ? 1200 : 400));

      const after = quick ? 300 : (win ? Math.max(2800, Math.max(T, tEnd) + 400) : 700);
      at(after, () => { popups(); }, { keep: true, noSkip: true });
      at(after + 200, (silent) => { if (!silent && !Audio2.isSpeaking() && Audio2.voiceName()) App.say(win ? 'Great job!' : 'Nice try!'); }, { keep: true, noSkip: true });
      Audio2.kick();
      setTimeout(() => U.$$('.rv', sc).forEach(el => { el.style.pointerEvents = ''; }), 1800);   // never leave a block untappable
      const begin = () => { if (!sc.isConnected) return; sting(); startTimeline(); };
      if (Audio2.state() === 'running' || Audio2.state() === 'none') begin();
      else { let waited = 0; const iv = setInterval(() => { waited += 50; if (Audio2.state() === 'running' || waited >= 300) { clearInterval(iv); begin(); } }, 50); }
      App.screenHidden = () => skipToEnd();
    }
  };
})();
