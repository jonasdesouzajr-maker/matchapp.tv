'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

const repo=path.resolve(__dirname,'..');
const base=process.env.MATCH_PROFILE_TEST_BASE||repo;
const read=name=>fs.readFileSync(fs.existsSync(path.join(repo,name))?path.join(repo,name):path.join(base,name),'utf8');
const helper=read('profile-portfolio-i18n.js');
const copy=JSON.parse(helper.match(/const COPY = ([\s\S]*?);\n  const bindings=/)[1]);
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deepFreeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(deepFreeze);Object.freeze(value);}return value;};
const records=()=>deepFreeze([
 {title:'Title',action:'shown',reason:'Shown by MatchApp',addedAt:300,ts:300,posterUrl:'https://image.tmdb.org/t/p/w500/original.jpg',streamUrl:'https://www.justwatch.com/br/filme/title?provider=Amazon%20Prime%20Video'},
 {title:'Linha de Ação',action:'seen',reason:'Original note · Amazon Prime Video',addedAt:200,posterUrl:'https://image.tmdb.org/t/p/w500/linha.jpg'},
 {title:'Love Hypothesis',action:'loved',reason:'A source reason with {title} and <em>markup</em>',addedAt:100}
]);
function fixture({lang='pt-BR',history=records(),activity=[],disliked=[],search=''}={}){
 const errors=[],calls={forget:[],removedAt:[],toasts:[],fetch:[]};
 const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>errors.push(error));
 const dom=new JSDOM('<!doctype html><html lang="en"><body><div class="container"><section class="profile-hub"></section><script data-registration-upgrade="1" type="application/json"></script><div class="portfolio-tabs">'+
  [['history','History'],['watchlater','Watch Later'],['seenit','Seen It'],['audio','Audio Library']].map(([name,label])=>'<button id="tab-'+name+'" class="portfolio-tab" onclick="switchPortfolioTab(\''+name+'\')"><span>'+label+'</span><span id="count-'+name+'" class="tab-count">0</span></button>').join('')+
  '</div><div id="panel-history" class="portfolio-panel"><div id="history-rematch"></div><div id="history-list"></div></div><div id="panel-watchlater" class="portfolio-panel"></div><div id="panel-seenit" class="portfolio-panel"></div><div id="panel-audio" class="portfolio-panel"></div></div></body></html>',
  {url:'https://matchapp.tv/profile/profile.html'+search,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole});
 const w=dom.window;
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 w.MATCH_LANG='en';w.localStorage.setItem('match_lang',lang);
 w.localStorage.setItem('match_dislikedList',JSON.stringify(disliked));
 w.localStorage.setItem('match_owned_wallet_test',JSON.stringify({match:10,ask:10}));
 w.fetch=async url=>{calls.fetch.push(url);throw new Error('External requests are forbidden in this fixture');};
 w.supabaseClient=null;
 w.showToast=(...args)=>calls.toasts.push(args);
 w.matchPolicy={history:()=>history,forget:async title=>{calls.forget.push(title);return true;}};
 w.MatchActivity={all:()=>activity,removeAt:ts=>calls.removedAt.push(ts)};
 const profile=read('profile.js');
 w.eval(profile.match(/window\.switchPortfolioTab = function\(tab\) \{[\s\S]*?\n\};/)[0]);
 w.eval(profile.match(/function escapeHtml\(str\) \{[\s\S]*?\n\}/)[0]);
 w.eval(profile.split('/* MATCHAPP_PORTFOLIO_POSTERS_BEGIN */')[1].split('/* MATCHAPP_PORTFOLIO_POSTERS_END */')[0]);
 w.document.querySelectorAll('.portfolio-tab').forEach(button=>button.addEventListener('click',()=>w.switchPortfolioTab(button.id.slice(4))));
 w.eval(helper);w.eval(read('portfolio-history.js'));w.eval(read('final-audit.js'));
 const select=(language,event='matchapp:langchange')=>{w.localStorage.setItem('match_lang',language);if(event==='storage')w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:language}));else w.document.dispatchEvent(new w.CustomEvent(event));};
 const snapshot=()=>Object.fromEntries(Object.keys(w.localStorage).filter(key=>key!=='match_lang').map(key=>[key,w.localStorage.getItem(key)]));
 return {dom,w,calls,errors,select,snapshot,history};
}

