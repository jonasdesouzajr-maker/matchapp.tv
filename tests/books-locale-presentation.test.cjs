'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');

const repo=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(repo,file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const fields=vm.runInNewContext('('+read('ebooks/ebook-matcher.js').match(/const FIELDS=(\{[\s\S]*?\n\});/)[1]+')');
const choiceKeys=Object.entries(fields).flatMap(([field,choices])=>['field.'+field+'.label',...choices.map(([value])=>'field.'+field+'.'+value)]).sort();
const choicesByKey=Object.fromEntries(Object.entries(fields).flatMap(([field,choices])=>choices.map(([value,icon,label])=>[field+'.'+value,{icon,label}])));
const readingKeys=['match_ebook_saved_v1','match_ebook_disliked_v1','match_ebook_seen_v1','match_ebook_criteria_v1'];
const sourceBook={id:'locale-source-identity',title:'Nature',author:'Genre',year:1813,genres:['classics','fantasy'],moods:['cozy','hopeful','curious'],pace:'balanced',length:'medium',era:'classic',access:['free','paid'],summary:'An unchanged source synopsis.',market:'GLOBAL'};
const tick=w=>new Promise(resolve=>w.setTimeout(resolve,20));

function scene(route='/ebooks/',options={}){
 const home=route==='/';
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body class="'+(home?'page-home':'ebook-page')+'"><main><article id="ma-concierge"></article><section id="ebook-matcher-root" class="ebook-matcher-root"></section></main></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 Object.defineProperty(w.document,'readyState',{configurable:true,get:()=> 'complete'});
 Object.defineProperty(w.navigator,'language',{configurable:true,get:()=> 'en-US'});
 w.MATCH_LANG='en';
 w.matchMedia=()=>({matches:true,addEventListener(){},removeEventListener(){}});
 w.HTMLElement.prototype.scrollIntoView=function(){};
 w.IntersectionObserver=class{constructor(callback){this.callback=callback;}observe(target){this.callback([{target,isIntersecting:true}],this);}unobserve(){}disconnect(){}};
 const calls={writes:[],fetch:[],metadata:0,verifiedCover:0,debits:0,tokens:0,rank:0};
 const nativeSet=w.Storage.prototype.setItem;
 w.Storage.prototype.setItem=function(key,value){calls.writes.push({key:String(key),value:String(value)});return nativeSet.call(this,key,value);};
 const save=(key,value)=>nativeSet.call(w.localStorage,key,typeof value==='string'?value:JSON.stringify(value));
 save('match_lang','en');save('match_ebook_saved_v1',[sourceBook.id]);save('match_ebook_disliked_v1',['excluded-source']);save('match_ebook_seen_v1',['previous-source']);
 save('match_ebook_criteria_v1',{mood:'hopeful',genre:'fantasy',pace:'balanced',length:'medium',era:'classic',access:'free',format:'ebook'});
 w.MATCHAPP_EBOOK_CATALOG=[{...sourceBook}];
 w.MATCHAPP_TOP_EBOOKS=[{...sourceBook,badge:'Top e-book',genre:'classics',source:'Apple Books',sourceUrl:'https://books.apple.com/',market:'GLOBAL'}];
 w.MatchAppCountry={regionCode:()=> 'US'};
 w.fetch=async url=>{calls.fetch.push(String(url));return{ok:true,json:async()=>({docs:[],items:[],results:[]})};};
 w.MatchAppBookDetails={hydrate(){calls.metadata++;},async verifiedCover(){calls.verifiedCover++;return null;}};
 w.checkDailyLimit=async()=>{calls.debits++;return true;};
 w.MatchAppTokens={begin(){calls.tokens++;},confirmResult(){calls.tokens++;},noteUnconfirmed(){calls.tokens++;}};
 w.MatchAppAIRank={async rank(){calls.rank++;return null;}};
 const reset=()=>{calls.writes.length=0;calls.fetch.length=0;calls.metadata=0;calls.verifiedCover=0;calls.debits=0;calls.tokens=0;calls.rank=0;};
 const load=()=>{for(const file of['ebooks/locale.js','ebooks/locale-choices.js','ebooks/locale-interface.js'])w.eval(read(file));};
 const mount=async()=>{load();let source=read('ebooks/ebook-matcher.js');if(options.presentation)source=source.replace('window.MatchAppEbooks={','window.__bookPresentation={renderResult,renderAudioDiscovery,paintNote,matchNote};\nwindow.MatchAppEbooks={');w.eval(source);await tick(w);await tick(w);return w.document.getElementById('ebook-matcher-root');};
 const selectLanguage=async lang=>{save('match_lang',lang);reset();w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));await tick(w);};
 const storage=()=>Object.fromEntries(readingKeys.map(key=>[key,w.localStorage.getItem(key)]));
 const close=()=>{w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:false}));dom.window.close();};
 return{dom,w,calls,load,mount,reset,save,selectLanguage,storage,close};
}

