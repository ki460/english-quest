/* app.js — boot */
(function () {
  'use strict';
  function boot() {
    Content.build();
    Store.load();
    const p = Store.profile();
    if (p) {
      App.p = p; Engine.ensureDaily(p);
      App.sfxOn = p.settings.sfx !== false; Audio2.muted = !App.sfxOn; Audio2.rate = p.settings.ttsRate || 0.9;
      Store.save();
      App.go('home');
    } else App.go('profiles');

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && App.p && Engine.ensureDaily(App.p)) { Store.save(); if (App.screen === 'home') App.refresh(); }
    });
    // Offline copy: registered after the first paint so it never competes with the initial load.
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      const reg = () => { try { navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }); } catch (e) { /* ignore */ } };
      if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
      // sw.js says so after it has downloaded a newer version in the background
      navigator.serviceWorker.addEventListener('message', (e) => { if (e.data && e.data.type === 'eq-updated') App.toast('🆕 あたらしい バージョンが とどいたよ。つぎに ひらくと かわるよ'); });
    }
    // keep the audio context warm when returning from background (iOS)
    window.addEventListener('focus', () => Audio2.unlock());
  }
  function start() {
    // A start-up crash must never leave a blank page: hand it to the watchdog in index.html.
    try { boot(); } catch (err) { if (window.__eqBootFail) window.__eqBootFail(err); else throw err; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
