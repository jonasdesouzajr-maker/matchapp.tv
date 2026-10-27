/* Online frame state/bridge tests. No network, accounts, invitations or rendered
 * browser assertions are performed; authoritative SQL is tested separately. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const source = name => fs.readFileSync(path.join(__dirname, '../lumina-match/browser', name), 'utf8');
const scripts = ['i18n.js','online-i18n.js','online.js'].map(source);
const settle = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));
const CODE = '0123456789abcdef12345678';
const list = (alias = 'Julio') => ({friends:[{friend:'accepted-friend-id',alias,online:true}],rooms:[]});
function room(overrides = {}) {
  return Object.assign({code:CODE,status:'active',player:1,turn:1,scores:[0,0],
    cards:Array.from({length:12},(_,index)=>({index,art:null,matched:false,flipped:false})),
    moves:0,revision:0,friendAlias:'Julio',winner:null},overrides);
}
function fixture(t, language = 'en') {
  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url:'https://matchapp.tv/lumina-match/browser/',runScripts:'outside-only',pretendToBeVisual:true
  });
  const w = dom.window, d = w.document, sent = [], clipboard = [];
  d.documentElement.lang = language;
  const parent = {postMessage(message, origin) {sent.push({message,origin});}};
  Object.defineProperty(w,'parent',{value:parent});
  Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{clipboard.push(value);}},configurable:true});
  let time = 0, timerId = 0;
  const timers = new Map();
  w.setTimeout = (callback, delay) => {const id=++timerId;timers.set(id,{callback,at:time+delay});return id;};
  w.clearTimeout = id => timers.delete(id);
  scripts.forEach(script => w.eval(script));
  t.after(async () => {w.LuminaOnline.destroy();await settle();dom.window.close();});
  const rpcCalls = () => sent.filter(item=>item.message.type==='lumina:rpc');
  const latest = () => rpcCalls().at(-1).message;
  function message(data, options = {}) {
    w.dispatchEvent(new w.MessageEvent('message',{
      source:options.source || parent,origin:options.origin || 'https://matchapp.tv',data
    }));
  }
  function answer(data, options = {}) {
    message({type:'lumina:rpc-result',id:options.id || latest().id,data,
      error:options.error ? {code:options.error} : undefined},options);
  }
  function click(selector) {const el=d.querySelector(selector);assert.ok(el,'Missing control '+selector);el.click();}
  async function advance(duration) {
    const target = time + duration;
    let count = 0;
    while (true) {
      const next=[...timers].filter(([,value])=>value.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
      if (!next) break;
      assert.ok(++count<200,'Unexpected timer loop');
      time=next[1].at;timers.delete(next[0]);next[1].callback();await settle();
    }
    time=target;await settle();
  }
  async function hidden(value) {
    Object.defineProperty(d,'hidden',{configurable:true,value});
    d.dispatchEvent(new w.Event('visibilitychange'));await settle();
  }
  return {w,d,sent,clipboard,rpcCalls,latest,answer,message,click,advance,hidden};
}

test('online friends are requested only through the parent bridge and aliases remain plain text', async t => {
  const f=fixture(t,'pt-BR');let local=0;
  f.w.LuminaOnline.open({onLocal:()=>local++});
  assert.equal(f.latest().action,'list');
  assert.equal(f.sent[0].origin,'https://matchapp.tv');
  assert.equal(f.d.documentElement.lang,'pt-BR');
  f.answer(list('<img src=x onerror=alert(1)>'));await settle();
  assert.equal(f.d.querySelector('img'),null);
  assert.ok(f.d.body.textContent.includes('<img src=x onerror=alert(1)>'));
  assert.equal(f.d.querySelector('.lm-online-title').textContent,f.w.LuminaOnlineMessages['pt-BR'].title);
  assert.equal(f.rpcCalls().length,1,'Rendering a friend must never send an invitation');
  f.click('[data-lm-action="local"]');assert.equal(local,1);
  await f.advance(20000);assert.equal(f.rpcCalls().length,1,'Local play must stop online polling');
});

test('host invitation is explicit, uses an accepted friend identity, and copies a link only on click', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({});f.answer(list());await settle();
  assert.equal(f.clipboard.length,0);
  f.click('[data-lm-action="invite"]');
  assert.equal(f.latest().action,'create');
  assert.deepEqual(plain(f.latest().payload),{friend:'accepted-friend-id'});
  f.answer(room({status:'pending',cards:[]}));await settle();
  assert.equal(f.d.querySelector('[data-lm-action="accept"]'),null);
  assert.ok(f.d.querySelector('[data-lm-action="cancel"]'));
  assert.equal(f.clipboard.length,0);
  f.click('[data-lm-action="copy"]');await settle();
  assert.deepEqual(f.clipboard,['https://matchapp.tv/?lumina='+CODE]);
  assert.ok(f.d.body.textContent.includes(f.w.LuminaOnlineMessages.en.copied));
});

test('opening an invitation does not accept it until the invited player clicks Accept', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({roomCode:CODE});
  assert.equal(f.latest().action,'get');
  f.answer(room({status:'pending',player:2,cards:[]}));await settle();
  assert.equal(f.rpcCalls().length,1);
  assert.ok(f.d.querySelector('[data-lm-action="accept"]'));
  assert.ok(f.d.querySelector('[data-lm-action="decline"]'));
  assert.equal(f.d.querySelector('[data-lm-action="cancel"]'),null);
  f.click('[data-lm-action="accept"]');assert.equal(f.latest().action,'accept');
  f.answer(room({player:2}));await settle();
  assert.ok([...f.d.querySelectorAll('.lm-online-card')].every(card=>card.disabled));
});

test('the online board renders only revealed server artwork and sends index plus revision, never a deck', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({roomCode:CODE});f.answer(room());await settle();
  assert.equal(f.d.querySelectorAll('.lm-online-card').length,12);
  assert.ok([...f.d.querySelectorAll('.front')].every(face=>!face.style.backgroundImage));
  f.click('[data-index="0"]');
  assert.deepEqual(plain(f.latest().payload),{code:CODE,index:0,revision:0});
  let view=room({revision:1});view.cards[0]={index:0,art:'moon',matched:false,flipped:true};
  f.answer(view);await settle();
  assert.match(f.d.querySelector('[data-index="0"] .front').style.backgroundImage,/card_moon\.jpg/);
  assert.equal(f.d.querySelector('[data-index="1"] .front').style.backgroundImage,'');
  f.click('[data-index="1"]');assert.equal(f.latest().payload.revision,1);
  view=room({revision:2,turn:2,moves:1});view.cards[0]={index:0,art:'moon',matched:false,flipped:true};view.cards[1]={index:1,art:'star',matched:false,flipped:true};
  f.answer(view);await settle();
  assert.ok([...f.d.querySelectorAll('.lm-online-card')].every(card=>card.disabled));
  assert.equal(f.d.querySelector('[data-index="2"] .front').style.backgroundImage,'');
});

test('language changes preserve the active server board and translate every supported locale with Arabic RTL', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({roomCode:CODE});
  const view=room({revision:4,scores:[1,0]});view.cards[0]={index:0,art:'moon',matched:true,flipped:true};
  f.answer(view);await settle();
  const firstCard=f.d.querySelector('[data-index="0"]');
  for (const language of Object.keys(f.w.LuminaOnlineMessages)) {
    f.w.LuminaOnline.setLanguage(language);
    assert.equal(f.d.querySelector('[data-index="0"]'),firstCard,'Locale changes must preserve the active board nodes');
    assert.equal(f.d.querySelector('.lm-online-title').textContent,f.w.LuminaOnlineMessages[language].title);
    assert.equal(f.d.documentElement.dir,language==='ar'?'rtl':'ltr');
    assert.ok(firstCard.getAttribute('aria-label').includes(f.w.LuminaMessages[language].moon));
  }
  assert.equal(f.rpcCalls().length,1,'Translation must not restart the match');
  assert.equal(f.d.querySelector('[data-online-player="1"] .score').textContent,'1');
});

test('a pending read and user mutation are serialized without overlapping requests', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({});f.answer(list());await settle();
  await f.advance(5000);assert.equal(f.latest().action,'list');
  const before=f.rpcCalls().length;
  f.click('[data-lm-action="invite"]');
  assert.equal(f.rpcCalls().length,before,'User action waits for the pending read');
  f.answer(list());await settle();
  assert.equal(f.rpcCalls().length,before+1);assert.equal(f.latest().action,'create');
});

test('revision conflicts resync with a read and never replay the failed flip automatically', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({roomCode:CODE});f.answer(room());await settle();
  f.click('[data-index="0"]');f.answer(null,{error:'LUMINA_CONFLICT'});await settle();
  assert.equal(f.latest().action,'get');
  assert.equal(f.rpcCalls().filter(call=>call.message.action==='flip').length,1);
  f.answer(room({turn:2,revision:5}));await settle();
  assert.ok([...f.d.querySelectorAll('.lm-online-card')].every(card=>card.disabled));
});

test('a 15-second timeout offers read-only recovery without duplicating a mutation', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({});f.answer(list());await settle();
  f.click('[data-lm-action="invite"]');await f.advance(15000);
  assert.ok(f.d.body.textContent.includes(f.w.LuminaOnlineMessages.en.unavailable));
  f.click('[data-lm-action="retry"]');assert.equal(f.latest().action,'list');
  assert.equal(f.rpcCalls().filter(call=>call.message.action==='create').length,1);
});

test('foreign origins, sources and request IDs cannot supply private friend responses', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({});
  f.answer(list('FORGED'),{origin:'https://example.invalid'});
  f.answer(list('FORGED'),{source:{}});
  f.answer(list('FORGED'),{id:'unrelated-request'});
  await settle();assert.equal(f.d.body.textContent.includes('FORGED'),false);
  f.answer(null,{error:'LUMINA_AUTH_REQUIRED'});await settle();
  assert.ok(f.d.querySelector('[data-destination="profile"]'));
  assert.ok(f.d.querySelector('[data-lm-action="local"]'));
  f.click('[data-destination="profile"]');
  assert.deepEqual(plain(f.sent.at(-1).message),{type:'lumina:navigate',destination:'profile'});
});

test('auth changes immediately erase old-account private data and reject its pending response', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({roomCode:CODE});
  f.answer(room({friendAlias:'PRIVATE OLD ACCOUNT FRIEND'}));await settle();
  await f.advance(1000);const old=f.latest();
  assert.ok(f.d.body.textContent.includes('PRIVATE OLD ACCOUNT FRIEND'));
  f.message({type:'lumina:auth-changed'});
  assert.equal(f.d.body.textContent.includes('PRIVATE OLD ACCOUNT FRIEND'),false);
  assert.equal(f.d.querySelector('.lm-online-board'),null);
  await settle();assert.equal(f.latest().action,'list');assert.notEqual(f.latest().id,old.id);
  f.answer(room({friendAlias:'PRIVATE OLD ACCOUNT FRIEND'}),{id:old.id});await settle();
  assert.equal(f.d.body.textContent.includes('PRIVATE OLD ACCOUNT FRIEND'),false);
  f.answer(null,{error:'LUMINA_AUTH_REQUIRED'});await settle();
  assert.ok(f.d.querySelector('[data-destination="profile"]'));
});

test('hidden pages stop polling, discard pending responses and resume with one fresh authorized read', async t => {
  const f=fixture(t);f.w.LuminaOnline.open({roomCode:CODE});f.answer(room());await settle();
  await f.advance(1000);const old=f.latest();await f.hidden(true);
  const count=f.rpcCalls().length;await f.advance(20000);assert.equal(f.rpcCalls().length,count);
  f.answer(room({friendAlias:'STALE HIDDEN RESPONSE'}),{id:old.id});await settle();
  assert.equal(f.d.body.textContent.includes('STALE HIDDEN RESPONSE'),false);
  await f.hidden(false);assert.equal(f.rpcCalls().length,count+1);assert.equal(f.latest().action,'get');
  f.answer(room({revision:3}));await settle();
  f.w.LuminaOnline.destroy();const stopped=f.rpcCalls().length;
  await f.advance(20000);assert.equal(f.rpcCalls().length,stopped);
});

test('completed games report the current player score and correct winner without continuing polls', async t => {
  const f=fixture(t,'pt-BR');f.w.LuminaOnline.open({roomCode:CODE});
  f.answer(room({status:'complete',player:2,scores:[2,4],winner:2,cards:[]}));await settle();
  assert.equal(f.d.querySelector('.lm-online-result-title').textContent,f.w.LuminaOnlineMessages['pt-BR'].won);
  assert.ok(f.d.querySelector('.lm-online-result-score').textContent.includes('Você: 4'));
  assert.ok(f.d.querySelector('.lm-online-result-score').textContent.includes('Julio: 2'));
  const before=f.rpcCalls().length;await f.advance(20000);assert.equal(f.rpcCalls().length,before);
  f.click('[data-lm-action="lobby"]');assert.equal(f.latest().action,'list');
  assert.equal(f.rpcCalls().filter(call=>call.message.action==='create').length,0,'Play again opens friend picker, not an automatic invitation');
});

test('invalid card indices, counts or artwork cannot become an active online board', async t => {
  const invalid = [
    room({cards:room().cards.slice(0,10)}),
    room({cards:room().cards.map((card,index)=>index===0?{...card,index:12}:card)}),
    room({cards:room().cards.map((card,index)=>index===0?{...card,art:'https://example.invalid/image',flipped:true}:card)})
  ];
  for (let i=0;i<invalid.length;i++) await t.test('invalid server view '+i, async inner => {
    const f=fixture(inner);f.w.LuminaOnline.open({roomCode:CODE});f.answer(invalid[i]);await settle();
    assert.equal(f.d.querySelector('.lm-online-board'),null);
    assert.ok(f.d.body.textContent.includes(f.w.LuminaOnlineMessages.en.unavailable));
  });
});