function zeroSideEffects(calls,lang){
 assert.deepEqual(calls.writes,[],lang+' must not write Books preferences/history');
 assert.deepEqual(calls.fetch,[],lang+' must not fetch covers or metadata');
 assert.equal(calls.metadata,0,lang+' metadata hydration');assert.equal(calls.verifiedCover,0,lang+' verified cover lookup');
 assert.equal(calls.debits,0,lang+' quota debit');assert.equal(calls.tokens,0,lang+' token mutation');assert.equal(calls.rank,0,lang+' ranking');
}
function chipLabel(button){const icon=button.querySelector('[aria-hidden="true"]')?.textContent||'';return button.textContent.replace(icon,'').trim();}
function assertSourceIdentity(root){
 assert.equal(root.querySelector('.ebook-top-copy>h3').textContent,sourceBook.title);
 assert.equal(root.querySelector('.ebook-top-author').textContent,sourceBook.author);
 assert.equal(root.querySelector('[data-ebook-saved-list] strong').textContent,sourceBook.title);
 assert.equal(root.querySelector('[data-ebook-saved-list] small').textContent,sourceBook.author);
 assert.ok(root.querySelector('.ebook-top-source').textContent.includes('Apple Books'));
 assert.ok([...root.querySelectorAll('[data-ebook-saved-list] a')].some(a=>a.textContent.includes('Google Books')));
}

test('authored Books bundles provide the exact81 choice keys and complete interface keys in all14 languages',()=>{
 let choices,ui;
 vm.runInNewContext(read('ebooks/locale-choices.js'),{window:{MatchAppBooksLocale:{register(bundle){choices=bundle;}}}});
 vm.runInNewContext(read('ebooks/locale-interface.js'),{window:{MatchAppBooksLocale:{register(bundle){ui=bundle;}}}});
 assert.deepEqual(Object.keys(choices).sort(),languages.slice().sort());assert.deepEqual(Object.keys(ui).sort(),languages.slice().sort());
 const uiKeys=Object.keys(ui.en).sort();assert.ok(uiKeys.length>70);
 for(const lang of languages){assert.deepEqual(Object.keys(choices[lang]).sort(),choiceKeys,lang);assert.deepEqual(Object.keys(ui[lang]).sort(),uiKeys,lang);for(const value of Object.values({...choices[lang],...ui[lang]}))assert.ok(typeof value==='string'&&value.trim(),lang);}
});

test('the saved explicit language wins over stale English globals and device locale',t=>{
 const f=scene();t.after(f.close);f.load();f.save('match_lang','ar');
 assert.equal(f.w.MATCH_LANG,'en');assert.equal(f.w.document.documentElement.lang,'en');assert.equal(f.w.navigator.language,'en-US');
 assert.equal(f.w.MatchAppBooksLocale.lang(),'ar');assert.equal(f.w.MatchAppBooksLocale.choice('mood','cozy'),'مريح');assert.equal(f.w.MatchAppBooksLocale.t('field.format.label'),'الصيغة');
});

test('Text-node and attribute bindings translate params while preserving owners, siblings and listeners',async t=>{
 const f=scene();t.after(f.close);const {w}=f;f.load();const api=w.MatchAppBooksLocale;
 const button=w.document.createElement('button'),icon=w.document.createElement('span'),text=w.document.createTextNode('Original label'),counter=w.document.createElement('span'),input=w.document.createElement('input');
 icon.textContent='🎧';icon.setAttribute('aria-hidden','true');counter.textContent='7';button.append(icon,text,counter);w.document.body.append(button,input);
 let clicked=0;button.addEventListener('click',()=>clicked++);
 const params={provider:'Apple Books'};assert.equal(api.bind(text,'ui.searchAudio',()=>params),text);api.bind(button,'ui.searchAudio',params,'aria-label');api.bind(input,'ui.sourceCover',{title:'Nature',author:'Genre'},'placeholder');
 for(const lang of languages){await f.selectLanguage(lang);assert.equal(text.nodeValue,api.t('ui.searchAudio',params),lang);assert.equal(button.getAttribute('aria-label'),api.t('ui.searchAudio',params),lang);assert.equal(input.placeholder,api.t('ui.sourceCover',{title:'Nature',author:'Genre'}),lang);assert.deepEqual([...button.childNodes],[icon,text,counter]);assert.equal(icon.textContent,'🎧');assert.equal(counter.textContent,'7');zeroSideEffects(f.calls,lang);}
 button.click();assert.equal(clicked,1);
});

