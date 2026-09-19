/* util.js — small DOM + math helpers (no dependencies) */
(function () {
  'use strict';
  const U = {};

  U.$ = (sel, root) => (root || document).querySelector(sel);
  U.$$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  // h('div.card#id', {attrs..., on:{click:fn}, style:{...}}, ...children)
  U.h = function (tag, props, ...children) {
    if (props != null && (typeof props !== 'object' || props instanceof Node || Array.isArray(props))) {
      children.unshift(props); props = null;
    }
    const m = /^([a-z0-9-]+)?((?:[.#][\w-]+)*)$/i.exec(tag) || [];
    const el = document.createElement(m[1] || 'div');
    (m[2] || '').split(/(?=[.#])/).forEach(t => {
      if (t[0] === '.') el.classList.add(t.slice(1));
      else if (t[0] === '#') el.id = t.slice(1);
    });
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'on') { for (const ev in v) el.addEventListener(ev, v[ev]); }
      else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.indexOf('--') === 0) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
      else if (k === 'class' || k === 'className') el.className += (el.className ? ' ' : '') + v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k in el && k !== 'list' && k !== 'form') { try { el[k] = v; } catch (e) { el.setAttribute(k, v); } }
      else el.setAttribute(k, v === true ? '' : v);
    }
    U.append(el, children);
    return el;
  };
  U.append = function (el, children) {
    children.flat(Infinity).forEach(c => {
      if (c == null || c === false) return;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    });
    return el;
  };
  U.clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };

  U.rand = (n) => Math.floor(Math.random() * n);
  U.pick = (arr) => arr[U.rand(arr.length)];
  U.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = U.rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  U.sample = (arr, n) => U.shuffle(arr).slice(0, n);
  U.clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  U.chunk = function (arr, size) {
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
  };
  // split into roughly equal chunks of ~size (avoids a tiny last chunk)
  U.chunkEven = function (arr, size) {
    const n = Math.max(1, Math.round(arr.length / size));
    const per = Math.ceil(arr.length / n);
    return U.chunk(arr, per);
  };
  U.sum = (arr) => arr.reduce((a, b) => a + b, 0);
  U.uniq = (arr) => Array.from(new Set(arr));

  // dates as local YYYY-MM-DD
  U.today = function (offsetDays) {
    const d = new Date();
    if (offsetDays) d.setDate(d.getDate() + offsetDays);
    return U.ymd(d);
  };
  U.ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  U.addDays = function (ymd, n) {
    const p = ymd.split('-').map(Number);
    const d = new Date(p[0], p[1] - 1, p[2]);
    d.setDate(d.getDate() + n);
    return U.ymd(d);
  };
  U.daysBetween = function (a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    const da = new Date(pa[0], pa[1] - 1, pa[2]), db = new Date(pb[0], pb[1] - 1, pb[2]);
    return Math.round((db - da) / 86400000);
  };

  U.norm = (s) => String(s || '').toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' ]+/g, ' ').replace(/\s+/g, ' ').trim();
  U.levenshtein = function (a, b) {
    if (a === b) return 0;
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, i) => i);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur;
    }
    return prev[n];
  };
  U.similarity = function (a, b) {
    a = U.norm(a); b = U.norm(b);
    if (!a.length && !b.length) return 1;
    return 1 - U.levenshtein(a, b) / Math.max(a.length, b.length);
  };

  U.escape = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  U.wait = (ms) => new Promise(r => setTimeout(r, ms));
  U.fmt = (n) => Number(n).toLocaleString('ja-JP');
  U.reducedMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // count-up animation for numbers; onTick(progress 0..1) fires when the shown number changes (≥60 ms apart)
  U.countUp = function (el, to, ms, onTick, from) {
    if (from == null) from = Number(String(el.textContent || '0').replace(/[^\d.-]/g, '')) || 0;
    const start = performance.now();
    ms = U.reducedMotion() ? 0 : (ms == null ? 600 : ms);
    if (!ms) { el.textContent = U.fmt(to); return; }
    let shown = null, lastTick = -1, done = false;
    function step(t) {
      if (done) return;
      const p = ms ? Math.min(1, (t - start) / ms) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (to - from) * eased);
      if (v !== shown) {
        shown = v; el.textContent = U.fmt(v);
        if (onTick && p < 1 && t - lastTick >= 60) { lastTick = t; try { onTick(p); } catch (e) { /* ignore */ } }
      }
      if (p < 1) requestAnimationFrame(step); else done = true;
    }
    requestAnimationFrame(step);
    // frames stop in a hidden window: land on the final number anyway
    setTimeout(() => { if (!done) { done = true; el.textContent = U.fmt(to); } }, ms + 400);
  };

  U.uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  window.U = U;
})();
