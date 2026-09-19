/* ui_parent.js — parent gate, progress dashboard, settings, data export/import */
(function () {
  'use strict';
  const h = U.h;

  App.screens.parentGate = {
    hud: true,
    render(sc) {
      const p = App.p;
      const usePin = !!p.settings.pin;
      const a = 3 + U.rand(7), b = 3 + U.rand(7);
      const input = h('input', { id: 'gateInput', type: 'tel', inputmode: 'numeric', placeholder: usePin ? 'PIN（4けた）' : 'こたえ', autocomplete: 'off' });
      const check = () => { const v = input.value.trim(); if ((usePin && v === p.settings.pin) || (!usePin && Number(v) === a * b)) { App.go('parent'); } else { App.sfx('wrong'); input.value = ''; App.toast('ちがうみたい'); } };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
      sc.appendChild(h('div.card.col', { style: { maxWidth: '420px', margin: '0 auto', width: '100%' } }, h('h1', '👪 おうちのひと用'), h('p.muted', usePin ? 'PINを いれてください' : 'おうちのひとに きいてね： ' + a + ' × ' + b + ' = ?'), h('div.field', input), h('button.btn.primary', { on: { click: check } }, 'OK'), h('button.btn.ghost', { on: { click: () => App.go('home') } }, 'もどる')));
      setTimeout(() => input.focus(), 100);
    }
  };

  App.screens.parent = {
    hud: true,
    render(sc, params) {
      const p = App.p, tab = params.tab || 'stats';
      sc.appendChild(h('div.row', h('button.btn.sm.ghost', { on: { click: () => App.go('home') } }, '← ホーム'), h('h1', '👪 保護者メニュー')));
      sc.appendChild(h('div.seg', [['stats', '📊 記録'], ['settings', '⚙️ 設定'], ['data', '💾 データ'], ['help', '❓ 使い方']].map(t => h('button', { class: t[0] === tab ? 'on' : '', on: { click: () => App.go('parent', { tab: t[0] }) } }, t[1]))));
      if (tab === 'stats') renderStats(sc, p);
      else if (tab === 'settings') renderSettings(sc, p);
      else if (tab === 'data') renderData(sc, p);
      else renderHelp(sc);
    }
  };

  function renderStats(sc, p) {
    const st = p.stats;
    const acc = st.answered ? Math.round(100 * st.correct / st.answered) : 0;
    const mins = Math.round(st.timeMs / 60000);
    sc.appendChild(h('div.stat-grid',
      h('div.st', h('div.k', '学習時間（合計）'), h('div.v', mins + '分')), h('div.st', h('div.k', '正答率'), h('div.v', acc + '%')),
      h('div.st', h('div.k', '出会った単語'), h('div.v', Engine.seenCount(p))), h('div.st', h('div.k', '覚えた単語'), h('div.v', Engine.learnedCount(p))),
      h('div.st', h('div.k', '連続日数 / 最高'), h('div.v', p.streak.count + ' / ' + (p.streak.best || 0))), h('div.st', h('div.k', 'バトル回数'), h('div.v', st.battles)),
      h('div.st', h('div.k', '発声練習'), h('div.v', st.speak)), h('div.st', h('div.k', '旅で通じた'), h('div.v', p.travel.tsuujita))));
    // 14-day XP chart (single series, direct labels on the bars that matter)
    const days = []; let max = 1;
    for (let i = 13; i >= 0; i--) { const d = U.today(-i); const v = st.days[d] || 0; max = Math.max(max, v); days.push({ d, v, today: i === 0 }); }
    const chart = h('div.chart', days.map(x => h('div.bar-col', { title: x.d + ': ' + x.v + ' XP' }, h('span.v', x.v || (x.today ? '0' : '')), h('i', { class: x.today ? 'today' : '', style: { height: Math.max(2, Math.round(100 * x.v / max)) + '%' } }), h('span.d', x.d.slice(5).replace('-', '/')))));
    sc.appendChild(h('div.card', h('h3', '直近14日の XP'), chart, h('p.tiny.muted', '1日の目標: ' + p.settings.dailyGoal + ' XP（レッスン1回で 20〜30 XP くらい）')));
    // Eiken progress
    sc.appendChild(h('div.card', h('h3', 'レベルごとの進み具合'), Content.worlds.map(w => { const wp = Engine.worldProgress(p, w); const T = p.tests[w.key]; return h('div.row', { style: { padding: '6px 0' } }, h('span', { style: { width: '2rem' } }, w.emoji), h('div', { style: { flex: 1 } }, h('div.row.between.small', h('span', w.sub), h('span.num', wp.done + '/' + wp.total + (T && T.passed ? ' ・ 合格 ' + T.best + '点' : T && T.tries ? ' ・ 最高 ' + T.best + '点' : ''))), h('div.bar', h('i', { style: { width: wp.pct + '%' } })))); })));
    // weak words
    const weak = Engine.weakWords(p, 12).filter(k => p.words[k].w > 0);
    sc.appendChild(h('div.card', h('h3', '苦手な単語（間違いが多い順）'), weak.length ? h('div.wordchips', { style: { marginTop: '8px' } }, weak.map(k => { const w = Content.words[k]; return h('span', w.w + ' ' + w.ja + '（×' + p.words[k].w + '）'); })) : h('p.muted', 'まだデータがありません')));
    // exercise types
    const types = Object.entries(st.byType || {}).sort((a, b) => b[1] - a[1]);
    const tn = { choice: '選択問題', pic4: '絵を選ぶ', spell: 'つづり', build: '並べかえ', speak: '発声', trace: 'なぞり書き', intro: '新出', abcIntro: '文字の紹介' };
    if (types.length) sc.appendChild(h('div.card', h('h3', '問題タイプ別の回答数'), h('table', { style: { width: '100%', fontSize: '.9rem', marginTop: '6px' } }, types.map(t => h('tr', h('td', tn[t[0]] || t[0]), h('td.num', { style: { textAlign: 'right' } }, t[1]))))));
    // log
    sc.appendChild(h('div.card', h('h3', '最近の記録'), p.log.length ? p.log.slice(0, 15).map(l => h('div.row.between.small', { style: { padding: '4px 0', borderTop: '1px solid var(--line)' } }, h('span', new Date(l.t).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' ' + ({ lesson: 'レッスン', boss: 'ボス', test: 'テスト', review: '復習', travel: '旅', practice: '練習' })[l.kind] + '「' + l.title + '」'), h('span.num', l.acc + '% / +' + l.xp + 'XP'))) : h('p.muted', 'まだ記録がありません')));
  }

  function renderSettings(sc, p) {
    const s = p.settings;
    const goalSeg = h('div.seg', [15, 30, 50, 80].map(g => h('button', { class: s.dailyGoal === g ? 'on' : '', on: { click: () => { s.dailyGoal = g; App.save(); App.refresh(); } } }, g + ' XP')));
    const rateSeg = h('div.seg', [[0.7, 'ゆっくり'], [0.9, 'ふつう'], [1.05, 'はやめ']].map(r => h('button', { class: s.ttsRate === r[0] ? 'on' : '', on: { click: () => { s.ttsRate = r[0]; Audio2.rate = r[0]; App.save(); App.say('Hello! Nice to meet you.'); App.refresh(); } } }, r[1])));
    const toggle = (key, label, desc) => h('div.switch', h('div', h('div.bold', label), h('div.tiny.muted', desc)), h('button.toggle' + (s[key] ? '.on' : ''), { role: 'switch', 'aria-checked': String(!!s[key]), on: { click: (e) => { s[key] = !s[key]; App.save(); App.applySettings(p); if (key === 'sfx' && s.sfx) { Audio2.unlock({ type: 'click' }); App.sfx('pop'); } if (key === 'music') p.tips.musicAsked = true; e.currentTarget.classList.toggle('on', s[key]); e.currentTarget.setAttribute('aria-checked', String(!!s[key])); } } }));
    // volume + a quiet preset for shared rooms
    const volSeg = h('div.seg', [[0.4, '小'], [0.7, '中'], [1, '大']].map(v => h('button', { class: (s.volume == null ? 1 : s.volume) === v[0] ? 'on' : '', on: { click: () => { s.volume = v[0]; App.save(); App.applySettings(p); Audio2.unlock({ type: 'click' }); App.sfx('correct', 1); App.refresh(); } } }, v[1])));
    const quiet = h('button.btn.sm.ghost', { on: { click: () => { s.volume = 0.4; s.music = false; p.tips.musicAsked = true; App.save(); App.applySettings(p); App.toast('しずかモード：効果音と読み上げは小さく、音楽はオフにしました', 'good'); App.refresh(); } } }, '🤫 しずかモード');
    // sound test: plays a chime, then reports what the audio engine saw (for checking on the iPad)
    const out = h('pre.tiny.muted.diag', { hidden: true });
    const test = () => {
      Audio2.unlock({ type: 'click' }); App.sfx('correct', 1);
      const t0 = Audio2.time();
      setTimeout(() => {
        const d = Audio2.diag(t0);
        const alive = d.state === 'running' && d.advanced > 0.3;
        const verdict = !App.sfxOn ? '🔇 効果音がオフになっています（上のスイッチ、またはホーム画面右上の 🔇 ボタン）'
          : alive ? '✅ 効果音エンジンは動いています。聞こえなかった場合は iPad の音量と、コントロールセンターの 🔔（サイレントモード）を確認してください。読み上げだけ聞こえて効果音が聞こえないときはサイレントモードが原因のことが多いです'
          : d.state === 'interrupted' ? '⚠️ 音が中断された状態です（読み上げ・他のアプリ・バックグラウンドの影響）。もう一度押すと復帰を試みます'
          : '⚠️ 音がまだ解除されていません。ホーム画面のアプリを一度閉じて開き直してから、もう一度お試しください';
        out.hidden = false;
        out.textContent = verdict + '\n\nbuild ' + (window.EQ_BUILD || '?') + '\n' + JSON.stringify(d, null, 1);
      }, 700);
    };
    const testCard = h('div.field', h('label', '🔊 音のテスト'), h('div.row.wrap', h('button.btn.sm.blue', { on: { click: test } }, '効果音を鳴らす'), h('button.btn.sm.ghost', { on: { click: () => App.say('Great job! That is correct!') } }, '読み上げを鳴らす')), h('div.tiny.muted', '2つとも押して比べてください。読み上げだけ聞こえる → iPad のサイレントモード（コントロールセンターの 🔔）を確認。どちらも聞こえない → 音量を確認。更新直後は「次に開いたとき」に新しい版になります（いまの版: ' + (window.EQ_BUILD || '?') + '）'), out);
    const pin = h('input', { id: 'pinInput', type: 'tel', inputmode: 'numeric', maxLength: 4, placeholder: '4けた（空なら計算問題）', value: s.pin || '' });
    sc.appendChild(h('div.card.col',
      h('div.field', h('label', '1日の目標 XP'), goalSeg, h('div.tiny.muted', '小さな達成感を毎日：15 XP は約1レッスン、30 XP で約2レッスン分です')),
      h('div.field', h('label', '読み上げの速さ'), rateSeg, h('div.tiny.muted', '使用中の音声: ' + (Audio2.voiceName() || '（この端末には英語音声がありません）'))),
      toggle('speech', 'マイクで発音チェック', Audio2.srAvailable() ? 'オフにすると「聞いて真似する」練習になります' : 'この環境では音声認識が使えないため、聞いて真似する練習になります'),
      toggle('sfx', '効果音', '正解・攻撃・ごほうびの音。ホーム画面右上の 🔊 ボタンでも切り替えられます'),
      h('div.field', h('label', '音の大きさ（効果音・読み上げ）'), h('div.row.wrap', volSeg, quiet), h('div.tiny.muted', '読み上げの音量は端末によっては変わらないことがあります（その場合は iPad 本体の音量で）')),
      toggle('music', 'バトルの音楽（BGM）', 'バトル中だけ流れる短いループ。読み上げ中は自動で小さくなり、マイク使用中は止まります'),
      testCard,
      h('div.field', h('label', '保護者メニューの PIN'), h('div.row', pin, h('button.btn.sm.blue', { on: { click: () => { const v = pin.value.trim(); if (v && !/^\d{4}$/.test(v)) { App.toast('4けたの数字にしてください'); return; } s.pin = v; App.save(); App.toast(v ? 'PINを設定しました' : 'PINを解除しました（計算問題になります）', 'good'); } } }, '保存')))));
    sc.appendChild(h('div.card.col', h('h3', 'このプロフィール'), h('div.field', h('label', '開始レベル（これより前のワールドは自由に遊べます）'), h('select', { id: 'startSel', on: { change: (e) => { p.startLevel = e.target.value; App.save(); App.toast('変更しました', 'good'); } } }, Content.worlds.map(w => h('option', { value: w.key, selected: w.key === p.startLevel }, w.emoji + ' ' + w.sub))))));
  }

  function renderData(sc, p) {
    const ta = h('textarea', { id: 'exportArea', readonly: true, value: Store.exportJSON() });
    const imp = h('textarea', { id: 'importArea', placeholder: 'ここに貼り付け' });
    const share = async () => { const text = Store.exportJSON(); try { if (navigator.share) { await navigator.share({ title: 'English Quest セーブデータ', text }); return; } } catch (e) { /* cancelled */ } try { await navigator.clipboard.writeText(text); App.toast('コピーしました', 'good'); } catch (e) { ta.select(); App.toast('全選択してコピーしてください'); } };
    sc.appendChild(h('div.card.col', h('h3', '💾 バックアップ（書き出し）'), h('p.small.muted', '進み具合はこの端末のブラウザに保存されています。別の iPad や別の公開先に移すときは、この文字列をメモや AirDrop で送って「読み込み」に貼り付けてください。' + (Store.memoryOnly ? '【注意】この環境では保存できません（プライベートブラウズ？）' : '')), ta, h('button.btn.blue', { on: { click: share } }, '📤 共有 / コピー')));
    sc.appendChild(h('div.card.col', h('h3', '📥 読み込み'), imp, h('div.row', h('button.btn', { style: { flex: 1 }, on: { click: () => doImport('merge') } }, '追加・上書き'), h('button.btn.ghost', { on: { click: () => App.modal({ emoji: '⚠️', title: 'すべて置き換え？', body: '今の全プロフィールが消えて、貼り付けたデータになります', buttons: [{ label: '置き換える', cls: 'primary', onClick: () => doImport('replace') }, { label: 'やめる', cls: 'ghost' }] }) } }, '置き換え'))));
    function doImport(mode) { try { const n = Store.importJSON(imp.value, mode); App.p = Store.profile(); if (App.p) App.applySettings(App.p); App.toast(n + ' 件のプロフィールを読み込みました', 'good'); App.go('profiles'); } catch (e) { App.toast('読み込めません: ' + e.message); } }
    sc.appendChild(h('div.card.col', h('h3', '🗑️ リセット'), h('button.btn.ghost', { on: { click: () => App.modal({ emoji: '⚠️', title: p.name + ' の進み具合を消す？', body: 'XP・単語・なかま・バッジがすべて消えます（元に戻せません）', buttons: [{ label: '消す', cls: 'primary', onClick: () => { const np = Store.newProfile(p.name, p.avatar, p.startLevel); np.id = p.id; np.settings = p.settings; const i = Store.data.profiles.findIndex(x => x.id === p.id); Store.data.profiles[i] = np; App.p = np; Engine.ensureDaily(np); App.save(); App.go('home'); } }, { label: 'やめる', cls: 'ghost' }] }) } }, 'このプロフィールの進み具合をリセット'), h('button.btn.ghost', { on: { click: () => App.modal({ emoji: '⚠️', title: p.name + ' を削除？', body: 'プロフィールごと消えます（元に戻せません）', buttons: [{ label: '削除する', cls: 'primary', onClick: () => { Store.removeProfile(p.id); App.p = Store.profile(); App.go('profiles'); } }, { label: 'やめる', cls: 'ghost' }] }) } }, 'このプロフィールを削除')));
  }

  function renderHelp(sc) {
    const li = (t) => h('li', t);
    sc.appendChild(h('div.card.col',
      h('h3', '📱 iPad で使う（ホーム画面に追加）'),
      h('ol', { style: { paddingLeft: '1.2em', margin: 0, lineHeight: 1.7 } }, li('iPad の Safari でこのページを開く'), li('共有ボタン（□↑）→「ホーム画面に追加」'), li('ホーム画面のアイコンから起動すると全画面のアプリとして使えます'), li('初回にマイクの許可を聞かれたら「許可」（発音チェックに使います）'), li('効果音を鳴らすため、アプリを開いている間は他のアプリの音楽が止まります。サイレントモード（🔔）でも効果音が鳴るようにしてあります')),
      h('h3', '🎮 遊び方のしくみ'),
      h('ul', { style: { paddingLeft: '1.2em', margin: 0, lineHeight: 1.7 } }, li('マップのステージ = 20単語くらいのテーマ。4〜5レッスン + ボスで1ステージ'), li('正解すると攻撃、連続正解でコンボ（ダメージ↑・5コンボでXP↑）。まちがえても失格にはならず、その問題があとで出直します'), li('覚えた単語は 1日・3日・7日・14日・30日後に「ゾンビ」として戻ってきます（忘却曲線に合わせた復習）'), li('毎日3つのクエスト。全部達成で宝箱＋たまご。たまごは 3〜5回のバトルで「なかま」に孵化（最初のたまごと金のたまごは3回）'), li('各級の最後は本物の英検の形式（語彙文法・会話・並べかえ・リスニング・読解）を模したボステスト。70点で合格→次の級が開放'), li('「たび」は来年の海外旅行のためのフレーズ集。現地で通じたら「つうじた！」で大きなごほうび')),
      h('h3', '📚 収録内容'),
      h('p.small.muted', 'アルファベット26文字 ・ フォニックス ' + Content.countWords('ph') + '語 ・ 英検5級 ' + Content.countWords('g5') + '語 ・ 4級 ' + Content.countWords('g4') + '語 ・ 3級 ' + Content.countWords('g3') + '語 ・ 準2級 ' + Content.countWords('p2') + '語 ・ 2級 ' + Content.countWords('g2') + '語 ・ 旅行フレーズ ' + Content.countWords('travel') + '（単語リストは各級の目安で、公式の出題範囲そのものではありません）')));
  }
})();