test('all14 hub translations repaint the same74 chips without preference, source, metadata or quota changes',async t=>{
 const f=scene('/ebooks/');t.after(f.close);const {w}=f,root=await f.mount();
 const chips=[...root.querySelectorAll('[data-ebook-field]')];assert.equal(chips.length,74);
 const chosen=root.querySelector('[data-ebook-field="mood"][data-ebook-value="cozy"]');let ownerClicks=0;chosen.addEventListener('click',()=>ownerClicks++);f.reset();chosen.click();
 assert.equal(ownerClicks,1);assert.equal(f.calls.writes.length,1);assert.equal(f.calls.writes[0].key,'match_ebook_criteria_v1');assert.equal(JSON.parse(w.localStorage.getItem('match_ebook_criteria_v1')).mood,'cozy');assert.equal(f.calls.debits,0);
 const baseline=f.storage(),catalog=JSON.stringify(w.MATCHAPP_EBOOK_CATALOG),top=root.querySelector('[data-ebook-top-card]'),saved=root.querySelector('[data-ebook-saved-list] article');
 const snapshot=chips.map(node=>({node,field:node.dataset.ebookField,value:node.dataset.ebookValue,id:node.id,classes:node.className,pressed:node.getAttribute('aria-pressed'),disabled:node.disabled,icon:node.querySelector('[aria-hidden="true"]')}));
 const fold=root.querySelector('.ebook-fold');fold.open=false;root.dataset.audioBusy='1';const match=root.querySelector('[data-ebook-match]');match.disabled=true;
 for(const lang of languages){await f.selectLanguage(lang);assert.deepEqual([...root.querySelectorAll('[data-ebook-field]')],chips,lang+' chip owners');
  for(const item of snapshot){const key='field.'+item.field+'.'+item.value;assert.equal(chipLabel(item.node),w.MatchAppBooksLocale.t(key),lang+'/'+key);assert.equal(item.node.id,item.id);assert.equal(item.node.dataset.ebookValue,item.value);assert.equal(item.node.className,item.classes);assert.equal(item.node.getAttribute('aria-pressed'),item.pressed);assert.equal(item.node.disabled,item.disabled);assert.equal(item.node.querySelector('[aria-hidden="true"]'),item.icon);assert.equal(item.icon.textContent,choicesByKey[item.field+'.'+item.value].icon);}
  for(const fieldset of root.querySelectorAll('fieldset.ebook-field')){const field=fieldset.querySelector('[data-ebook-field]').dataset.ebookField;assert.equal(fieldset.querySelector('legend').textContent,w.MatchAppBooksLocale.t('field.'+field+'.label'),lang+'/'+field);}
  assert.equal(root.querySelector('[data-ebook-top-card]'),top,lang+' original top card');assert.equal(root.querySelector('[data-ebook-saved-list] article'),saved,lang+' original saved row');assert.equal(fold.open,false);assert.equal(root.querySelector('[data-ebook-match]'),match);assert.equal(match.disabled,true);assert.equal(root.dataset.audioBusy,'1');assert.deepEqual(f.storage(),baseline);assert.equal(JSON.stringify(w.MATCHAPP_EBOOK_CATALOG),catalog);assertSourceIdentity(root);zeroSideEffects(f.calls,lang);
 }
 f.reset();chosen.click();assert.equal(ownerClicks,2,'original direct click listener remains attached');assert.equal(f.calls.writes.length,1,'delegated chip persistence still runs once');assert.deepEqual(f.storage(),baseline);
});

