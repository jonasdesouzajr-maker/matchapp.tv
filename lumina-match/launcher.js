/* Lumina Match — opt-in browser-only launcher. Android, Kids and AdSense untouched. */
(function () {
  'use strict';
  function nativeShell() {
    var ua = navigator.userAgent || '';
    return /MatchAppTVAndroid|MatchAppAiAndroid|MatchAppAiKidsAndroid|;\s*wv[;) ]|\bwv\b/i.test(ua) ||
      document.documentElement.classList.contains('matchapp-android') ||
      Boolean(window.MatchAppAndroid || window.MatchAppNativeBridge || window.AndroidBridge);
  }
  if (nativeShell()) return;

  var labels = {
    en: ['Play Lumina Match', 'Close game', 'A memory game inside MatchApp Ai', 'Unable to load the game. Please try again.'],
    'pt-BR': ['Jogar Lumina Match', 'Fechar jogo', 'Um jogo da memória no MatchApp Ai', 'Não foi possível carregar o jogo. Tente novamente.'],
    es: ['Jugar Lumina Match', 'Cerrar juego', 'Un juego de memoria en MatchApp Ai', 'No se pudo cargar el juego. Inténtalo de nuevo.'],
    fr: ['Jouer à Lumina Match', 'Fermer le jeu', 'Un jeu de mémoire dans MatchApp Ai', 'Chargement impossible. Réessayez.'],
    de: ['Lumina Match spielen', 'Spiel schließen', 'Ein Gedächtnisspiel in MatchApp Ai', 'Spiel konnte nicht geladen werden. Bitte erneut versuchen.'],
    it: ['Gioca a Lumina Match', 'Chiudi il gioco', 'Un gioco di memoria in MatchApp Ai', 'Impossibile caricare il gioco. Riprova.'],
    tr: ['Lumina Match oyna', 'Oyunu kapat', 'MatchApp Ai içinde bir hafıza oyunu', 'Oyun yüklenemedi. Tekrar deneyin.'],
    ru: ['Играть в Lumina Match', 'Закрыть игру', 'Игра на память в MatchApp Ai', 'Не удалось загрузить игру. Попробуйте снова.'],
    ar: ['العب Lumina Match', 'إغلاق اللعبة', 'لعبة ذاكرة داخل MatchApp Ai', 'تعذر تحميل اللعبة. حاول مرة أخرى.'],
    hi: ['Lumina Match खेलें', 'गेम बंद करें', 'MatchApp Ai में मेमोरी गेम', 'गेम लोड नहीं हुआ। फिर से कोशिश करें।'],
    id: ['Main Lumina Match', 'Tutup game', 'Game memori di MatchApp Ai', 'Game gagal dimuat. Coba lagi.'],
    ja: ['Lumina Match をプレイ', 'ゲームを閉じる', 'MatchApp Ai の記憶ゲーム', 'ゲームを読み込めませんでした。もう一度お試しください。'],
    ko: ['Lumina Match 플레이', '게임 닫기', 'MatchApp Ai의 기억력 게임', '게임을 불러오지 못했습니다. 다시 시도하세요.'],
    zh: ['玩 Lumina Match', '关闭游戏', 'MatchApp Ai 内的记忆游戏', '无法加载游戏，请重试。']
  };
  function language() {
    var selected = String(window.MATCH_LANG || document.querySelector('#lang-switcher-host select')?.value ||
      document.documentElement.lang || 'en').toLowerCase();
    if (selected.startsWith('pt')) return 'pt-BR';
    return selected.split('-')[0];
  }
  function copy() { return labels[language()] || labels.en; }

  function start() {
    var hero = document.querySelector('main .home-hero');
    if (!hero || nativeShell() || document.getElementById('lm-launch')) return;
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'lm-launch';
    trigger.className = 'lm-launch';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'lm-dialog');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 8h9a5.5 5.5 0 0 1 5.2 4l1 4a2.6 2.6 0 0 1-4.1 2.8L16 17H8l-2.6 1.8A2.6 2.6 0 0 1 1.3 16l1-4a5.5 5.5 0 0 1 5.2-4Z"/><path d="M7 11v5M4.5 13.5h5M16.5 12h.01M19 14h.01"/></svg><span class="ma-luxe-text"></span>';
    var tray = document.createElement('div');
    tray.id = 'lm-launch-grid';
    tray.className = 'lm-launch-grid';
    tray.setAttribute('data-ma-pill-exclude', '');
    tray.appendChild(trigger);
    hero.insertAdjacentElement('afterend', tray);

    var retryLabels = {en:'Try again','pt-BR':'Tentar novamente',es:'Reintentar',fr:'Réessayer',de:'Erneut versuchen',it:'Riprova',tr:'Tekrar dene',ru:'Попробовать снова',ar:'حاول مرة أخرى',hi:'फिर कोशिश करें',id:'Coba lagi',ja:'再試行',ko:'다시 시도',zh:'重试'};
    var root = null;
    var disposeGame = null;
    var closing = false;
    var previousFocus = null;
    var previousScroll = null;
    var previousScrollPriority = '';
    var loadSequence = 0;
    var retryCount = 0;
    var registration = null;
    var ignoredCloseEvents = 0;

    function translate() {
      var t = copy();
      trigger.querySelector('.ma-luxe-text').textContent = t[0];
      trigger.setAttribute('aria-label', t[0]);
      trigger.title = t[0];
      if (!root) return;
      root.dir = language() === 'ar' ? 'rtl' : 'ltr';
      root.querySelector('#lm-close').setAttribute('aria-label', t[1]);
      root.querySelector('#lm-close').title = t[1];
      root.querySelector('#lm-description').textContent = t[2];
      var error = root.querySelector('.lm-error-copy');
      var retry = root.querySelector('.lm-retry');
      if (error) error.textContent = t[3];
      if (retry) retry.textContent = retryLabels[language()] || retryLabels.en;
    }
    translate();
    document.addEventListener('matchapp:langchange', translate);
    window.addEventListener('languagechange', translate);
    document.addEventListener('change', function(e) {
      if (e.target?.closest?.('#lang-switcher-host')) queueMicrotask(translate);
    });
    new MutationObserver(translate).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});

    // One small invitation when the pill first comes into view; no recurring timer.
    if (typeof IntersectionObserver === 'function') {
      var notice = new IntersectionObserver(function(entries) {
        if (entries.some(function(entry) { return entry.isIntersecting; })) {
          trigger.classList.add('lm-notice');
          notice.disconnect();
        }
      }, {threshold:0.4});
      notice.observe(trigger);
    } else trigger.classList.add('lm-notice');

    function dispose() {
      var cleanup = disposeGame;
      disposeGame = null;
      if (typeof cleanup === 'function') cleanup();
    }
    function restorePageScroll() {
      document.body.classList.remove('lm-game-open');
      if (previousScroll) document.body.style.setProperty('overflow',previousScroll,previousScrollPriority);
      else document.body.style.removeProperty('overflow');
    }
    function close() {
      if (!root || closing) return;
      closing = true;
      var currentRoot = root;
      root = null;
      registration?.observer.disconnect(); clearTimeout(registration?.timer); registration = null;
      ++loadSequence; // An earlier import must never mount into a later opening.
      try { dispose(); } finally {
        if (typeof currentRoot.close === 'function' && currentRoot.open) currentRoot.close();
        currentRoot.remove();
        restorePageScroll();
        previousScroll = null;
        trigger.setAttribute('aria-expanded', 'false');
        (previousFocus?.isConnected ? previousFocus : trigger).focus({preventScroll:true});
        closing = false;
      }
    }
    function revealGame(opening) {
      if (root !== opening) return;
      document.body.classList.add('lm-game-open'); document.body.style.overflow = 'hidden';
      if (!opening.open) {
        if (typeof opening.showModal === 'function') opening.showModal(); else opening.setAttribute('open','');
      }
      trigger.setAttribute('aria-expanded','true');
      opening.querySelector('#lm-close').focus({preventScroll:true});
    }
    function registered() {
      if (!registration || root !== registration.opening) return;
      registration.observer.disconnect(); clearTimeout(registration.timer); registration = null;
      window.closeAuthModal?.(); revealGame(root);
    }
    function accountUIClosed(pending) {
      if (registration !== pending || pending.checking) return;
      pending.checking = true;
      // Successful password/passkey sign-in also closes the auth UI before
      // progress finishes loading. Keep a reachable Close while verifying
      // the current session, rather than treating that hide as cancellation.
      revealGame(pending.opening);
      pending.timer = setTimeout(function () { if (registration === pending) close(); },14000);
      Promise.resolve().then(function () { return window.supabaseClient?.auth?.getSession?.(); }).then(function (result) {
        if (registration !== pending) return;
        clearTimeout(pending.timer); pending.timer = null;
        var user = result?.data?.session?.user;
        if (result?.error || !user || user.is_anonymous || typeof user.id !== 'string' || !user.id) close();
        // A verified account keeps the same frame while its guarded bridge
        // loads or retries the account save. Only that bridge marks it saved.
      }).catch(function () { if (registration === pending) close(); });
    }
    function register() {
      if (!root || registration) return;
      var auth = document.getElementById('main-auth-modal');
      if (!auth || typeof window.openAuthModal !== 'function' || typeof window.switchAuthTab !== 'function') {
        close(); location.assign('/?openAuth=1'); return;
      }
      var opening = root;
      var observer = new MutationObserver(function () {
        if (registration?.opening === opening && (auth.style.display === 'none' || auth.hidden)) accountUIClosed(registration);
      });
      registration = {opening:opening,observer:observer,timer:null,checking:false};
      opening.setAttribute('data-lumina-registration','');
      // Keep the open guest attempt only in memory while the existing account
      // UI is visible. Canceling registration disposes it and returns to Home.
      if (typeof opening.close === 'function' && opening.open) { ignoredCloseEvents++; opening.close(); }
      else opening.removeAttribute('open');
      restorePageScroll(); trigger.setAttribute('aria-expanded','false');
      observer.observe(auth,{attributes:true,attributeFilter:['style','hidden']});
      window.openAuthModal(); window.switchAuthTab('signup');
      auth.querySelector('#reg-email')?.focus({preventScroll:true});
    }
    function trap(e) {
      if (!root) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var controls = Array.from(root.querySelectorAll('button:not([disabled]),iframe,[href],select,[tabindex="0"]')).filter(function(el){return el.getClientRects().length>0;});
      if (!controls.length) return;
      var first = controls[0], last = controls[controls.length - 1];
      // The native modal also contains focus while keys originate inside the game frame.
      if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
      else if (!e.shiftKey && document.activeElement === last && last.tagName !== 'IFRAME') {e.preventDefault();first.focus();}
    }
    function showError(opening, sequence) {
      if (root !== opening || sequence !== loadSequence) return;
      dispose();
      var stage = opening.querySelector('#lm-stage');
      stage.replaceChildren();
      var error = document.createElement('div');
      error.className = 'lm-error';
      var text = document.createElement('p');
      text.className = 'lm-error-copy';
      text.setAttribute('role','alert');
      var retry = document.createElement('button');
      retry.className = 'lm-retry';
      retry.type = 'button';
      retry.addEventListener('click',function() { retryCount++; load(opening); });
      error.append(text,retry);
      stage.append(error);
      translate();
    }
    async function load(opening) {
      var sequence = ++loadSequence;
      var stage = opening.querySelector('#lm-stage');
      dispose();
      stage.innerHTML = '<p class="lm-loading" role="status">✦ Lumina Match</p>';
      try {
        var mod = await import('/lumina-match/game.mjs?v=20261029-1' + (retryCount ? '&retry=' + retryCount : ''));
        if (root !== opening || sequence !== loadSequence) return;
        disposeGame = mod.mountGame(stage, {
          language:language,
          close:close,
          register:function() { if (root === opening && sequence === loadSequence) register(); },
          onRegistered:function() { if (root === opening && sequence === loadSequence) registered(); },
          onError:function() { showError(opening,sequence); }
        });
      } catch(err) {
        console.error('Lumina Match web game failed to start',err);
        showError(opening,sequence);
      }
    }
    trigger.addEventListener('click',function() {
      if (root || nativeShell()) return;
      previousFocus = document.activeElement;
      previousScroll = document.body.style.getPropertyValue('overflow');
      previousScrollPriority = document.body.style.getPropertyPriority('overflow');
      root = document.createElement('dialog');
      root.id = 'lm-dialog';
      root.className = 'lm-overlay';
      root.setAttribute('data-ma-pill-exclude','');
      root.setAttribute('aria-labelledby','lm-title');
      root.setAttribute('aria-describedby','lm-description');
      root.setAttribute('aria-modal','true');
      root.innerHTML = '<section class="lm-shell"><div class="lm-framebar"><span id="lm-title">✦ Lumina Match</span><span class="lm-source">MatchApp Ai</span><button type="button" id="lm-close" class="lm-icon-btn">×</button></div><p id="lm-description" class="lm-visually-hidden"></p><div id="lm-stage" class="lm-stage" aria-live="off"></div></section>';
      var opening = root;
      document.body.append(opening);
      document.body.classList.add('lm-game-open');
      document.body.style.overflow = 'hidden';
      opening.querySelector('#lm-close').addEventListener('click',close);
      opening.addEventListener('keydown',trap);
      opening.addEventListener('cancel',function(e) {e.preventDefault();if(root === opening)close();});
      opening.addEventListener('close',function() {
        if (ignoredCloseEvents) { ignoredCloseEvents--; return; }
        if(root === opening)close();
      });
      translate();
      if (typeof opening.showModal === 'function') opening.showModal();
      else { opening.setAttribute('open',''); opening.setAttribute('role','dialog'); }
      trigger.setAttribute('aria-expanded','true');
      opening.querySelector('#lm-close').focus({preventScroll:true});
      load(opening);
    });
    var invitation = new URLSearchParams(location.search).get('lumina');
    if (invitation && /^[a-zA-Z0-9_-]{8,64}$/.test(invitation)) trigger.click();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
