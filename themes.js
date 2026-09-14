/* Appearance is a preference only. Preview never writes account/device data. */
(function () {
  'use strict';
  window.MATCHAPP_ASSET_ERRORS=[];
  window.addEventListener('error',event=>{
    const resource=event.target?.src||event.target?.href||event.filename;
    if(resource&&(event.filename||event.target?.tagName==='SCRIPT'||event.target?.rel==='stylesheet'))try{if(new URL(resource,location.href).origin===location.origin)window.MATCHAPP_ASSET_ERRORS.push(resource);}catch(_){}
  },true);
  const themes = ['aurora','cinema','ocean','sunrise','arcade'];
  const root = document.documentElement;
  let preview = null;
  function saved() {
    try { const id = JSON.parse(localStorage.getItem('match_settings') || '{}').theme; return themes.includes(id) ? id : 'aurora'; } catch (_) { return 'aurora'; }
  }
  function apply(id) { root.dataset.theme = themes.includes(id) ? id : 'aurora'; }
  apply(saved());
  window.MatchThemes = {
    ids: themes.slice(),
    preview(id) { if (!themes.includes(id)) return; preview = id; apply(id); paint(); },
    cancel() { preview = null; apply(window.MatchSettings?.get('theme') || saved()); paint(); },
    save() { const id = preview || root.dataset.theme; if (!window.MatchSettings) return; window.MatchSettings.set('theme', id); preview = null; paint(); },
    current() { return {saved: window.MatchSettings?.get('theme') || saved(), preview}; }
  };
  function text(key) { return window.t ? window.t(key) : key; }
  function paint() {
    document.querySelectorAll('[data-theme-choice]').forEach(b => {
      b.setAttribute('aria-pressed', String(b.dataset.themeChoice === root.dataset.theme));
      b.querySelector('strong').textContent = text('theme.' + b.dataset.themeChoice);
      b.querySelector('small').textContent = text('theme.' + b.dataset.themeChoice + 'Desc');
    });
    const status = document.getElementById('theme-preview-status');
    if (status) status.textContent = text(preview ? 'theme.previewing' : 'theme.saved');
  }
  function init() {
    document.querySelectorAll('[data-theme-choice]').forEach(b => b.addEventListener('click', () => window.MatchThemes.preview(b.dataset.themeChoice)));
    document.querySelector('[data-theme-save]')?.addEventListener('click', () => window.MatchThemes.save());
    document.querySelector('[data-theme-cancel]')?.addEventListener('click', () => window.MatchThemes.cancel());
    paint();
  }
  document.addEventListener('matchapp:settingschanged', () => { if (!preview) apply(window.MatchSettings?.get('theme') || saved()); paint(); });
  document.addEventListener('matchapp:langchange', paint);
  window.addEventListener('pagehide', () => { preview = null; });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