test('all14 Home translations retain the same native select, option, change and saved-state owners',async t=>{
 const f=scene('/');t.after(f.close);const {w}=f,root=await f.mount();
 const selects=[...root.querySelectorAll('[data-ebook-select]')];assert.equal(selects.length,7);assert.equal(selects.reduce((sum,select)=>sum+select.options.length,0),74);
 const chosen=selects.find(select=>select.dataset.ebookSelect==='mood');let changes=0;chosen.addEventListener('change',()=>changes++);f.reset();chosen.value='cozy';chosen.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(changes,1);assert.equal(f.calls.writes.length,1);assert.equal(f.calls.writes[0].key,'match_ebook_criteria_v1');
 const baseline=f.storage(),snapshot=selects.map(node=>({node,id:node.id,field:node.dataset.ebookSelect,value:node.value,options:[...node.options].map(option=>({node:option,value:option.value,selected:option.selected,disabled:option.disabled}))})),fold=root.querySelector('.ebook-fold');fold.open=true;
 for(const lang of languages){await f.selectLanguage(lang);assert.deepEqual([...root.querySelectorAll('[data-ebook-select]')],selects,lang+' native controls');
  for(const item of snapshot){assert.equal(item.node.id,item.id);assert.equal(item.node.value,item.value);assert.equal(item.node.getAttribute('aria-label'),w.MatchAppBooksLocale.t('field.'+item.field+'.label'));assert.deepEqual([...item.node.options],item.options.map(option=>option.node));for(const option of item.options){assert.equal(option.node.value,option.value);assert.equal(option.node.selected,option.selected);assert.equal(option.node.disabled,option.disabled);assert.equal(option.node.textContent,w.MatchAppBooksLocale.choice(item.field,option.value));}}
  assert.equal(fold.open,true);assert.deepEqual(f.storage(),baseline);assertSourceIdentity(root);zeroSideEffects(f.calls,lang);
 }
 f.reset();chosen.dispatchEvent(new w.Event('change',{bubbles:true}));assert.equal(changes,2);assert.equal(f.calls.writes.length,1);assert.deepEqual(f.storage(),baseline);
});

