'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom'),read=file=>fs.readFileSync(file,'utf8');
const files=['discover.js','discover-male-only-20261010.js'],languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const newKeys=['ui.cookingUnavailable','ui.cookingSources','ui.cookingBrowse','ui.verifyReading','ui.cookingSpecialty.maangchi','ui.cookingSpecialty.jamie','ui.cookingSpecialty.panelinha','ui.cookingSpecialty.foodwishes'];
function fixture(){
 const dom=new JSDOM('<html lang="en"><body><textarea id="draft">Unsaved question</textarea><main id="answer"></main><p id="actual-prose">A real AI answer with source facts.</p></body></html>',{url:'https://matchapp.tv/discover.html',runScripts:'outside-only'}),w=dom.window,calls={fetch:0,credit:0,source:0};
 w.fetch=()=>{calls.fetch++;throw Error('No requests permitted');};w.checkDailyLimit=()=>{calls.credit++;throw Error('No credits permitted');};w.fallbackSearch=()=>{calls.source++;throw Error('No fallback queries permitted');};
 for(const file of ['ebooks/locale.js','ebooks/locale-interface.js','cooking/catalog.js'])w.eval(read(file));
 const select=lang=>{w.localStorage.setItem('match_lang',lang);w.MATCH_LANG='en';w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));};
 return {dom,w,calls,select};
}
function cookingBlock(source){const start=source.indexOf('    if(cookingIntent && bubble?.wrap){'),end=source.indexOf('\n    // Only attach the exact numbered TMDB record',start);assert(start>=0&&end>start);return source.slice(start,end);}
function readingBlock(source){const start=source.indexOf('    if (bubble?.wrap && bookIntent) {'),marker='        bubble.wrap.appendChild(route);',end=source.indexOf(marker,start)+marker.length;assert(start>=0&&end>start);return source.slice(start,end)+'\n    }';}
function fallbackBody(source){const line=source.split('\n').find(line=>line.trim().startsWith('catch (e) { cookingUnavailable = cookingIntent;'));assert(line);return line.trim().slice('catch (e) {'.length,-1);}
const fallbackBind="if(cookingUnavailable && bubble?.textEl)window.MatchAppBooksLocale?.bind?.(bubble.textEl,'ui.cookingUnavailable');";