test('all 14 authored dictionaries cover the same 37 UI keys and preserve placeholders',()=>{
 assert.deepEqual(Object.keys(copy),languages);
 const keys=Object.keys(copy.en);assert.equal(keys.length,37);
 for(const lang of languages){
  assert.deepEqual(Object.keys(copy[lang]),keys,lang);
  for(const key of keys){
   assert.equal(typeof copy[lang][key],'string');assert.ok(copy[lang][key].trim(),lang+'/'+key);
   assert.deepEqual(copy[lang][key].match(/\{\w+\}/g)||[],copy.en[key].match(/\{\w+\}/g)||[],lang+'/'+key);
   if(lang!=='en')assert.notEqual(copy[lang][key],copy.en[key],lang+'/'+key+' must be authored');
  }
 }
});

test('saved Portuguese overrides stale globals; language and storage repaint preserve source data and control identity',async t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f;
 const before=f.snapshot(),source=JSON.stringify(f.history);
 const cards=[...w.document.querySelectorAll('.profile-history-card')];
 const first=cards[0],title=first.querySelector('h3'),link=first.querySelector('a'),remove=first.querySelector('button');
 const href=link.href,poster=first.querySelector('img').getAttribute('src');
 assert.equal(w.MatchProfilePortfolioI18n.language(),'pt-BR');
 assert.equal(first.querySelector('p').textContent,'Recomendado · Exibido pelo MatchApp Ai');
 assert.equal(link.textContent,'Onde assistir');assert.equal(w.document.querySelector('#tab-notforme span').textContent,'Não é para mim');
 assert.equal(title.textContent,'Title');assert.equal(first.querySelector('img').alt,'Title');
 assert.equal(cards[1].querySelector('h3').textContent,'Linha de Ação');
 assert.equal(cards[1].querySelector('p').textContent,'Visto · Original note · Amazon Prime Video');
 for(const [lang,event] of [['ar','matchapp:langchange'],['fr','matchapp:languagechange'],['de','storage']]){
  f.select(lang,event);await turn();
  assert.equal(w.document.querySelector('.profile-history-card'),first);
  assert.equal(first.querySelector('a'),link);assert.equal(first.querySelector('button'),remove);
  assert.equal(link.textContent,copy[lang].findWatch);assert.equal(title.textContent,'Title');
  assert.equal(link.href,href);assert.equal(first.querySelector('img').getAttribute('src'),poster);
  assert.equal(first.querySelector('img').alt,'Title');
  assert.equal(cards[1].querySelector('p').textContent,copy[lang].seen+' · Original note · Amazon Prime Video');
  assert.equal(cards[2].querySelector('p').textContent,copy[lang].loved+' · A source reason with {title} and <em>markup</em>');
  assert.equal(cards[2].querySelector('em'),null);
  assert.equal(first.dir,lang==='ar'?'rtl':'ltr');assert.equal(title.dir,'auto');
 }
 assert.deepEqual(f.snapshot(),before);assert.equal(JSON.stringify(f.history),source);
 assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.calls.forget,[]);assert.deepEqual(f.errors,[]);
});

