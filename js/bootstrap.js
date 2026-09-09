/* ============================================================
   cramchy. — bootstrap
   Owns the single app version constant, the stylesheet set,
   the script load order, and the boot sequence.

   The app version lives HERE and in the deploy. It does NOT
   live in filenames or in individual CSS files.
   ============================================================ */
(function () {
  'use strict';

  const APP_VERSION = '2026-09-09-task-home-sync-9';

  // ---- Stylesheet set (owned here) ----------------------------
  // Transitional: this mirrors the current live CSS surface so
  // the app keeps working while CSS is folded into styles/ one
  // slice at a time (see STRUCTURE.md migration plan).
  const STYLESHEET_SET = [
    'styles.css',            // base entry point (itself imports styles-base.css + fonts)
    'design-v3.css',
    'home-hero-v4.css',
    'home-hierarchy-v5.css',
    'home-command-v6.css',
    'polish-v7.css',
    'theme-gradients-v8.css'
  ];

  // ---- Script load order --------------------------------------
  // Transitional: mirrors the current load chain. Each entry is
  // replaced with its js/ canonical module as that slice is migrated.
  // Order matters: state first, then features.
  const SCRIPT_LOAD_ORDER = [
    'app-logo-base.js',
    'planner-root-compat-v4.js',
    'planner-v3.js',
    'home-hierarchy-v5.js',
    'home-command-v6.js',
    'polish-v7.js',
    'task-home-sync-v9.js'
  ];

  // ---- Styles --------------------------------------------------
  function refreshStyles() {
    // Version the base stylesheet link that index.html declares.
    document.querySelectorAll('link[rel="stylesheet"]').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf('styles.css') !== -1) {
        link.setAttribute('href', 'styles.css?v=' + APP_VERSION);
      }
    });

    // Inject the rest of the set if absent.
    STYLESHEET_SET.forEach(function (file) {
      if (file === 'styles.css') return; // already handled above
      if (!document.querySelector('link[href^="' + file + '"]')) {
        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = file + '?v=' + APP_VERSION;
        document.head.appendChild(link);
      }
    });
  }

  // ---- Scripts ------------------------------------------------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(script);
    });
  }

  function loadScripts() {
    return SCRIPT_LOAD_ORDER.reduce(function (chain, src) {
      return chain.then(function () { return loadScript(src + '?v=' + APP_VERSION); });
    }, Promise.resolve());
  }

  // ---- Boot ---------------------------------------------------
  function boot() {
    refreshStyles();
    loadScripts()
      .catch(function (err) { console.error('Cramchy startup failed.', err); });
  }

  // Expose the version for diagnostics / CI checks.
  window.__CRAMCHY_APP_VERSION__ = APP_VERSION;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
