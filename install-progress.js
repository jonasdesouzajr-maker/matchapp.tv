/* One-tap install meter. Bar follows real install phases, not fake bytes. */
(function () {
  'use strict';
  if (window.__maInstallMeter) return;
  window.__maInstallMeter = true;

  let target = 0;
  let shown = 0;
  let raf = 0;
  let holdTimer = 0;
  let doneTimer = 0;
  let phase = 'idle';

  function pt() {
    return String(document.documentElement.lang || navigator.language || '').toLowerCase().indexOf('pt') === 0;
  }
  function appName() {
    return window.MATCHAPP_INSTALL_NAME || (pt() ? 'MatchApp iA' : 'MatchApp Ai');
  }
  function copy() {
    const name = appName();
    if (pt()) {
      return {
        title: 'Instalando ' + name,
        wait: 'Confirme na próxima tela do seu dispositivo.',
        work: 'Adicionando à tela inicial…',
        done: name + ' está na sua tela inicial.',
        close: 'Pronto'
      };
    }
    return {
      title: 'Installing ' + name,
      wait: 'Confirm on the next screen on your device.',
      work: 'Adding to your home screen…',
      done: name + ' is on your home screen.',
      close: 'Done'
    };
  }

  function ensureStyle() {
    if (document.getElementById('ma-install-meter-css')) return;
    const s = document.createElement('style');
    s.id = 'ma-install-meter-css';
    s.textContent = [
      '#ma-install-meter{position:fixed;inset:0;z-index:5000;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(8,6,18,.72)}',
      '#ma-install-meter[hidden]{display:none!important}',
      '#ma-install-meter .ma-im-card{width:min(100%,340px);padding:22px 20px 18px;border:1px solid rgba(229,193,88,.55);border-radius:20px;background:#120a22;color:#fff;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.45)}',
      '#ma-install-meter img{width:56px;height:56px;border-radius:14px;object-fit:cover;margin:0 auto 12px;display:block}',
      '#ma-install-meter h2{margin:0 0 8px;font:800 18px/1.25 Outfit,system-ui,sans-serif;color:#F3D77A}',
      '#ma-install-meter p{margin:0 0 14px;color:#d9d0e4;font:500 14px/1.45 Outfit,system-ui,sans-serif}',
      '#ma-install-meter .ma-im-track{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}',
      '#ma-install-meter .ma-im-fill{height:100%;width:0;border-radius:999px;background:linear-gradient(90deg,#f3e0a2,#E5C158);transform:translateZ(0)}',
      '#ma-install-meter button{margin-top:16px;min-height:42px;padding:0 18px;border:0;border-radius:12px;background:linear-gradient(180deg,#f3e0a2,#E5C158);color:#1a1328;font:800 14px Outfit,system-ui,sans-serif}',
      '@media(prefers-reduced-motion:reduce){#ma-install-meter .ma-im-fill{transition:none}}'
    ].join('');
    document.head.appendChild(s);
  }

  function panel() {
    let el = document.getElementById('ma-install-meter');
    if (el) return el;
    ensureStyle();
    el = document.createElement('div');
    el.id = 'ma-install-meter';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = '<div class="ma-im-card"><img src="/assets/brand/matchapp-ai-install-192.png?v=20260923-icon4" width="56" height="56" alt=""><h2></h2><p></p><div class="ma-im-track"><div class="ma-im-fill"></div></div><button type="button" hidden></button></div>';
    document.body.appendChild(el);
    el.querySelector('button').addEventListener('click', hide);
    return el;
  }

  function setText(title, body, showDone) {
    const el = panel();
    el.querySelector('h2').textContent = title;
    el.querySelector('p').textContent = body;
    const btn = el.querySelector('button');
    btn.textContent = copy().close;
    btn.hidden = !showDone;
    el.hidden = false;
  }

  function tick() {
    raf = 0;
    const fill = document.querySelector('#ma-install-meter .ma-im-fill');
    if (!fill) return;
    const gap = target - shown;
    shown += gap * 0.12;
    if (Math.abs(gap) < 0.4) shown = target;
    fill.style.width = shown + '%';
    if (shown !== target) raf = requestAnimationFrame(tick);
  }

  function to(n) {
    target = Math.max(0, Math.min(100, n));
    if (!raf) raf = requestAnimationFrame(tick);
  }

  function hide() {
    const el = document.getElementById('ma-install-meter');
    if (el) el.hidden = true;
    phase = 'idle';
    shown = 0;
    target = 0;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    clearTimeout(holdTimer);
    clearTimeout(doneTimer);
  }

  function start() {
    const t = copy();
    phase = 'confirm';
    setText(t.title, t.wait, false);
    shown = 0;
    to(22);
  }

  function accepting() {
    const t = copy();
    phase = 'installing';
    setText(t.title, t.work, false);
    to(62);
    clearTimeout(holdTimer);
    holdTimer = setTimeout(function () { if (phase === 'installing') to(88); }, 900);
  }

  function complete() {
    const t = copy();
    phase = 'done';
    setText(t.done, '', true);
    to(100);
    clearTimeout(doneTimer);
    doneTimer = setTimeout(hide, 3200);
  }

  function cancel() {
    hide();
  }

  window.matchAppInstallProgress = {
    start: start,
    complete: complete,
    cancel: cancel,
    accepting: accepting,
    updating: start,
    downloadReady: accepting,
    installingUpdate: accepting,
    updated: complete
  };

  window.addEventListener('appinstalled', function () {
    complete();
  });
})();
