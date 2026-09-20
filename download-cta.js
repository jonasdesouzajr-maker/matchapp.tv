/* Keep Download / Update visible, show progress, announce big releases. */
(function () {
  'use strict';
  const COPY = {
    en: { down: 'Download the App', upd: 'Update App', done: 'Updated', inst: 'Installing…', apply: 'Updating…' },
    'pt-BR': { down: 'Baixar o app', upd: 'Atualizar app', done: 'Atualizado', inst: 'Instalando…', apply: 'Atualizando…' },
    es: { down: 'Descargar la app', upd: 'Actualizar app', done: 'Actualizada', inst: 'Instalando…', apply: 'Actualizando…' }
  };
  const lang = () => window.MATCH_LANG || document.documentElement.lang || 'en';
  const t = (k) => (COPY[lang()] || COPY[lang().split('-')[0]] || COPY.en)[k];
  function buttons() { return [...document.querySelectorAll('.install-btn')]; }
  function paint() {
    const pending = !!window.matchAppUpdatePending;
    const installed = !!(window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true || !!window.matchAppInstallState?.isInstalled?.();
    buttons().forEach(btn => {
      btn.style.display = 'inline-flex';
      btn.classList.add('install-prominent-v2');
      btn.classList.toggle('has-app-update', pending);
      btn.classList.toggle('is-app-installed', installed && !pending);
      let label = btn.querySelector('.install-label');
      if (!label) { label = document.createElement('span'); label.className = 'install-label'; btn.appendChild(label); }
      label.textContent = pending ? t('upd') : installed ? t('done') : t('down');
      btn.setAttribute('aria-label', label.textContent);
      if (installed && !pending) { btn.style.display = 'none'; }
      document.querySelectorAll('.install-bubble,.install-bubble-v2').forEach(el => { el.style.display = 'none'; });
      if (pending && !btn.querySelector('.install-dot')) {
        const dot = document.createElement('span'); dot.className = 'install-dot'; dot.setAttribute('aria-hidden', 'true'); btn.insertBefore(dot, btn.firstChild);
      }
      if (!pending) btn.querySelector('.install-dot')?.remove();
    });
  }
  function startMeter(kind) {
    const api = window.matchAppInstallProgress;
    if (api?.start) api.start(kind === 'update' ? 'update' : 'install');
    buttons().forEach(btn => { btn.disabled = true; const label = btn.querySelector('.install-label'); if (label) label.textContent = kind === 'update' ? t('apply') : t('inst'); });
  }
  function finishMeter() {
    window.matchAppInstallProgress?.complete?.(t('done'));
    buttons().forEach(btn => { btn.disabled = false; });
    paint();
  }
  document.addEventListener('click', ev => {
    const btn = ev.target.closest?.('.install-btn');
    if (!btn) return;
    startMeter(window.matchAppUpdatePending ? 'update' : 'install');
  }, true);
  window.addEventListener('appinstalled', finishMeter);
  window.addEventListener('matchapp:installstate', paint);
  document.addEventListener('matchapp:langchange', paint);
  function enhanceNotice() {
    const panel = document.getElementById('app-release-notice');
    if (!panel || panel.querySelector('.app-release-x')) return;
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'app-release-x'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
    x.addEventListener('click', () => { panel.hidden = true; panel.querySelector('.app-release-dismiss')?.click(); });
    panel.style.position = 'fixed'; panel.prepend(x);
  }
  async function forceWhatsNew() {
    try {
      const res = await fetch('/release.json', { cache: 'no-store' });
      if (!res.ok) return;
      const release = await res.json();
      if (!release?.functional || !release.notes) return;
      let seen = ''; try { seen = localStorage.getItem('match_release_seen') || ''; } catch (_) {}
      if (seen === release.version) return;
      if (typeof window.checkMatchAppRelease === 'function') await window.checkMatchAppRelease();
      let panel = document.getElementById('app-release-notice');
      if (!panel) {
        panel = document.createElement('aside');
        panel.id = 'app-release-notice'; panel.className = 'app-release-notice';
        const note = release.notes[lang()] || release.notes.en;
        panel.innerHTML = '<h2>' + (lang().startsWith('pt') ? 'Novidades no MatchApp' : "What's new in MatchApp") + '</h2><p class="app-release-notes"></p><button type="button" class="app-release-dismiss">OK</button>';
        panel.querySelector('.app-release-notes').textContent = note;
        panel.querySelector('.app-release-dismiss').onclick = () => { panel.hidden = true; try { localStorage.setItem('match_release_seen', release.version); } catch (_) {} };
        document.body.append(panel);
      }
      panel.hidden = false; enhanceNotice();
    } catch (_) {}
  }
  function overlaysClear() {
    try { if (!localStorage.getItem('match_cookie_choice') && document.querySelector('.ma-cookie')) return false; } catch (_) {}
    return !document.documentElement.classList.contains('matchapp-tour-active');
  }
  function boot() { paint(); enhanceNotice(); setTimeout(() => { if (overlaysClear()) forceWhatsNew(); else setTimeout(forceWhatsNew, 8000); }, 2400); setInterval(paint, 8000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
