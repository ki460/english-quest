/* sw.js — offline support. Network first (always fresh when online), cached copy when offline. */
const VERSION = 'eq-v1';
const SHELL = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/util.js', './js/audio.js', './js/store.js', './js/content.js', './js/engine.js',
  './js/ui_core.js', './js/ui_home.js', './js/ui_map.js', './js/ui_battle.js', './js/ui_travel.js', './js/ui_parent.js', './js/app.js',
  './js/data/game.js', './js/data/abc.js', './js/data/phonics.js', './js/data/travel.js',
  './js/data/g5.js', './js/data/g4.js', './js/data/g3.js', './js/data/p2.js', './js/data/g2.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname.indexOf('fonts.g') >= 0;
  if (url.origin !== location.origin && !isFont) return;
  if (isFont) {
    // fonts never change: cache first
    e.respondWith(caches.match(req).then(c => c || fetch(req).then(res => { if (res && res.ok) caches.open(VERSION).then(cc => cc.put(req, res.clone())); return res; })));
    return;
  }
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) caches.open(VERSION).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then(c => c || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
