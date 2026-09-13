/* A PWA loads releases from the website. Update applies the new web release;
   it does not claim to install a native App Store package. No push subscription. */
(function () {
  'use strict';
  const SEEN = 'match_release_seen';
  let release = null, checking = false, dismissedVersion = null;
  const buttonState = new WeakMap();
  const strings = {
    en:{update:'Update app',ready:'A new MatchApp update is ready',new:'What’s new in MatchApp',later:'Later',done:'Got it',applying:'Updating…',retry:'Update could not be loaded. Please try again.',fresh:'The latest features are ready.',reload:'This reloads the app. Finish any unsaved changes first.'},
    'pt-BR':{update:'Atualizar app',ready:'Uma atualização do MatchApp está pronta',new:'Novidades no MatchApp',later:'Depois',done:'Entendi',applying:'Atualizando…',retry:'Não foi possível atualizar. Tente novamente.',fresh:'Os novos recursos estão prontos.',reload:'Isso recarrega o app. Conclua alterações não salvas primeiro.'},
    es:{update:'Actualizar app',ready:'Hay una actualización de MatchApp',new:'Novedades de MatchApp',later:'Más tarde',done:'Entendido',applying:'Actualizando…',retry:'No se pudo actualizar. Intenta de nuevo.',fresh:'Las nuevas funciones están listas.',reload:'Se recargará la app. Termina los cambios sin guardar primero.'}
  };
  const lang = () => window.MATCH_LANG || document.documentElement.lang || 'en';
  const tr = k => (strings[lang()] || strings.en)[k];
  const stored = () => { try { return localStorage.getItem(SEEN); } catch (_) { return null; } };
  const markSeen = () => { try { localStorage.setItem(SEEN, release.version); } catch (_) {} };
  const installed = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  function syncButtons() {
    document.querySelectorAll('.install-btn').forEach(button => {
      if (!buttonState.has(button)) buttonState.set(button, {html:button.innerHTML, display:button.style.display, aria:button.getAttribute('aria-label')});
      if (window.matchAppUpdatePending) { button.style.display = 'inline-flex'; button.textContent = tr('update'); button.setAttribute('aria-label',tr('update')); }
    });
  }
  function notice(pending) {
    let panel = document.getElementById('app-release-notice');
    if (!panel) {
      panel = document.createElement('aside'); panel.id = 'app-release-notice'; panel.setAttribute('aria-labelledby','app-release-heading'); panel.className = 'app-release-notice';
      panel.innerHTML = '<h2 id="app-release-heading" role="status" aria-live="polite"></h2><p class="app-release-notes"></p><p class="app-release-hint"></p><div><button type="button" class="app-release-apply"></button><button type="button" class="app-release-dismiss"></button></div>';
      document.body.append(panel);
    }
    panel.hidden = false;
    panel.querySelector('h2').textContent = tr(pending ? 'ready' : 'new');
    panel.querySelector('.app-release-notes').textContent = release.notes[lang()] || release.notes.en;
    panel.querySelector('.app-release-hint').textContent = tr(pending ? 'reload' : 'fresh');
    const apply = panel.querySelector('.app-release-apply'); apply.hidden = !pending; apply.textContent = tr('update'); apply.onclick = window.updateMatchApp;
    const dismiss = panel.querySelector('.app-release-dismiss'); dismiss.textContent = tr(pending ? 'later' : 'done'); dismiss.onclick = () => { panel.hidden = true; dismissedVersion = release.version; if (!pending) markSeen(); };
  }
  window.checkMatchAppRelease = async function () {
    if (checking || document.hidden || !window.MATCHAPP_BUILD) return;
    checking = true;
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(),8000);
    try {
      const response = await fetch('/release.json', {cache:'no-store',signal:controller.signal}); if (!response.ok) return;
      const next = await response.json();
      if (!/^\d{4}\.\d{2}\.\d{2}\.\d+$/.test(next.version || '') || !next.notes?.en || typeof next.functional !== 'boolean') return;
      // Never roll backwards if a deployment is still propagating.
      const compare = (a,b) => { const x=a.split('.').map(Number),y=b.split('.').map(Number); for(let i=0;i<4;i++)if(x[i]!==y[i])return x[i]-y[i];return 0; };
      if (compare(next.version,window.MATCHAPP_BUILD) < 0) return;
      if (release && compare(next.version,release.version) < 0) return;
      release = next;
      const pending = compare(release.version,window.MATCHAPP_BUILD) > 0;
      window.matchAppUpdatePending = pending ? release : null;
      syncButtons();
      if (release.functional && dismissedVersion !== release.version && stored() !== release.version && (installed() || pending)) notice(pending);
    } catch (_) { /* offline: keep the current release and all sign-in methods usable */ }
    finally { clearTimeout(timer); checking = false; }
  };
  window.updateMatchApp = async function () {
    if (!window.matchAppUpdatePending) return;
    const buttons = [...document.querySelectorAll('.install-btn,.app-release-apply')]; buttons.forEach(b => {b.disabled=true;b.textContent=tr('applying');});
    try {
      // Verify that the HTML and release are reachable before replacing the view.
      const controller = new AbortController(), timer = setTimeout(() => controller.abort(),12000);
      let response;
      try { response = await fetch(location.pathname || '/', {cache:'reload',signal:controller.signal}); }
      finally { clearTimeout(timer); }
      if (!response.ok) throw new Error('Release unavailable');
      if ('serviceWorker' in navigator) { try { const reg = await navigator.serviceWorker.getRegistration(); if(reg) await reg.update(); } catch (_) {} }
      const url = new URL(location.href); url.searchParams.set('appUpdate', release.version); location.replace(url.href);
    } catch (_) {
      const hint = document.querySelector('.app-release-hint'); if (hint) hint.textContent = tr('retry');
      buttons.forEach(b => {b.disabled=false;b.textContent=tr('update');});
    }
  };
  function boot() {
    window.checkMatchAppRelease();
    // One fetch every fifteen minutes while visible; immediate check on resume.
    setInterval(window.checkMatchAppRelease,15*60*1000);
    window.addEventListener('online',window.checkMatchAppRelease);
    window.addEventListener('appinstalled', () => { if(release) markSeen(); });
    document.addEventListener('visibilitychange', () => {if(!document.hidden)window.checkMatchAppRelease();});
    document.addEventListener('matchapp:langchange', () => {syncButtons();if(release && document.getElementById('app-release-notice')?.hidden===false)notice(!!window.matchAppUpdatePending);});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot);else boot();
})();