test('history actions, empty states, rematch anchors and Not For Me copy render in each chosen language',t=>{
 for(const lang of languages){
  const actions=['save','seen','like','loved','dislike','rated','shown','ai','match','other'];
  const actionKeys=['saved','seen','loved','loved','notForMe','rated','matched','askAI','matched','inHistory'];
  const data=deepFreeze(actions.map((action,i)=>({title:'Original '+i,action,reason:i===7?'Ask AI':'',addedAt:100-i})));
  const f=fixture({lang,history:data,search:'?rematch=1'});t.after(()=>f.dom.window.close());
  const ui=f.w.MatchProfilePortfolioI18n;
  const notes=[...f.w.document.querySelectorAll('.profile-history-card p')].map(p=>p.textContent);
  assert.deepEqual(notes,actionKeys.map((key,i)=>ui.text(key)+(i===7?' · '+ui.text('askAI'):'')),lang);
  const links=[...f.w.document.querySelectorAll('#history-rematch a')];
  assert.deepEqual(links.map(a=>a.getAttribute('href')),['/?rematch=same#questionnaire-box','/?rematch=new#questionnaire-box']);
  assert.deepEqual(links.map(a=>a.textContent),[copy[lang].sameCriteria,copy[lang].newCriteria]);
  assert.equal(f.w.document.querySelector('#panel-notforme h3').textContent,copy[lang].notForMe);
  assert.equal(f.w.document.querySelector('#notforme-grid strong').textContent,copy[lang].notForMeEmptyTitle);
  assert.equal(f.w.document.querySelector('#notforme-grid span').textContent,copy[lang].notForMeEmptyCopy);
  const empty=fixture({lang,history:[]});t.after(()=>empty.dom.window.close());
  assert.equal(empty.w.document.querySelector('#history-list strong').textContent,copy[lang].historyEmptyTitle);
  assert.equal(empty.w.document.querySelector('#history-list span').textContent,copy[lang].historyEmptyCopy);
  assert.deepEqual(f.errors,[]);assert.deepEqual(empty.errors,[]);
 }
});

test('open removal dialog repaints without losing focus; cancel, Escape and confirm keep the original action contract',async t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f;
 w.MatchAudit={forgetEverywhere:async title=>{f.calls.forget.push(title);return true;}};
 const button=w.document.querySelector('.profile-history-card button');button.focus();button.click();
 let dialog=w.document.querySelector('[role=alertdialog]'),cancel=dialog.querySelector('.ma-confirm-cancel');
 assert.equal(w.document.activeElement,cancel);assert.equal(dialog.querySelector('h2').textContent,'Remover do histórico?');
 f.select('ar');assert.equal(w.document.querySelector('[role=alertdialog]'),dialog);assert.equal(w.document.activeElement,cancel);
 assert.equal(cancel.textContent,copy.ar.cancel);assert.ok(dialog.querySelector('p').textContent.includes('\u2068Title\u2069'));
 cancel.click();await turn();assert.equal(w.document.querySelector('[role=alertdialog]'),null);
 assert.equal(w.document.activeElement,button);assert.deepEqual(f.calls.forget,[]);assert.deepEqual(f.calls.removedAt,[]);
 button.click();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await turn();
 assert.equal(w.document.querySelector('[role=alertdialog]'),null);assert.deepEqual(f.calls.forget,[]);
 button.click();dialog=w.document.querySelector('[role=alertdialog]');f.select('pt-BR','storage');
 dialog.querySelector('.ma-confirm-danger').click();await turn();
 assert.deepEqual(f.calls.forget,['Title']);assert.deepEqual(f.calls.removedAt,[300]);
 assert.equal(f.calls.toasts.at(-1)[0],'Removido do seu histórico privado.');
 assert.equal(w.localStorage.getItem('match_owned_wallet_test'),JSON.stringify({match:10,ask:10}));
 assert.deepEqual(f.errors,[]);
});