test('all14 result and unverified audio presentations repaint their original source and action owners without matching again',async t=>{
 const f=scene('/ebooks/',{presentation:true});t.after(f.close);const {w}=f,root=await f.mount(),api=w.MatchAppBooksLocale;
 const p={mood:'hopeful',genre:'fantasy',pace:'balanced',length:'medium',era:'classic',access:'free',format:'ebook'};
 const baseline=f.storage(),book=JSON.stringify(sourceBook);
 w.__bookPresentation.renderResult(root,sourceBook,p,false,null,false,null);await tick(w);await tick(w);
 const host=root.querySelector('[data-ebook-result]'),img=host.querySelector('[data-ebook-cover]'),title=host.querySelector('h3[data-book-identity]'),author=host.querySelector('.ebook-author'),summary=host.querySelector('.ebook-summary');
 const stable=[...host.querySelectorAll('img,a,button')].map(node=>({node,attrs:[...node.attributes].filter(a=>a.name!=='alt').map(a=>[a.name,a.value])}));
 let previewClicks=0;const preview=host.querySelector('.ebook-preview-link');preview.addEventListener('click',event=>{event.preventDefault();previewClicks++;});
 for(const lang of languages){await f.selectLanguage(lang);
  assert.equal(root.querySelector('[data-ebook-result]'),host);assert.equal(host.querySelector('[data-ebook-cover]'),img);assert.equal(host.querySelector('h3[data-book-identity]'),title);assert.equal(title.textContent,'Nature');assert.equal(host.querySelector('.ebook-author'),author);assert.equal(author.textContent,api.t('ui.by',{author:'Genre'}));assert.equal(host.querySelector('.ebook-summary'),summary);assert.equal(summary.textContent,sourceBook.summary);assert.equal(summary.lang,'en');assert.equal(host.querySelector('.ebook-source-language').textContent,api.t('ui.sourceEnglish'));
  assert.equal(host.querySelector('.ebook-kicker').textContent,'1813 · '+['classics','fantasy'].map(value=>api.genreToken(value)).join(' · '));
  assert.equal(host.querySelector('.ebook-why strong').textContent,api.t('ui.why'));assert.equal(host.querySelector('.ebook-why span').textContent,api.t('ui.exactFit')+' · '+[api.choice('mood','hopeful'),api.choice('genre','fantasy'),api.t('ui.paceValue',{value:api.choice('pace','balanced')})].join(' · '));
  assert.deepEqual([...host.querySelectorAll('.ebook-meta span')].map(node=>node.textContent),[api.t('ui.readLength',{value:api.choice('length','medium')}),api.t('ui.paceValue',{value:api.choice('pace','balanced')}),api.t('ui.freePlusStores')]);
  for(const item of stable){assert.ok(host.contains(item.node),lang+' result owner retained');assert.deepEqual([...item.node.attributes].filter(a=>a.name!=='alt').map(a=>[a.name,a.value]),item.attrs,lang+' original URI/action attrs');}
  assert.ok(host.querySelector('[data-ebook-save]').textContent.includes(api.t('ui.save')));assert.ok(host.querySelector('[data-ebook-nope]').textContent.includes(api.t('ui.nope')));assert.ok(host.querySelector('[data-ebook-rematch]').textContent.includes(api.t('ui.another')));assert.deepEqual(f.storage(),baseline);assert.equal(JSON.stringify(sourceBook),book);zeroSideEffects(f.calls,lang);
 }
 preview.click();assert.equal(previewClicks,1,'original result action listener is retained');
 await f.selectLanguage('en');f.reset();w.__bookPresentation.renderAudioDiscovery(root,{...p,format:'audiobook'});await tick(w);zeroSideEffects(f.calls,'initial unverified audio presentation');
 const discovery=host.firstElementChild,links=[...host.querySelectorAll('a')],actions=[...host.querySelectorAll('button')],discoveryAttrs=[...links,...actions].map(node=>({node,attrs:[...node.attributes].map(a=>[a.name,a.value])}));
 for(const lang of languages){await f.selectLanguage(lang);assert.equal(host.firstElementChild,discovery);assert.deepEqual([...host.querySelectorAll('a')],links);assert.deepEqual([...host.querySelectorAll('button')],actions);assert.ok(host.querySelector('h3').textContent.includes(api.t('ui.audioTitle')));assert.ok([...host.querySelectorAll('.ebook-audio-note')].some(node=>node.textContent===api.t('ui.audioEmpty')));assert.equal(host.querySelector('.ebook-rights').textContent,api.t('ui.noCredit'));for(const link of host.querySelectorAll('.ebook-audio-search'))assert.ok(link.textContent.includes(api.t('ui.unverified')),lang+' unverified search label');for(const item of discoveryAttrs)assert.deepEqual([...item.node.attributes].map(a=>[a.name,a.value]),item.attrs,lang+' discovery URI/action attrs');assert.equal(host.querySelector('[data-ebook-switch-format]').textContent,api.t('ui.compatibleEbook'));assert.equal(host.querySelector('[data-ebook-switch-access]').textContent,api.t('ui.includeAudio'));assert.equal(host.querySelector('[data-ebook-cover]'),null);assert.equal(host.querySelector('[data-book-identity]'),null);assert.deepEqual(f.storage(),baseline);zeroSideEffects(f.calls,lang);}
});

test('pending audio progress and closest-match notes change language without restarting their work',async t=>{
 const f=scene('/ebooks/',{presentation:true});t.after(f.close);const root=await f.mount(),api=f.w.MatchAppBooksLocale,note=root.querySelector('[data-ebook-note]'),presentation=f.w.__bookPresentation;
 note.hidden=false;root.dataset.audioBusy='1';presentation.paintNote(note,()=>api.t('ui.audioWaiting')+' (2/24)');
 const p={mood:'hopeful',genre:'fantasy',pace:'balanced',length:'medium',era:'classic',access:'free',format:'ebook'},pick={mismatched:['mood'],recycled:false};
 const baseline=f.storage();
 for(const lang of languages){await f.selectLanguage(lang);assert.equal(root.querySelector('[data-ebook-note]'),note);assert.equal(note.textContent,api.t('ui.audioWaiting')+' (2/24)');assert.equal(root.dataset.audioBusy,'1');assert.equal(note.hidden,false);assert.deepEqual(f.storage(),baseline);zeroSideEffects(f.calls,lang);}
 root.dataset.audioBusy='0';presentation.paintNote(note,()=>presentation.matchNote(p,pick));
 for(const lang of languages){await f.selectLanguage(lang);assert.ok(note.textContent.includes(api.t('fallback.miss')));assert.ok(note.textContent.includes(api.choice('mood','hopeful')));assert.equal(note.hidden,false);assert.deepEqual(f.storage(),baseline);zeroSideEffects(f.calls,lang);}
});
