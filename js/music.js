/* music.js — tiny chiptune sequencer for battle music (Web Audio through Audio2's music bus, no audio files).
   Patterns are strings of 16th-note tokens: "E5" one step, "E5*2" two steps, "." a rest; drums use k s h per step. */
(function () {
  'use strict';
  const M = { enabled: false, playing: null };
  const LOOK = 0.2, TICK = 60, MAX_MS = 20 * 60 * 1000;
  const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let timer = null, step = 0, nextT = 0, cur = null, startedAt = 0, ducked = false, hushed = false, gainCtx = null;

  function parse(str) {
    const ev = []; let s = 0;
    str.trim().split(/\s+/).forEach(tok => {
      if (/^\.+$/.test(tok)) { s += tok.length; return; }
      const m = /^([A-G])(#|b)?(\d)(?:\*(\d+))?$/.exec(tok); if (!m) return;
      const len = m[4] ? +m[4] : 1;
      ev.push({ s, n: 12 * (+m[3] + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0), len }); s += len;
    });
    return { ev, total: s };
  }
  function drums(str) { const ev = []; str.replace(/\s+/g, '').split('').forEach((ch, i) => { if (ch !== '.') ev.push({ s: i, n: ch, len: 1 }); }); return { ev, total: str.replace(/\s+/g, '').length }; }

  // ----- voices (all through the music bus; levels sit ~12 dB under the feedback chimes) -----
  const V = {
    lead: (at, n, d) => Audio2.tone({ bus: 'music', at, f: hz(n), d, type: 'square', lp: 3800, g: 0.11, a: 0.006, hold: 0.7 }),
    bass: (at, n, d) => Audio2.tone({ bus: 'music', at, f: hz(n), d, type: 'square', lp: 520, g: 0.15, a: 0.004, hold: 0.75 }),
    arp: (at, n, d) => Audio2.tone({ bus: 'music', at, f: hz(n), d, type: 'triangle', g: 0.07, a: 0.004, hold: 0.5 }),
    k: (at) => Audio2.tone({ bus: 'music', at, f: 180, d: 0.1, type: 'sine', g: 0.22, slide: -120, a: 0.002, hold: 0.3 }),
    s: (at) => Audio2.noise({ bus: 'music', at, f: 1800, d: 0.08, g: 0.1, q: 0.6 }),
    h: (at) => Audio2.noise({ bus: 'music', at, f: 7000, type: 'highpass', d: 0.02, g: 0.035 })
  };

  // ----- tracks -----
  const TRACKS = {
    battle: {                                   // C major, bouncy: C – Am – F – G, 8 bars
      bpm: 132,
      lead: 'E5*2 G5*2 E5*2 C5*2 D5*2 E5*2 G5*4   A5*2 G5*2 E5*2 G5*2 E5*4 ....   A4*2 C5*2 E5*2 A5*2 G5*2 E5*2 C5*4   D5*2 E5*2 D5*2 C5*2 A4*4 ....' +
        '   F5*2 A5*2 F5*2 C5*2 D5*2 F5*2 A5*4   G5*2 A5*2 G5*2 F5*2 E5*4 ....   G5*2 B5*2 G5*2 D5*2 E5*2 G5*2 B5*4   C6*2 B5*2 A5*2 G5*2 D5*4 ....',
      bass: 'C3*2 C3*2 G3*2 C3*2 C3*2 C3*2 G3*2 G3*2   C3*2 C3*2 G3*2 C3*2 C3*2 G3*2 C4*2 G3*2   A2*2 A2*2 E3*2 A2*2 A2*2 A2*2 E3*2 E3*2   A2*2 A2*2 E3*2 A2*2 A2*2 E3*2 A3*2 E3*2' +
        '   F3*2 F3*2 C3*2 F3*2 F3*2 F3*2 C3*2 C3*2   F3*2 F3*2 C3*2 F3*2 F3*2 C3*2 F3*2 C3*2   G3*2 G3*2 D3*2 G3*2 G3*2 G3*2 D3*2 D3*2   G3*2 G3*2 D3*2 G3*2 B3*2 D4*2 G3*2 G3*2',
      arp: 'C4*2 E4*2 G4*2 E4*2 C4*2 E4*2 G4*2 E4*2   C4*2 E4*2 G4*2 E4*2 C4*2 E4*2 G4*2 E4*2   A4*2 C5*2 E5*2 C5*2 A4*2 C5*2 E5*2 C5*2   A4*2 C5*2 E5*2 C5*2 A4*2 C5*2 E5*2 C5*2' +
        '   F4*2 A4*2 C5*2 A4*2 F4*2 A4*2 C5*2 A4*2   F4*2 A4*2 C5*2 A4*2 F4*2 A4*2 C5*2 A4*2   G4*2 B4*2 D5*2 B4*2 G4*2 B4*2 D5*2 B4*2   G4*2 B4*2 D5*2 B4*2 G4*2 B4*2 D5*2 B4*2',
      drums: 'k.h.s.h.k.h.s.h. k.h.s.h.k.h.s.hh k.h.s.h.k.h.s.h. k.h.s.h.k.h.s.hh k.h.s.h.k.h.s.h. k.h.s.h.k.h.s.hh k.h.s.h.k.h.s.h. k.h.s.h.k.k.s.ss'
    },
    boss: {                                     // E minor, driving: Em – Em – C – D – Em – Em – C – B, 8 bars
      bpm: 150,
      lead: 'E5 E5 . E5 G5 . E5 . B4 . D5 . E5*2 . .   G5 G5 . G5 A5 . G5 . E5 . D5 . E5*4   C5 C5 . C5 E5 . C5 . G4 . B4 . C5*2 . .   D5 D5 . D5 F#5 . D5 . A4 . C5 . D5*4' +
        '   E5 . E5 . G5 . A5 . B5*2 A5*2 G5*2 E5*2   B5 . B5 . A5 . G5 . E5*4 D5*2 E5*2   C5 . E5 . G5 . C6 . B5*2 G5*2 E5*2 C5*2   B4 . D#5 . F#5 . B5 . D#6*2 B5*2 F#5*2 D#5*2',
      bass: 'E3*2 E3*2 E4*2 E3*2 E3*2 E3*2 D3*2 E3*2   E3*2 E3*2 E4*2 E3*2 E3*2 E3*2 D3*2 D3*2   C3*2 C3*2 C4*2 C3*2 C3*2 C3*2 G3*2 C3*2   D3*2 D3*2 D4*2 D3*2 D3*2 D3*2 A3*2 D3*2' +
        '   E3*2 E3*2 E4*2 E3*2 E3*2 E3*2 D3*2 E3*2   E3*2 E3*2 E4*2 E3*2 E3*2 E3*2 D3*2 D3*2   C3*2 C3*2 C4*2 C3*2 C3*2 C3*2 G3*2 C3*2   B2*2 B2*2 B3*2 B2*2 B2*2 F#3*2 B2*2 B2*2',
      arp: 'E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4   E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4   C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4   D4 F#4 A4 F#4 D4 F#4 A4 F#4 D4 F#4 A4 F#4 D4 F#4 A4 F#4' +
        '   E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4   E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4 E4 G4 B4 G4   C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4 C4 E4 G4 E4   B3 D#4 F#4 D#4 B3 D#4 F#4 D#4 B3 D#4 F#4 D#4 B3 D#4 F#4 D#4',
      drums: 'khhhshhhkhhhshhh khhhshhhkhhhshss khhhshhhkhhhshhh khhhshhhkhhhshss khhhshhhkhhhshhh khhhshhhkhhhshss khhhshhhkhhhshhh khhhshhhkkhkssss'
    }
  };
  // compile: per step → list of [voice, midi/drum, lenSteps]
  const COMPILED = {};
  Object.keys(TRACKS).forEach(name => {
    const t = TRACKS[name], parts = { lead: parse(t.lead), bass: parse(t.bass), arp: parse(t.arp), drums: drums(t.drums) };
    const len = Math.max.apply(null, Object.keys(parts).map(k => parts[k].total)) || 128;
    const byStep = []; for (let i = 0; i < len; i++) byStep.push([]);
    Object.keys(parts).forEach(k => parts[k].ev.forEach(e => { if (e.s < len) byStep[e.s].push([k === 'drums' ? e.n : k, e.n, e.len]); }));
    COMPILED[name] = { bpm: t.bpm, len, byStep };
  });

  // ----- scheduler -----
  function gainNode() {
    const c = Audio2.ctx(), bus = Audio2.musicBus();
    if (!c || !bus) return null;
    if (gainCtx !== c) gainCtx = c;
    return { c, bus };
  }
  function target() { return hushed ? 0 : (ducked ? 0.3 : 1); }
  function applyGain(ramp) {
    const g = gainNode(); if (!g) return;
    try { g.bus.gain.setTargetAtTime(Audio2.MUSIC_GAIN * target(), g.c.currentTime, ramp || 0.08); } catch (e) { /* ignore */ }
  }
  function tick() {
    const g = gainNode();
    if (!g || !cur) return;
    if (g.c.state !== 'running') return;                        // resync() re-anchors when the context runs again
    if (Date.now() - startedAt > MAX_MS) { M.stop(); return; }
    const spb = 60 / cur.bpm / 4;
    if (nextT < g.c.currentTime - 0.5) nextT = g.c.currentTime + 0.05;   // fell behind (tab hidden): skip ahead, never burst
    let guard = 0;
    while (nextT < g.c.currentTime + LOOK && guard++ < 64) {
      cur.byStep[step % cur.len].forEach(e => {
        const fn = V[e[0]]; if (!fn) return;
        if (e[0].length === 1) fn(nextT); else fn(nextT, e[1], Math.max(0.05, e[2] * spb * 0.9));
      });
      step++; nextT += spb;
    }
  }
  function startTimer() { if (!timer) timer = setInterval(tick, TICK); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }

  M.setEnabled = function (on) { M.enabled = !!on; if (!M.enabled) M.stop(); };
  M.play = function (name) {
    if (!M.enabled || Audio2.muted || !COMPILED[name]) return;
    if (M.playing === name && timer) return;
    Audio2.poke();
    cur = COMPILED[name]; M.playing = name; step = 0; startedAt = Date.now(); ducked = Audio2.isSpeaking();
    const g = gainNode(); nextT = g ? g.c.currentTime + 0.08 : 0;
    applyGain(0.15);
    startTimer();
  };
  M.stop = function () {
    stopTimer();
    if (cur) { const g = gainNode(); if (g) { try { g.bus.gain.setTargetAtTime(0, g.c.currentTime, 0.06); } catch (e) { /* ignore */ } } }
    cur = null; M.playing = null; ducked = false; hushed = false;
  };
  M.resync = function () { const g = gainNode(); if (g && cur) { nextT = g.c.currentTime + 0.08; applyGain(0.05); } };
  M.duck = function (on) { if (ducked === !!on) return; ducked = !!on; if (cur) applyGain(on ? 0.08 : 0.4); };
  M.hush = function (on) { if (hushed === !!on) return; hushed = !!on; if (cur) applyGain(on ? 0.05 : 0.4); };
  M.trackFor = (s) => !s || s.kind === 'test' ? null : (s.kind === 'boss' ? 'boss' : 'battle');

  // offline render of the first `seconds` of a track (level checks): { peak, rms, dur }
  M.render = function (name, seconds) {
    const t = COMPILED[name]; if (!t) return Promise.resolve(null);
    return Audio2.renderWith(() => {
      const spb = 60 / t.bpm / 4; let st = 0;
      for (let at = 0.05; at < (seconds || 4); at += spb, st++) t.byStep[st % t.len].forEach(e => { const fn = V[e[0]]; if (!fn) return; if (e[0].length === 1) fn(at); else fn(at, e[1], Math.max(0.05, e[2] * spb * 0.9)); });
    }, seconds || 4);
  };

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopTimer();
    else if (cur) { M.resync(); startTimer(); }
  });

  window.Music = M;
})();
