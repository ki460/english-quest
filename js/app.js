/* app.js — boot */
(function () {
  'use strict';
  window.EQ_BUILD = '2026-09-20f';   // shown in the parent menu so a device test can be matched to a version
  function boot() {
    Content.build();
    Store.load();
    const p = Store.profile();
    if (p) {
      App.p = p; Engine.ensureDaily(p);
      App.applySettings(p);
      Store.save();
      App.go('home');
    } else App.go('profiles');

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (App.screenHidden) App.screenHidden(); return; }   // e.g. stop a battle's auto-advance
      Audio2.kick();
      if (App.p && Engine.ensureDaily(App.p)) { Store.save(); if (App.screen === 'home') App.refresh(); }
    });
    // Offline copy: registered after the first paint so it never competes with the initial load.
    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
      const reg = () => { try { navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ }); } catch (e) { /* ignore */ } };
      if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg);
      // sw.js says so after it has downloaded a newer version in the background → the app reloads itself (App.updateArrived)
      navigator.serviceWorker.addEventListener('message', (e) => {
        const d = e.data || {};
        if (d.type === 'eq-updated') App.updateArrived();
        else if (d.type === 'eq-refreshed' && App._refreshWait) App._refreshWait(d);
      });
      // iOS rarely relaunches a home-screen app, it resumes it: coming back also looks for a new version (10 min apart)
      let lastAsk = Date.now();
      document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastAsk > 10 * 60 * 1000) { lastAsk = Date.now(); App.askRefresh(); } });
    }
    // keep the audio context warm when returning from background (iOS)
    window.addEventListener('focus', () => Audio2.kick());
  }
  function start() {
    // A start-up crash must never leave a blank page: hand it to the watchdog in index.html.
    try { boot(); } catch (err) { if (window.__eqBootFail) window.__eqBootFail(err); else throw err; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
