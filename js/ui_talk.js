/* ui_talk.js — はなす: a coached conversation, the summary that follows, and the weekly review.
   The coach never stops the chat for a mistake. Everything — what was said, what to fix, the
   score on the same five axes as every other day, and one small homework — comes afterwards. */
(function () {
  'use strict';
  const h = U.h;
  const REACT = ['Nice!', 'Good job!', 'Great!', 'Cool!', 'Awesome!', 'Well done!', 'Perfect!'];
  const coachOf = (p) => { const b = p.buddy ? Content.buddyById[p.buddy] : null; return b ? { emoji: b.emoji, name: b.name } : { emoji: '🦉', name: 'Coach Owl' }; };
  const pips = (v) => h('span.pips', [1, 2, 3, 4, 5].map(i => h('i', { class: v != null && i <= v ? 'on' : '' })));
  // "I'm ゆうき." — read out only the English, the child knows their own name
  const sayable = (s) => String(s).replace(/[^\x00-\x7F]+/g, '').replace(/\s+/g, ' ').trim();

  function axisRows(axes) {
    return Engine.talkAxes.map(a => h('div.axis',
      h('span.n', a.name),
      pips(axes[a.k]),
      h('span.v.num', axes[a.k] == null ? '—' : axes[a.k] + '/5')));
  }

  // ---------- scene list ----------
  App.screens.talk = {
    hud: true, tab: 'talk',
    render(sc) {
      const p = App.p;
      const rung = Engine.talkRung(p), info = Engine.talkRungInfo(rung);
      const last = p.talk.logs[0];
      const hw = p.talk.homework;
      const coach = coachOf(p);

      sc.appendChild(h('h1', '🗣️ えいごで おしゃべり'));
      sc.appendChild(h('div.card.col',
        h('div.row', h('span', { style: { fontSize: '2.2rem' } }, coach.emoji),
          h('p', { style: { flex: 1 } }, 'コーチと えいごで はなそう。とちゅうで とめないから、まちがえても だいじょうぶ。おわってから「よかった ところ」と「なおす ところ」を まとめて おしえるね。')),
        h('div.field', h('label', 'いまの むずかしさ'),
          h('div.ladder', Engine.talkRungs.map(r => h('span' + (r.n === rung ? '.on' : (r.n < rung ? '.done' : '')), { title: r.name }, r.n))),
          h('div.row.between',
            h('div', h('div.bold', rung + '. ' + info.name), h('div.tiny.muted', info.tip)),
            h('div.row',
              h('button.iconbtn', { title: 'やさしく', on: { click: () => { p.talk.rung = Math.max(1, rung - 1); App.save(); App.sfx('tap'); App.refresh(); } } }, '−'),
              h('button.iconbtn', { title: 'むずかしく', on: { click: () => { p.talk.rung = Math.min(5, rung + 1); App.save(); App.sfx('tap'); App.refresh(); } } }, '＋')))),
        h('p.tiny.muted', 'むずかしさは おしゃべりの あとに じどうで すこしずつ かわるよ（ボタンで じぶんでも かえられる）')));

      if (hw && !hw.done) {
        sc.appendChild(h('div.card.col.hw',
          h('div.section-title', h('h2', '📝 きょうの しゅくだい（5分）'), h('span.pill.blue', hw.name)),
          h('p', hw.text),
          h('button.btn.gold', { on: { click: () => {
            const r = Engine.talkHomeworkDone(p);
            if (!r) return;
            App.sfx('coin'); App.confetti(60); App.toast('🪙 +30 コイン', 'gold');
            App.showBadges(r.badges, () => App.refresh());
          } } }, 'やった！ できた')));
      }

      if (last) {
        sc.appendChild(h('div.card',
          h('div.section-title', h('h2', '📈 まえの おしゃべり'), h('span.pill', last.d.slice(5).replace('-', '/'))),
          h('div.row.between', h('span', last.emoji + ' ' + last.name), h('span.bold.num', last.score + ' / 25')),
          h('p.tiny.muted', { style: { marginTop: '6px' } }, 'つぎの かだい： ' + last.next),
          h('button.btn.sm.ghost', { style: { marginTop: '8px' }, on: { click: () => App.go('talkReview') } }, '📒 1週間の ふりかえりを 見る')));
      }

      sc.appendChild(h('button.btn.primary.big.pulse', { on: { click: () => {
        const order = Content.talk.slice().sort((a, b) => (p.talk.done[a.key] || 0) - (p.talk.done[b.key] || 0));
        App.sfx('tap'); start(order[0].key);
      } } }, '🎤 おまかせで はなす'));

      Content.talk.forEach(scn => {
        const n = p.talk.done[scn.key] || 0;
        sc.appendChild(h('button.scene-card', { style: { '--sc': scn.color }, on: { click: () => start(scn.key) } },
          h('div.e', scn.emoji),
          h('div', { style: { flex: 1 } }, h('div.t', scn.name), h('div.s', scn.phrases.length + ' フレーズ ・ はなした ' + n + '回')),
          h('div', n ? '✅' : '▶️')));
      });

      function start(key) { App.sfx('tap'); App.go('talkSession', { session: Engine.startTalk(App.p, key) }); }
    }
  };

  // ---------- the conversation ----------
  App.screens.talkSession = {
    render(sc, params) {
      const p = App.p, ts = params.session, coach = coachOf(p);
      sc.classList.add('talkscreen');
      const prog = h('div.progress', h('i', { style: { width: '0%' } }));
      const counter = h('span.pill.num', '');
      const quit = h('button.iconbtn', { title: 'やめる', on: { click: askQuit } }, '✕');
      sc.appendChild(h('div.battle-top', quit, prog, counter));
      const chat = h('div.chat');
      const answer = h('div.answerzone');
      sc.appendChild(chat); sc.appendChild(answer);

      function scrollDown() { setTimeout(() => { sc.scrollTop = sc.scrollHeight; }, 30); }
      function bars() {
        prog.firstChild.style.width = Math.round(100 * ts.i / ts.turns.length) + '%';
        counter.textContent = Math.min(ts.i + 1, ts.turns.length) + ' / ' + ts.turns.length + ' ・ 🗣️' + ts.said;
      }
      function bubbleCoach(text, ja, small) {
        chat.appendChild(h('div.line', h('span.who', coach.emoji),
          h('div.bub' + (small ? '.small' : ''), h('div.en', text),
            ja && p.settings.hintJa ? h('div.ja', ja) : null,
            small ? null : h('button.speakbtn.tiny', { on: { click: () => App.say(text) } }, '🔊'))));
        scrollDown();
      }
      function bubbleMe(text, note) {
        chat.appendChild(h('div.line.me', h('div.bub', h('div.en', text), note ? h('div.ja', note) : null), h('span.who', p.avatar)));
        scrollDown();
      }
      function askQuit() {
        const btns = [{ label: 'つづける', cls: 'primary' }];
        if (ts.records.length >= 2) btns.push({ label: '✋ ここまでで おわる（まとめを 見る）', cls: 'blue', onClick: () => { ts.stoppedEarly = true; finish(); } });
        btns.push({ label: 'やめる（きろくは のこらない）', cls: 'ghost', onClick: () => App.go('talk') });
        App.modal({ emoji: '✋', title: 'おしゃべりを やめる？', body: 'Let\'s stop here と いうと、ここまでの まとめが 見られるよ', buttons: btns });
      }
      function finish() { App.go('talkResult', { r: Engine.finishTalk(p, ts), ts }); }

      function nextTurn() {
        if (App.screen !== 'talkSession') return;   // the player left mid-turn
        bars();
        if (ts.i >= ts.turns.length) return finish();
        const t = ts.turns[ts.i];
        U.clear(answer);
        bubbleCoach(t.q, t.ja);
        App.say(t.q);
        if (t.mode === 'yn' || t.mode === 'ab') options(t);
        else if (t.mode === 'slot') slot(t);
        else if (t.mode === 'echo') saystep(t, t.target, 'まねして 声に 出そう');
        else saystep(t, null, 'じぶんの ことばで こたえよう');
        scrollDown();
      }

      function options(t) {
        answer.appendChild(h('div.label', t.mode === 'yn' ? 'どっち？ えらんで 声に 出そう' : 'どちらか えらんで 言ってみよう'));
        const box = h('div.choices.one');
        t.options.forEach(o => box.appendChild(h('button.choice', { on: { click: () => { App.sfx('tap'); saystep(t, o, 'えらんだ 文を 声に 出そう'); } } }, h('span.en', o))));
        answer.appendChild(box);
      }
      function slot(t) {
        answer.appendChild(h('div.label', 'じぶんの ことに かえて 言おう'));
        const parts = t.pattern.split('___');
        answer.appendChild(h('div.slotline.en', parts[0], h('b', '___'), parts[1] || ''));
        answer.appendChild(h('div.chips', t.words.map(w => h('button.chip', { on: { click: () => { App.sfx('tap'); saystep(t, t.pattern.replace('___', w[0]), 'この文を 声に 出そう'); } } },
          h('span.en', w[0]), h('small', w[1])))));
      }

      function saystep(t, target, label) {
        U.clear(answer);
        const useSR = Audio2.srAvailable() && p.settings.speech;
        let tries = 0, best = 0, bestHeard = '', helped = false;
        answer.appendChild(h('div.label', label));
        const say = h('div.saynow');
        const spoken = target ? sayable(target) : '';
        if (target) say.appendChild(h('div.en', target));
        else say.appendChild(h('div.small.muted', 'なんて こたえる？ こまったら ヒントを 見てね'));
        const tip = h('div.col', { style: { alignItems: 'center' } });
        if (target) tip.appendChild(h('div.row.center.wrap', App.speakBtn(spoken, { xl: true }), App.slowBtn(spoken)));
        else tip.appendChild(h('button.btn.sm.blue', { on: { click: (e) => {
          helped = true; App.sfx('pop'); e.currentTarget.remove();
          tip.appendChild(h('div.en', t.hint));
          tip.appendChild(h('div.row.center.wrap', App.speakBtn(t.hint, { xl: true }), App.slowBtn(t.hint)));
          App.say(t.hint);
        } } }, '👀 ヒントを 見る'));
        say.appendChild(tip);
        answer.appendChild(say);

        const heard = h('div.heard', useSR ? 'マイクを おして はなしてね' : '声に 出して 言えたら ボタンを おそう');
        const mic = h('button.mic', { title: 'マイク' }, '🎤');
        const done = h('button.btn.good', { on: { click: () => advance({ text: target || t.hint, heard: bestHeard, score: tries ? best : null, helped, model: target ? null : t.hint }) } }, '✅ いえた！');
        const pass = h('button.btn.sm.ghost', { on: { click: () => advance({ skipped: true, text: target || t.hint, helped }) } }, 'パス');
        if (useSR) done.hidden = true;
        answer.appendChild(h('div.col', { style: { alignItems: 'center' } }, useSR ? mic : null, heard, h('div.row.center.wrap', done, pass)));
        if (target) setTimeout(() => App.say(spoken), 700);

        mic.addEventListener('click', async () => {
          if (mic.classList.contains('listening')) return;
          Audio2.stopSpeaking();
          mic.classList.add('listening'); heard.textContent = 'きいているよ… はなして！';
          const res = await Audio2.listen({ timeout: 7000 });
          mic.classList.remove('listening'); done.hidden = false;
          if (!res.ok) {
            if (res.error === 'not-allowed' || res.error === 'service-not-allowed') { heard.textContent = 'マイクが つかえないみたい。声に 出して 言えたら 「いえた！」を おそう'; return; }
            heard.textContent = (res.error === 'no-speech' || res.error === 'timeout') ? 'きこえなかった… もういちど マイクを おして はなしてね' : 'うまく きけなかった… もういちど';
            return;
          }
          tries++;
          const m = Audio2.matchSpeech(res.alts, target || t.hint);
          const said = U.norm(m.heard);
          if (m.score > best) { best = m.score; bestHeard = m.heard; }
          const keyHit = (t.keys || []).some(k => said.indexOf(k) >= 0);
          const looseHit = (t.loose || []).some(k => said.indexOf(U.norm(k)) >= 0);
          const good = looseHit || (target ? m.ok : (m.ok || keyHit || said.split(' ').filter(Boolean).length >= 3));
          if (good) {
            const floor = (looseHit || !target) ? 0.78 : 0;   // own name / own words: judged on getting through, not on a perfect match
            advance({ text: target || m.heard, heard: m.heard, score: Math.max(m.score, floor), helped, model: target ? null : t.hint });
            return;
          }
          App.sfx('pop');
          heard.textContent = 'きこえた：「' + m.heard + '」';
          if (tries >= 2 && !helped) {
            helped = true;
            const model = target || t.hint;
            tip.appendChild(h('div.tiny.muted', { style: { marginTop: '6px' } }, 'こう いえるよ 👇'));
            tip.appendChild(h('div.en', model));
            tip.appendChild(h('div.row.center.wrap', App.speakBtn(model, { xl: true }), App.slowBtn(model)));
            App.say(model);
            done.textContent = '✅ 言えた！ つぎへ';
          } else {
            heard.textContent += ' — もういちど 言ってみよう';
          }
        });

        function advance(rec) {
          if (App.screen !== 'talkSession' || ts.i >= ts.turns.length) return;   // a late mic result after leaving
          const r = Engine.talkSay(p, ts, rec);
          U.clear(answer);
          if (rec.skipped) bubbleMe('…パス', 'つぎに いこう！');
          else bubbleMe(r.text, r.heard && U.norm(r.heard) !== U.norm(r.text) ? 'きこえた：' + r.heard : '');
          bars();
          if (!rec.skipped && r.ok) {
            App.sfx('correct');
            const react = U.pick(REACT);
            bubbleCoach(react, null, true); App.say(react);
            setTimeout(nextTurn, 1100);
          } else {
            App.sfx('tap');
            setTimeout(nextTurn, 600);
          }
        }
      }

      bubbleCoach("Hi! Let's talk!", 'やあ！ おしゃべり しよう！', true);
      setTimeout(nextTurn, 700);
    }
  };

  // ---------- summary (the part a tutor would write down afterwards) ----------
  App.screens.talkResult = {
    render(sc, params) {
      const r = params.r, ts = params.ts, p = App.p, coach = coachOf(p);
      App.sfx('fanfare');
      if (r.score >= 20) App.confetti(120);

      sc.appendChild(h('div.result-hero', h('div.mon', coach.emoji), h('div.big', 'Good job!'),
        h('h1', r.scene.emoji + ' ' + r.title),
        h('p.muted', '声に出した かず ' + r.said + ' / ' + r.turns + ' ・ むずかしさ ' + Engine.talkRungInfo(r.log.rung).name)));

      sc.appendChild(h('div.card.col',
        h('div.section-title', h('h2', '📊 きょうの スコア'), h('span.pill.gold.num', r.score + ' / 25')),
        h('div.axes', axisRows(r.axes)),
        r.axes.pron == null ? h('p.tiny.muted', '※ はつおんは マイクを つかうと 点が つくよ') : null,
        h('p.tiny.muted', 'まいかい おなじ 5つの ものさしで 見ているよ（テストの 点数では ありません）')));

      sc.appendChild(h('div.card.col',
        h('div.good-line', '🌱 ' + r.better),
        h('div.next-line', '🎯 つぎの かだい： ' + r.next),
        r.rungAfter !== r.rungBefore ? h('p.pill.' + (r.rungAfter > r.rungBefore ? 'good' : 'blue'),
          r.rungAfter > r.rungBefore ? 'つぎから むずかしさ ' + r.rungAfter + '「' + Engine.talkRungInfo(r.rungAfter).name + '」に レベルアップ！'
            : 'つぎは すこし やさしく ' + r.rungAfter + '「' + Engine.talkRungInfo(r.rungAfter).name + '」で いこう') : null));

      const said = r.log.phrases;
      if (said.length) {
        const list = h('div.card.col', h('h3', '💬 きょう いえた えいご'));
        r.log.phrases.forEach(s => list.appendChild(h('div.phrase', h('div.p', h('div.en', s)), App.speakBtn(s, { label: '' }))));
        (r.polish || []).forEach(x => list.appendChild(h('div.fixbox.soft',
          h('div.said', '「' + x.said + '」'),
          h('span.tiny.muted', 'こう いうと もっと いいね'), h('div.en.better', x.better),
          h('div.row', App.speakBtn(x.better, { label: ' きく' }), App.slowBtn(x.better)))));
        sc.appendChild(list);
      }
      if (r.mistakes.length) {
        const fix = h('div.card.col', h('h3', '✏️ なおすと もっと つたわるよ'));
        r.mistakes.forEach(m => fix.appendChild(h('div.fixbox',
          h('div.row.between', h('span.tiny.muted', 'いった えいご'), null), h('div.said', '「' + (m.said || '（きこえなかった）') + '」'),
          h('span.tiny.muted', 'もっと つたわる いいかた'), h('div.en.better', m.better),
          h('div.small', '💡 ' + m.note),
          h('div.row', App.speakBtn(m.better, { label: ' きく' }), App.slowBtn(m.better)))));
        fix.appendChild(h('p.tiny.muted', 'ぜんぶは なおさないよ。いちばん つたわりにくい ところだけ！'));
        sc.appendChild(fix);
      }

      const ph = h('div.card.col', h('h3', '⭐ きょうの フレーズ'));
      r.scene.phrases.forEach(x => ph.appendChild(h('div.phrase', h('div.p', h('div.en', x[0]), h('div.ja', x[1])), App.speakBtn(x[0], { label: '' }))));
      sc.appendChild(ph);

      sc.appendChild(h('div.card.col.hw', h('h3', '📝 しゅくだい（5分）'), h('p', r.homework.text), h('p.tiny.muted', 'できたら「はなす」の 画面で 「やった！ できた」を おしてね（🪙+30）')));

      const xpEl = h('span.v.num', '0'), coinEl = h('span.v.num', '0');
      const rewards = h('div.card', h('div.reward', h('span', '⭐ XP'), xpEl), h('div.reward', h('span', '🪙 コイン'), coinEl));
      if (r.streak) rewards.appendChild(h('div.reward', h('span', '🔥 れんぞく'), h('span.v.num', r.streak + '日目！')));
      if (r.goalDone) rewards.appendChild(h('div.reward', h('span', '🎯 きょうの もくひょう'), h('span.v', 'たっせい！')));
      if (r.questsDone > 0) rewards.appendChild(h('div.reward', h('span', '📜 クエスト ' + r.questsDone + 'つ たっせい！'), h('span.v', '🏠で うけとる')));
      sc.appendChild(rewards);
      setTimeout(() => { U.countUp(xpEl, r.xp, 700); U.countUp(coinEl, r.coins, 900); App.sfx('coin'); }, 300);

      sc.appendChild(h('div.col',
        h('button.btn.primary.big', { on: { click: () => App.go('talk') } }, '🗣️ もういちど はなす'),
        h('div.row', h('button.btn', { style: { flex: 1 }, on: { click: () => App.go('talkReview') } }, '📒 ふりかえり'),
          h('button.btn', { style: { flex: 1 }, on: { click: () => App.go('home') } }, '🏠 ホーム'))));

      const chain = () => App.showBadges(r.newBadges, () => App.showHatch(r.hatched));
      if (r.levelUp) setTimeout(() => App.showLevelUp(r.levelUp, chain), 900); else setTimeout(chain, 700);
    }
  };

  // ---------- weekly review ----------
  App.screens.talkReview = {
    hud: true, tab: 'talk',
    render(sc) {
      const p = App.p, w = Engine.talkWeekly(p);
      sc.appendChild(h('div.row', h('button.btn.sm.ghost', { on: { click: () => App.go('talk') } }, '← もどる'), h('h1', '📒 1週間の ふりかえり')));
      if (!w.count) {
        sc.appendChild(h('div.card', h('p', 'まだ この1週間の おしゃべりが ないよ。'), h('button.btn.primary', { style: { marginTop: '10px' }, on: { click: () => App.go('talk') } }, '🗣️ はなしに いく')));
        return;
      }
      const max = Math.max(1, ...w.days.map(d => d.score));
      sc.appendChild(h('div.card',
        h('h3', 'スコアの うつりかわり（25点まん点）'),
        h('div.chart', w.days.map((d, i) => h('div.bar-col', { title: d.d + ': ' + d.score },
          h('span.v', d.score || ''),
          h('i', { class: i === w.days.length - 1 ? 'today' : '', style: { height: Math.max(2, Math.round(100 * d.score / max)) + '%' } }),
          h('span.d', d.d.slice(5).replace('-', '/')))))));

      sc.appendChild(h('div.stat-grid',
        h('div.st', h('div.k', 'おしゃべり'), h('div.v', w.count + '回')),
        h('div.st', h('div.k', '声に出した'), h('div.v', w.said + '回')),
        h('div.st', h('div.k', 'へいきん スコア'), h('div.v', w.score + '/25'))));

      sc.appendChild(h('div.card.col', h('h3', 'ものさし べつ（1週間の へいきん）'),
        h('div.axes', Engine.talkAxes.map(a => h('div.axis', h('span.n', a.name), pips(w.axes[a.k] == null ? null : Math.round(w.axes[a.k])), h('span.v.num', w.axes[a.k] == null ? '—' : w.axes[a.k] + '/5'))))));

      if (w.mistakes.length) {
        const fix = h('div.card.col', h('h3', '✏️ くりかえし つまずいた ところ'));
        w.mistakes.forEach(m => fix.appendChild(h('div.fixbox',
          h('div.said', '「' + (m.said || '（きこえなかった）') + '」'),
          h('div.en.better', m.better),
          h('div.small', '💡 ' + m.note + (m.n > 1 ? '（' + m.n + '回）' : '')),
          h('div.row', App.speakBtn(m.better, { label: ' きく' }), App.slowBtn(m.better)))));
        sc.appendChild(fix);
      }
      if (w.phrases.length || w.polish.length) {
        const list = h('div.card.col', h('h3', '💬 いえた えいご'));
        w.phrases.forEach(s => list.appendChild(h('div.phrase', h('div.p', h('div.en', s)), App.speakBtn(s, { label: '' }))));
        w.polish.forEach(x => list.appendChild(h('div.fixbox.soft', h('div.said', '「' + x.said + '」'),
          h('span.tiny.muted', 'こう いうと もっと いいね'), h('div.en.better', x.better),
          h('div.row', App.speakBtn(x.better, { label: ' きく' }), App.slowBtn(x.better)))));
        sc.appendChild(list);
      }
      sc.appendChild(h('div.card.col', h('h3', '🎯 らいしゅう がんばること'), h('p', w.focus),
        h('p.tiny.muted', 'いちばん ひくかった ものさし： ' + w.lowest)));

      const logs = h('div.card.col', h('h3', '🗒️ きろく'));
      p.talk.logs.slice(0, 10).forEach(l => logs.appendChild(h('div.row.between.small', { style: { padding: '4px 0', borderTop: '1px solid var(--line)' } },
        h('span', l.d.slice(5).replace('-', '/') + ' ' + l.emoji + ' ' + l.name), h('span.num', l.score + '/25 ・ 🗣️' + l.said))));
      sc.appendChild(logs);
    }
  };
})();
