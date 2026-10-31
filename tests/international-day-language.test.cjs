'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const inputTags=['en-US','pt_PT','es-MX','fr-CA','de-DE','it-IT','tr-TR','ru-RU','ar-SA','hi-IN','id-ID','ja-JP','ko-KR','zh-Hant'];
const labels={
 en:['Today','Ended','Ask MatchApp Ai','Official page','Ask MatchApp Ai about this day'],
 'pt-BR':['Hoje','Encerrado','Pergunte ao MatchApp Ai','Página oficial','Pergunte ao MatchApp Ai sobre esta data'],
 es:['Hoy','Finalizado','Preguntar a MatchApp Ai','Página oficial','Pregunta a MatchApp Ai sobre este día'],
 fr:['Aujourd’hui','Terminé','Demander à MatchApp Ai','Page officielle','Demander à MatchApp Ai des informations sur cette journée'],
 de:['Heute','Beendet','MatchApp Ai fragen','Offizielle Seite','MatchApp Ai nach diesem Tag fragen'],
 it:['Oggi','Concluso','Chiedi a MatchApp Ai','Pagina ufficiale','Chiedi a MatchApp Ai informazioni su questa giornata'],
 tr:['Bugün','Sona erdi','MatchApp Ai’a sor','Resmî sayfa','Bu gün hakkında MatchApp Ai’a sor'],
 ru:['Сегодня','Завершено','Спросить MatchApp Ai','Официальная страница','Спросить MatchApp Ai об этом дне'],
 ar:['اليوم','انتهى','اسأل MatchApp Ai','الصفحة الرسمية','اسأل MatchApp Ai عن هذا اليوم'],
 hi:['आज','समाप्त','MatchApp Ai से पूछें','आधिकारिक पृष्ठ','इस दिवस के बारे में MatchApp Ai से पूछें'],
 id:['Hari ini','Berakhir','Tanya MatchApp Ai','Halaman resmi','Tanya MatchApp Ai tentang hari ini'],
 ja:['今日','終了','MatchApp Aiに聞く','公式ページ','この日についてMatchApp Aiに聞く'],
 ko:['오늘','종료','MatchApp Ai에 물어보기','공식 페이지','이 기념일에 대해 MatchApp Ai에 물어보기'],
 zh:['今天','已结束','询问MatchApp Ai','官方网站','向MatchApp Ai询问这个纪念日']
};
function day(date='2026-10-21',extra={}){
 const record={id:'day-'+date,date,title:'Source & <day> "en"',kicker:'International day',place:'Worldwide',summary:'Source <summary> & details',prompt:'Explain this source day in English.',image:'/event-posters/verified-source.webp',imageAlt:'Source art',officialUrl:'https://official.example/day',sourceName:'Official source',keywords:['verified day'],i18n:{}};
 for(const lang of languages.filter(lang=>lang!=='en'))record.i18n[lang]={title:'Title '+lang+' & <day>',kicker:'Kicker '+lang,place:'Place '+lang,summary:'Summary '+lang+' <details>',prompt:'Prompt '+lang+' & <question>',imageAlt:'Art '+lang};
 return Object.assign(record,extra);
}
function translated(record,lang){return Object.assign({},record,record.i18n&&record.i18n[lang]);}
async function fixture({lang='en',globalLang='en',htmlLang='en',route='/events/',current=day(),history=[],host=true,failFetch=false,storageBlocked=false,html}={}){
 const dom=new JSDOM(html||'<!doctype html><html lang="'+htmlLang+'"><head><meta name="keywords" content="existing"></head><body>'+(host?'<section id="global-events"><span class="ge-sum-count">1</span><div class="global-event-grid"><article class="global-event" id="existing-event">Existing event</article></div></section>':'')+'</body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only'}),w=dom.window;
 const NativeDate=w.Date;w.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-21T12:00:00Z']));}static now(){return NativeDate.parse('2026-10-21T12:00:00Z');}};
 Object.defineProperty(w.document,'readyState',{value:'complete',configurable:true});
 if(lang!==null)w.localStorage.setItem('match_lang',lang);
 if(storageBlocked)Object.defineProperty(w,'localStorage',{get(){throw new Error('Storage unavailable');}});
 w.MATCH_LANG=globalLang;const requests=[];
 w.fetch=(url,options)=>{requests.push({url,options:JSON.parse(JSON.stringify(options))});return failFetch?Promise.reject(new Error('Offline')):Promise.resolve({ok:true,json:()=>Promise.resolve(url.includes('history')?history:current)});};
 w.eval(read('international-day.js'));await new Promise(resolve=>setImmediate(resolve));
 return {dom,w,requests,close(){w.close();}};
}
function assertCard(w,record,lang,state){
 const localized=translated(record,lang),id=state==='today'?'international-day-card':'international-day-card-'+record.id,card=w.document.getElementById(id),copy=labels[lang];
 assert.ok(card,id);assert.equal(card.querySelector('h3 a').textContent,localized.title);
 assert.equal(card.querySelector('.id-kicker').textContent,localized.kicker);assert.equal(card.querySelector('.id-summary').textContent,localized.summary);
 assert.ok(card.querySelector('.id-kicker').parentNode.textContent.includes(localized.place));
 assert.equal(card.querySelector('.event-badge').textContent,state==='today'?copy[0]:state==='ended'?copy[1]:new Intl.DateTimeFormat(lang,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(record.date+'T12:00:00Z')));
 assert.equal(card.querySelector('.id-cta').textContent,'✨ '+copy[2]);assert.equal(card.querySelector('.id-official').textContent,copy[3]);
 assert.equal(card.querySelector('.id-art').getAttribute('aria-label'),localized.title+' — '+copy[4]);
 assert.equal(card.querySelector('img').alt,localized.imageAlt);assert.equal(card.querySelector('img').getAttribute('src'),record.image);
 for(const link of card.querySelectorAll('.id-art,h3 a,.id-cta')){const url=new URL(link.href);assert.equal(url.origin,'https://matchapp.tv');assert.equal(url.pathname,'/discover.html');assert.equal(url.searchParams.get('q'),localized.prompt);assert.equal(url.searchParams.get('focus'),'start');}
 assert.equal(card.querySelector('.id-official').href,record.officialUrl);assert.equal(card.querySelector('.id-official').target,'_blank');assert.equal(card.querySelector('.id-official').rel,'noopener noreferrer');
 assert.equal(card.querySelector('day,details'),null,'authored text is escaped, never interpreted as markup');
 const schema=JSON.parse(w.document.getElementById('international-day-schema-'+record.id).textContent);
 assert.equal(schema.name,localized.title);assert.equal(schema.description,localized.summary);assert.equal(schema.about,localized.kicker);assert.equal(schema.inLanguage,lang);
 assert.equal(schema['@type'],'Event');assert.equal(schema.startDate,record.date);assert.equal(schema.endDate,record.date);assert.equal(schema.eventStatus,state==='ended'?'https://schema.org/EventCompleted':'https://schema.org/EventScheduled');
 assert.equal(schema.image,'https://matchapp.tv'+record.image);assert.equal(schema.url,record.officialUrl);assert.equal(schema.organizer.name,record.sourceName);assert.equal(schema.organizer.url,record.officialUrl);
 assert.equal(new URL(schema.location.url).searchParams.get('q'),localized.prompt);
 return card;
}
for(const [index,lang]of languages.entries())test('International Day uses the saved '+lang+' choice for content, controls, accessibility and dates',async()=>{
 const current=day(),ended=day('2026-10-20'),upcoming=day('2026-10-22'),f=await fixture({lang:inputTags[index],globalLang:lang==='en'?'fr':'en',htmlLang:lang==='en'?'fr':'en',current,history:[ended,upcoming]});
 try{assertCard(f.w,current,lang,'today');assertCard(f.w,ended,lang,'ended');assertCard(f.w,upcoming,lang,'upcoming');assert.equal(f.requests.length,2);assert.ok(f.requests.every(request=>request.options.cache==='no-cache'&&request.options.credentials==='same-origin'));assert.equal(f.w.document.querySelector('.ge-sum-count').textContent,'4');}finally{f.close();}
});
test('the actual language owner repaints cached cards in place without fetching, duplicating cards, losing focus or replacing artwork',async()=>{
 const current=day(),ended=day('2026-10-20'),upcoming=day('2026-10-22'),f=await fixture({current,history:[ended,upcoming]});
 try{
  const {w}=f,d=w.document;w.eval(read('i18n.js'));
  const original=d.getElementById('existing-event'),cards=[...d.querySelectorAll('.international-day')],snapshots=cards.map(card=>({card,image:card.querySelector('img'),src:card.querySelector('img').src,links:[...card.querySelectorAll('a')]}));
  const focused=d.querySelector('.id-cta');let clicks=0;focused.addEventListener('click',event=>{event.preventDefault();clicks++;});focused.focus();
  for(const lang of languages){
   w.setLanguage(lang);assertCard(w,current,lang,'today');assertCard(w,ended,lang,'ended');assertCard(w,upcoming,lang,'upcoming');assert.equal(d.documentElement.lang,lang);assert.equal(d.documentElement.dir,lang==='ar'?'rtl':'ltr');
   assert.equal(d.activeElement,focused);assert.equal(d.getElementById('existing-event'),original);assert.equal(d.querySelectorAll('.international-day').length,3);assert.equal(d.querySelectorAll('script[id^="international-day-schema-"]').length,3);
   for(const before of snapshots){assert.ok(before.card.isConnected);assert.equal(before.card.querySelector('img'),before.image);assert.equal(before.image.src,before.src);assert.equal(before.image.width,900);assert.equal(before.image.height,1200);assert.deepEqual([...before.card.querySelectorAll('a')],before.links);}
  }
  focused.click();assert.equal(clicks,1);assert.equal(f.requests.length,2,'switching language reuses the two original JSON responses');
  // A real storage event follows a persisted change made by another tab.
  w.localStorage.setItem('match_lang','fr');w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'fr'}));assertCard(w,current,'fr','today');assert.equal(f.requests.length,2);
 }finally{f.close();}
});
test('a language change remains authoritative when saving it fails, and a later cross-tab choice still repaints',async()=>{
 const current=day(),ended=day('2026-10-20'),upcoming=day('2026-10-22'),f=await fixture({lang:'en',current,history:[ended,upcoming]}),{w}=f,originalSetItem=w.Storage.prototype.setItem;
 try{
  w.eval(read('i18n.js'));
  w.Storage.prototype.setItem=function(key,value){if(key==='match_lang')throw new Error('Preference write unavailable');return originalSetItem.call(this,key,value);};
  for(const [tag,lang]of[['fr-CA','fr'],['pt_PT','pt-BR']]){
   w.setLanguage(tag);assert.equal(w.localStorage.getItem('match_lang'),'en','the previous saved value remains readable');assert.equal(w.MATCH_LANG,lang);assert.equal(w.document.documentElement.lang,lang);
   assertCard(w,current,lang,'today');assertCard(w,ended,lang,'ended');assertCard(w,upcoming,lang,'upcoming');
  }
  w.Storage.prototype.setItem=originalSetItem;
  w.localStorage.setItem('match_lang','ar-SA');w.dispatchEvent(new w.StorageEvent('storage',{key:'match_lang',newValue:'ar-SA'}));
  assert.equal(w.MATCH_LANG,'ar');assert.equal(w.document.documentElement.dir,'rtl');assertCard(w,current,'ar','today');assertCard(w,ended,'ar','ended');assertCard(w,upcoming,'ar','upcoming');assert.equal(f.requests.length,2);
 }finally{w.Storage.prototype.setItem=originalSetItem;f.close();}
});
test('retention, deduplication, source-field fallback and failed-image suppression survive language repaint',async()=>{
 const current=day(),yesterday=day('2026-10-20'),threeDays=day('2026-10-18'),expired=day('2026-10-17'),missingImage=day('2026-10-19',{image:''});
 current.i18n.fr={title:'Journée source <authentique>'};
 const f=await fixture({lang:'fr',current,history:[current,yesterday,threeDays,expired,missingImage]});
 try{
  const d=f.w.document,card=assertCard(f.w,current,'fr','today');assertCard(f.w,yesterday,'fr','ended');assertCard(f.w,threeDays,'fr','ended');
  assert.deepEqual([...d.querySelector('.global-event-grid').children].map(node=>node.id),['international-day-card','existing-event','international-day-card-'+yesterday.id,'international-day-card-'+threeDays.id]);
  assert.equal(d.getElementById('international-day-card-'+expired.id),null);assert.equal(d.getElementById('international-day-card-'+missingImage.id),null);assert.equal(d.querySelector('.ge-sum-count').textContent,'4');
  card.querySelector('img').dispatchEvent(new f.w.Event('error'));assert.equal(card.isConnected,false);
  f.w.localStorage.setItem('match_lang','ja');d.dispatchEvent(new f.w.CustomEvent('matchapp:langchange',{detail:{lang:'ja'}}));
  assert.equal(d.getElementById('international-day-card'),null,'failed art stays suppressed on language changes');assertCard(f.w,yesterday,'ja','ended');assert.equal(f.requests.length,2);
 }finally{f.close();}
});
test('storage failure and unsupported tags use a valid explicit or document language before the existing English fallback',async()=>{
 for(const config of[{lang:null,globalLang:'ko-KR',htmlLang:'en',storageBlocked:true,expected:'ko'},{lang:'unsupported',globalLang:'ja-JP',htmlLang:'en',expected:'ja'},{lang:null,globalLang:'unsupported',htmlLang:'fr-CA',expected:'fr'},{lang:'unsupported',globalLang:'unsupported',htmlLang:'unsupported',expected:'en'}]){
  const record=day(),f=await fixture({...config,current:record});try{assertCard(f.w,record,config.expected,'today');}finally{f.close();}
 }
});
test('missing optional prompts and kickers use the selected language while the existing chat route and prompt limit remain intact',async()=>{
 for(const lang of languages){
  const record=day(undefined,{kicker:'',prompt:'',i18n:{}}),f=await fixture({lang,current:record});
  try{const card=f.w.document.getElementById('international-day-card'),q=new URL(card.querySelector('.id-cta').href).searchParams.get('q');assert.ok(q.includes(record.title));assert.ok(card.querySelector('.id-kicker').textContent.trim());if(lang!=='en'){assert.ok(!q.startsWith('What is '));assert.notEqual(card.querySelector('.id-kicker').textContent,'International day');}}finally{f.close();}
 }
 const record=day(undefined,{prompt:'Source prompt '.repeat(100)}),f=await fixture({current:record});try{assert.equal(new URL(f.w.document.querySelector('.id-cta').href).searchParams.get('q'),record.prompt.slice(0,600));}finally{f.close();}
});
test('Kids and missing event hosts stay untouched, and unavailable JSON leaves the existing event rail usable',async()=>{
 for(const config of[{route:'/kids/events/'},{host:false}]){const f=await fixture(config);try{assert.equal(f.requests.length,0);assert.equal(f.w.document.querySelector('.international-day'),null);assert.equal(f.w.document.querySelector('script[type="application/ld+json"]'),null);}finally{f.close();}}
 const f=await fixture({failFetch:true});try{assert.equal(f.requests.length,2);assert.equal(f.w.document.querySelector('.international-day'),null);assert.equal(f.w.document.getElementById('existing-event').textContent,'Existing event');f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:langchange'));assert.equal(f.requests.length,2);}finally{f.close();}
});

// Capture the existing generator's writes in memory; a regression test must never rewrite editorial output.
function regeneratedEventOutput(){
 const writes=new Map(),captureFs={readFileSync:fs.readFileSync,mkdirSync(){},writeFileSync(file,content){writes.set(path.resolve(file),content);}};
 vm.runInNewContext(read('tools/build-global-events.js'),{__dirname:path.join(root,'tools'),console:{log(){}},require(name){
  if(name==='fs')return captureFs;if(name==='path')return path;
  if(name==='./event-lifecycle')return require('../tools/event-lifecycle');
  if(name==='./finalize-brand.js')return {finalizeBrand(){}};
  throw new Error('Unexpected generator dependency: '+name);
 }},{filename:'tools/build-global-events.js'});
 return writes;
}
test('CCXP all-day calendar matches the guide, preserves CRLF and opens without an invitation or alarm',()=>{
 const event=JSON.parse(read('tools/global-events.json')).find(e=>e.slug==='ccxp-2026');
 const guide='events/'+event.slug+'/',calendar=guide+event.slug+'.ics';
 const built=regeneratedEventOutput(),bytes=read(calendar);
 assert.equal(built.get(path.join(root,calendar)),bytes);
 assert.ok(bytes.endsWith('END:VCALENDAR\r\n'));
 assert.ok(bytes.split('\r\n').every(line=>!/[\r\n]/.test(line)&&Buffer.byteLength(line)<=75));
 assert.match(bytes,/\r\nDTSTART;VALUE=DATE:20261203\r\nDTEND;VALUE=DATE:20261207\r\n/);
 assert.equal(event.start.slice(0,10),'2026-12-03');
 assert.equal(event.end.slice(0,10),'2026-12-06');
 assert.ok(bytes.includes('LOCATION:'+event.location.replace(/,/g,'\\,')));
 assert.ok(bytes.includes('URL:https://matchapp.tv/'+guide+'\r\n'));
 assert.doesNotMatch(bytes,/VALARM|ORGANIZER|ATTENDEE|METHOD:REQUEST/);
 for(const html of [read(guide+'index.html'),built.get(path.join(root,guide,'index.html'))]){
  const doc=JSDOM.fragment(html);
  assert.equal(doc.querySelector('a[download][type="text/calendar"]').getAttribute('href'),'/'+calendar);
 }
});
for(const regenerated of[false,true])test((regenerated?'regenerated':'published')+' Events archive exposes the daily card without applying Home expiry to indexed guides',async()=>{
 const html=regenerated?regeneratedEventOutput().get(path.join(root,'events-archive.html')):read('events-archive.html'),current=day(),ended=day('2026-10-18'),expired=day('2026-10-17');
 assert.ok(html,'the existing generator produces an archive');
 const f=await fixture({html,route:'/events-archive.html',current,history:[ended,expired]}),{w}=f,d=w.document;
 try{
  const sourceEvents=JSON.parse(read('tools/global-events.json')),grid=d.querySelector('.event-archive-grid[data-international-day-host]');
  assert.ok(grid);assert.equal(d.querySelector('#global-events'),null,'the archive must not inherit Home-only expiration');
  assert.equal(d.querySelectorAll('script[src^="/international-day.js?"]').length,1);assert.equal(d.querySelectorAll('link[href^="/international-day.css?"]').length,1);
  const sources=[...grid.querySelectorAll('[data-event-slug]')].map(card=>({card,slug:card.dataset.eventSlug,image:card.querySelector('img'),src:card.querySelector('img').getAttribute('src'),link:card.querySelector('.event-poster-link'),href:card.querySelector('.event-poster-link').getAttribute('href')}));
  assert.deepEqual(sources.map(item=>item.slug),sourceEvents.map(event=>event.slug));assert.ok(sources.some(item=>Date.parse(item.card.dataset.eventEnd)<w.Date.now()-3*86400000),'fixture includes guides outside the Home retention window');
  const todayCard=assertCard(w,current,'en','today'),endedCard=assertCard(w,ended,'en','ended');assert.equal(grid.firstElementChild,todayCard);assert.equal(grid.lastElementChild,endedCard);assert.equal(d.getElementById('international-day-card-'+expired.id),null);
  const style=d.createElement('style');style.textContent=read('event-guide.css')+'\n'+read('international-day.css');d.head.appendChild(style);
  assert.equal(w.getComputedStyle(todayCard.querySelector('.id-summary')).display,'none','daily copy retains the compact archive treatment');assert.equal(w.getComputedStyle(todayCard.querySelector('.id-cta')).display,'none','the artwork and title provide the Ask action');
  assert.equal(w.getComputedStyle(todayCard.querySelector('img')).objectFit,'contain');assert.equal(w.getComputedStyle(todayCard.querySelector('img')).width,'100%');assert.equal(w.getComputedStyle(todayCard.querySelector('img')).aspectRatio,'2/3');assert.notEqual(w.getComputedStyle(todayCard.querySelector('.id-official')).display,'none');
  assert.equal(w.getComputedStyle(sources[0].card.querySelector('p')).display,'none','neighboring source guides keep their compact presentation');
  const ad=d.querySelector('.premium-ad-frame'),adMarkup=ad.outerHTML;
  w.eval(read('global-events.js'));w.eval(read('i18n.js'));w.setLanguage('fr');assertCard(w,current,'fr','today');assertCard(w,ended,'fr','ended');
  for(const before of sources){assert.ok(before.card.isConnected);assert.equal(before.card.hidden,false,before.slug+' stays in the archive');assert.equal(before.card.querySelector('img'),before.image);assert.equal(before.image.getAttribute('src'),before.src);assert.equal(before.card.querySelector('.event-poster-link'),before.link);assert.equal(before.link.getAttribute('href'),before.href);}
  assert.equal(grid.firstElementChild,todayCard);assert.equal(grid.lastElementChild,endedCard);assert.equal(d.querySelector('.premium-ad-frame'),ad);assert.equal(ad.outerHTML,adMarkup);assert.equal(d.querySelectorAll('.international-day').length,2);assert.equal(f.requests.length,2);
 }finally{f.close();}
});
