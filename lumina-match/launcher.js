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
    if (!hero || document.getElementById('lm-launch')) return;
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'lm-launch';
    trigger.className = 'lm-launch';
    trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 8h9a5.5 5.5 0 0 1 5.2 4l1 4a2.6 2.6 0 0 1-4.1 2.8L16 17H8l-2.6 1.8A2.6 2.6 0 0 1 1.3 16l1-4a5.5 5.5 0 0 1 5.2-4Z"/><path d="M7 11v5M4.5 13.5h5M16.5 12h.01M19 14h.01"/></svg><span class="ma-luxe-text"></span>';
    var tray = document.createElement('div');
    tray.id = 'lm-launch-grid';
    tray.className = 'lm-launch-grid';
    tray.setAttribute('aria-label', 'Lumina Match');
    tray.appendChild(trigger);
    hero.insertAdjacentElement('afterend', tray);

    function translate() {
      var t = copy();
      trigger.querySelector('.ma-luxe-text').textContent = t[0];
      trigger.setAttribute('aria-label', t[0]);
      trigger.title = t[0];
      var close = document.querySelector('#lm-close');
      if (close) close.setAttribute('aria-label', t[1]);
    }
    translate();
    window.addEventListener('matchapp:languagechange', translate);
    window.addEventListener('languagechange', translate);
    document.addEventListener('change', function(e) {
      if (e.target?.closest?.('#lang-switcher-host')) queueMicrotask(translate);
    });
    new MutationObserver(translate).observe(document.documentElement, {attributes:true,attributeFilter:['lang']});

    var root = null;
    var disposeGame = null;
    var closing = false;
    var previousFocus = null;
    var previousScroll = null;
    function close() {
      if (!root || closing) return;
      closing = true;
      try { if (typeof disposeGame === 'function') disposeGame(); } finally {
        disposeGame = null;
        root.remove();
        root = null;
        document.body.classList.remove('lm-game-open');
        document.body.style.overflow = previousScroll === null ? '' : previousScroll;
        previousScroll = null;
        (previousFocus?.isConnected ? previousFocus : trigger).focus({preventScroll:true});
        closing = false;
      }
    }
    function trap(e) {
      if (!root) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var controls = Array.from(root.querySelectorAll('button:not([disabled]),[href],select,[tabindex="0"]')).filter(function(el){return el.getClientRects().length>0;});
      if (!controls.length) return;
      var first = controls[0], last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) {e.preventDefault();last.focus();}
      else if (!e.shiftKey && document.activeElement === last) {e.preventDefault();first.focus();}
    }
    trigger.addEventListener('click', async function() {
      if (root) return;
      previousFocus = document.activeElement;
      previousScroll = document.body.style.overflow;
      root = document.createElement('div');
      root.className = 'lm-overlay';
      root.innerHTML = '<section class="lm-shell" role="dialog" aria-modal="true" aria-labelledby="lm-title"><header class="lm-framebar"><span id="lm-title">✦ Lumina Match</span><span class="lm-source">MatchApp Ai</span><button type="button" id="lm-close" class="lm-icon-btn" aria-label="Close game">×</button></header><div id="lm-stage" class="lm-stage" aria-live="off"><p class="lm-loading" role="status">✦ Lumina Match</p></div></section>';
      document.body.append(root);
      document.body.classList.add('lm-game-open');
      document.body.style.overflow = 'hidden';
      root.querySelector('#lm-close').addEventListener('click', close);
      root.addEventListener('keydown', trap);
      translate();
      root.querySelector('#lm-close').focus({preventScroll:true});
      try {
        var mod = await import('/lumina-match/game.mjs?v=20261027-1');
        if (!root) return;
        disposeGame = mod.mountGame(root.querySelector('#lm-stage'), {language:language,close:close});
      } catch(err) {
        console.error('Lumina Match web game failed to start',err);
        if (root) {
          root.querySelector('#lm-stage').textContent = copy()[3];
          root.querySelector('#lm-close').focus({preventScroll:true});
        }
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();