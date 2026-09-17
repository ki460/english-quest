/* ui_travel.js — travel scenes, phrasebook for the real trip, missions ("つうじた！") */
(function () {
  'use strict';
  const h = U.h;

  App.screens.travel = {
    hud: true, tab: 'travel',
    render(sc) {
      const p = App.p;
      const total = Content.travel.reduce((a, s) => a + s.missions.length, 0);
      sc.appendChild(h('h1', '✈️ たびの じゅんび'));
      sc.appendChild(h('div.card', h('p', 'らいねんの なつの かいがいりょこうで つかう えいごを れんしゅうしよう！ ほんとうに つうじたら「つうじた！」ボタンを おして ごほうび ゲット。'),
        h('div.row.wrap', { style: { marginTop: '8px' } }, h('span.pill.gold', '🗣️ つうじた！ ' + p.travel.tsuujita + ' / ' + total), h('span.pill.blue', 'れんしゅうずみ シーン ' + Object.keys(p.travel.done).length + ' / ' + Content.travel.length))));
      sc.appendChild(h('button.btn.blue.big', { on: { click: () => App.go('phrasebook') } }, '📱 りょこうちゅうに つかう フレーズちょう'));
      Content.travel.forEach(scn => {
        const done = p.travel.done[scn.key] || 0;
        const mdone = scn.missions.filter((m, i) => p.travel.missions[scn.key + ':' + i]).length;
        sc.appendChild(h('button.scene-card', { style: { '--sc': scn.color }, on: { click: () => App.go('travelScene', { scene: scn.key }) } }, h('div.e', scn.emoji), h('div', { style: { flex: 1 } }, h('div.t', scn.name), h('div.s', scn.phrases.length + ' フレーズ ・ れんしゅう ' + done + '回 ・ つうじた ' + mdone + '/' + scn.missions.length)), h('div', done ? '✅' : '▶️')));
      });
    }
  };

  App.screens.travelScene = {
    hud: true, tab: 'travel',
    render(sc, params) {
      const p = App.p, scn = Content.travelByKey[params.scene];
      sc.appendChild(h('div.row', h('button.btn.sm.ghost', { on: { click: () => App.go('travel') } }, '← もどる'), h('h1', scn.emoji + ' ' + scn.name)));
      sc.appendChild(h('button.btn.primary.big', { on: { click: () => App.go('battle', { session: Engine.startTravel(p, scn.key) }) } }, '⚔️ れんしゅう バトル（ドキドキおばけを たおせ！）'));
      const list = h('div.card', h('h3', '🗣️ フレーズ'));
      scn.phrases.forEach(ph => {
        const k = 'tr:' + scn.key + ':' + ph[0]; const st = p.words[k];
        list.appendChild(h('div.phrase', h('div.p', h('div.en', ph[0]), h('div.ja', ph[1])), st && st.b >= 3 ? h('span.pill.good', 'おぼえた') : null, App.speakBtn(ph[0], { label: '' }), App.slowBtn(ph[0]).cloneNode(true)));
      });
      // clones lose listeners; rebuild slow buttons properly
      U.$$('.phrase', list).forEach((row, i) => { const slow = row.lastChild; slow.replaceWith(App.slowBtn(scn.phrases[i][0])); });
      sc.appendChild(list);
      const mis = h('div.card', h('h3', '🎯 たびで やってみよう（つうじたら おす！）'), h('p.tiny.muted', '1つ つうじるごとに 🪙100 ＋ 💎2'));
      scn.missions.forEach((m, i) => {
        const done = p.travel.missions[scn.key + ':' + i];
        mis.appendChild(h('div.mission' + (done ? '.done' : ''), h('span', done ? '✅' : '⬜'), h('div.t', m, done ? h('div.tiny.muted', done) : null),
          done ? null : h('button.btn.sm.gold', { on: { click: () => App.modal({ emoji: '🗣️', title: 'ほんとうに つうじた？', body: 'たびさきで えいごが つうじたときに おしてね！', buttons: [{ label: 'つうじた！！', cls: 'gold', onClick: () => { const r = Engine.tsuujita(p, scn.key, i); if (!r) return; App.sfx('fanfare'); App.confetti(220); App.toast('🎉 つうじた！ 🪙+100 💎+2', 'gold'); App.showBadges(r.badges, () => App.refresh()); } }, { label: 'まだ', cls: 'ghost' }] }) } }, 'つうじた！')));
      });
      sc.appendChild(mis);
    }
  };

  App.screens.phrasebook = {
    hud: true, tab: 'travel',
    render(sc, params) {
      const p = App.p;
      const scn = Content.travelByKey[params.scene || 'greet'];
      let i = params.i || 0;
      sc.appendChild(h('div.worldtabs', Content.travel.map(s => h('button', { class: s.key === scn.key ? 'on' : '', on: { click: () => App.go('phrasebook', { scene: s.key }) } }, s.emoji, s.name))));
      const card = h('div.bigphrase'); const pos = h('div.muted.num');
      const draw = () => { const ph = scn.phrases[i]; U.clear(card); card.appendChild(h('div.en', ph[0])); card.appendChild(h('div.ja', ph[1])); card.appendChild(h('div.row.center.wrap', { style: { marginTop: '14px' } }, App.speakBtn(ph[0], { xl: true, label: ' きく' }), App.slowBtn(ph[0]))); pos.textContent = (i + 1) + ' / ' + scn.phrases.length; };
      draw();
      sc.appendChild(card);
      sc.appendChild(h('div.row', h('button.btn', { style: { flex: 1 }, on: { click: () => { i = (i - 1 + scn.phrases.length) % scn.phrases.length; draw(); } } }, '← まえ'), pos, h('button.btn', { style: { flex: 1 }, on: { click: () => { i = (i + 1) % scn.phrases.length; draw(); } } }, 'つぎ →')));
      sc.appendChild(h('p.tiny.muted', 'おみせの ひとに がめんを みせながら 「きく」を おしてもいいよ。じぶんで いえたら もっと すごい！'));
      sc.appendChild(h('button.btn.ghost', { on: { click: () => App.go('travelScene', { scene: scn.key }) } }, '🎯 この シーンの ミッションを みる'));
    }
  };
})();
