/* Adapted from Jonas's LuminaMatch_Browser.zip. Six-pair solo and same-screen friends rounds. */
(function () {
  'use strict';
  var art = ['moon','star','planet','heart','crystal','butterfly','orb','sun'];
  var app = document.getElementById('app');
  var language = new URLSearchParams(location.search).get('lang') || 'en';
  document.documentElement.classList.toggle('reduce-motion', new URLSearchParams(location.search).get('reducedMotion') === '1');
  var screen = 'home', cards = [], flipped = [], matches = 0, moves = 0;
  var busy = false, multi = false, player = 1, scores = [0, 0];
  var timer = null, round = 0, storageAvailable = true;
  var embedded = window.parent !== window;
  var saveMode = embedded ? 'loading' : 'guest', progressOwner = embedded ? null : 'guest';
  function readNumber(key) {
    try {
      var value = Number(localStorage.getItem(key));
      return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 1000000000) : 0;
    } catch (_) { storageAvailable = false; return 0; }
  }
  var points = 0, rounds = 0;
  function validRound(value) {
    if (!value || !Number.isSafeInteger(value.moves) || value.moves < 0 || value.moves > 1000000 ||
        !Array.isArray(value.cards) || value.cards.length !== 12) return null;
    var pairs = new Map();
    for (var card of value.cards) {
      if (!card || !art.includes(card.art) || typeof card.matched !== 'boolean') return null;
      var pair = pairs.get(card.art) || []; pair.push(card.matched); pairs.set(card.art,pair);
    }
    if (pairs.size !== 6 || Array.from(pairs.values()).some(function (pair) { return pair.length !== 2 || pair[0] !== pair[1]; })) return null;
    if (value.cards.every(function (card) { return card.matched; })) return null;
    return {cards:value.cards.map(function (card) { return {art:card.art,matched:card.matched}; }),moves:value.moves};
  }
  function guestRound() {
    try { return validRound(JSON.parse(localStorage.getItem('luminaBrowserRound'))); }
    catch (_) { return null; }
  }
  function guestProgress() {
    try {
      var value = JSON.parse(localStorage.getItem('luminaBrowserProgress'));
      if (value && Number.isSafeInteger(value.points) && value.points >= 0 && value.points <= 1000000000 &&
          Number.isSafeInteger(value.rounds) && value.rounds >= 0 && value.rounds <= 1000000000 &&
          (value.activeRound === null || validRound(value.activeRound))) {
        return {points:value.points,rounds:value.rounds,activeRound:validRound(value.activeRound)};
      }
    } catch (_) { /* Legacy saves remain readable when no canonical snapshot exists. */ }
    return {points:readNumber('luminaPoints'),rounds:readNumber('luminaBrowserRounds'),activeRound:guestRound()};
  }
  var initialGuest = guestProgress();
  points = initialGuest.points; rounds = initialGuest.rounds;
  var soloResume = initialGuest.activeRound;
  function snapshot() {
    var active = screen === 'game' && !multi && matches < 6 ? {
      cards:cards.map(function (card) { return {art:card.art,matched:card.matched}; }),moves:moves
    } : soloResume;
    return {points:points,rounds:rounds,activeRound:validRound(active)};
  }
  window.LuminaGameProgress = Object.freeze({snapshot:snapshot});
  function save() {
    var progress = snapshot(); soloResume = progress.activeRound;
    if (progressOwner === 'account') {
      window.parent.postMessage({type:'lumina:progress-change',progress:progress}, location.origin);
      return;
    }
    if (progressOwner !== 'guest') return;
    try {
      // One atomic snapshot prevents a full browser storage area from saving
      // new points alongside an old unfinished round and awarding it twice.
      localStorage.setItem('luminaBrowserProgress', JSON.stringify(progress));
    } catch (_) { storageAvailable = false; updateProgress(); return; }
    try {
      // Compatibility counters never take precedence over the snapshot above.
      localStorage.setItem('luminaPoints', String(points));
      localStorage.setItem('luminaBrowserRounds', String(rounds));
      localStorage.setItem('luminaBrowserRound', JSON.stringify(soloResume));
    } catch (_) { /* The canonical save has already succeeded. */ }
  }
  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function t(key, values) {
    var text = (window.LuminaMessages[language] || window.LuminaMessages.en)[key];
    return String(text).replace(/\{(\w+)\}/g, function (all, name) {
      return values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : all;
    });
  }
  function label(key, values) { return esc(t(key, values)); }
  function button(action, key, extra) {
    return '<button type="button" class="pill ' + (extra || '') + '" data-action="' + action + '">' + label(key) + '</button>';
  }
  function canPlaySolo() { return progressOwner === 'guest' || progressOwner === 'account' && ['account','saving','saved'].includes(saveMode); }
  function progressNote() {
    var keys = {loading:'saveLoading',guest:storageAvailable ? 'saveGuest' : 'storageNotice',account:'saveAccount',saving:'saveSaving',saved:'saveSaved',offline:progressOwner === 'account' ? 'saveOffline' : 'saveUnavailable',conflict:'saveConflict'};
    return '<div class="save-area"><p class="save-status" role="status" aria-live="polite">' + label(keys[saveMode]) + '</p>' +
      (saveMode === 'offline' || saveMode === 'conflict' ? button('reload-save','reloadSave','secondary compact') : '') +
      (saveMode === 'guest' && embedded ? button('sign-in','signInSave','secondary compact') : '') + '</div>';
  }
  function updateProgress() {
    var area = app.querySelector('.save-area');
    if (area) area.outerHTML = progressNote();
    app.querySelectorAll('[data-action="solo"],[data-action="continue"]').forEach(function (element) { element.disabled = !canPlaySolo(); });
    if (screen === 'game') updateBoard();
  }
  function cancelRound() { round++; clearTimeout(timer); timer = null; flipped = []; busy = false; }
  function shuffle(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = result[i]; result[i] = result[j]; result[j] = tmp;
    }
    return result;
  }
  function render(focus) {
    app.dataset.screen = screen;
    if (screen === 'home') {
      app.innerHTML = '<section class="screen"><h1 tabindex="-1">Lumina</h1><div class="subtitle">MATCH</div>' +
        '<div class="stats">' + label('rounds') + ': ' + rounds + ' · ' + points + ' ' + label('points') + '</div>' +
        (soloResume ? button('continue','continueGame','teal') : '') +
        button('solo',soloResume ? 'newGame' : 'play') + button('friends','friends','friends') + button('help','how','teal') + progressNote() + '</section>';
    } else if (screen === 'help') {
      app.innerHTML = '<section class="screen help"><h1 tabindex="-1">' + label('helpTitle') + '</h1>' +
        '<p>' + label('helpSolo') + '</p><p>' + label('helpFriends') + '</p><p>' + label('saveHelp') + '</p>' +
        button('home','back','teal') + '</section>';
    } else if (screen === 'game') {
      var markup = '<section class="screen"><header class="header">' + button('home','home') +
        '<span>' + label(multi ? 'friendsMatch' : 'solo') + '</span></header>';
      if (multi) {
        markup += '<div class="plates">';
        for (var p = 1; p <= 2; p++) markup += '<div class="plate" data-player="' + p + '">' +
          label('player',{n:p}) + '<br><span class="score">' + scores[p - 1] + '</span></div>';
        markup += '</div>';
      }
      markup += '<p class="game-status" role="status" aria-live="polite"></p><div class="grid" role="group" aria-label="' +
        label(multi ? 'friendsMatch' : 'solo') + '">';
      cards.forEach(function (card, i) {
        markup += '<button type="button" class="card" data-card="' + i + '"><span class="face back" aria-hidden="true"></span>' +
          '<span class="face front" aria-hidden="true" style="background-image:url(card_' + card.art + '.jpg)"></span></button>';
      });
      app.innerHTML = markup + '</div>' + (multi ? '' : progressNote()) + '</section>';
      updateBoard();
    } else if (screen === 'result') {
      var winner = scores[0] > scores[1] ? 1 : 2;
      var title = multi ? (scores[0] === scores[1] ? label('tie') : label('wins',{n:winner})) : label('cleared');
      var result = multi ? label('player',{n:1}) + ': ' + scores[0] + '<br>' + label('player',{n:2}) + ': ' + scores[1] :
        label('earned') + '<br>' + label('roundSummary',{moves:moves,pairs:matches});
      app.innerHTML = '<section class="screen result"><h1 tabindex="-1">' + title + '</h1><div class="result-score">' + result +
        '</div>' + button(multi ? 'localfriends' : 'solo','again') + button('home','home','teal') + (multi ? '' : progressNote()) + '</section>';
    }
    updateProgress();
    if (focus) (app.querySelector('h1') || app.querySelector('button'))?.focus({preventScroll:true});
  }
  function updateBoard() {
    if (screen !== 'game') return;
    app.querySelectorAll('[data-card]').forEach(function (element) {
      var i = Number(element.dataset.card), card = cards[i];
      element.classList.toggle('flipped', card.flipped || card.matched);
      element.classList.toggle('matched', card.matched);
      element.disabled = card.matched || (!multi && !canPlaySolo());
      element.setAttribute('aria-pressed', String(card.flipped || card.matched));
      element.setAttribute('aria-label', t(card.matched ? 'matchedCard' : card.flipped ? 'revealedCard' : 'hiddenCard', {n:i+1,name:t(card.art)}));
    });
    var status = app.querySelector('.game-status');
    status.textContent = multi ? t('turn',{n:player}) : t('moves') + ' ' + moves + ' · ' + t('pairs') + ' ' + matches + '/6';
    app.querySelectorAll('[data-player]').forEach(function (element) {
      var p = Number(element.dataset.player);
      element.classList.toggle('active', p === player);
      element.querySelector('.score').textContent = String(scores[p - 1]);
    });
  }
  function startGame(friends) {
    if (!friends && !canPlaySolo()) return;
    cancelRound();
    multi = friends; player = 1; scores = [0,0]; matches = 0; moves = 0;
    var pool = shuffle(art).slice(0,6);
    cards = shuffle(pool.concat(pool)).map(function (name) { return {art:name,flipped:false,matched:false}; });
    screen = 'game'; render(true);
    if (!multi) save();
  }
  function continueGame() {
    if (!canPlaySolo() || !soloResume) return;
    cancelRound(); multi = false; scores = [0,0]; player = 1;
    cards = soloResume.cards.map(function (card) { return {art:card.art,matched:card.matched,flipped:false}; });
    moves = soloResume.moves; matches = cards.filter(function (card) { return card.matched; }).length / 2;
    screen = 'game'; render(true);
  }
  function flip(index) {
    if (screen !== 'game' || busy || (!multi && !canPlaySolo()) || !cards[index] || cards[index].flipped || cards[index].matched) return;
    cards[index].flipped = true; flipped.push(index); updateBoard();
    if (flipped.length !== 2) return;
    busy = true; moves = Math.min(moves + 1,1000000); updateBoard();
    if (!multi) save();
    var a = flipped[0], b = flipped[1], thisRound = round;
    timer = setTimeout(function () {
      if (thisRound !== round || screen !== 'game') return;
      timer = null;
      if (cards[a].art === cards[b].art) {
        cards[a].matched = cards[b].matched = true; matches++;
        if (multi) scores[player - 1]++;
      } else {
        cards[a].flipped = cards[b].flipped = false;
        if (multi) player = player === 1 ? 2 : 1;
      }
      flipped = []; busy = false;
      if (matches === 6) {
        if (!multi) { points = Math.min(points + 10,1000000000); rounds = Math.min(rounds + 1,1000000000); soloResume = null; save(); }
        screen = 'result'; render(true);
      } else {
        var focused = document.activeElement;
        updateBoard();
        if (focused?.matches?.('.card:disabled')) app.querySelector('.card:not(:disabled)')?.focus({preventScroll:true});
        if (!multi) save();
      }
    }, 700);
  }
  function home() { if (screen === 'game' && !multi) save(); window.LuminaOnline?.destroy(); cancelRound(); screen = 'home'; render(true); }
  function online(roomCode) {
    cancelRound(); screen = 'online';
    window.LuminaOnline.open({
      roomCode:roomCode,
      onLocal:function () { window.LuminaOnline.destroy(); startGame(true); },
      onHome:home
    });
  }
  function setLanguage(value) {
    var normalized = String(value || 'en').toLowerCase();
    normalized = normalized.startsWith('pt') ? 'pt-BR' : normalized.split('-')[0];
    language = Object.prototype.hasOwnProperty.call(window.LuminaMessages, normalized) ? normalized : 'en';
    var unchanged = document.documentElement.lang === language && app.childElementCount > 0;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (unchanged) return;
    if (screen === 'online') window.LuminaOnline?.setLanguage(language);
    else render(false);
  }
  function loadProgress(message) {
    if (!['loading','guest','account','saving','saved','offline','conflict'].includes(message.mode)) return;
    saveMode = message.mode;
    var replace = false;
    if (message.mode === 'loading' && message.progress === null) {
      progressOwner = null; points = 0; rounds = 0; soloResume = null; replace = true;
    } else if (message.mode === 'guest') {
      var guest = guestProgress();
      progressOwner = 'guest'; points = guest.points; rounds = guest.rounds; soloResume = guest.activeRound; replace = true;
    } else if (message.mode === 'account') {
      var progress = message.progress;
      if (progress !== null && (!progress || !Number.isSafeInteger(progress.points) || progress.points < 0 || progress.points > 1000000000 ||
          !Number.isSafeInteger(progress.rounds) || progress.rounds < 0 || progress.rounds > 1000000000 ||
          (progress.activeRound !== null && !validRound(progress.activeRound)))) { saveMode = 'offline'; updateProgress(); return; }
      progressOwner = 'account'; points = progress?.points || 0; rounds = progress?.rounds || 0; soloResume = progress ? validRound(progress.activeRound) : null; replace = true;
    }
    if (replace && screen !== 'online' && !(screen === 'game' && multi)) {
      cancelRound(); cards = []; screen = 'home'; render(false);
    } else updateProgress();
  }
  app.addEventListener('click', function (event) {
    var control = event.target.closest('button');
    if (!control || !app.contains(control)) return;
    if (control.hasAttribute('data-card')) { flip(Number(control.dataset.card)); return; }
    switch (control.dataset.action) {
      case 'solo': startGame(false); break;
      case 'continue': continueGame(); break;
      case 'friends': online(); break;
      case 'localfriends': startGame(true); break;
      case 'home': home(); break;
      case 'help': cancelRound(); screen = 'help'; render(true); break;
      case 'reload-save': saveMode = 'loading'; updateProgress(); window.parent.postMessage({type:'lumina:progress-load'},location.origin); break;
      case 'sign-in': window.parent.postMessage({type:'lumina:navigate',destination:'profile'},location.origin); break;
    }
  });
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type === 'lumina:set-language') {
      document.documentElement.classList.toggle('reduce-motion', event.data.reducedMotion === true);
      setLanguage(event.data.language);
    } else if (event.data?.type === 'lumina:progress-state') loadProgress(event.data);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && window.parent !== window) {
      event.preventDefault(); window.parent.postMessage({type:'lumina:close'}, location.origin);
    }
  });
  window.addEventListener('pagehide', function () {
    if (screen === 'online') { home(); return; }
    if (screen === 'game' && !multi) save();
    cancelRound();
    cards.forEach(function (card) { if (!card.matched) card.flipped = false; });
    if (screen === 'game') updateBoard();
  });
  setLanguage(language);
  var initialRoom = new URLSearchParams(location.search).get('room');
  if (initialRoom && /^[a-zA-Z0-9_-]{8,64}$/.test(initialRoom)) online(initialRoom);
  if (window.parent !== window) window.parent.postMessage({type:'lumina:ready'}, location.origin);
  if (embedded) window.parent.postMessage({type:'lumina:progress-load'}, location.origin);
})();
