/* sw.js — offline copy of the app.
   Start-up is served from the cache (instant, works offline); each launch then re-downloads the
   shell in the background, so an update shows up the next time the app is opened.
   Anything missing from the cache falls through to the network. */
const VERSION = 'eq-v4';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/util.js', './js/audio.js', './js/music.js', './js/store.js', './js/content.js', './js/engine.js',
  './js/ui_core.js', './js/ui_home.js', './js/ui_map.js', './js/ui_battle.js', './js/ui_travel.js', './js/ui_parent.js', './js/app.js',
  './js/data/game.js', './js/data/abc.js', './js/data/phonics.js', './js/data/travel.js',
  './js/data/g5.js', './js/data/g4.js', './js/data/g3.js', './js/data/p2.js', './js/data/g2.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
const abs = (u) => new URL(u, self.location.href).href;
const SHELL_URLS = new Set(SHELL.map(abs));
const INDEX = abs('./index.html');
const REFRESH_EVERY = 5 * 60 * 1000;
let lastRefresh = 0;

// Cache reads must never break a page load (iOS has been seen failing them under Screen Time restrictions).
function cached(key) {
  try { return caches.match(key).catch(() => undefined); } catch (e) { return Promise.resolve(undefined); }
}
function store(key, res) {
  try { caches.open(VERSION).then(c => c.put(key, res)).catch(() => { /* ignore */ }); } catch (e) { /* ignore */ }
}
const sig = (res) => res.headers.get('etag') || res.headers.get('last-modified') || '';

// Download the whole shell, then swap it into the cache in one go (keeps the files consistent with each other).
// Tells open pages when something actually changed (they reload themselves at a quiet moment). Resolves to that flag.
function refreshShell(force) {
  const now = Date.now();
  if (!force && now - lastRefresh < REFRESH_EVERY) return Promise.resolve(false);
  lastRefresh = now;
  return Promise.all(SHELL.map(u => fetch(u, { cache: 'no-cache' }).then(r => (r && r.ok ? [u, r] : null)).catch(() => null)))
    .then(pairs => caches.open(VERSION).then(c => Promise.all(pairs.filter(Boolean).map(([u, r]) =>
      c.match(u).then(old => {
        const changed = !!old && sig(old) !== sig(r) && sig(r) !== '';
        return c.put(u, r).then(() => changed);
      })))))
    .then(flags => {
      if (!flags.some(Boolean)) return false;
      return self.clients.matchAll({ type: 'window' }).then(cs => { cs.forEach(c => c.postMessage({ type: 'eq-updated' })); return true; });
    })
    .catch(() => false);   // offline: keep what we have
}
// A page asks for a check right now (app resumed, parent menu button): bypass the throttle and answer.
self.addEventListener('message', (e) => {
  if (!e.data || e.data.type !== 'eq-refresh') return;
  const reply = (changed) => { try { if (e.source) e.source.postMessage({ type: 'eq-refreshed', changed: !!changed }); } catch (err) { /* ignore */ } };
  e.waitUntil(refreshShell(true).then(reply, () => reply(false)));
});

self.addEventListener('install', (e) => {
  // straight from the server, never the HTTP cache: a copy cached minutes before a deploy must not become the new shell
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => fetch(u, { cache: 'no-cache' }).then(r => (r && r.ok ? c.put(u, r) : null)).catch(() => null)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== self.location.origin && !isFont) return;

  if (isFont) {
    // fonts never change: cache first, network once
    e.respondWith(cached(req).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok && res.type !== 'opaque') store(req, res.clone());
      return res;
    })));
    return;
  }

  const nav = req.mode === 'navigate';
  if (nav && url.searchParams.has('r')) {
    // "なおして ひらく" reload from index.html: straight from the network
    e.respondWith(fetch(req).catch(() => cached(INDEX)));
    return;
  }
  const key = url.origin + url.pathname;
  e.respondWith(cached(key).then(hit => hit || fetch(req).then(res => {
    if (res && res.ok && SHELL_URLS.has(key)) store(key, res.clone());
    return res;
  }).catch(() => (nav ? cached(INDEX) : undefined))));
  if (nav) e.waitUntil(cached(key).then(hit => (hit ? refreshShell() : undefined)));
});
