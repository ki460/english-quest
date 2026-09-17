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
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      try { navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }); } catch (e) { /* ignore */ }
    }
    // keep the audio context warm when returning from background (iOS)
    window.addEventListener('focus', () => Audio2.unlock());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
