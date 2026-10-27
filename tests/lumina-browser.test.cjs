/* Supplied browser game behavior. This harness runs actual DOM event handlers,
 * with deterministic settlement timers; rendered layout is checked separately. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {JSDOM} = require('jsdom');
const ROOT = path.resolve(__dirname,'..');
const read = name => fs.readFileSync(path.join(ROOT,name),'utf8');
const gameSource = read('lumina-match/browser/lumina-game.js');
function game(t, options = {}) {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url:'https://matchapp.tv/lumina-match/browser/index.html?lang='+(options.lang||'en'),runScripts:'outside-only'
  });
  t.after(()=>dom.window.close());
  const w = dom.window, timers = new Map(),messages = []; let timerId = 0, onlineOptions;
  const parent = options.embedded ? {postMessage(value,origin){messages.push({value:JSON.parse(JSON.stringify(value)),origin});}} : w;
  if(options.embedded) Object.defineProperty(w,'parent',{value:parent});
  w.setTimeout = fn => { timers.set(++timerId,fn); return timerId; };
  w.clearTimeout = id => timers.delete(id);
  w.LuminaOnline = {open(opts){onlineOptions=opts;},destroy(){},setLanguage(){}};
  if(options.blockStorage) Object.defineProperty(w,'localStorage',{get(){throw Error('blocked');}});
  else if(options.storage) for(const [key,value] of Object.entries(options.storage)) w.localStorage.setItem(key,value);
  if(options.failStorageWrites) Object.defineProperty(w.Storage.prototype,'setItem',{value(){throw Error('quota exceeded');}});
  w.eval(read('lumina-match/browser/i18n.js'));
  w.eval(read('lumina-match/browser/progress-i18n.js'));
  w.eval(gameSource);
  const click = selector => { const el = w.document.querySelector(selector); assert.ok(el,selector);el.click();return el; };
  const settle = () => { const pending = [...timers.values()];timers.clear();pending.forEach(fn=>fn()); };
  const groups = () => {
    const groups = new Map();
    for(const el of w.document.querySelectorAll('[data-card]')) {
      const art = el.querySelector('.front').style.backgroundImage;
      if(!groups.has(art)) groups.set(art,[]);groups.get(art).push(el);
    }
    return [...groups.values()];
  };
  const receive = (value,extra={}) => w.dispatchEvent(new w.MessageEvent('message',{
    source:extra.source || parent,origin:extra.origin || 'https://matchapp.tv',data:value
  }));
  const progress = (mode,extra={}) => receive({type:'lumina:progress-state',mode,...extra});
  const stored = () => Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{
    const key=w.localStorage.key(i);return [key,w.localStorage.getItem(key)];
  }));
  return {w,click,settle,groups,timers,messages,receive,progress,stored,localFriends(){click('[data-action="friends"]');assert.ok(onlineOptions);onlineOptions.onLocal();}};
}
test('Home alone loads the launcher and game payload stays opt-in',()=>{
  const html=read('index.html'), launcher=read('lumina-match/launcher.js');
  assert.equal((html.match(/\/lumina-match\/launcher\.js/g)||[]).length,1);
  assert.match(html,/launcher\.js\?v=20261027-2/);
  assert.match(html,/lumina\.css\?v=20261027-2/);
  assert.doesNotMatch(html,/lumina-match\/browser\//);
  assert.match(launcher,/import\('\/lumina-match\/game\.mjs/);
  for(const name of ['android/index.html','kids/index.html']) assert.doesNotMatch(read(name),/lumina-match/);
});
test('every supplied artwork file is preserved byte-for-byte',()=>{
  const provenance=JSON.parse(read('lumina-match/browser/source.json'));
  assert.equal(provenance.source,'LuminaMatch_Browser.zip');
  assert.equal(Object.keys(provenance.artwork).length,9);
  for(const [name,sha] of Object.entries(provenance.artwork)) {
    const bytes=fs.readFileSync(path.join(ROOT,'lumina-match/browser',name));
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),sha,name);
  }
});
test('all14 locales have complete strings and identical placeholders',t=>{
  const {w}=game(t);const dictionaries=w.LuminaMessages,expected=Object.keys(dictionaries.en).sort();
  assert.equal(Object.keys(dictionaries).length,14);
  for(const [lang,dict] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dict).sort(),expected,lang);
    for(const key of expected){assert.ok(dict[key].trim(),lang+key);assert.deepEqual([...dict[key].matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),[...dictionaries.en[key].matchAll(/\{\w+\}/g)].map(m=>m[0]).sort(),lang+key);}
  }
  assert.ok(w.document.querySelector('[data-action="friends"]'));
  assert.doesNotMatch(w.document.body.textContent,/coming in full build|350|Levels/);
});
test('solo completes six pairs, preserves card nodes through flips and saves points',t=>{
  const {w,click,settle,groups}=game(t);
  click('[data-action="solo"]');const pairs=groups();
  assert.equal(pairs.length,6);assert.ok(pairs.every(p=>p.length===2));
  for(const [a,b] of pairs){a.click();assert.equal(w.document.querySelector('[data-card="'+a.dataset.card+'"]'),a);b.click();settle();}
  assert.equal(w.document.querySelector('#app').dataset.screen,'result');
  assert.match(w.document.body.textContent,/Round complete/);
  assert.equal(w.localStorage.getItem('luminaPoints'),'10');
  assert.equal(w.localStorage.getItem('luminaBrowserRounds'),'1');
  click('[data-action="home"]');assert.match(w.document.body.textContent,/Rounds cleared: 1/);
});
test('leaving during two-card delay cannot corrupt a new round',t=>{
  const {w,click,settle,groups,timers}=game(t);click('[data-action="solo"]');
  const old=groups();old[0][0].click();old[1][0].click();assert.equal(timers.size,1);
  click('[data-action="home"]');click('[data-action="solo"]');settle();
  assert.equal(w.document.querySelectorAll('.flipped').length,0);
  assert.match(w.document.querySelector('.game-status').textContent,/Moves 0/);
  const pair=groups()[0];pair[0].click();pair[1].click();settle();
  assert.equal(w.document.querySelectorAll('.matched').length,2);
});
test('same-screen friends keep their turn on a pair and switch after a miss',t=>{
  const fixture=game(t);const {w,settle,groups,click}=fixture;fixture.localFriends();
  const pairs=groups();pairs[0][0].click();pairs[0][1].click();settle();
  assert.equal(w.document.querySelector('.plate.active').dataset.player,'1');
  assert.equal(w.document.querySelector('[data-player="1"] .score').textContent,'1');
  pairs[1][0].click();pairs[2][0].click();settle();
  assert.equal(w.document.querySelector('.plate.active').dataset.player,'2');
  for(const pair of pairs.slice(1)){pair[0].click();pair[1].click();settle();}
  assert.match(w.document.querySelector('h1').textContent,/Player 2 wins/);
  assert.equal(w.localStorage.getItem('luminaPoints'),null);
  click('[data-action="localfriends"]');assert.equal(w.document.querySelectorAll('[data-card]').length,12);
});
test('unavailable storage and corrupt saved values do not prevent gameplay',t=>{
  const fixture=game(t,{blockStorage:true});fixture.click('[data-action="solo"]');
  for(const pair of fixture.groups()){pair[0].click();pair[1].click();fixture.settle();}
  assert.equal(fixture.w.document.querySelector('#app').dataset.screen,'result');
  assert.match(fixture.w.document.body.textContent,/session only/);
  const corrupt=game(t,{storage:{luminaPoints:'NaN',luminaBrowserRounds:'-5'}});
  assert.match(corrupt.w.document.body.textContent,/Rounds cleared: 0 · 0 points/);
});
test('a write-only guest storage failure immediately reports session-only saving during play',t=>{
  const f=game(t,{failStorageWrites:true});
  assert.doesNotMatch(f.w.document.querySelector('.save-status').textContent,/session only/);
  f.click('[data-action="solo"]');
  assert.match(f.w.document.querySelector('.save-status').textContent,/session only/);
  assert.doesNotMatch(f.w.document.querySelector('.save-status').textContent,/saved on this browser/);
  const pair=f.groups()[0];pair[0].click();pair[1].click();f.settle();
  assert.equal(f.w.document.querySelectorAll('.matched').length,2);
  assert.equal(f.w.localStorage.getItem('luminaPoints'),null);
});
test('pagehide clears unmatched flips so a restored round remains playable',t=>{
  const {w,click,settle,groups}=game(t);click('[data-action="solo"]');
  const pair=groups()[0];pair[0].click();
  w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}));
  w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));
  assert.equal(w.document.querySelectorAll('.flipped').length,0);
  pair[0].click();pair[1].click();settle();assert.equal(w.document.querySelectorAll('.matched').length,2);
});
test('selected Portuguese and Arabic render localized accessible controls',t=>{
  const pt=game(t,{lang:'pt-BR'});pt.click('[data-action="solo"]');
  assert.equal(pt.w.document.documentElement.lang,'pt-BR');
  assert.doesNotMatch(pt.w.document.querySelector('.game-status').textContent,/Moves|Pairs/);
  const ar=game(t,{lang:'ar'});assert.equal(ar.w.document.documentElement.dir,'rtl');
  ar.click('[data-action="solo"]');assert.ok(ar.w.document.querySelector('[data-card]').getAttribute('aria-label'));
});
test('embedded game honors reduced motion without adding ad SDKs or external assets',()=>{
  const sources=['lumina-match/game.mjs','lumina-match/browser/index.html','lumina-match/browser/lumina-game.js','lumina-match/browser/style.css'].map(read).join('\n');
  assert.match(sources,/reduce-motion/);assert.match(sources,/prefers-reduced-motion/);
  assert.doesNotMatch(sources,/adsbygoogle|ca-pub-|googletag|serviceWorker\.register|user-scalable=no/);
});

const asPlain = value => JSON.parse(JSON.stringify(value));
function savedGame(points=40, moves=3, matchedPairs=1) {
  const names=['moon','star','planet','heart','crystal','sun'];
  return {points,rounds:Math.floor(points/10),activeRound:{moves,
    cards:names.concat(names).map((art,index)=>({art,matched:index%6<matchedPairs}))
  }};
}

test('guest unfinished solo rounds persist and Continue restores the same board, matches and moves',t=>{
  const original=game(t);original.click('[data-action="solo"]');
  const first=original.groups()[0];first[0].click();first[1].click();original.settle();
  const before=asPlain(original.w.LuminaGameProgress.snapshot());
  assert.equal(before.activeRound.cards.filter(card=>card.matched).length,2);
  assert.equal(before.activeRound.moves,1);
  original.click('[data-action="home"]');
  assert.ok(original.w.document.querySelector('[data-action="continue"]'));
  const reopened=game(t,{storage:original.stored()});
  reopened.click('[data-action="continue"]');
  assert.deepEqual(asPlain(reopened.w.LuminaGameProgress.snapshot()),before);
  assert.equal(reopened.w.document.querySelectorAll('.matched').length,2);
  assert.match(reopened.w.document.querySelector('.game-status').textContent,/Moves 1/);
  assert.equal(reopened.w.document.querySelectorAll('.flipped:not(.matched)').length,0);
});

test('embedded startup disables solo actions until the trusted parent resolves progress ownership',t=>{
  const f=game(t,{embedded:true,storage:{luminaPoints:'90',luminaBrowserRounds:'9'}});
  assert.equal(f.w.document.querySelector('[data-action="solo"]').disabled,true);
  f.click('[data-action="solo"]');assert.equal(f.w.document.querySelector('#app').dataset.screen,'home');
  assert.equal(f.messages.filter(item=>item.value.type==='lumina:progress-load').length,1);
  assert.equal(f.messages.filter(item=>item.value.type==='lumina:progress-change').length,0);
  f.receive({type:'lumina:progress-state',mode:'guest'},{origin:'https://example.invalid'});
  f.receive({type:'lumina:progress-state',mode:'guest'},{source:{}});
  assert.equal(f.w.document.querySelector('[data-action="solo"]').disabled,true);
  f.progress('guest');assert.equal(f.w.document.querySelector('[data-action="solo"]').disabled,false);
  f.click('[data-action="solo"]');assert.equal(f.w.document.querySelectorAll('[data-card]').length,12);
});

test('account progress restores an unfinished board and keeps guest storage separate',t=>{
  const guest=savedGame(20,1,0),cloud=savedGame(80,9,2);
  const storage={luminaPoints:'20',luminaBrowserRounds:'2',luminaBrowserRound:JSON.stringify(guest.activeRound)};
  const f=game(t,{embedded:true,storage});
  f.progress('account',{progress:cloud,revision:7});
  assert.match(f.w.document.querySelector('.stats').textContent,/8.*80/);
  assert.ok(f.w.document.querySelector('[data-action="continue"]'));
  f.click('[data-action="continue"]');
  assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),cloud);
  assert.equal(f.w.document.querySelectorAll('.matched').length,4);
  const available=f.groups().find(pair=>!pair[0].disabled);
  available[0].click();available[1].click();f.settle();
  const change=f.messages.filter(item=>item.value.type==='lumina:progress-change').at(-1).value.progress;
  assert.equal(change.points,80);assert.equal(change.activeRound.moves,10);
  assert.equal(change.activeRound.cards.filter(card=>card.matched).length,6);
  assert.deepEqual(f.stored(),storage,'Account play must not overwrite the separate guest save');
});

test('a new account starts clean rather than importing guest counters or an unfinished round',t=>{
  const guest=savedGame(90,6,2);
  const storage={luminaPoints:'90',luminaBrowserRounds:'9',luminaBrowserRound:JSON.stringify(guest.activeRound)};
  const f=game(t,{embedded:true,storage});f.progress('account',{progress:null,revision:0});
  assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),{points:0,rounds:0,activeRound:null});
  assert.equal(f.w.document.querySelector('[data-action="continue"]'),null);
  assert.equal(f.messages.filter(item=>item.value.type==='lumina:progress-change').length,0);
  assert.deepEqual(f.stored(),storage);
});

test('auth reset immediately clears old-account board and counters, then restores the independent guest save',t=>{
  const guest=savedGame(20,2,1),cloud=savedGame(120,8,2);
  const storage={luminaPoints:'20',luminaBrowserRounds:'2',luminaBrowserRound:JSON.stringify(guest.activeRound)};
  const f=game(t,{embedded:true,storage});f.progress('account',{progress:cloud,revision:4});f.click('[data-action="continue"]');
  const pair=f.groups().find(group=>!group[0].disabled);pair[0].click();pair[1].click();
  assert.equal(f.timers.size,1);
  f.progress('loading',{progress:null,revision:null});
  assert.equal(f.w.document.querySelectorAll('[data-card]').length,0);
  assert.equal(f.w.document.querySelector('[data-action="continue"]'),null);
  assert.equal(f.w.document.querySelector('[data-action="solo"]').disabled,true);
  assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),{points:0,rounds:0,activeRound:null});
  assert.equal(f.timers.size,0);f.settle();
  f.progress('guest');
  assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),guest);
  assert.deepEqual(f.stored(),storage);
});

test('saving and saved acknowledgments preserve live card nodes, pending flips and the newest solo state',t=>{
  const f=game(t,{embedded:true});f.progress('account',{progress:null,revision:0});f.click('[data-action="solo"]');
  const pair=f.groups()[0],nodes=[...f.w.document.querySelectorAll('[data-card]')];
  pair[0].click();pair[1].click();assert.equal(f.timers.size,1);
  const pending=asPlain(f.w.LuminaGameProgress.snapshot());
  f.progress('saving');f.progress('saved',{revision:1,progress:{points:0,rounds:0,activeRound:null}});
  assert.deepEqual([...f.w.document.querySelectorAll('[data-card]')],nodes);
  assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),pending);
  assert.equal(f.timers.size,1);assert.equal(f.w.document.querySelectorAll('.flipped').length,2);
  f.settle();assert.equal(f.w.document.querySelectorAll('.matched').length,2);
  f.progress('saving');f.progress('saved',{revision:2});
  assert.deepEqual([...f.w.document.querySelectorAll('[data-card]')],nodes);
  assert.equal(f.w.LuminaGameProgress.snapshot().activeRound.cards.filter(card=>card.matched).length,2);
});

test('offline or conflicting account saves block solo input until an explicit reload resolves it',t=>{
  for(const mode of ['offline','conflict']) {
    const f=game(t,{embedded:true});f.progress('account',{progress:savedGame(30,4,1),revision:3});f.click('[data-action="continue"]');
    const nodes=[...f.w.document.querySelectorAll('[data-card]')],before=asPlain(f.w.LuminaGameProgress.snapshot());
    f.progress(mode);assert.ok(nodes.every(card=>card.disabled));
    nodes.find(card=>!card.classList.contains('matched')).click();
    assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),before);
    assert.ok(f.w.document.querySelector('[data-action="reload-save"]'));
    const loads=f.messages.filter(item=>item.value.type==='lumina:progress-load').length;
    f.click('[data-action="reload-save"]');
    assert.equal(f.messages.filter(item=>item.value.type==='lumina:progress-load').length,loads+1);
    assert.ok(nodes.every(card=>card.disabled));
    const restored=savedGame(50,7,2);f.progress('account',{progress:restored,revision:8});
    assert.equal(f.w.document.querySelector('#app').dataset.screen,'home');
    f.click('[data-action="continue"]');assert.deepEqual(asPlain(f.w.LuminaGameProgress.snapshot()),restored);
  }
});

test('offline startup never enables or posts guest progress as account progress',t=>{
  const guest=savedGame(70,3,1);
  const f=game(t,{embedded:true,storage:{luminaPoints:'70',luminaBrowserRounds:'7',luminaBrowserRound:JSON.stringify(guest.activeRound)}});
  f.progress('offline');
  assert.equal(f.w.document.querySelector('[data-action="solo"]').disabled,true);
  assert.equal(f.w.document.querySelector('[data-action="continue"]').disabled,true);
  f.click('[data-action="continue"]');assert.equal(f.w.document.querySelectorAll('[data-card]').length,0);
  assert.equal(f.messages.filter(item=>item.value.type==='lumina:progress-change').length,0);
});

test('closing during the final pair delay saves only settled cards and cannot award a round twice',t=>{
  const f=game(t);f.click('[data-action="solo"]');const pairs=f.groups();
  for(const pair of pairs.slice(0,5)){pair[0].click();pair[1].click();f.settle();}
  pairs[5][0].click();pairs[5][1].click();assert.equal(f.timers.size,1);
  const closing=asPlain(f.w.LuminaGameProgress.snapshot());
  assert.equal(closing.points,0);assert.equal(closing.rounds,0);
  assert.equal(closing.activeRound.cards.filter(card=>card.matched).length,10);
  assert.equal(closing.activeRound.moves,6);
  assert.ok(closing.activeRound.cards.every(card=>Object.keys(card).sort().join(',')==='art,matched'));
  // A caller gets a copy; altering a snapshot cannot mutate the live round.
  const changed=f.w.LuminaGameProgress.snapshot();changed.activeRound.cards[0].art='not-game-art';
  assert.notEqual(f.w.LuminaGameProgress.snapshot().activeRound.cards[0].art,'not-game-art');
  f.w.dispatchEvent(new f.w.PageTransitionEvent('pagehide',{persisted:false}));f.settle();
  assert.equal(f.w.localStorage.getItem('luminaPoints'),'0');
  const resumed=game(t,{storage:f.stored()});resumed.click('[data-action="continue"]');
  assert.equal(resumed.w.document.querySelectorAll('.flipped:not(.matched)').length,0);
  const remaining=resumed.groups().find(pair=>!pair[0].disabled);remaining[0].click();remaining[1].click();resumed.settle();
  assert.equal(resumed.w.localStorage.getItem('luminaPoints'),'10');
  assert.equal(resumed.w.localStorage.getItem('luminaBrowserRounds'),'1');
  assert.equal(resumed.w.localStorage.getItem('luminaBrowserRound'),'null');
  resumed.w.dispatchEvent(new resumed.w.PageTransitionEvent('pagehide',{persisted:false}));resumed.settle();
  const completed=game(t,{storage:resumed.stored()});
  assert.equal(completed.w.document.querySelector('[data-action="continue"]'),null);
  assert.equal(completed.w.LuminaGameProgress.snapshot().points,10);
  assert.equal(completed.w.LuminaGameProgress.snapshot().rounds,1);
});

test('a partial compatibility-counter write cannot replay a completed guest round after reload',t=>{
  const f=game(t);f.click('[data-action="solo"]');const pairs=f.groups();
  for(const pair of pairs.slice(0,5)){pair[0].click();pair[1].click();f.settle();}
  const originalSet=f.w.Storage.prototype.setItem;
  let failedMirror=false;
  f.w.Storage.prototype.setItem=function(key,value) {
    if(key==='luminaBrowserRounds'&&value==='1') {failedMirror=true;throw Error('quota exceeded');}
    return originalSet.call(this,key,value);
  };
  pairs[5][0].click();pairs[5][1].click();f.settle();
  assert.equal(failedMirror,true,'The fixture must reproduce the partial legacy-write failure');
  assert.equal(f.w.document.querySelector('#app').dataset.screen,'result');
  assert.equal(f.w.localStorage.getItem('luminaBrowserRounds'),'0');
  const complete={points:10,rounds:1,activeRound:null};
  assert.deepEqual(JSON.parse(f.w.localStorage.getItem('luminaBrowserProgress')),complete);
  const reopened=game(t,{storage:f.stored()});
  assert.equal(reopened.w.document.querySelector('[data-action="continue"]'),null);
  assert.deepEqual(asPlain(reopened.w.LuminaGameProgress.snapshot()),complete);
  assert.match(reopened.w.document.querySelector('.stats').textContent,/Rounds cleared: 1 · 10 points/);
  const staleMirrors={...f.stored(),luminaPoints:'900',luminaBrowserRounds:'90'};
  const freshReload=game(t,{storage:staleMirrors});
  assert.deepEqual(asPlain(freshReload.w.LuminaGameProgress.snapshot()),complete,
    'Fresh loads must use the complete canonical snapshot rather than stale independent counters');
  assert.equal(freshReload.w.document.querySelector('[data-action="continue"]'),null);
});
