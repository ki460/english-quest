/* audio.js — synthesized sound effects (Web Audio), text-to-speech, speech recognition.
   Everything is generated at run time: no audio files. One long-lived AudioContext feeds
   sfx → master → compressor → speakers; music.js plays through the same master bus. */
(function () {
  'use strict';
  const A = { muted: false, srBlocked: false, rate: 0.9 };
  const isIOS = /iP(ad|hone|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const MUSIC_GAIN = 0.3;
  let ctx = null, master = null, comp = null, sfxBus = null, musicBus = null, noiseBuf = null;
  let volume = 1, silent = null, override = null;
  let lastGesture = 0, stuckTaps = 0, lastStuckAt = 0, lastRebuild = 0, timeAtTap = -1, fallbackFailedAt = 0, lastKickAt = 0, lastHealAt = 0, lastSpeechEnd = 0;
  const diag = { log: [], dropped: 0, builds: 0, resumes: 0 };
  function note(m) { diag.log.push(new Date().toTimeString().slice(0, 8) + ' ' + m); if (diag.log.length > 24) diag.log.shift(); }

  // ---------- context lifecycle ----------
  function wire(c) {
    const m = c.createGain(); m.gain.value = volume;
    const cp = c.createDynamicsCompressor();
    cp.threshold.value = -14; cp.knee.value = 10; cp.ratio.value = 6; cp.attack.value = 0.002; cp.release.value = 0.12;
    const s = c.createGain(), mu = c.createGain(); mu.gain.value = MUSIC_GAIN;
    // sfx + music → compressor → master volume → speakers (volume after the compressor so 小/中/大 scales everything the same)
    s.connect(cp); mu.connect(cp); cp.connect(m); m.connect(c.destination);
    // one shared noise buffer per context (2 s of white noise); every noise() plays a slice of it
    const nb = c.createBuffer(1, Math.ceil(c.sampleRate * 2), c.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return { master: m, comp: cp, sfx: s, music: mu, noise: nb };
  }
  function build() {
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    try { ctx = new C(); } catch (e) { note('build failed ' + e); return null; }
    diag.builds++;
    const w = wire(ctx);
    master = w.master; comp = w.comp; sfxBus = w.sfx; musicBus = w.music; noiseBuf = w.noise;
    note('built sr=' + ctx.sampleRate + ' state=' + ctx.state);
    ctx.onstatechange = () => {
      note('state=' + ctx.state);
      if (ctx.state === 'running' && window.Music) Music.resync();
    };
    return ctx;
  }
  // Ask a stopped context to run again. Safe anywhere; iOS also uses the non-standard 'interrupted' state.
  function kick() {
    if (!ctx) return;
    if (ctx.state === 'closed') { ctx = null; return; }
    if (ctx.state !== 'running') {
      diag.resumes++; lastKickAt = Date.now();
      try { const p = ctx.resume(); if (p && p.catch) p.catch(() => { /* not allowed yet */ }); } catch (e) { /* ignore */ }
    }
  }
  function ac() {
    if (!ctx && !build()) return null;
    if (ctx.state !== 'running') kick();
    return ctx;
  }
  // Only inside a user gesture, and BEFORE this tap's own resume(): if taps keep finding the context stopped
  // (or its clock frozen), rebuild it. Speech interruptions are left to the kick() that runs when speech ends.
  function heal() {
    if (!ctx) return;
    const now = Date.now();
    if (now - lastHealAt < 300) return;            // one physical tap fires touchend + pointerup + click
    const gap = now - lastHealAt; lastHealAt = now;
    if (A.isSpeaking() || now - lastSpeechEnd < 1000) return;
    const running = ctx.state === 'running';
    const frozen = running && timeAtTap >= 0 && ctx.currentTime === timeAtTap && gap > 2500;
    if (running && !frozen) { stuckTaps = 0; timeAtTap = ctx.currentTime; return; }
    if (!running && now - lastKickAt < 700) return; // the last resume() has not had time to land yet
    if (now - lastStuckAt > 1000) { stuckTaps++; lastStuckAt = now; }
    if (stuckTaps >= 2 && now - lastRebuild > 8000 && diag.builds < 8) {
      note('rebuild (' + (frozen ? 'frozen clock' : ctx.state) + ')');
      try { const p = ctx.close(); if (p && p.catch) p.catch(() => { /* ignore */ }); } catch (e) { /* ignore */ }
      ctx = null; master = comp = sfxBus = musicBus = noiseBuf = null;
      stuckTaps = 0; lastRebuild = Date.now(); timeAtTap = -1;
      build();
      if (window.Music) Music.resync();
    }
  }
  A.kick = kick;
  A.state = () => ctx ? ctx.state : 'none';
  A.time = () => ctx ? ctx.currentTime : -1;
  A.ctx = () => ctx;
  A.musicBus = () => musicBus;
  A.setVolume = function (v) {
    volume = Math.max(0, Math.min(1, Number(v) || 0));
    if (master && ctx) { try { master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02); } catch (e) { master.gain.value = volume; } }
  };
  A.volume = () => volume;

  // ---------- iPad silent mode ----------
  // Web Audio is muted by the Control-Center bell (ambient session) while speech is not.
  // iOS 17+: claim the playback session. Older iOS: keep a silent <audio> loop playing (flips the session to playback).
  function claimSession(on) {
    if (on && A.currentRec) return;                 // the microphone is open: leave the recording-capable session alone
    try {
      if (navigator.audioSession) navigator.audioSession.type = on ? 'playback' : 'auto';
    } catch (e) { /* ignore */ }
  }
  function silentWav() {
    const rate = 8000, n = rate / 2, bytes = 44 + n * 2, b = new Uint8Array(bytes), v = new DataView(b.buffer);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) b[o + i] = s.charCodeAt(i); };
    str(0, 'RIFF'); v.setUint32(4, bytes - 8, true); str(8, 'WAVE'); str(12, 'fmt '); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, 'data'); v.setUint32(40, n * 2, true);
    let s = ''; for (let i = 0; i < bytes; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
    return 'data:audio/wav;base64,' + btoa(s);
  }
  function unmuteFallback() {
    if (!isIOS || navigator.audioSession || A.muted) return;
    if (silent) { if (silent.paused) silent.play().catch(() => { /* ignore */ }); return; }
    if (Date.now() - fallbackFailedAt < 5000) return;
    try {
      silent = new Audio(silentWav()); silent.loop = true; silent.setAttribute('playsinline', ''); silent.volume = 0.01;
      silent.play().then(() => note('silent loop on')).catch(() => { note('silent loop refused'); silent = null; fallbackFailedAt = Date.now(); });
    } catch (e) { silent = null; fallbackFailedAt = Date.now(); }
  }
  function pauseFallback() { if (silent && !silent.paused) { try { silent.pause(); } catch (e) { /* ignore */ } } }
  A.setMuted = function (m) {
    A.muted = !!m;
    if (A.muted) { claimSession(false); pauseFallback(); if (window.Music) Music.stop(); }
    // unmuting claims the playback session lazily, on the next gesture/sound (never at boot)
  };

  // ---------- synthesis helpers ----------
  const out = (which) => {
    if (override) return { c: override.c, node: which === 'music' ? override.music : override.sfx, noise: override.noise };
    const c = ac(); if (!c) return null;
    return { c, node: which === 'music' ? musicBus : sfxBus, noise: noiseBuf };
  };
  // tone({f, d, t | at, g, type, slide, a, hold, lp, partials:[[ratio, gain],...], bus})  t = seconds from now, at = absolute context time
  // a sound scheduled on a stopped clock would burst out later; drop it unless a tap is resuming the context right now
  const stale = (c) => !override && c.state !== 'running' && Date.now() - lastGesture > 300 && (diag.dropped++, true);
  function tone(o) {
    if (A.muted && !override) return;
    const o2 = out(o.bus); if (!o2) return;
    const c = o2.c;
    if (stale(c)) return;
    const f = o.f || 440, d = o.d || 0.15, t0 = o.at != null ? o.at : c.currentTime + (o.t || 0), g = o.g == null ? 0.25 : o.g;
    const a = o.a == null ? 0.004 : o.a, hold = o.hold == null ? 0.45 : o.hold;
    const vol = c.createGain();
    vol.gain.setValueAtTime(0.0001, t0);
    vol.gain.linearRampToValueAtTime(g, t0 + a);
    vol.gain.setValueAtTime(g, Math.max(t0 + a, t0 + d * hold));
    vol.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
    let dest = vol;
    if (o.lp) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = o.lp; lp.Q.value = 0.7; lp.connect(vol); dest = lp; }
    vol.connect(o2.node);
    [[1, 1]].concat(o.partials || []).forEach(pr => {
      const ff = f * pr[0];
      if (ff > 7000 || ff < 20) return;                       // shrill partials are dropped on purpose
      const osc = c.createOscillator(); osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(ff, t0);
      if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, (f + o.slide) * pr[0]), t0 + d);
      if (pr[1] !== 1) { const pg = c.createGain(); pg.gain.value = pr[1]; osc.connect(pg); pg.connect(dest); } else osc.connect(dest);
      osc.start(t0); osc.stop(t0 + d + 0.05);
    });
  }
  // noise({f, to, q, type:'bandpass'|'lowpass'|'highpass', d, t, g, a, bus})
  function noise(o) {
    if (A.muted && !override) return;
    const o2 = out(o.bus); if (!o2 || !o2.noise) return;
    const c = o2.c;
    if (stale(c)) return;
    const d = o.d || 0.15, t0 = o.at != null ? o.at : c.currentTime + (o.t || 0), g = o.g == null ? 0.2 : o.g, a = o.a == null ? 0.002 : o.a;
    const src = c.createBufferSource(); src.buffer = o2.noise;
    const flt = c.createBiquadFilter(); flt.type = o.type || 'bandpass'; flt.frequency.setValueAtTime(o.f || 1000, t0); flt.Q.value = o.q == null ? 0.8 : o.q;
    if (o.to) flt.frequency.exponentialRampToValueAtTime(o.to, t0 + d);
    const vol = c.createGain();
    vol.gain.setValueAtTime(0.0001, t0);
    vol.gain.linearRampToValueAtTime(g, t0 + a);
    vol.gain.exponentialRampToValueAtTime(0.0005, t0 + d);
    src.connect(flt); flt.connect(vol); vol.connect(o2.node);
    src.start(t0, Math.random() * 1.2, d + 0.03);
  }
  A.tone = tone; A.noise = noise; A.MUSIC_GAIN = MUSIC_GAIN;

  // ---------- the palette ----------
  // Families: bells/sine = rewards, square+lowpass = UI, noise+slides = combat. Levels: UI ≈ .2, feedback ≈ .3, impacts ≈ .35.
  const SCALE = [0, 2, 4, 5, 7, 7, 7];                 // correct-chime steps by combo (major scale, capped at a fifth)
  const TILE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];  // pentatonic ladder for letter/word tiles
  const bell = (f, t, d, g, extra) => tone(Object.assign({ f, t, d: d || 0.3, g: g == null ? 0.28 : g, type: 'sine', partials: [[2, 0.3], [3, 0.1]], a: 0.004, hold: 0.3 }, extra || {}));
  const chord = (fs, t, d, g, type) => fs.forEach(f => tone({ f, t, d, g, type: type || 'triangle', hold: 0.5 }));
  A.sfx = {
    tap: () => { tone({ f: 900, d: 0.045, type: 'sine', g: 0.2, slide: -300, a: 0.001 }); noise({ f: 3000, d: 0.012, g: 0.05 }); },
    pop: () => tone({ f: 600, d: 0.07, type: 'sine', g: 0.26, slide: 500 }),
    tick: () => tone({ f: 1800, d: 0.03, type: 'square', lp: 3000, g: 0.1 }),
    tilePick: (k) => { const i = Math.max(0, Math.min(TILE.length - 1, k | 0)); tone({ f: 880 * Math.pow(2, TILE[i] / 12), d: 0.07, type: 'sine', partials: [[2, 0.3]], hold: 0.4, g: 0.26 }); },
    tileUnpick: () => tone({ f: 700, d: 0.06, type: 'sine', g: 0.18, slide: -220 }),
    // ピンポーン — descending major third, rises with the combo (whole scale steps, capped at +7 semitones)
    correct: (n) => {
      const k = Math.pow(2, SCALE[Math.max(0, Math.min(SCALE.length - 1, (n || 1) - 1))] / 12);
      tone({ f: 1319 * k, d: 0.11, type: 'sine', partials: [[2, 0.3], [3, 0.1]], a: 0.003, hold: 0.3, g: 0.3 });
      tone({ f: 1047 * k, d: 0.42, type: 'sine', partials: [[2, 0.3], [3, 0.1]], hold: 0.55, g: 0.3, t: 0.1 });
      if (n >= 5) chord([523, 659, 784], 0.1, 0.35, 0.08);
    },
    comboHit: (n) => {
      const k = n >= 10 ? 1 : Math.pow(2, SCALE[Math.min(6, Math.max(0, n - 1))] / 12);
      [1047, 1175, 1319, 1568].forEach((f, i) => tone({ f: f * k, d: 0.055, type: 'square', lp: 3500, g: 0.16, hold: 0.4, t: i * 0.055 }));
      if (n >= 10) { chord([523, 659, 784, 1047], 0.42, 0.35, 0.1); noise({ f: 6000, d: 0.12, g: 0.08, t: 0.42 }); }
    },
    // ブッブー — soft, comic, two falling notes (triangle doubling an octave up so small speakers carry it)
    wrong: () => {
      tone({ f: 196, d: 0.12, type: 'square', lp: 900, hold: 0.5, g: 0.15 }); tone({ f: 392, d: 0.12, type: 'triangle', hold: 0.5, g: 0.08 });
      tone({ f: 165, d: 0.28, type: 'square', lp: 900, hold: 0.6, g: 0.15, slide: -12, t: 0.15 }); tone({ f: 330, d: 0.28, type: 'triangle', hold: 0.6, g: 0.08, slide: -24, t: 0.15 });
    },
    hit: () => { noise({ f: 1200, d: 0.08, g: 0.16 }); tone({ f: 420, d: 0.14, type: 'sine', g: 0.28, slide: -240 }); },
    crit: () => {
      noise({ f: 1600, d: 0.22, g: 0.28 }); tone({ f: 300, d: 0.28, type: 'sine', g: 0.34, slide: -160 });
      tone({ f: 1300, d: 0.1, type: 'square', lp: 4000, g: 0.11 }); tone({ f: 1950, d: 0.15, type: 'square', lp: 4000, g: 0.11, t: 0.08 });
    },
    oof: () => tone({ f: 380, d: 0.16, type: 'triangle', g: 0.22, slide: -140, lp: 1200 }),
    heal: () => [660, 990, 1320].forEach((f, i) => bell(f, i * 0.09, 0.14, 0.24)),
    cheer: () => { tone({ f: 880, d: 0.2, type: 'sine', g: 0.24, slide: 440 }); noise({ f: 1500, d: 0.03, g: 0.16 }); noise({ f: 1500, d: 0.03, g: 0.16, t: 0.12 }); },
    battleStart: () => { [392, 523, 659].forEach((f, i) => tone({ f, d: 0.1, type: 'square', lp: 3000, g: 0.18, t: i * 0.12 })); chord([523, 659, 784, 1047], 0.48, 0.25, 0.12); },
    bossAppear: () => {
      [0, 0.35].forEach(t => { tone({ f: 196, d: 0.25, type: 'sine', g: 0.38, slide: -86, t }); tone({ f: 392, d: 0.25, type: 'triangle', g: 0.12, slide: -172, t }); });
      tone({ f: 220, d: 0.6, type: 'sawtooth', lp: 800, g: 0.16, slide: -80 }); noise({ f: 300, d: 0.5, g: 0.18, q: 0.5 });
    },
    monsterDown: () => {
      noise({ f: 2000, type: 'lowpass', d: 0.2, g: 0.28 }); tone({ f: 600, d: 0.35, type: 'sawtooth', lp: 1200, g: 0.16, slide: -480 });
      [1319, 1568, 2093].forEach((f, i) => tone({ f, d: 0.08, type: 'square', lp: 4000, g: 0.14, t: 0.38 + i * 0.06 }));
    },
    waveIn: () => { tone({ f: 330, d: 0.12, type: 'square', lp: 1200, g: 0.16 }); tone({ f: 392, d: 0.2, type: 'square', lp: 1200, g: 0.16, t: 0.12 }); noise({ f: 400, to: 2000, d: 0.25, g: 0.14 }); },
    micOn: () => { bell(880, 0, 0.12, 0.24); bell(1320, 0.09, 0.16, 0.24); },
    micOff: () => { bell(1320, 0, 0.1, 0.2); bell(880, 0.09, 0.16, 0.2); },
    chestShake: () => [0, 0.09, 0.18].forEach(t => { noise({ f: 1200, q: 2, d: 0.03, g: 0.2, t }); tone({ f: 180, d: 0.03, type: 'square', g: 0.08, t }); tone({ f: 360, d: 0.03, type: 'triangle', g: 0.06, t }); }),
    chestOpen: (tier) => {
      tone({ f: 400, d: 0.25, type: 'sine', g: 0.24, slide: 1200 });
      [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => bell(f, 0.1 + i * 0.06, 0.18, 0.2));
      if (tier === 'epic') chord([523, 659, 784, 1047], 0.3, 0.8, 0.07);
    },
    coin: () => { tone({ f: 1319, d: 0.08, type: 'square', lp: 4000, g: 0.16 }); tone({ f: 1760, d: 0.22, type: 'square', lp: 4000, g: 0.16, t: 0.08 }); },
    star: (i) => { const f = [1047, 1319, 1568][Math.max(0, Math.min(2, (i || 1) - 1))]; bell(f, 0, 0.28, 0.3, { a: 0.03 }); if (i === 3) noise({ f: 6000, d: 0.15, g: 0.1 }); },
    tickCount: (k) => tone({ f: 2200 + 800 * Math.max(0, Math.min(1, k || 0)), d: 0.025, type: 'square', lp: 4000, g: 0.11 }),
    ding: () => { tone({ f: 988, d: 0.09, type: 'square', lp: 3000, g: 0.2 }); tone({ f: 1319, d: 0.3, type: 'square', lp: 3000, g: 0.2, t: 0.09 }); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.18, type: 'triangle', g: 0.22, t: i * 0.13 })); tone({ f: 1047, d: 0.35, type: 'triangle', g: 0.22, t: 0.56 }); tone({ f: 1319, d: 0.35, type: 'triangle', g: 0.14, t: 0.56 }); },
    lose: () => [392, 349, 311, 262].forEach((f, i) => tone({ f, d: 0.3, type: 'triangle', g: 0.16, t: i * 0.22 })),
    fanfare: () => [523, 523, 523, 659, 784, 1047].forEach((f, i) => { const t = [0, 0.15, 0.3, 0.45, 0.6, 0.8][i], d = i === 5 ? 0.8 : 0.16; tone({ f, d, t, type: 'square', lp: 3500, g: 0.15 }); tone({ f: f * 2, d, t, type: 'triangle', g: 0.07 }); }),
    levelup: () => {
      [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => { tone({ f, d: 0.22, type: 'square', lp: 3500, g: 0.16, t: i * 0.09 }); tone({ f: f * 2, d: 0.22, type: 'triangle', g: 0.08, t: i * 0.09 }); });
      chord([1047, 1319, 1568], 0.63, 0.7, 0.12); noise({ f: 6000, d: 0.2, g: 0.08, t: 0.63 });
    },
    badge: () => { chord([698, 880, 1047], 0, 0.18, 0.1); chord([784, 988, 1175, 1568], 0.2, 0.6, 0.09); bell(2093, 0.2, 0.4, 0.2); },
    hatch: () => {
      [0, 0.2, 0.38].forEach(t => { noise({ f: 3500, d: 0.025, g: 0.28, t }); tone({ f: 250, d: 0.06, type: 'sine', g: 0.18, t }); });
      tone({ f: 660, d: 0.3, type: 'sine', g: 0.24, slide: 660, t: 0.6 });
      [880, 1109, 1319, 1760].forEach((f, i) => bell(f, 0.9 + i * 0.1, 0.28, 0.2));
    },
    streak: () => { noise({ f: 300, to: 3000, d: 0.3, g: 0.18 }); bell(880, 0.15, 0.3, 0.24); bell(1319, 0.25, 0.35, 0.24); },
    goal: () => { bell(1047, 0, 0.12, 0.24); bell(1568, 0.1, 0.12, 0.24); tone({ f: 1568, d: 0.6, type: 'sine', partials: [[2, 0.35], [3, 0.12]], g: 0.3, hold: 0.3, t: 0.2 }); },
    quest: () => { noise({ f: 4000, d: 0.12, g: 0.1 }); [784, 1047, 1319].forEach((f, i) => bell(f, 0.05 + i * 0.1, 0.14, 0.24)); },
    egg: () => [0, 0.08, 0.16].forEach((t, i) => tone({ f: 660, d: 0.08, type: 'sine', g: 0.22, slide: i % 2 ? -30 : 30, t })),
    swoosh: () => noise({ f: 600, to: 2500, d: 0.16, q: 0.7, g: 0.6, a: 0.02 })
  };
  A.sfx.combo = A.sfx.comboHit; A.sfx.hurt = A.sfx.oof;   // old names

  // Render offline (for level checks): fn(offlineCtx) schedules sounds, returns { peak, rms, dur }
  A.renderWith = function (fn, seconds) {
    const O = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    if (!O) return Promise.resolve(null);
    const secs = seconds || 2, off = new O(1, Math.ceil(44100 * secs), 44100);
    const w = wire(off);
    override = { c: off, sfx: w.sfx, music: w.music, noise: w.noise };
    try { fn(off); } finally { override = null; }
    return off.startRendering().then(buf => {
      const d = buf.getChannelData(0); let peak = 0, sum = 0, last = 0;
      for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); if (v > peak) peak = v; sum += v * v; if (v > 0.002) last = i; }
      return { peak: +peak.toFixed(3), rms: +Math.sqrt(sum / Math.max(1, last)).toFixed(3), dur: +(last / 44100).toFixed(2) };
    });
  };
  A.render = (name, arg, seconds) => A.sfx[name] ? A.renderWith(() => A.sfx[name](arg), seconds) : Promise.resolve(null);

  // ---------- Text to speech ----------
  const synth = window.speechSynthesis || null;
  let voices = [], chosen = null, speaking = 0, speakSeq = 0;
  const PREF = ['Samantha', 'Ava', 'Allison', 'Nicky', 'Karen', 'Moira', 'Daniel', 'Google US English', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Ana', 'Microsoft Zira', 'Microsoft Guy', 'Alex', 'Tessa', 'Google UK English Female'];
  const BAD = /eloquence|compact|novelty|bad news|bells|boing|bubbles|cellos|deranged|good news|hysterical|pipe organ|trinoids|whisper|zarvox|wobble|jester|superstar|albert|fred|junior|kathy|ralph/i;
  function pickVoice(vs) {
    const en = vs.filter(v => /^en([-_]|$)/i.test(v.lang));
    if (!en.length) return null;
    const score = (v) => {
      let s = 0;
      const i = PREF.findIndex(p => v.name.indexOf(p) === 0);
      if (i >= 0) s += 100 - i;
      if (/premium|enhanced|natural|neural/i.test(v.name)) s += 30;
      if (/^en[-_]US/i.test(v.lang)) s += 20;
      if (v.localService) s += 5;
      if (BAD.test(v.name)) s -= 200;
      return s;
    };
    return en.slice().sort((a, b) => score(b) - score(a))[0];
  }
  function loadVoices() {
    if (!synth) return;
    try { voices = synth.getVoices() || []; } catch (e) { voices = []; }
    chosen = pickVoice(voices);
  }
  if (synth) { loadVoices(); try { synth.onvoiceschanged = loadVoices; } catch (e) { /* ignore */ } }
  const busy = () => { try { return !!(synth && (synth.speaking || synth.pending)); } catch (e) { return false; } };

  A.ttsAvailable = () => !!synth;
  A.voiceName = () => chosen ? chosen.name : '';
  // the device lists its voices and none of them is English: English is then never spoken (a Japanese voice reading
  // "six" as シックス would teach the wrong sound), and the home screen says so
  A.noEnglishVoice = () => !!synth && voices.length > 0 && !chosen;
  A.isSpeaking = () => speaking > 0 || busy();
  A.speak = function (text, opt) {
    opt = opt || {};
    return new Promise((resolve) => {
      if (!synth || !text) return resolve(false);
      if (!voices.length) loadVoices();
      if (voices.length && !chosen && (opt.lang || 'en-US').indexOf('en') === 0) return resolve(false);   // no English voice: stay silent
      const wasBusy = busy(), my = ++speakSeq;
      if (wasBusy) { try { synth.cancel(); } catch (e) { /* ignore */ } }
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = opt.lang || 'en-US';
      if (chosen && u.lang.indexOf('en') === 0) u.voice = chosen;
      u.rate = opt.rate || A.rate || 0.9;
      u.pitch = opt.pitch || 1.05;
      u.volume = Math.max(0.2, volume);              // follows the parent's volume setting (some devices ignore it)
      let finished = false;
      speaking++;
      if (window.Music) Music.duck(true);
      const done = (ok) => {
        if (finished) return; finished = true; speaking = Math.max(0, speaking - 1);
        if (A._keep === u) A._keep = null;
        // speech can interrupt the Web Audio context on iOS: nudge it the moment speech ends
        setTimeout(() => { lastSpeechEnd = Date.now(); kick(); }, 60);
        // the safety timeout may fire while the voice is still talking: release the music only once it is really quiet
        let tries = 0;
        const release = () => { if (A.isSpeaking() && tries++ < 40) { setTimeout(release, 150); return; } lastSpeechEnd = Date.now(); if (window.Music) Music.duck(false); };
        setTimeout(release, 80);
        resolve(ok);
      };
      u.onend = () => done(true);
      u.onerror = () => done(false);
      A._keep = u;                                   // keep a reference: GC'd utterances never fire onend on some browsers
      const go = () => {
        if (finished) return;
        if (my !== speakSeq) return done(false);   // a newer request replaced this one while it was waiting
        try { synth.speak(u); } catch (e) { return done(false); }
        // iOS/Chrome sometimes leave the synth paused; nudge it and add a safety timeout
        setTimeout(() => { try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ } }, 120);
        setTimeout(() => done(true), (1200 + String(text).length * 100) / Math.max(0.5, u.rate));
      };
      if (wasBusy) setTimeout(go, 60); else go();    // speak() right after cancel() is unreliable on iOS
    });
  };
  A.stopSpeaking = () => { try { if (synth && busy()) synth.cancel(); } catch (e) { /* ignore */ } };

  // ---------- Speech recognition ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  A.srAvailable = () => !!SR && !A.srBlocked;
  A.currentRec = null;
  A.listen = function (opt) {
    opt = opt || {};
    return new Promise((resolve) => {
      if (!SR) return resolve({ ok: false, error: 'unsupported' });
      let r;
      try { r = new SR(); } catch (e) { return resolve({ ok: false, error: 'unsupported' }); }
      r.lang = opt.lang || 'en-US';
      r.interimResults = false;
      r.maxAlternatives = 5;
      r.continuous = false;
      let done = false;
      if (window.Music) Music.hush(true);
      claimSession(false);                            // let the system pick a recording-capable session while the mic is open
      const finish = (res) => {
        if (done) return; done = true; A.currentRec = null;
        try { r.onresult = r.onerror = r.onend = null; r.abort(); } catch (e) { /* ignore */ }
        if (!A.muted) claimSession(true);
        if (window.Music) Music.hush(false);
        kick();
        resolve(res);
      };
      r.onresult = (e) => {
        const alts = [];
        for (let i = 0; i < e.results.length; i++) for (let j = 0; j < e.results[i].length; j++) alts.push(e.results[i][j].transcript);
        finish({ ok: true, alts });
      };
      r.onerror = (e) => {
        const err = (e && e.error) || 'error';
        if (err === 'not-allowed' || err === 'service-not-allowed') A.srBlocked = true;
        finish({ ok: false, error: err });
      };
      r.onend = () => finish({ ok: false, error: 'no-speech' });
      A.currentRec = r;
      try { r.start(); } catch (e) { return finish({ ok: false, error: 'start-failed' }); }
      setTimeout(() => finish({ ok: false, error: 'timeout' }), opt.timeout || 7000);
    });
  };
  A.stopListening = () => { try { if (A.currentRec) A.currentRec.stop(); } catch (e) { /* ignore */ } };

  // Compare what was heard with the target sentence/word
  A.matchSpeech = function (alts, target) {
    const t = U.norm(target);
    const tw = t.split(' ').filter(Boolean);
    let best = 0, heard = alts && alts[0] ? alts[0] : '';
    (alts || []).forEach(a => {
      const n = U.norm(a);
      let s = U.similarity(n, t);
      if (n === t || n.indexOf(t) >= 0) s = 1;
      const hw = n.split(' ');
      const hitWords = tw.filter(w => hw.indexOf(w) >= 0).length / Math.max(1, tw.length);
      s = Math.max(s, hitWords);
      if (s > best) { best = s; heard = a; }
    });
    return { score: best, heard, ok: best >= 0.72 };
  };

  // ---------- unlock (iOS needs a user gesture before any sound) ----------
  let warmed = false;
  function warmTTS() {
    if (warmed || !synth) return;
    warmed = true;
    // a silent utterance primes the speech engine; deferred so it never lands in the same tick as the context start
    setTimeout(() => { try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.rate = 2; u.onend = u.onerror = () => setTimeout(kick, 60); A._warm = u; synth.speak(u); } catch (e) { /* ignore */ } }, 300);
  }
  const GESTURE = { touchend: 1, pointerup: 1, click: 1, keydown: 1 };
  function gestureExtras() {
    lastGesture = Date.now();
    claimSession(true);
    unmuteFallback();
    warmTTS();
  }
  // Runs on every tap (capture phase, before the app's own handlers): creates/resumes the context inside the gesture.
  A.unlock = function (e) {
    if (A.muted) return;
    const gesture = !!(e && GESTURE[e.type]);
    if (gesture) heal();                             // judged before this tap's own resume() below
    ac();
    if (gesture) gestureExtras();
  };
  // Cheap nudge from App.sfx (may run from a timer, so no gesture-only work here)
  A.poke = function () { if (A.muted) return; ac(); claimSession(true); };
  ['touchstart', 'touchend', 'pointerup', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, A.unlock, { capture: true, passive: true }));
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseFallback(); else { kick(); if (!A.muted) unmuteFallback(); } });
  window.addEventListener('pageshow', kick);
  window.addEventListener('focus', kick);

  // ---------- diagnostics (parent menu) ----------
  A.diag = function (t0) {
    return {
      state: ctx ? ctx.state : 'none', sr: ctx ? ctx.sampleRate : 0,
      advanced: ctx ? +(ctx.currentTime - (t0 || 0)).toFixed(2) : 0,
      muted: A.muted, volume, session: navigator.audioSession ? navigator.audioSession.type : 'n/a',
      unlocker: silent ? (silent.paused ? 'paused' : 'playing') : 'off',
      builds: diag.builds, resumes: diag.resumes, dropped: diag.dropped, voice: A.voiceName(), speaking: A.isSpeaking(),
      standalone: !!navigator.standalone, ios: isIOS, log: diag.log.slice(-8)
    };
  };

  window.Audio2 = A;
})();