test('tab names and live item counts repaint while tab navigation and allow-again handlers remain attached',async t=>{
 const f=fixture({disliked:[{title:'Title',posterUrl:'https://image.tmdb.org/t/p/w500/excluded.jpg'}]});t.after(()=>f.dom.window.close());
 const {w}=f,tab=w.document.getElementById('tab-notforme');
 tab.click();assert.equal(w.document.getElementById('panel-notforme').style.display,'block');
 const card=w.document.querySelector('.audit-notforme-card'),allow=card.querySelector('button');
 const wallet=w.localStorage.getItem('match_owned_wallet_test');
 f.select('ar');assert.equal(w.document.querySelector('.audit-notforme-card'),card);assert.equal(card.querySelector('button'),allow);
 assert.equal(card.querySelector('strong').textContent,'Title');assert.equal(card.querySelector('img').alt,'Title');
 assert.equal(allow.textContent,copy.ar.allowAgain);
 for(const count of [0,1,2,11,21]){
  w.document.getElementById('count-watchlater').textContent=String(count);await turn();
  assert.equal(w.document.getElementById('tab-watchlater').getAttribute('aria-label'),copy.ar.watchLaterTab+' — '+copy.ar.itemCount.replace('{count}',String(count)));
 }
 f.select('pt-BR');await turn();
 assert.equal(w.document.getElementById('tab-history').getAttribute('aria-label'),'Histórico');
 assert.equal(w.document.getElementById('tab-seenit').getAttribute('aria-label'),'Já vi — Itens: 0');
 assert.equal(w.document.getElementById('tab-audio').getAttribute('aria-label'),'Biblioteca de áudio — Itens: 0');
 assert.equal(tab.getAttribute('aria-label'),'Não é para mim — Itens: 1');
 w.document.getElementById('tab-watchlater').click();assert.equal(w.document.getElementById('panel-watchlater').style.display,'block');
 tab.click();allow.click();await turn();
 assert.deepEqual(f.calls.forget,['Title']);assert.deepEqual(JSON.parse(w.localStorage.getItem('match_dislikedList')),[]);
 assert.equal(f.calls.toasts.at(-1)[0],'“Title” pode ser recomendado novamente.');
 assert.equal(w.localStorage.getItem('match_owned_wallet_test'),wallet);
 assert.equal(tab.getAttribute('aria-label'),'Não é para mim — Itens: 0');assert.deepEqual(f.calls.fetch,[]);assert.deepEqual(f.errors,[]);
});

test('storage read failures preserve renderability and use the existing app-selected language',t=>{
 const dom=new JSDOM('<!doctype html><html lang="en"><body><p></p></body></html>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});t.after(()=>dom.window.close());
 const w=dom.window;w.MATCH_LANG='pt-BR';Object.defineProperty(w,'localStorage',{get(){throw new Error('blocked storage');}});w.eval(helper);
 const p=w.document.querySelector('p');w.MatchProfilePortfolioI18n.bind(p,()=>{p.textContent=w.MatchProfilePortfolioI18n.text('findWatch');});
 assert.equal(p.textContent,'Onde assistir');assert.equal(p.lang,'pt-BR');
 w.MATCH_LANG='ja';w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange'));assert.equal(p.textContent,copy.ja.findWatch);
});

test('profile loads the copy helper before its consumers and only the profile audit loader receives the new cache suffix',t=>{
 const html=new JSDOM(read('profile/profile.html'));t.after(()=>html.window.close());
 const sources=[...html.window.document.querySelectorAll('script[src]')].map(s=>s.getAttribute('src'));
 const helperAt=sources.indexOf('/profile-portfolio-i18n.js?v=20261018-1');
 const historyAt=sources.indexOf('/portfolio-history.js?v=20260924-ui2&portfolio=20261018-1&posters=20261020-1&androidqa=20261021-1');
 assert.ok(helperAt>=0&&historyAt>helperAt);
 assert.ok(sources.includes('/title-captions.js?v=20260929-avatar1&profilestate=20261026-1&profilelang=20261018-1&portfolio=20261018-1&posters=20261020-1&accountphoto=20261020-1&registry=20261026-1'));
 const loader=read('title-captions.js').slice(read('title-captions.js').indexOf('/* Site-wide final audit layer.'));
 for(const route of ['/profile/profile.html','/pricing/pricing.html']){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only'});t.after(()=>dom.window.close());dom.window.eval(loader);
  const src=dom.window.document.querySelector('script[data-final-audit]').getAttribute('src');
  assert.equal(src,'/final-audit.js?v=20260929-avatar1&profilestate=20261026-1&profilelang=20261018-1&accountphoto=20261020-1'+(route.startsWith('/profile/')?'&portfolio=20261018-1&posters=20261020-1':''));
 }
});
