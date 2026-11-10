(function () {
  if (window.__stellarThemeToggleMounted) return;
  window.__stellarThemeToggleMounted = true;

  var ICONS = {
    light: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/></svg>',
    dark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.2A8.3 8.3 0 0 1 9.8 3.6a8.3 8.3 0 1 0 10.6 10.6z"/></svg>',
    auto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/></svg>'
  };
  var LABEL = { light: '当前亮色', dark: '当前暗色', auto: '当前跟随系统' };

  var css = document.createElement('style');
  css.textContent = '.stellar-theme-toggle{position:fixed;top:14px;right:18px;z-index:60;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid var(--bg-a20);background:var(--card);color:var(--text-p1);box-shadow:0 2px 10px rgba(0,0,0,.10);cursor:pointer;opacity:.72;transition:opacity .2s,transform .2s}.stellar-theme-toggle:hover{opacity:1;transform:scale(1.07)}.stellar-theme-toggle svg{width:20px;height:20px}@media (max-width:720px){.stellar-theme-toggle{top:auto;bottom:84px;right:14px;width:42px;height:42px;box-shadow:0 2px 12px rgba(0,0,0,.18)}}';
  document.head.appendChild(css);

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'stellar-theme-toggle';
  btn.setAttribute('aria-label', '切换明暗模式');
  document.body.appendChild(btn);

  function mode() { return document.documentElement.getAttribute('data-theme') || 'auto'; }
  function render(m) { btn.innerHTML = ICONS[m] || ICONS.auto; btn.title = '切换明暗模式 - ' + (LABEL[m] || ''); }
  btn.addEventListener('click', function () {
    var m = mode();
    var next = m === 'light' ? 'dark' : m === 'dark' ? 'auto' : 'light';
    if (typeof window.setColorScheme === 'function') window.setColorScheme(next); else render(next);
  });
  document.addEventListener('stellar:color-scheme-change', function (e) { render((e.detail && e.detail.mode) || mode()); });
  render(mode());
})();