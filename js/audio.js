/* audio.js — synthesized sound effects (Web Audio), text-to-speech, speech recognition */
(function () {
  'use strict';
  const A = { muted: false, srBlocked: false, rate: 0.9 };
  let ctx = null;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) { /* ignore */ } }
    return ctx;
  }

  function tone(o) {
    const c = ac(); if (!c || A.muted) return;
    const f = o.f || 440, d = o.d || 0.15, t = c.currentTime + (o.t || 0), g = o.g || 0.15;
    const osc = c.createOscillator(); const vol = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, f + o.slide), t + d);
    vol.gain.setValueAtTime(0.0001, t);
    vol.gain.exponentialRampToValueAtTime(g, t + 0.012);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + d);
    osc.connect(vol).connect(c.destination);
    osc.start(t); osc.stop(t + d + 0.05);
  }
  function noise(o) {
    const c = ac(); if (!c || A.muted) return;
    const d = o.d || 0.15, t = c.currentTime + (o.t || 0);
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * d), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = o.f || 1000; bp.Q.value = 0.8;
    const vol = c.createGain();
    vol.gain.setValueAtTime(o.g || 0.2, t);
    vol.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(bp).connect(vol).connect(c.destination);
    src.start(t); src.stop(t + d + 0.02);
  }

  A.sfx = {
    tap: () => tone({ f: 700, d: 0.05, type: 'triangle', g: 0.08 }),
    pop: () => tone({ f: 800, d: 0.07, type: 'sine', g: 0.12, slide: 500 }),
    correct: () => { tone({ f: 523, d: 0.12, type: 'triangle' }); tone({ f: 659, d: 0.12, type: 'triangle', t: 0.08 }); tone({ f: 784, d: 0.22, type: 'triangle', t: 0.16 }); },
    wrong: () => { tone({ f: 190, d: 0.18, type: 'square', g: 0.1 }); tone({ f: 150, d: 0.28, type: 'square', g: 0.1, t: 0.16 }); },
    hit: () => { noise({ d: 0.12, g: 0.25, f: 900 }); tone({ f: 130, d: 0.16, type: 'sine', g: 0.3, slide: -70 }); },
    crit: () => { noise({ d: 0.22, g: 0.35, f: 1600 }); tone({ f: 95, d: 0.28, type: 'sine', g: 0.35, slide: -50 }); tone({ f: 1300, d: 0.1, type: 'square', g: 0.07 }); tone({ f: 1950, d: 0.15, type: 'square', g: 0.07, t: 0.08 }); },
    hurt: () => { tone({ f: 320, d: 0.22, type: 'sawtooth', g: 0.1, slide: -220 }); noise({ d: 0.1, g: 0.12, f: 400 }); },
    combo: (n) => { const b = 620 + Math.min(n, 12) * 55; tone({ f: b, d: 0.08, type: 'square', g: 0.06 }); tone({ f: b * 1.5, d: 0.14, type: 'square', g: 0.06, t: 0.07 }); },
    coin: () => { tone({ f: 1319, d: 0.08, type: 'square', g: 0.07 }); tone({ f: 1760, d: 0.22, type: 'square', g: 0.07, t: 0.08 }); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => tone({ f, d: 0.18, type: 'triangle', g: 0.16, t: i * 0.13 })); tone({ f: 1047, d: 0.6, type: 'triangle', g: 0.16, t: 0.56 }); tone({ f: 1319, d: 0.6, type: 'triangle', g: 0.1, t: 0.56 }); },
    lose: () => { [392, 349, 311, 262].forEach((f, i) => tone({ f, d: 0.3, type: 'triangle', g: 0.12, t: i * 0.22 })); },
    chest: () => { [784, 988, 1175, 1568, 1976, 2349].forEach((f, i) => tone({ f, d: 0.16, type: 'sine', g: 0.13, t: i * 0.06 })); },
    levelup: () => { [392, 523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone({ f, d: 0.22, type: 'triangle', g: 0.14, t: i * 0.09 })); },
    hatch: () => { noise({ d: 0.08, g: 0.2, f: 2500 }); noise({ d: 0.08, g: 0.2, f: 2500, t: 0.18 }); [880, 1109, 1319, 1760].forEach((f, i) => tone({ f, d: 0.28, type: 'sine', g: 0.14, t: 0.4 + i * 0.1 })); },
    swoosh: () => noise({ d: 0.18, g: 0.12, f: 2200 }),
    star: () => { tone({ f: 1568, d: 0.12, type: 'sine', g: 0.12 }); tone({ f: 2093, d: 0.25, type: 'sine', g: 0.12, t: 0.1 }); },
    tick: () => tone({ f: 1000, d: 0.03, type: 'square', g: 0.04 }),
    fanfare: () => { [523, 523, 523, 659, 784, 1047].forEach((f, i) => tone({ f, d: i === 5 ? 0.8 : 0.16, type: 'square', g: 0.08, t: [0, 0.15, 0.3, 0.45, 0.6, 0.8][i] })); }
  };

  // ---------- Text to speech ----------
  const synth = window.speechSynthesis || null;
  let voices = [], chosen = null;
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

  A.ttsAvailable = () => !!synth;
  A.voiceName = () => chosen ? chosen.name : '';
  A.speak = function (text, opt) {
    opt = opt || {};
    return new Promise((resolve) => {
      if (!synth || !text) return resolve(false);
      if (!voices.length) loadVoices();
      try { synth.cancel(); } catch (e) { /* ignore */ }
      const u = new SpeechSynthesisUtterance(String(text));
      u.lang = opt.lang || 'en-US';
      if (chosen && u.lang.indexOf('en') === 0) u.voice = chosen;
      u.rate = opt.rate || A.rate || 0.9;
      u.pitch = opt.pitch || 1.05;
      u.volume = 1;
      let finished = false;
      const done = (ok) => { if (!finished) { finished = true; resolve(ok); } };
      u.onend = () => done(true);
      u.onerror = () => done(false);
      try { synth.speak(u); } catch (e) { return done(false); }
      // iOS/Chrome sometimes leave the synth paused; nudge it and add a safety timeout
      setTimeout(() => { try { if (synth.paused) synth.resume(); } catch (e) { /* ignore */ } }, 120);
      setTimeout(() => done(true), 1500 + String(text).length * 120);
    });
  };
  A.stopSpeaking = () => { try { if (synth) synth.cancel(); } catch (e) { /* ignore */ } };

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
      const finish = (res) => {
        if (done) return; done = true; A.currentRec = null;
        try { r.onresult = r.onerror = r.onend = null; r.abort(); } catch (e) { /* ignore */ }
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

  // Unlock audio + TTS on the first user gesture (required by iOS)
  A.unlock = function () {
    ac();
    if (synth && !A._warmed) {
      A._warmed = true;
      try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) { /* ignore */ }
    }
  };
  ['touchstart', 'pointerdown', 'click', 'keydown'].forEach(ev => document.addEventListener(ev, A.unlock, { once: true, passive: true }));

  window.Audio2 = A;
})();
