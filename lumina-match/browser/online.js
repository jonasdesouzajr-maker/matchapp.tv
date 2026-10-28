/* Private online Lumina games. Authentication stays in the parent MatchApp
 * bridge; the frame receives only authorized room views and revealed artwork. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  var language = 'en';
  var active = false, epoch = 0, sequence = 0;
  var pollTimer = null, pendingRpc = null, running = null, queued = null;
  var callbacks = {}, state = null;
  var artNames = ['moon','star','planet','heart','crystal','butterfly','orb','sun'];
  var statuses = ['pending','active','complete','declined','canceled','expired'];
  var errorKeys = {
    LUMINA_AUTH_REQUIRED:'authRequired', LUMINA_FRIEND_REQUIRED:'friendRequired',
    LUMINA_EXPIRED:'ended', LUMINA_NOT_FOUND:'ended', LUMINA_CONFLICT:'changed',
    LUMINA_LIMIT:'limit', LUMINA_TURN:'awaitTurn', LUMINA_UNAVAILABLE:'unavailable'
  };
  function t(key, values) {
    var all = window.LuminaOnlineMessages || {};
    var table = all[language] || all.en || {};
    return String(table[key] || key).replace(/\{(\w+)\}/g,function(match,name) {
      return values && Object.prototype.hasOwnProperty.call(values,name) ? String(values[name]) : match;
    });
  }
  function artLabel(name) {
    var all = window.LuminaMessages || {};
    return (all[language] || all.en || {})[name] || name;
  }
  function node(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = String(text);
    return element;
  }
  function action(name, key, values, extra, details) {
    var element = node('button','pill lm-online-action ' + (extra || ''),t(key,values));
    element.type = 'button';
    element.dataset.lmAction = name;
    Object.keys(details || {}).forEach(function(k) { element.dataset[k] = String(details[k]); });
    element.dataset.lmFocus = name + ':' + (element.dataset.friend || element.dataset.code || '');
    if (state && state.mutating && !['home','local','navigate','copy'].includes(name)) element.disabled = true;
    return element;
  }
  function validCode(code) { return typeof code === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(code); }
  function alias(value) { return typeof value === 'string' && value.trim() ? value.trim().slice(0,100) : t('opponent'); }
  function safeNumber(value, max) { return Number.isSafeInteger(value) && value >= 0 && value <= max; }
  function normalizeRoom(value) {
    if (!value || !validCode(value.code) || !statuses.includes(value.status) ||
      ![1,2].includes(value.player) || !safeNumber(value.revision,1000000000)) throw {code:'LUMINA_UNAVAILABLE'};
    var scores = value.scores;
    if (!Array.isArray(scores) || scores.length !== 2 || !scores.every(function(n) { return safeNumber(n,100); })) throw {code:'LUMINA_UNAVAILABLE'};
    var seen = new Set();
    var cards = (Array.isArray(value.cards) ? value.cards : []).map(function(card) {
      if (!card || !safeNumber(card.index,11) || seen.has(card.index)) throw {code:'LUMINA_UNAVAILABLE'};
      seen.add(card.index);
      var art = card.art === null || card.art === undefined ? null : String(card.art);
      // Accept only the eight supplied filenames or their short identities.
      if (art && /^card_[a-z]+\.jpg$/.test(art)) art = art.slice(5,-4);
      if (art && !artNames.includes(art)) throw {code:'LUMINA_UNAVAILABLE'};
      var shown = card.flipped === true || card.matched === true;
      if (shown && !art) throw {code:'LUMINA_UNAVAILABLE'};
      return {index:card.index,art:shown ? art : null,matched:card.matched === true,flipped:shown};
    });
    if (cards.length > 12 || (value.status === 'active' && (cards.length !== 12 || ![1,2].includes(value.turn)))) throw {code:'LUMINA_UNAVAILABLE'};
    return {
      code:value.code,status:value.status,player:value.player,turn:[1,2].includes(value.turn) ? value.turn : 1,
      scores:scores.slice(),cards:cards,moves:safeNumber(value.moves,1000000000) ? value.moves : 0,
      revision:value.revision,friendAlias:alias(value.friendAlias),
      winner:[0,1,2].includes(value.winner) ? value.winner : null
    };
  }
  function normalizeList(value) {
    if (!value || !Array.isArray(value.friends) || !Array.isArray(value.rooms)) throw {code:'LUMINA_UNAVAILABLE'};
    return {
      friends:value.friends.slice(0,200).filter(function(friend) {
        return friend && typeof friend.friend === 'string' && friend.friend.length > 0 && friend.friend.length <= 128;
      }).map(function(friend) { return {friend:friend.friend,alias:alias(friend.alias),online:friend.online === true}; }),
      rooms:value.rooms.slice(0,100).filter(function(room) {
        return room && validCode(room.code) && statuses.includes(room.status);
      }).map(function(room) { return {code:room.code,status:room.status,incoming:room.incoming === true,friendAlias:alias(room.friendAlias)}; })
    };
  }
  function clearPoll() { clearTimeout(pollTimer); pollTimer = null; }
  function abortRpc() {
    if (!pendingRpc) return;
    var request = pendingRpc;
    pendingRpc = null;
    clearTimeout(request.timer);
    request.reject({code:'LUMINA_CANCELED'});
  }
  function rpc(name, payload) {
    if (window.parent === window) return Promise.reject({code:'LUMINA_UNAVAILABLE'});
    return new Promise(function(resolve,reject) {
      var id = 'lumina-online-' + Date.now().toString(36) + '-' + (++sequence).toString(36);
      var request = {id:id,resolve:resolve,reject:reject,timer:null};
      pendingRpc = request;
      request.timer = setTimeout(function() {
        if (pendingRpc !== request) return;
        pendingRpc = null;
        reject({code:'LUMINA_UNAVAILABLE'});
      },15000);
      try { window.parent.postMessage({type:'lumina:rpc',id:id,action:name,payload:payload || {}},location.origin); }
      catch (_) { clearTimeout(request.timer);pendingRpc = null;reject({code:'LUMINA_UNAVAILABLE'}); }
    });
  }
  function receive(event) {
    if (!active || event.source !== window.parent || event.origin !== location.origin) return;
    var message = event.data;
    if (message?.type === 'lumina:auth-changed') { resetAuthorization();return; }
    if (!pendingRpc) return;
    if (!message || message.type !== 'lumina:rpc-result' || message.id !== pendingRpc.id) return;
    var request = pendingRpc;
    pendingRpc = null;
    clearTimeout(request.timer);
    if (message.error) request.reject({code:errorKeys[message.error.code] ? message.error.code : 'LUMINA_UNAVAILABLE'});
    else request.resolve(message.data);
  }
  function blocked() {
    return state && ['LUMINA_AUTH_REQUIRED','LUMINA_FRIEND_REQUIRED','LUMINA_EXPIRED','LUMINA_NOT_FOUND'].includes(state.error);
  }
  function refreshTask() {
    return state.mode === 'room' && state.code ? {name:'get',payload:{code:state.code}} : {name:'list',payload:{}};
  }
  function schedule() {
    clearPoll();
    if (!active || document.hidden || blocked() || running || queued) return;
    var room = state.room;
    if (state.mode === 'room' && room && !['pending','active'].includes(room.status) && !state.error) return;
    var delay = state.error ? 5000 : state.mode === 'room' && room?.status === 'active' ? 1000 : state.mode === 'room' ? 2000 : 5000;
    pollTimer = setTimeout(function() { enqueue(refreshTask()); },delay);
  }
  function enqueue(task) {
    if (!active || document.hidden) return;
    clearPoll();
    if (running) {
      if (!queued || task.user || !queued.user) queued = task;
      if (task.user) { state.mutating = true; render(false); }
      return;
    }
    execute(task);
  }
  function apply(task, value) {
    if (task.name === 'list') {
      var list = normalizeList(value);
      state.friends = list.friends;state.rooms = list.rooms;state.loaded = true;
    } else {
      var room = normalizeRoom(value);
      if (state.room && state.room.code === room.code && room.revision < state.room.revision) return;
      var previousRoom = state.room;
      if (previousRoom && previousRoom.code === room.code && room.revision > previousRoom.revision) {
        var oldMatches = previousRoom.cards.filter(function (card) { return card.matched; }).length;
        var newMatches = room.cards.filter(function (card) { return card.matched; }).length;
        if (room.status === 'complete' && previousRoom.status !== 'complete') window.LuminaAudio?.play('win');
        else if (newMatches > oldMatches) window.LuminaAudio?.play('match');
        else if (room.cards.some(function (card,index) { return card.flipped && !previousRoom.cards[index]?.flipped; })) window.LuminaAudio?.play('flip');
        else if (previousRoom.cards.some(function (card) { return card.flipped && !card.matched; })) window.LuminaAudio?.play('miss');
      }
      state.room = room;state.code = room.code;state.mode = 'room';state.loaded = true;
      if (task.returnToLobby) {
        state.mode = 'lobby';state.code = null;state.room = null;state.copyStatus = null;
        queued = {name:'list',payload:{}};
      }
    }
    state.error = null;
  }
  async function execute(task) {
    var job = {epoch:epoch,task:task};
    running = job;
    if (task.user) state.mutating = true;
    render(false);
    try {
      var value = await rpc(task.name,task.payload);
      if (active && job.epoch === epoch) apply(task,value);
    } catch(error) {
      if (active && job.epoch === epoch && error?.code !== 'LUMINA_CANCELED') {
        state.error = errorKeys[error?.code] ? error.code : 'LUMINA_UNAVAILABLE';
        if (['LUMINA_CONFLICT','LUMINA_TURN'].includes(state.error)) queued = refreshTask();
      }
    } finally {
      if (running === job) running = null;
      if (active && job.epoch === epoch) { state.mutating = false;render(false); }
      if (active && !document.hidden && queued && !running) {
        var next = queued;queued = null;enqueue(next);
      } else if (active && job.epoch === epoch) schedule();
    }
  }
  function errorNotice(section) {
    if (!state.error) return;
    var notice = node('div','lm-online-notice');
    notice.append(node('p','',t(errorKeys[state.error] || 'unavailable')));
    notice.firstChild.setAttribute('role','status');
    if (state.error === 'LUMINA_AUTH_REQUIRED') notice.append(action('navigate','signInAction',null,'teal',{destination:'profile'}));
    else if (state.error === 'LUMINA_FRIEND_REQUIRED') notice.append(action('navigate','manageFriends',null,'teal',{destination:'friends'}));
    else if (!['LUMINA_NOT_FOUND','LUMINA_EXPIRED'].includes(state.error)) notice.append(action('retry','retry',null,'secondary'));
    section.append(notice);
  }
  function header(section, backAction) {
    var top = node('div','lm-online-header');
    top.append(action(backAction || 'lobby','back',null,'secondary'));
    var heading = node('h1','lm-online-title',t('title'));heading.tabIndex = -1;top.append(heading);
    section.append(top);
  }
  function localActions(section) {
    var group = node('div','lm-online-secondary');
    group.append(action('local','sameDevice',null,'teal'));
    group.append(node('p','lm-online-hint',t('sameDeviceHint')));
    section.append(group);
  }
  function roomList(section) {
    var group = node('section','lm-online-invites');
    group.append(node('h2','',t('invites')));
    var available = state.rooms.filter(function(room) { return ['pending','active','complete'].includes(room.status); });
    if (!available.length) group.append(node('p','lm-online-hint',t('noInvites')));
    available.forEach(function(room) {
      var row = node('div','lm-online-room');
      var key = room.status === 'pending' ? (room.incoming ? 'incoming' : 'waiting') : room.status === 'active' ? 'active' : 'completed';
      row.append(node('p','lm-online-room-name',t(key,{name:room.friendAlias}) + (room.status === 'complete' ? ' · ' + room.friendAlias : '')));
      var controls = node('div','lm-online-row-actions');
      if (room.status === 'pending' && room.incoming) {
        controls.append(action('accept','accept',null,'',{code:room.code}));
        controls.append(action('decline','decline',null,'secondary',{code:room.code}));
      } else {
        controls.append(action('resume','resume',null,'',{code:room.code}));
        if (room.status === 'pending') controls.append(action('cancel','cancel',null,'secondary',{code:room.code}));
      }
      row.append(controls);group.append(row);
    });
    section.append(group);
  }
  function renderLobby(section) {
    header(section,'home');
    section.append(node('p','lm-online-hint',t('inboxHint')));
    errorNotice(section);
    if (state.error === 'LUMINA_AUTH_REQUIRED') {
      section.append(node('p','lm-online-hint',t('signIn')));
    } else if (!state.loaded) {
      var loading = node('p','lm-online-loading',t('loading'));loading.setAttribute('role','status');section.append(loading);
    } else {
      roomList(section);
      var friends = node('section','lm-online-friends');
      friends.append(node('h2','',t('invite')));
      friends.append(node('p','lm-online-hint',t('inviteHelp')));
      if (!state.friends.length) friends.append(node('p','lm-online-hint',t('empty')));
      state.friends.forEach(function(friend) {
        var row = node('div','lm-online-friend');
        var info = node('div','lm-online-friend-info');
        info.append(node('strong','',friend.alias));
        info.append(node('span','lm-online-presence' + (friend.online ? ' is-online' : ''),t(friend.online ? 'online' : 'offline')));
        row.append(info,action('invite','invite',null,'',{friend:friend.friend}));
        friends.append(row);
      });
      friends.append(action('navigate','manageFriends',null,'secondary',{destination:'friends'}));
      section.append(friends);
    }
    localActions(section);
  }
  function renderPending(section, room) {
    header(section);
    section.append(node('h2','lm-online-room-heading',t(room.player === 2 ? 'incoming' : 'waiting',{name:room.friendAlias})));
    if (room.player === 1) section.append(node('p','lm-online-hint',t('pendingSent')));
    errorNotice(section);
    var controls = node('div','lm-online-stack');
    if (room.player === 2) {
      controls.append(action('accept','accept',null,'',{code:room.code}));
      controls.append(action('decline','decline',null,'secondary',{code:room.code}));
    } else {
      controls.append(action('copy','copyLink',null,'teal',{code:room.code}));
      controls.append(action('cancel','cancel',null,'secondary',{code:room.code}));
    }
    section.append(controls);
    if (state.copyStatus) {
      var note = node('p','lm-online-hint',t(state.copyStatus));note.setAttribute('role','status');section.append(note);
      if (state.copyStatus === 'copyFailed') {
        var input = node('input','lm-online-link');input.type = 'text';input.readOnly = true;
        input.value = invitationUrl(room.code);input.setAttribute('aria-label',t('copyLink'));
        input.addEventListener('focus',function() {input.select();});section.append(input);
      }
    }
  }
  function makeBoard(section,room) {
    header(section);
    var plates = node('div','plates lm-online-plates');
    [1,2].forEach(function(player) {
      var plate = node('div','plate');plate.dataset.onlinePlayer = String(player);
      plate.append(node('span','lm-online-player-name'),node('strong','score'));
      plates.append(plate);
    });
    section.append(plates);
    var status = node('p','lm-online-turn');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.setAttribute('aria-atomic','true');
    section.append(status,node('p','lm-online-moves'));
    var board = node('div','grid lm-online-board');board.setAttribute('role','group');board.setAttribute('aria-label',t('cards'));
    room.cards.forEach(function(card) {
      var button = node('button','card lm-online-card');button.type = 'button';
      button.dataset.lmAction = 'flip';button.dataset.index = String(card.index);button.dataset.lmFocus = 'card:' + card.index;
      var back = node('span','face back');back.setAttribute('aria-hidden','true');
      var front = node('span','face front');front.setAttribute('aria-hidden','true');
      button.append(back,front);board.append(button);
    });
    section.append(board,node('div','lm-online-board-error'));
    section.append(action('leave','leave',null,'secondary',{code:room.code}));
  }
  function updateBoard(section,room) {
    var ownTurn = room.turn === room.player;
    var resolving = room.cards.filter(function(card) {return card.flipped && !card.matched;}).length >= 2;
    section.querySelectorAll('[data-online-player]').forEach(function(plate) {
      var player = Number(plate.dataset.onlinePlayer);
      plate.classList.toggle('active',player === room.turn);
      plate.querySelector('.lm-online-player-name').textContent = player === room.player ? t('you') : room.friendAlias;
      plate.querySelector('.score').textContent = String(room.scores[player - 1]);
      plate.setAttribute('aria-label',(player === room.player ? t('you') : room.friendAlias) + ': ' + room.scores[player - 1] + ' ' + t('score'));
    });
    var status = section.querySelector('.lm-online-turn');
    var turnText = t(ownTurn ? 'yourTurn' : 'theirTurn',{name:room.friendAlias});
    if (status.textContent !== turnText) status.textContent = turnText;
    section.querySelector('.lm-online-moves').textContent = t('moves') + ': ' + room.moves + ' · ' + t('matches') + ': ' + room.cards.filter(function(card){return card.matched;}).length / 2;
    section.querySelector('.lm-online-board').setAttribute('aria-label',t('cards'));
    room.cards.forEach(function(card) {
      var button = section.querySelector('[data-index="' + card.index + '"]');
      if (!button) return;
      var front = button.querySelector('.front');
      front.style.backgroundImage = card.art ? 'url("card_' + card.art + '.jpg")' : '';
      button.classList.toggle('flipped',card.flipped);
      button.classList.toggle('matched',card.matched);
      button.disabled = !ownTurn || resolving || state.mutating || !!state.error || card.matched || card.flipped;
      button.setAttribute('aria-pressed',String(card.flipped));
      button.setAttribute('aria-label',t(card.art ? 'shownCard' : 'hiddenCard',{n:card.index + 1,name:card.art ? artLabel(card.art) : ''}));
    });
    var errors = section.querySelector('.lm-online-board-error');errors.replaceChildren();errorNotice(errors);
    var leave = section.querySelector('[data-lm-action="leave"]');
    leave.disabled = state.mutating;leave.textContent = t('leave');
    section.querySelector('.lm-online-title').textContent = t('title');
    section.querySelector('[data-lm-action="lobby"]').textContent = t('back');
  }
  function renderResult(section,room) {
    header(section);
    var winner = room.winner === null ? (room.scores[0] === room.scores[1] ? 0 : room.scores[0] > room.scores[1] ? 1 : 2) : room.winner;
    var result = winner === 0 ? 'tie' : winner === room.player ? 'won' : 'lost';
    section.append(node('h2','lm-online-result-title',t(result,{name:room.friendAlias})));
    section.append(node('p','lm-online-result-score',t('you') + ': ' + room.scores[room.player-1] + ' · ' + room.friendAlias + ': ' + room.scores[2-room.player]));
    section.append(action('lobby','newGame',null,'teal'));
  }
  function render(focus) {
    if (!active || !state) return;
    app.dataset.screen = 'online';
    var room = state.room;
    var signature = state.mode === 'lobby' ? 'lobby' : blocked() ? 'blocked' : room ? room.code + ':' + room.status : 'loading';
    var previousFocus = app.contains(document.activeElement) ? document.activeElement.dataset?.lmFocus : null;
    var previous = app.querySelector('.lm-online');
    if (signature === state.signature && room?.status === 'active' && !blocked() && previous?.querySelector('.lm-online-board')) {
      updateBoard(previous,room);return;
    }
    var section = node('section','screen lm-online');
    if (state.mode === 'lobby') renderLobby(section);
    else if (blocked()) {
      header(section);errorNotice(section);section.append(action('lobby','newGame',null,'teal'));localActions(section);
    } else if (!room) {
      header(section);errorNotice(section);var loading = node('p','lm-online-loading',t('loading'));loading.setAttribute('role','status');section.append(loading);
    } else if (room.status === 'pending') renderPending(section,room);
    else if (room.status === 'active') {makeBoard(section,room);updateBoard(section,room);}
    else if (room.status === 'complete') renderResult(section,room);
    else {header(section);section.append(node('p','lm-online-room-heading',t('ended')));section.append(action('lobby','newGame',null,'teal'));}
    app.replaceChildren(section);state.signature = signature;
    if (previousFocus) {
      var control = Array.from(section.querySelectorAll('[data-lm-focus]')).find(function(el){return el.dataset.lmFocus === previousFocus && !el.disabled;});
      if (control) control.focus({preventScroll:true});
    } else if (focus) section.querySelector('h1')?.focus({preventScroll:true});
  }
  function lobby() {
    clearPoll();epoch++;abortRpc();queued = null;
    state.mode = 'lobby';state.code = null;state.room = null;state.error = null;state.copyStatus = null;state.mutating = false;
    render(true);enqueue({name:'list',payload:{}});
  }
  function openRoom(code) {
    if (!validCode(code)) return;
    clearPoll();epoch++;abortRpc();queued = null;
    state.mode = 'room';state.code = code;state.room = null;state.error = null;state.copyStatus = null;state.mutating = false;
    render(true);enqueue({name:'get',payload:{code:code}});
  }
  function invitationUrl(code) {return location.origin + '/?lumina=' + encodeURIComponent(code);}
  async function copyLink(code) {
    if (!validCode(code)) return;
    var currentEpoch = epoch;
    try {await navigator.clipboard.writeText(invitationUrl(code));if(active && epoch === currentEpoch)state.copyStatus = 'copied';}
    catch (_) {if(active && epoch === currentEpoch)state.copyStatus = 'copyFailed';}
    if (active && epoch === currentEpoch) render(false);
  }
  function navigate(destination) {
    if (!['profile','friends'].includes(destination)) return;
    if (window.parent !== window) window.parent.postMessage({type:'lumina:navigate',destination:destination},location.origin);
  }
  function click(event) {
    var button = event.target.closest('button[data-lm-action]');
    if (!active || !button || !app.contains(button) || button.disabled) return;
    var name = button.dataset.lmAction, code = button.dataset.code;
    if (name === 'home' || name === 'local') {
      var callback = name === 'home' ? callbacks.onHome : callbacks.onLocal;
      destroy();if (typeof callback === 'function') callback();return;
    }
    if (name === 'navigate') {navigate(button.dataset.destination);return;}
    if (name === 'copy') {copyLink(code);return;}
    if (name === 'lobby') {lobby();return;}
    if (name === 'resume') {openRoom(code);return;}
    if (name === 'retry') {enqueue(refreshTask());return;}
    if (state.mutating) return;
    if (name === 'invite') {
      var friend = state.friends.find(function(item){return item.friend === button.dataset.friend;});
      if (friend) enqueue({name:'create',payload:{friend:friend.friend},user:true});
    } else if (['accept','decline','cancel','leave'].includes(name) && validCode(code)) {
      enqueue({name:name,payload:{code:code},user:true,returnToLobby:name !== 'accept'});
    } else if (name === 'flip' && state.room?.status === 'active') {
      var card = state.room.cards.find(function(item){return item.index === Number(button.dataset.index);});
      if (card && !card.matched && !card.flipped && state.room.turn === state.room.player) {
        enqueue({name:'flip',payload:{code:state.room.code,index:card.index,revision:state.room.revision},user:true});
      }
    }
  }
  function visibility() {
    if (!active) return;
    if (document.hidden) {clearPoll();epoch++;queued = null;abortRpc();state.mutating = false;}
    else {state.error = null;enqueue(refreshTask());}
  }
  function emptyState() {
    return {mode:'lobby',code:null,room:null,friends:[],rooms:[],error:null,loaded:false,mutating:false,copyStatus:null,signature:null};
  }
  function resetAuthorization() {
    // Authentication changes invalidate every private row and pending response
    // before the bridge is asked to read the new account's authorized view.
    epoch++;clearPoll();queued = null;abortRpc();state = emptyState();
    render(false);enqueue({name:'list',payload:{}});
  }
  function setLanguage(value) {
    var lang = String(value || 'en').toLowerCase();
    language = lang.startsWith('pt') ? 'pt-BR' : lang.split('-')[0];
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    if (active) render(false);
  }
  function destroy() {
    active = false;epoch++;clearPoll();queued = null;abortRpc();callbacks = {};state = null;
    window.removeEventListener('message',receive);
    window.removeEventListener('pagehide',destroy);
    document.removeEventListener('visibilitychange',visibility);
    app.removeEventListener('click',click);
  }
  function open(options) {
    destroy();options = options || {};
    setLanguage(document.documentElement.lang || new URLSearchParams(location.search).get('lang') || 'en');
    active = true;callbacks = options;
    state = emptyState();
    window.addEventListener('message',receive);
    window.addEventListener('pagehide',destroy);
    document.addEventListener('visibilitychange',visibility);
    app.addEventListener('click',click);
    if (validCode(options.roomCode)) {state.mode = 'room';state.code = options.roomCode;}
    render(true);enqueue(refreshTask());
  }
  window.LuminaOnline = {open:open,setLanguage:setLanguage,destroy:destroy};
})();
