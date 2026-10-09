// Runs blocking in <head>, before first paint. External file (not inline)
// because the CSP is script-src 'self'. Keep in sync with src/lib/theme.js.
(function () {
  var mode = 'system';
  try {
    var saved = localStorage.getItem('maia.theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') mode = saved;
  } catch (e) {
    // storage blocked: fall through to system
  }
  var dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  var root = document.documentElement;
  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-accent', 'neutral');
})();
