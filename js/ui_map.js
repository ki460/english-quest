/* ui_map.js — world map with stage nodes, stage sheet, test intro */
(function () {
  'use strict';
  const h = U.h;

  App.screens.map = {
    hud: true, tab: 'map',
    render(sc, params) {
      const p = App.p;
      const na = Engine.nextAction(p);
      const wkey = params.world || (na.world ? na.world.key : p.startLevel);
      const world = Content.world(wkey);
      sc.appendChild(h('div.worldtabs', Content.worlds.map(w => {
        const un = Engine.worldUnlocked(p, w.key);
        return h('button', { class: (w.key === wkey ? 'on ' : '') + (un ? '' : 'locked'), on: { click: () => { App.sfx('tap'); App.go('map', { world: w.key }); } } }, w.emoji, w.sub, Engine.testPassed(p, w.key) ? '✅' : (un ? '' : '🔒'));
      })));
      const wp = Engine.worldProgress(p, world);
      sc.appendChild(h('div.card.row.between', { style: { background: world.color, color: '#fff' } }, h('div', h('h2', world.emoji + ' ' + world.name), h('div.small', world.sub + ' ・ ' + world.stages.length + 'ステージ ・ ' + Content.countWords(world.key === 'abc' ? 'abc' : world.key === 'ph' ? 'ph' : world.key) + (world.key === 'abc' ? 'もじ' : 'たんご'))), h('div.bold.num', wp.pct + '%')));
      if (!Engine.worldUnlocked(p, wkey)) {
        const prev = Content.worlds[Content.worldIndex(wkey) - 1];
        sc.appendChild(h('div.card', '🔒 まえの ワールド「' + prev.name + '」の ' + prev.test + ' に ごうかくすると ひらくよ！'));
      }
      const path = h('div.path');
      world.stages.forEach((st, i) => {
        const un = Engine.stageUnlocked(p, st), cleared = Engine.stageCleared(p, st), done = Engine.lessonsDone(p, st);
        const isNow = na.stage && na.stage.id === st.id;
        const stars = Engine.stageStars(p, st), maxStars = st.lessons.length * 3;
        path.appendChild(h('button.node' + (i % 2 ? '.right' : '.left') + (un ? '' : '.locked') + (isNow ? '.now' : '') + (cleared ? '.done' : ''), { on: { click: () => { App.sfx('tap'); if (!un) { App.toast('まえの ステージを クリアすると ひらくよ'); return; } App.stageSheet(st); } } },
          h('div.orb', cleared ? st.boss[1] : st.monster[1], un ? null : h('span.lock', '🔒')),
          h('div.nm', st.emoji + ' ' + st.name),
          h('div.dots', st.lessons.map(l => h('i', { class: Engine.lessonCleared(p, l) ? 'on' : (p.lessons[l.id] && p.lessons[l.id].n ? 'half' : '') })), h('i.boss' + (cleared ? '.on' : ''))),
          cleared ? h('div.stars', App.stars(Math.round(3 * stars / Math.max(1, maxStars)))) : h('div.prog', done + '/' + st.lessons.length + ' レッスン')));
      });
      const tUn = Engine.testUnlocked(p, world), tPass = Engine.testPassed(p, wkey), T = p.tests[wkey];
      path.appendChild(h('button.node.test' + (tUn ? '' : '.locked') + (na.kind === 'test' && na.world.key === wkey ? '.now' : '') + (tPass ? '.done' : ''), { on: { click: () => { App.sfx('tap'); if (!tUn) { App.toast('ぜんぶの ステージボスを たおすと ちょうせんできる'); return; } App.go('testIntro', { world: wkey }); } } },
        h('div.orb', '🧙', tUn ? null : h('span.lock', '🔒')), h('div.nm', world.test), tPass ? h('div.stars', '🏆 ごうかく ' + T.best + '点') : h('div.prog', T && T.tries ? 'さいこう ' + T.best + '点' : '70点で ごうかく')));
      sc.appendChild(path);
    }
  };

  App.stageSheet = function (st) {
    const p = App.p;
    const done = Engine.lessonsDone(p, st), played = Engine.lessonsPlayed(p, st), next = Engine.nextLesson(p, st);
    const cleared = Engine.stageCleared(p, st), locked = Engine.bossLocked(p, st), mastery = Engine.mastery(p);
    const nextL = next < st.lessons.length ? st.lessons[next] : null;
    const retry = !!(nextL && p.lessons[nextL.id] && p.lessons[nextL.id].n > 0);   // played, but not yet ★★
    const lessonChip = (l, i) => { const L = p.lessons[l.id]; return h('span.lchip' + (Engine.lessonCleared(p, l) ? '.on' : (L && L.n ? '.half' : '')), (i + 1) + ' ' + (L && L.n ? App.stars(L.s) : '‐')); };
    const hint = !mastery || cleared ? null : nextL ? '★★（80%いじょう）で つぎの レッスンが ひらくよ' : locked ? 'ボスに まけたよ。れんしゅうで 70%いじょう とると、もういちど ちょうせんできる' : 'ボスは ' + Math.round(100 * Engine.bossPass(p)) + '%いじょう せいかいで たおせるよ';
    const go = (session) => { close(); App.go('battle', { session }); };
    const close = App.sheet(h('div.col',
      h('div.row', h('span', { style: { fontSize: '3rem' } }, st.monster[1]), h('div', h('h2', st.emoji + ' ' + st.name), h('div.small.muted', st.kind === 'abc' ? st.letters.join(' ') + ' の もじ' : st.words.length + ' の たんご' + (st.hint ? ' ・ ' + st.hint : '')))),
      h('div.wordchips', st.words.slice(0, 30).map(k => { const w = Content.words[k]; const known = p.words[k] && p.words[k].b >= 3; return h('span', { class: known ? 'known' : '' }, (w.e ? w.e + ' ' : '') + w.w); })),
      h('div.card.soft', h('div.row.between', h('span.bold', 'レッスン'), h('span.num', (cleared ? st.lessons.length : done) + ' / ' + st.lessons.length)),
        h('div.lchips', st.lessons.map(lessonChip), h('span.lchip.bossc' + (cleared ? '.on' : ''), '👑 ' + (cleared ? 'たおした' : locked ? 'れんしゅう中' : 'ボス'))),
        hint ? h('div.tiny.muted', { style: { marginTop: '6px' } }, hint) : null),
      nextL ? h('button.btn.primary.big', { on: { click: () => go(Engine.startLesson(p, st.id, next)) } }, retry ? '🔁 レッスン ' + (next + 1) + ' を もういちど（★★を めざせ！）' : '⚔️ レッスン ' + (next + 1) + ' を たたかう')
        : (cleared ? h('button.btn.good.big', { on: { click: () => go(Engine.startPractice(p, st.id)) } }, '💪 れんしゅう バトル')
          : locked ? h('button.btn.good.big', { on: { click: () => go(Engine.startPractice(p, st.id)) } }, '💪 れんしゅうして ボスに そなえる')
            : h('button.btn.gold.big', { on: { click: () => go(Engine.startBoss(p, st.id)) } }, '👑 ボス「' + st.boss[0] + '」に ちょうせん！')),
      cleared ? h('button.btn.sm.ghost', { on: { click: () => go(Engine.startBoss(p, st.id)) } }, '👑 ボスと もういちど') : (played > 0 && !locked ? h('button.btn.sm.ghost', { on: { click: () => go(Engine.startPractice(p, st.id)) } }, '💪 いままでの たんごを れんしゅう') : null)
    ));
  };

  App.screens.testIntro = {
    hud: true,
    render(sc, params) {
      const p = App.p, w = Content.world(params.world), T = p.tests[w.key];
      const parts = w.key === 'abc' ? ['もじを きく', 'おおもじ・こもじ', 'さいしょの もじ'] : w.key === 'ph' ? ['え を えらぶ', 'きいて えらぶ', 'つづり', 'おなじ おと'] : ['たんご・ぶんぽう（___に はいる ことば）', 'かいわ（へんじを えらぶ）', 'ならべかえ', 'リスニング', w.key === 'g5' ? null : 'よみもの'];
      sc.appendChild(h('div.card.col', { style: { textAlign: 'center', alignItems: 'center' } },
        h('div', { style: { fontSize: '5rem', lineHeight: 1 } }, '🧙'), h('h1', w.test),
        h('p', Content.isVocabLevel(w.key) ? 'ほんものの 英検と おなじような もんだいが でるよ。70点いじょうで ごうかく！' : 'この ワールドの まとめテストだよ。70点いじょうで ごうかく！'),
        h('div.wordchips', parts.filter(Boolean).map(x => h('span', x))),
        T && T.tries ? h('p.muted', 'ちょうせん ' + T.tries + '回 ・ さいこう ' + T.best + '点' + (T.passed ? ' ・ ごうかくずみ 🏆' : '')) : null,
        h('p.small.muted', 'まちがえても HPは へらないよ。さいごまで がんばろう！'),
        h('button.btn.primary.big', { on: { click: () => App.go('battle', { session: Engine.startTest(p, w.key) }) } }, 'テストを はじめる'),
        h('button.btn.ghost', { on: { click: () => App.go('map', { world: w.key }) } }, 'マップに もどる')));
    }
  };
})();
