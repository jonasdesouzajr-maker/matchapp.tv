/* Lumina's 250-level journey, classic rounds and existing approved-friends play. */
(function () {
  'use strict';
  var art = ['moon','star','planet','heart','crystal','butterfly','orb','sun'];
  var campaignCore = window.LuminaCampaign;
  var campaign = campaignCore.empty(), campaignEnabled = false;
  var gameKind = 'classic', stage = null, chapter = 1, timedChoice = false;
  var elapsed = 0, clockStarted = null, clockTimer = null, lastCheckpoint = 0;
  var paused = false, hintsUsed = 0, hintTimer = null, peek = [];
  var lastResult = null, settingsResume = false, restartPending = false, registerResume = false, registrationPending = false;
  var app = document.getElementById('app');
  var language = new URLSearchParams(location.search).get('lang') || 'en';
  document.documentElement.classList.toggle('reduce-motion', new URLSearchParams(location.search).get('reducedMotion') === '1');
  var screen = 'home', cards = [], flipped = [], matches = 0, moves = 0;
  var busy = false, multi = false, player = 1, scores = [0, 0];
  var timer = null, pendingPairSettlement = null, round = 0;
  var embedded = window.parent !== window;
  var saveMode = embedded ? 'loading' : 'guest', progressOwner = embedded ? null : 'guest';
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
  // Guests can play freely in this open game, but no guest progress is read
  // from or written to browser storage. Only registered accounts retain saves.
  var soloResume = null;
  function now() { return window.performance.now(); }
  function elapsedSeconds() {
    return Math.min(86400,Math.floor(elapsed + (clockStarted === null ? 0 : Math.max(0,now()-clockStarted)/1000)));
  }
  function stopClock() {
    if (clockStarted !== null) elapsed = Math.min(86400,elapsed + Math.max(0,now()-clockStarted)/1000);
    clockStarted = null;
    if (clockTimer !== null) clearInterval(clockTimer);
    clockTimer = null;
  }
  function campaignRound() {
    return {level:stage.level,cards:cards.map(function (card) { return {art:card.art,matched:card.matched}; }),
      moves:moves,elapsedSeconds:elapsedSeconds(),timed:timedChoice,hintsUsed:hintsUsed};
  }
  function snapshot() {
    var active = screen === 'game' && !multi && gameKind === 'classic' && matches < 6 ? {
      cards:cards.map(function (card) { return {art:card.art,matched:card.matched}; }),moves:moves
    } : soloResume;
    var progress = {points:points,rounds:rounds,activeRound:validRound(active)};
    if (campaignEnabled) {
      if (screen === 'game' && gameKind === 'campaign' && matches < stage.pairs) campaign.activeLevel = campaignRound();
      var clean = campaignCore.normalize(campaign);
      if (!clean) throw new Error('LUMINA_INVALID_CAMPAIGN');
      progress = {version:2,points:points,rounds:rounds,activeRound:progress.activeRound,campaign:clean};
    }
    return progress;
  }
  window.LuminaGameProgress = Object.freeze({snapshot:snapshot});
  function save(explicit) {
    var progress = snapshot(); soloResume = progress.activeRound;
    if (progressOwner === 'account') {
      var message = {type:'lumina:progress-change',progress:progress};
      if (explicit === true) message.explicit = true;
      window.parent.postMessage(message, location.origin);
    }
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
    var keys = {loading:'saveLoading',guest:'saveGuest',account:'saveAccount',saving:'saveSaving',saved:'saveSaved',offline:progressOwner === 'account' ? 'saveOffline' : 'saveUnavailable',conflict:'saveConflict'};
    return '<div class="save-area"><p class="save-status" role="status" aria-live="polite">' + label(keys[saveMode]) + '</p>' +
      (saveMode === 'offline' || saveMode === 'conflict' ? button('reload-save','reloadSave','secondary compact') : '') +
      (saveMode === 'guest' ? button('sign-in','createAccount','secondary compact') : '') + '</div>';
  }
  function updateProgress() {
    var area = app.querySelector('.save-area');
    if (area) area.outerHTML = progressNote();
    app.querySelectorAll('[data-action="solo"],[data-action="continue"],[data-action="campaign"],[data-action="campaign-resume"]').forEach(function (element) { element.disabled = !canPlaySolo(); });
    var saveButton = document.querySelector('[data-save-game]');
    if (saveButton) {
      saveButton.disabled = !canPlaySolo();
      // Online rooms already persist each server-authorized turn. A shared
      // device round is session-only and must not claim a solo account save.
      saveButton.hidden = screen === 'online' || multi && (screen === 'game' || screen === 'result');
    }
    if (screen === 'game') updateBoard();
  }
  function cancelRound() {
    round++; clearTimeout(timer); timer = null; pendingPairSettlement = null; clearTimeout(hintTimer); hintTimer = null;
    flipped = []; peek = []; busy = false; restartPending = false; stopClock();
  }
  function shuffle(items) {
    var result = items.slice();
    for (var i = result.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = result[i]; result[i] = result[j]; result[j] = tmp;
    }
    return result;
  }
  function themeLabel(theme) { return label(theme === 'grove' ? 'themeGrove' : theme === 'ocean' ? 'themeOcean' : 'themeStarlight'); }
  function starText(count) { return '★'.repeat(count) + '☆'.repeat(3-count); }
  function modeControls() {
    return '<fieldset class="mode-options"><legend>' + label('modeHelp') + '</legend>' +
      '<label><input type="radio" name="lumina-mode" value="relaxed"' + (timedChoice ? '' : ' checked') + '> ' + label('relaxed') + '</label>' +
      '<label><input type="radio" name="lumina-mode" value="timed"' + (timedChoice ? ' checked' : '') + '> ' + label('timed') + '</label></fieldset>';
  }
  function campaignSummary() {
    var completed = campaign.results.filter(Boolean).length;
    var stars = campaign.results.reduce(function (total,item) { return total + (item ? item[0] : 0); },0);
    return '<div class="journey-summary"><span>' + label('campaignProgress',{completed:completed}) + '</span><span>' +
      label('starsOf',{n:stars}) + '</span></div><progress class="journey-progress" max="250" value="' + completed +
      '" aria-label="' + label('campaignProgress',{completed:completed}) + '"></progress>';
  }
  function levelMap() {
    var first = (chapter-1)*25+1;
    var html = '<section class="screen level-screen"><header class="header">' + button('home','home') +
      '<h1 tabindex="-1">' + label('levels') + '</h1></header>' + campaignSummary() +
      '<div class="chapter-nav">' + button('chapter-prev','previousChapter','compact secondary') +
      '<strong>' + label('chapter',{n:chapter}) + '</strong>' + button('chapter-next','nextChapter','compact secondary') + '</div>' +
      '<p class="map-note">' + label('unlockedLevels',{n:campaign.unlocked}) + '</p>' + modeControls() +
      '<div class="level-grid" role="group" aria-label="' + label('campaignChoose') + '">';
    for (var n = first; n < first+25; n++) {
      var config = campaignCore.levels[n-1], result = campaign.results[n-1], unlocked = n <= campaign.unlocked;
      html += '<button type="button" class="level-tile ' + config.theme + (result ? ' completed' : '') +
        '" data-level="' + n + '" aria-label="' + label(unlocked ? 'levelStars' : 'levelLocked',{n:n,stars:result ? result[0] : 0}) +
        '"' + (!unlocked || !canPlaySolo() ? ' disabled' : '') + '><span class="level-number">' + n + '</span><span class="level-star" aria-hidden="true">' +
        (unlocked ? starText(result ? result[0] : 0) : '◇') + '</span><span class="level-theme">' + themeLabel(config.theme) + '</span></button>';
    }
    return html + '</div>' + progressNote() + '</section>';
  }
  function render(focus) {
    app.dataset.screen = screen;
    app.dataset.theme = screen === 'game' && gameKind === 'campaign' ? stage.theme : 'starlight';
    if (screen === 'home') {
      app.innerHTML = '<section class="screen"><h1 tabindex="-1">Lumina</h1><div class="subtitle">MATCH</div>' +
        '<p class="journey-title">' + label('campaign') + '</p>' + campaignSummary() +
        '<button type="button" class="pill journey-play" data-action="' + (campaign.activeLevel ? 'campaign-resume' : 'campaign') + '">' +
        label(campaign.activeLevel ? 'resumeSavedLevel' : campaign.results.every(Boolean) ? 'campaignChoose' : 'continueCampaign',
          {n:campaign.activeLevel ? campaign.activeLevel.level : campaign.unlocked}) + '</button>' +
        button('levels','levels','secondary') +
        modeControls() +
        '<div class="home-secondary">' + button('friends','friends','friends') +
        (soloResume ? button('continue','classicContinue','teal') : '') +
        button('solo',soloResume ? 'classicNew' : 'classic','secondary') + '</div>' +
        '<div class="stats">' + label('rounds') + ': ' + rounds + ' · ' + points + ' ' + label('points') + '</div>' +
        button('help','how','teal compact') + progressNote() + '</section>';
    } else if (screen === 'levels') {
      app.innerHTML = levelMap();
      app.querySelector('[data-action="chapter-prev"]').disabled = chapter === 1;
      app.querySelector('[data-action="chapter-next"]').disabled = chapter === 10;
    } else if (screen === 'help') {
      app.innerHTML = '<section class="screen help"><h1 tabindex="-1">' + label('helpTitle') + '</h1>' +
        '<p>' + label('campaignHelp') + '</p><p>' + label('scoringHelp') + '</p><p>' + label('eventHelp') + '</p>' +
        '<p>' + label('modeHelp') + '</p><p>' + label('hintHelp') + '</p><p>' + label('helpFriends') + '</p>' +
        '<p>' + label('campaignSaveHelp') + '</p><p>' + label('audioHelp') + '</p>' +
        button('home','back','teal') + '</section>';
    } else if (screen === 'game') {
      var isCampaign = gameKind === 'campaign', pairCount = isCampaign ? stage.pairs : 6;
      var columns = pairCount <= 6 ? 3 : pairCount <= 10 ? 4 : pairCount <= 15 ? 5 : 6;
      var markup = '<section class="screen play-screen"><div class="play-controls"><header class="header">' + button('home','home') +
        '<span>' + (isCampaign ? label('levelOf',{n:stage.level}) : label(multi ? 'friendsMatch' : 'solo')) + '</span>' +
        button('pause','pause','secondary') + '</header>';
      if (isCampaign) markup += '<div class="stage-meta"><span>' + themeLabel(stage.theme) + '</span><span>' +
        label(timedChoice ? 'timed' : 'relaxed') + '</span><span class="clock" role="timer" aria-live="off"></span></div>' +
        '<div class="hint-row">' + button('hint','hint','secondary compact') + '<span class="hint-count"></span></div>';
      if (isCampaign && campaign.results[stage.level-1]) {
        var best = campaign.results[stage.level-1];
        markup += '<p class="personal-best">' + label('bestResult',{stars:best[0],moves:best[1],seconds:best[2]}) + '</p>';
      }
      if (multi) {
        markup += '<div class="plates">';
        for (var p = 1; p <= 2; p++) markup += '<div class="plate" data-player="' + p + '">' +
          label('player',{n:p}) + '<br><span class="score">' + scores[p - 1] + '</span></div>';
        markup += '</div>';
      }
      markup += '<p class="game-status" role="status" aria-live="polite"></p>' + (multi ? '' : progressNote()) +
        '</div><div class="board-area"><div class="grid' +
        (isCampaign ? ' campaign-grid' : '') + '" style="--columns:' + columns + ';--mobile-columns:' + (pairCount > 12 ? 5 : columns > 4 ? 4 : columns) +
        '" role="group" aria-label="' + (isCampaign ? label('level',{n:stage.level}) : label(multi ? 'friendsMatch' : 'solo')) + '">';
      cards.forEach(function (card, i) {
        markup += '<button type="button" class="card" data-card="' + i + '"><span class="face back" aria-hidden="true" style="background-image:url(' +
          campaignCore.back(isCampaign ? stage.theme : 'starlight') + ')"></span>' +
          '<span class="face front" aria-hidden="true" style="background-image:url(' + campaignCore.image(card.art) + ')"></span></button>';
      });
      app.innerHTML = markup + '</div><section class="pause-panel" hidden><h2>' + label('paused') + '</h2><div class="pause-actions">' +
        button('resume','resume','teal') + (isCampaign ? button('restart-level','abandonAttempt','secondary') : '') + '</div>' +
        (isCampaign ? '<div class="restart-confirm" hidden><p id="lumina-restart-question">' + label('confirmRestart') + '</p>' +
          '<div role="group" aria-labelledby="lumina-restart-question">' + button('confirm-restart','confirm') + button('cancel-restart','cancel','secondary') + '</div></div>' : '') + '</section></div></section>';
      updateBoard();
    } else if (screen === 'campaign-result') {
      app.innerHTML = '<section class="screen result"><p class="theme-caption">' + themeLabel(stage.theme) + '</p><h1 tabindex="-1">' +
        label(lastResult.complete ? 'campaignComplete' : 'campaignCleared',{n:stage.level}) + '</h1>' +
        '<div class="earned-stars" role="img" aria-label="' + label('levelStars',{n:stage.level,stars:lastResult.stars}) + '">' + starText(lastResult.stars) + '</div>' +
        '<div class="result-score">' + label('earnedPoints',{n:lastResult.points}) + '</div>' +
        (lastResult.milestone ? '<p class="milestone">' + label('milestoneBonus') + '</p>' : '') +
        '<p class="result-detail">' + label('levelSummary',{moves:moves,seconds:elapsedSeconds(),pairs:stage.pairs}) + '</p>' +
        (lastResult.complete ? '<p class="completion-copy">' + label('campaignCompleteBody') + '</p>' : '') +
        (stage.level < 250 ? button('next-level','nextLevel') : button('levels','levels')) +
        button('replay-level','replayLevel','secondary') + button('home','home','teal') + progressNote() + '</section>';
    } else if (screen === 'defeat') {
      app.innerHTML = '<section class="screen result"><p class="theme-caption">' + label('levelOf',{n:stage.level}) + '</p><h1 tabindex="-1">' +
        label('timeUp') + '</h1><p class="completion-copy">' + label('timeUpBody') + '</p>' +
        button('retry-level','retryLevel') + button('relaxed-level','tryRelaxed','teal') + button('home','home','secondary') + progressNote() + '</section>';
    } else if (screen === 'result') {
      var winner = scores[0] > scores[1] ? 1 : 2;
      var title = multi ? (scores[0] === scores[1] ? label('tie') : label('wins',{n:winner})) : label('cleared');
      var result = multi ? label('player',{n:1}) + ': ' + scores[0] + '<br>' + label('player',{n:2}) + ': ' + scores[1] :
        label('earned') + '<br>' + label('roundSummary',{moves:moves,pairs:matches});
      app.innerHTML = '<section class="screen result"><h1 tabindex="-1">' + title + '</h1><div class="result-score">' + result +
        '</div>' + button(multi ? 'localfriends' : 'solo','again') + button('home','home','teal') + (multi ? '' : progressNote()) + '</section>';
    }
    window.LuminaAudio?.setTheme(screen === 'game' && gameKind === 'campaign' ? stage.theme : 'starlight');
    window.LuminaAudio?.setActive(!paused && !registrationPending);
    updateProgress();
    if (focus) (app.querySelector('h1') || app.querySelector('button'))?.focus({preventScroll:true});
  }
  function updateBoard() {
    if (screen !== 'game') return;
    app.querySelectorAll('[data-card]').forEach(function (element) {
      var i = Number(element.dataset.card), card = cards[i];
      var revealed = card.flipped || card.matched || peek.includes(i);
      element.classList.toggle('flipped', revealed);
      element.classList.toggle('matched', card.matched);
      element.disabled = paused || card.matched || (!multi && !canPlaySolo());
      element.setAttribute('aria-pressed', String(revealed));
      element.setAttribute('aria-label', t(card.matched ? 'matchedCard' : revealed ? 'revealedCard' : 'hiddenCard', {n:i+1,name:t(card.art)}));
    });
    var status = app.querySelector('.game-status');
    status.textContent = multi ? t('turn',{n:player}) : t('moves') + ' ' + moves + ' · ' + t('pairs') + ' ' + matches + '/' + (gameKind === 'campaign' ? stage.pairs : 6);
    app.querySelectorAll('[data-player]').forEach(function (element) {
      var p = Number(element.dataset.player);
      element.classList.toggle('active', p === player);
      element.querySelector('.score').textContent = String(scores[p - 1]);
    });
    var panel = app.querySelector('.pause-panel');
    if (panel) {
      panel.hidden = !paused;
      panel.querySelector('[data-action="resume"]').disabled = !multi && !canPlaySolo();
      panel.querySelector('.pause-actions').hidden = restartPending;
      var restart = panel.querySelector('.restart-confirm');
      if (restart) {
        restart.hidden = !restartPending;
        restart.querySelector('[data-action="confirm-restart"]').disabled = !canPlaySolo();
      }
      app.querySelector('.board-area').classList.toggle('is-paused',paused);
      app.querySelector('.grid').setAttribute('aria-hidden',String(paused));
    }
    if (gameKind === 'campaign') {
      var seconds = elapsedSeconds(), time = timedChoice ? Math.max(0,stage.seconds-seconds) : seconds;
      var clock = app.querySelector('.clock');
      clock.textContent = t(timedChoice ? 'timeLeft' : 'elapsed') + ': ' + t('seconds',{n:time});
      clock.classList.toggle('urgent',timedChoice && time <= 10);
      var hint = app.querySelector('[data-action="hint"]');
      hint.disabled = paused || busy || flipped.length > 0 || hintsUsed >= 3 || !canPlaySolo();
      app.querySelector('.hint-count').textContent = t('hintsLeft',{n:3-hintsUsed});
    }
  }
  function startClock() {
    if (gameKind !== 'campaign' || screen !== 'game' || paused || !canPlaySolo() || document.hidden || clockStarted !== null) return;
    clockStarted = now();
    function tick() {
      if (screen !== 'game' || gameKind !== 'campaign' || paused) return;
      if (!canPlaySolo()) { pauseGame(); return; }
      if (timedChoice && elapsedSeconds() >= stage.seconds) { loseLevel(); return; }
      updateBoard();
      if (elapsedSeconds() - lastCheckpoint >= 15) { lastCheckpoint = elapsedSeconds(); save(); }
    }
    clockTimer = setInterval(tick,250);
    tick();
  }
  function pauseGame() {
    if (screen !== 'game' || paused) return;
    // A local two-player attempt already belongs to its current player. A
    // pause must not discard a match or let that player erase a missed turn.
    if (multi && pendingPairSettlement) {
      clearTimeout(timer); pendingPairSettlement();
      if (screen !== 'game') return;
    }
    cancelRound(); paused = true;
    cards.forEach(function (card) { if (!card.matched) card.flipped = false; });
    window.LuminaAudio?.setActive(false);
    if (!multi) save();
    updateBoard();
  }
  function resumeGame() {
    if (screen !== 'game' || !paused || document.hidden || (!multi && !canPlaySolo())) return;
    paused = false; restartPending = false; window.LuminaAudio?.setActive(true); startClock(); updateBoard();
  }
  function loseLevel() {
    if (screen !== 'game' || gameKind !== 'campaign') return;
    cancelRound(); paused = false;
    cards.forEach(function (card) { if (!card.matched) card.flipped = false; });
    campaign.activeLevel = campaignRound(); screen = 'defeat'; save();
    window.LuminaAudio?.play('miss'); render(true);
  }
  function hint() {
    if (screen !== 'game' || gameKind !== 'campaign' || paused || busy || flipped.length || hintsUsed >= 3 || !canPlaySolo()) return;
    var remaining = cards.map(function (card,index) { return {card:card,index:index}; }).filter(function (item) { return !item.card.matched; });
    if (!remaining.length) return;
    var chosen = remaining[Math.floor(Math.random()*remaining.length)].card.art;
    peek = remaining.filter(function (item) { return item.card.art === chosen; }).map(function (item) { return item.index; });
    hintsUsed++; busy = true; updateBoard(); save(); window.LuminaAudio?.play('tap');
    var thisRound = round;
    hintTimer = setTimeout(function () {
      if (thisRound !== round || screen !== 'game') return;
      hintTimer = null; peek = []; busy = false; updateBoard();
    },1500);
  }
  function showLevels() {
    if (screen === 'game' && !multi) save();
    cancelRound(); paused = false; window.LuminaOnline?.destroy();
    chapter = Math.ceil(campaign.unlocked/25); screen = 'levels'; render(true);
  }
  function startCampaign(level,resume) {
    if (!canPlaySolo() || !Number.isInteger(level) || level < 1 || level > campaign.unlocked || level > 250) return;
    cancelRound(); gameKind = 'campaign'; campaignEnabled = true;
    multi = false; paused = false; player = 1; scores = [0,0]; stage = campaignCore.config(level);
    var saved = resume && campaign.activeLevel?.level === level ? campaign.activeLevel : null;
    cards = (saved ? saved.cards : campaignCore.deck(level)).map(function (card) { return {art:card.art,matched:card.matched,flipped:false}; });
    moves = saved ? saved.moves : 0;
    elapsed = saved ? saved.elapsedSeconds : 0; lastCheckpoint = Math.floor(elapsed);
    hintsUsed = saved ? saved.hintsUsed : 0;
    if (saved) timedChoice = saved.timed;
    matches = cards.filter(function (card) { return card.matched; }).length/2;
    screen = 'game'; render(true); save();
    window.LuminaAudio?.play('level'); startClock();
  }
  function startGame(friends) {
    if (!friends && !canPlaySolo()) return;
    cancelRound();
    gameKind = 'classic'; paused = false; stage = null;
    multi = friends; player = 1; scores = [0,0]; matches = 0; moves = 0;
    var pool = shuffle(art).slice(0,6);
    cards = shuffle(pool.concat(pool)).map(function (name) { return {art:name,flipped:false,matched:false}; });
    screen = 'game'; render(true);
    if (!multi) save();
  }
  function continueGame() {
    if (!canPlaySolo() || !soloResume) return;
    cancelRound(); gameKind = 'classic'; paused = false; stage = null; multi = false; scores = [0,0]; player = 1;
    cards = soloResume.cards.map(function (card) { return {art:card.art,matched:card.matched,flipped:false}; });
    moves = soloResume.moves; matches = cards.filter(function (card) { return card.matched; }).length / 2;
    screen = 'game'; render(true);
  }
  function flip(index) {
    if (screen !== 'game' || paused || busy || (!multi && !canPlaySolo()) || !cards[index] || cards[index].flipped || cards[index].matched) return;
    if (gameKind === 'campaign' && timedChoice && elapsedSeconds() >= stage.seconds) { loseLevel(); return; }
    window.LuminaAudio?.play('flip');
    cards[index].flipped = true; flipped.push(index); updateBoard();
    if (flipped.length !== 2) return;
    busy = true; moves = Math.min(moves + 1,1000000); updateBoard();
    if (!multi) save();
    var a = flipped[0], b = flipped[1], thisRound = round;
    pendingPairSettlement = function () {
      if (thisRound !== round || screen !== 'game') return;
      timer = null; pendingPairSettlement = null;
      if (gameKind === 'campaign' && timedChoice && elapsedSeconds() >= stage.seconds) { loseLevel(); return; }
      if (cards[a].art === cards[b].art) {
        cards[a].matched = cards[b].matched = true; matches++;
        if (multi) scores[player - 1]++;
        window.LuminaAudio?.play('match');
      } else {
        cards[a].flipped = cards[b].flipped = false;
        if (multi) player = player === 1 ? 2 : 1;
        window.LuminaAudio?.play('miss');
      }
      flipped = []; busy = false;
      if (matches === (gameKind === 'campaign' ? stage.pairs : 6)) {
        stopClock();
        if (gameKind === 'campaign') {
          // Complete from the pre-win snapshot; an all-matched active board is
          // never persisted, so reopening cannot award the same clear twice.
          campaign.activeLevel = null;
          lastResult = campaignCore.finish(campaign,stage.level,moves,elapsedSeconds(),hintsUsed);
          campaign = lastResult.campaign; points = Math.min(points+lastResult.points,1000000000);
          rounds = Math.min(rounds+1,1000000000); screen = 'campaign-result'; save();
        } else {
          if (!multi) { points = Math.min(points + 10,1000000000); rounds = Math.min(rounds + 1,1000000000); soloResume = null; save(); }
          screen = 'result';
        }
        window.LuminaAudio?.play('win'); render(true);
      } else {
        var focused = document.activeElement;
        updateBoard();
        if (focused?.matches?.('.card:disabled')) app.querySelector('.card:not(:disabled)')?.focus({preventScroll:true});
        if (!multi) save();
      }
    };
    timer = setTimeout(pendingPairSettlement, 700);
  }
  function home() { if (screen === 'game' && !multi) save(); window.LuminaOnline?.destroy(); cancelRound(); paused = false; screen = 'home'; render(true); }
  function online(roomCode) {
    if (screen === 'game' && !multi) save();
    cancelRound(); paused = false; screen = 'online'; window.LuminaAudio?.setActive(true);
    window.LuminaOnline.open({
      roomCode:roomCode,
      onLocal:function () { window.LuminaOnline.destroy(); startGame(true); },
      onHome:home
    });
    updateProgress();
  }
  function requestSave() {
    if (!canPlaySolo()) return;
    if (progressOwner === 'guest') { openRegisterPrompt(); return; }
    save(true);
  }
  function requestClose() {
    if (embedded) window.parent.postMessage({type:'lumina:close'},location.origin);
    else location.assign('/');
  }
  function renderRegisterPrompt() {
    var dialog = document.getElementById('lumina-register-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'lumina-register-dialog'; dialog.className = 'audio-dialog register-dialog';
      dialog.setAttribute('aria-labelledby','lumina-register-title');
      dialog.setAttribute('aria-describedby','lumina-register-copy'); document.body.appendChild(dialog);
      dialog.addEventListener('cancel',function (event) { event.preventDefault(); closeRegisterPrompt(true); });
      dialog.addEventListener('click',function (event) {
        var action = event.target.closest('[data-registration]')?.dataset.registration;
        if (action === 'dismiss' || action === 'keep') closeRegisterPrompt(true);
        else if (action === 'leave') { closeRegisterPrompt(false); requestClose(); }
        else if (action === 'create') {
          closeRegisterPrompt(false);
          registrationPending = true;
          if (embedded) window.parent.postMessage({type:'lumina:register',progress:snapshot()},location.origin);
          else location.assign('/?openAuth=1');
        }
      });
    }
    dialog.innerHTML = '<button type="button" class="register-dismiss" data-registration="dismiss" aria-label="' + label('dismissRegisterPrompt') + '">×</button>' +
      '<h2 id="lumina-register-title">' + label('registerToSaveTitle') + '</h2><p id="lumina-register-copy">' + label('registerToSaveBody') + '</p>' +
      '<p class="guest-session-note">' + label('saveGuest') + '</p>' +
      '<button type="button" class="pill" data-registration="create">' + label('createAccount') + '</button>' +
      '<button type="button" class="pill secondary" data-registration="keep">' + label('keepPlaying') + '</button>' +
      '<button type="button" class="pill teal" data-registration="leave">' + label('closeWithoutSaving') + '</button>';
  }
  function openRegisterPrompt() {
    if (progressOwner !== 'guest') return;
    registerResume = screen === 'game' && !paused;
    if (registerResume) pauseGame();
    window.LuminaAudio?.setActive(false);
    renderRegisterPrompt();
    var dialog = document.getElementById('lumina-register-dialog');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
    dialog.querySelector('[data-registration="create"]')?.focus();
  }
  function closeRegisterPrompt(resume) {
    var dialog = document.getElementById('lumina-register-dialog');
    if (dialog?.hasAttribute('open')) {
      if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    }
    if (resume) {
      if (registerResume) resumeGame(); else window.LuminaAudio?.setActive(!paused);
      document.querySelector('[data-save-game]')?.focus({preventScroll:true});
    }
    registerResume = false;
  }
  function renderAudioControls() {
    var toolbar = document.getElementById('lumina-audio-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div'); toolbar.id = 'lumina-audio-toolbar'; toolbar.className = 'audio-toolbar';
      toolbar.innerHTML = '<button type="button" class="audio-settings-button save-game-button" data-save-game></button>' +
        '<button type="button" class="audio-settings-button" data-audio-settings></button>';
      document.body.insertBefore(toolbar,app);
      toolbar.querySelector('[data-audio-settings]').addEventListener('click',openSettings);
      toolbar.querySelector('[data-save-game]').addEventListener('click',requestSave);
    }
    toolbar.querySelector('[data-audio-settings]').textContent = t('settings');
    toolbar.querySelector('[data-save-game]').textContent = t('saveGame');
    toolbar.querySelector('[data-save-game]').disabled = !canPlaySolo();
    var dialog = document.getElementById('lumina-audio-dialog');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'lumina-audio-dialog'; dialog.className = 'audio-dialog';
      dialog.setAttribute('aria-labelledby','lumina-audio-title'); document.body.appendChild(dialog);
      dialog.addEventListener('cancel',function (event) { event.preventDefault(); closeSettings(); });
      dialog.addEventListener('click',function (event) { if (event.target.closest('[data-close-audio]')) closeSettings(); });
      dialog.addEventListener('change',function (event) {
        if (event.target.id === 'lumina-sound') window.LuminaAudio?.setSound(event.target.checked);
        if (event.target.id === 'lumina-music') window.LuminaAudio?.setMusic(event.target.checked);
      });
      dialog.addEventListener('input',function (event) {
        if (event.target.id === 'lumina-volume') window.LuminaAudio?.setVolume(Number(event.target.value)/100);
      });
    }
    var audio = window.LuminaAudio?.getSettings() || {sound:true,music:true,volume:0.45};
    dialog.innerHTML = '<h2 id="lumina-audio-title">' + label('settings') + '</h2><label class="audio-setting">' +
      '<span>' + label('soundEffects') + '</span><input id="lumina-sound" type="checkbox"' + (audio.sound ? ' checked' : '') + '></label>' +
      '<label class="audio-setting"><span>' + label('music') + '</span><input id="lumina-music" type="checkbox"' + (audio.music ? ' checked' : '') + '></label>' +
      '<label class="volume-setting" for="lumina-volume">' + label('volume') + '</label><input id="lumina-volume" type="range" min="0" max="100" value="' +
      Math.round(audio.volume*100) + '"><p class="audio-status">' + label('audioReady') + '</p>' +
      '<button type="button" class="pill teal" data-close-audio>' + label('closeSettings') + '</button>';
  }
  function openSettings() {
    settingsResume = screen === 'game' && !paused;
    if (settingsResume) pauseGame();
    renderAudioControls();
    var dialog = document.getElementById('lumina-audio-dialog');
    if (typeof dialog.showModal === 'function') dialog.showModal(); else dialog.setAttribute('open','');
    dialog.querySelector('input')?.focus();
  }
  function closeSettings() {
    var dialog = document.getElementById('lumina-audio-dialog');
    if (!dialog?.hasAttribute('open')) return;
    if (typeof dialog.close === 'function') dialog.close(); else dialog.removeAttribute('open');
    if (settingsResume) resumeGame();
    settingsResume = false;
    document.querySelector('[data-audio-settings]')?.focus({preventScroll:true});
  }
  function setLanguage(value) {
    var normalized = String(value || 'en').toLowerCase();
    normalized = normalized.startsWith('pt') ? 'pt-BR' : normalized.split('-')[0];
    language = Object.prototype.hasOwnProperty.call(window.LuminaMessages, normalized) ? normalized : 'en';
    var unchanged = document.documentElement.lang === language && app.childElementCount > 0;
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    renderAudioControls();
    if (document.getElementById('lumina-register-dialog')) renderRegisterPrompt();
    if (unchanged) return;
    if (screen === 'online') window.LuminaOnline?.setLanguage(language);
    else render(false);
  }
  function loadProgress(message) {
    if (!['loading','guest','account','saving','saved','offline','conflict'].includes(message.mode)) return;
    saveMode = message.mode;
    var replace = false;
    if (message.mode === 'loading' && message.progress === null) {
      progressOwner = null; points = 0; rounds = 0; soloResume = null;
      campaign = campaignCore.empty(); campaignEnabled = false; replace = true;
    } else if (message.mode === 'guest') {
      var guest = progressOwner === 'guest' ? snapshot() : null;
      progressOwner = 'guest'; points = guest?.points || 0; rounds = guest?.rounds || 0; soloResume = guest?.activeRound || null;
      campaign = guest?.version === 2 ? guest.campaign : campaignCore.empty(); campaignEnabled = guest?.version === 2; replace = true;
    } else if (message.mode === 'account') {
      var progress = message.progress;
      if (progress !== null && (!progress || !Number.isSafeInteger(progress.points) || progress.points < 0 || progress.points > 1000000000 ||
          !Number.isSafeInteger(progress.rounds) || progress.rounds < 0 || progress.rounds > 1000000000 ||
          (progress.activeRound !== null && !validRound(progress.activeRound)) ||
          (progress.version !== undefined && (progress.version !== 2 || !campaignCore.normalize(progress.campaign))))) { saveMode = 'offline'; if (screen === 'game') pauseGame(); updateProgress(); return; }
      progressOwner = 'account'; points = progress?.points || 0; rounds = progress?.rounds || 0; soloResume = progress ? validRound(progress.activeRound) : null;
      campaign = progress?.version === 2 ? campaignCore.normalize(progress.campaign) : campaignCore.empty();
      campaignEnabled = progress?.version === 2; replace = true;
    }
    if (replace && screen !== 'online' && !(screen === 'game' && multi)) {
      closeRegisterPrompt(false);
      cancelRound(); paused = false; cards = []; screen = 'home'; render(false);
    } else {
      if (screen === 'game' && !multi && !canPlaySolo()) pauseGame();
      if (screen === 'levels') render(false); else updateProgress();
    }
  }
  document.addEventListener('click',function () {
    try {
      var expectAudio = !paused && !registrationPending && !document.hidden && !document.getElementById('lumina-register-dialog')?.hasAttribute('open');
      var activation = window.LuminaAudio?.unlock();
      activation?.then?.(function (ready) {
        if (!ready && expectAudio && !paused && !document.hidden) {
          var status = document.querySelector('.audio-status');
          if (status) status.textContent = t('audioUnavailable');
        }
      }).catch?.(function () {});
    } catch (_) { /* Audio failure must never interrupt gameplay. */ }
  },true);
  app.addEventListener('change',function (event) {
    if (event.target.name === 'lumina-mode') timedChoice = event.target.value === 'timed';
  });
  app.addEventListener('click', function (event) {
    var control = event.target.closest('button');
    if (!control || !app.contains(control)) return;
    if (control.hasAttribute('data-card')) { flip(Number(control.dataset.card)); return; }
    if (control.hasAttribute('data-level')) {
      var chosen = Number(control.dataset.level);
      startCampaign(chosen,campaign.activeLevel?.level === chosen && campaign.activeLevel.timed === timedChoice); return;
    }
    switch (control.dataset.action) {
      case 'campaign':
        if (campaign.results.every(Boolean)) showLevels(); else startCampaign(campaign.unlocked,false);
        break;
      case 'campaign-resume': if (campaign.activeLevel) startCampaign(campaign.activeLevel.level,true); break;
      case 'levels': showLevels(); break;
      case 'chapter-prev': chapter = Math.max(1,chapter-1); render(true); break;
      case 'chapter-next': chapter = Math.min(10,chapter+1); render(true); break;
      case 'next-level': if (stage.level < 250) startCampaign(stage.level+1,false); break;
      case 'replay-level': case 'retry-level': startCampaign(stage.level,false); break;
      case 'relaxed-level': timedChoice = false; startCampaign(stage.level,false); break;
      case 'pause': pauseGame(); break;
      case 'resume': resumeGame(); break;
      case 'hint': hint(); break;
      case 'restart-level':
        if (paused && gameKind === 'campaign') {
          restartPending = true; updateBoard(); app.querySelector('[data-action="cancel-restart"]')?.focus();
        }
        break;
      case 'confirm-restart':
        if (paused && restartPending && gameKind === 'campaign') startCampaign(stage.level,false);
        break;
      case 'cancel-restart':
        restartPending = false; updateBoard(); app.querySelector('[data-action="restart-level"]')?.focus();
        break;
      case 'solo': startGame(false); break;
      case 'continue': continueGame(); break;
      case 'friends': online(); break;
      case 'localfriends': startGame(true); break;
      case 'home': home(); break;
      case 'help': cancelRound(); paused = false; screen = 'help'; render(true); break;
      case 'reload-save': saveMode = 'loading'; updateProgress(); window.parent.postMessage({type:'lumina:progress-load'},location.origin); break;
      case 'sign-in': openRegisterPrompt(); break;
    }
  });
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || event.origin !== location.origin) return;
    if (event.data?.type === 'lumina:set-language') {
      document.documentElement.classList.toggle('reduce-motion', event.data.reducedMotion === true);
      setLanguage(event.data.language);
    } else if (event.data?.type === 'lumina:progress-state') loadProgress(event.data);
    else if (event.data?.type === 'lumina:registration-return') {
      registrationPending = false; window.LuminaAudio?.setActive(!paused);
    }
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && document.getElementById('lumina-register-dialog')?.hasAttribute('open')) {
      event.preventDefault(); event.stopPropagation(); closeRegisterPrompt(true); return;
    }
    if (event.key === 'Escape' && document.getElementById('lumina-audio-dialog')?.hasAttribute('open')) {
      event.preventDefault(); event.stopPropagation(); closeSettings(); return;
    }
    if (event.key === 'Escape' && restartPending) {
      event.preventDefault(); event.stopPropagation(); restartPending = false; updateBoard();
      app.querySelector('[data-action="restart-level"]')?.focus(); return;
    }
    if (event.key === 'Escape' && window.parent !== window) {
      event.preventDefault(); window.parent.postMessage({type:'lumina:close'}, location.origin);
    }
  });
  window.addEventListener('pagehide', function () {
    if (screen === 'online') { home(); return; }
    // BFCache restoration may arrive without visibilitychange. Keep a timed
    // board explicitly paused until Resume so its clock cannot silently stop.
    if (screen === 'game' && (gameKind === 'campaign' || multi)) { pauseGame(); return; }
    if (screen === 'game' && !multi) save();
    cancelRound();
    cards.forEach(function (card) { if (!card.matched) card.flipped = false; });
    if (screen === 'game') updateBoard();
  });
  document.addEventListener('visibilitychange',function () {
    // Returning from another tab never silently restarts a timed level.
    if (document.hidden && screen === 'game') pauseGame();
  });
  setLanguage(language);
  var initialRoom = new URLSearchParams(location.search).get('room');
  if (initialRoom && /^[a-zA-Z0-9_-]{8,64}$/.test(initialRoom)) online(initialRoom);
  if (window.parent !== window) window.parent.postMessage({type:'lumina:ready'}, location.origin);
  if (embedded) window.parent.postMessage({type:'lumina:progress-load'}, location.origin);
})();