test('exactly8 new UI keys exist in all14 languages and all95 original English values remain byte-identical',()=>{
 let bundle;vm.runInNewContext(read('ebooks/locale-interface.js'),{window:{MatchAppBooksLocale:{register(v){bundle=v;}}}});
 assert.deepEqual(Object.keys(bundle).sort(),languages.slice().sort());
 const original=Object.fromEntries(Object.entries(bundle.en).filter(([key])=>!newKeys.includes(key)).sort(([a],[b])=>a.localeCompare(b)));
 assert.equal(Object.keys(original).length,95);assert.equal(crypto.createHash('sha256').update(JSON.stringify(original)).digest('hex'),'2cad2be33cc0198fe64cf64b59a0a6abe2b2234aeac49d9bee6e500ced299201');
 const dom=new JSDOM('<html></html>',{url:'https://matchapp.tv/cooking/',runScripts:'outside-only'});try{dom.window.eval(read('cooking/i18n.js'));const specialtyKeys={maangchi:'specialtyMaangchi',jamie:'specialtyJamie',panelinha:'specialtyPanelinha',foodwishes:'specialtyFoodwishes'};
 for(const lang of languages){assert.equal(Object.keys(bundle[lang]).length,103);for(const key of newKeys){assert.equal(typeof bundle[lang][key],'string');assert(bundle[lang][key].trim());}for(const[id,key]of Object.entries(specialtyKeys))assert.equal(bundle[lang]['ui.cookingSpecialty.'+id],dom.window.MatchCookingI18n.copy[lang][key]);}
 }finally{dom.window.close();}
});
test('both runtime files keep their requested source/binding blocks identical',()=>{
 const sources=files.map(read);assert.equal(cookingBlock(sources[0]),cookingBlock(sources[1]));assert.equal(fallbackBody(sources[0]),fallbackBody(sources[1]));
 const binding=source=>{const start=source.indexOf("        if(window.MatchAppBooksLocale?.bind){",source.indexOf('    if (bubble?.wrap && bookIntent) {'));return source.slice(start,source.indexOf('\n        bubble.wrap.appendChild(route);',start));};
 assert.equal(binding(sources[0]),binding(sources[1]));assert(sources.every(source=>source.includes(fallbackBind)));
});
for(const file of files)test(file+' real Books/Recipes route blocks repaint all14 without replacing anchors, fields or original source names',t=>{
 const f=fixture();t.after(()=>f.dom.window.close());const {w}=f,source=read(file),question='Help with recipes. Original source: https://www.youtube.com/watch?v=ATN7ZGO-PPU';
 w.question=question;w.cookingIntent=true;w.bookIntent=true;w.bubble={wrap:w.document.getElementById('answer'),textEl:w.document.getElementById('actual-prose')};w.MatchAppReadingAI={intent:()=> 'audiobook'};
 if(file==='discover.js')w.discoverRecoveryText=()=> '📚🎧📰 Verify e-books, audiobooks and magazines';
 w.eval(cookingBlock(source));w.eval(readingBlock(source));
 const section=w.document.querySelector('.cooking-chat-sources'),anchors=[...w.document.querySelectorAll('#answer a')],hrefs=anchors.map(a=>a.href),labels=anchors.map(a=>a.querySelector('span')),names=[...w.MatchCooking.channels].map(c=>c.name+' · '),draft=w.document.getElementById('draft'),prose=w.document.getElementById('actual-prose');
 assert.equal(anchors.length,6);assert.equal(new URL(anchors[0].href).pathname,'/cooking/');assert.equal(new URL(anchors[0].href).searchParams.get('q'),question);assert.equal(anchors[5].getAttribute('href'),'/?reading=audiobook#ebook-matcher-root');
 draft.focus();draft.setSelectionRange(2,8);const handler=()=>{};anchors[0].onclick=handler;
 for(const lang of languages){f.select(lang);assert.deepEqual([...w.document.querySelectorAll('#answer a')],anchors);assert.deepEqual(anchors.map(a=>a.href),hrefs);assert.deepEqual(anchors.map(a=>a.querySelector('span')),labels);assert.equal(anchors[0].onclick,handler);assert.equal(section.getAttribute('aria-label'),w.MatchAppBooksLocale.t('ui.cookingSources'));assert.equal(labels[0].textContent,w.MatchAppBooksLocale.t('ui.cookingBrowse'));assert.equal(labels[5].textContent,w.MatchAppBooksLocale.t('ui.verifyReading'));assert.equal(anchors[5].getAttribute('aria-label'),labels[5].textContent);
  w.MatchCooking.channels.forEach((c,i)=>{assert.equal(anchors[i+1].firstChild.nodeValue,names[i]);assert.equal(labels[i+1].textContent,w.MatchAppBooksLocale.t('ui.cookingSpecialty.'+c.id));});
  assert.equal(w.document.getElementById('draft'),draft);assert.equal(draft.value,'Unsaved question');assert.equal(w.document.activeElement,draft);assert.equal(draft.selectionStart,2);assert.equal(draft.selectionEnd,8);assert.equal(prose.textContent,'A real AI answer with source facts.');assert.deepEqual(f.calls,{fetch:0,credit:0,source:0});
 }
});
test('real cooking catch copy follows saved language and only its marked app-authored bubble repaints',async t=>{
 for(const file of files){const f=fixture();t.after(()=>f.dom.window.close());const {w}=f,body=fallbackBody(read(file));
  for(const lang of languages){f.select(lang);const result=await w.eval('(async function(){const cookingIntent=true;let payload,musicPayload,source="ai",cookingUnavailable=false;const e={aiUnavailable:true};'+body+';return {payload,source,cookingUnavailable};})()');assert.equal(result.payload.answer,w.MatchAppBooksLocale.t('ui.cookingUnavailable'));assert.equal(result.payload.results.length,0);assert.equal(result.payload._live,false);assert.equal(result.source,'fallback');assert.equal(result.cookingUnavailable,true);}
  w.bubble={textEl:w.document.getElementById('answer')};w.bubble.textEl.textContent='Old authored fallback';w.cookingUnavailable=true;w.eval(fallbackBind);const same=w.bubble.textEl;
  for(const lang of languages){f.select(lang);assert.equal(w.bubble.textEl,same);assert.equal(same.textContent,w.MatchAppBooksLocale.t('ui.cookingUnavailable'));assert.equal(w.document.getElementById('actual-prose').textContent,'A real AI answer with source facts.');assert.deepEqual(f.calls,{fetch:0,credit:0,source:0});}
 }
});
