'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),os=require('node:os'),path=require('node:path');
const app=fs.readFileSync('app.js','utf8'),proxy=fs.readFileSync('supabase/functions/tmdb-proxy/index.ts','utf8');
const fn=name=>app.match(new RegExp('function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'source-wiring-')),file=path.join(dir,'proxy.cts');let install;
try{fs.writeFileSync(file,'module.exports=function install(createClient,Deno,fetch){\n'+proxy.replace(/^import[^\n]+\n/m,'')+'\n}');install=require(file)}finally{fs.rmSync(dir,{recursive:true,force:true})}
function backend({genres=[35],providerRows=[{provider_id:8,provider_name:'Netflix'}],total=30,details={}}={}){
 let handler;const requests=[];
 install(()=>({rpc:async()=>({data:{allowed:true}})}),{env:{get:()=> 'test'},serve:f=>handler=f},async url=>{
  const u=new URL(url);requests.push(u);
  let body={results:[],total_pages:total};
  if(u.pathname.includes('/watch/providers/'))body={results:providerRows};
  else if(u.pathname==='/3/search/keyword')body={results:[{id:9716,name:'stand-up comedy'}]};
  else if(u.pathname.includes('/discover/'))body={total_pages:total,results:[{id:42,title:'Source film',name:'Source series',adult:false,genre_ids:genres,poster_path:'/source.jpg',release_date:'2024-01-01',first_air_date:'2024-01-01'}]};
  else body={id:42,title:'Source film',name:'Source series',adult:false,genres:[{name:'Comedy'}],poster_path:'/source.jpg',...details};
  return new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}});
 });
 return {requests,call:async body=>{const r=await handler(new Request('https://test/functions/v1/tmdb-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));return {status:r.status,data:await r.json()}}};
}
const normalize=vm.runInNewContext(fn('canonicalProviderName')+';canonicalProviderName');
test('direct provider aliases agree across client/source without treating add-on channels as subscriptions',()=>{
 const source=vm.runInNewContext(proxy.match(/function canonicalWatchProvider\(value: unknown\): string \{[\s\S]*?\n\}/)[0].replace('(value: unknown): string','(value)')+';canonicalWatchProvider');
 for(const [name,key] of [['The Roku Channel','roku'],['Roku Channel','roku'],['Pluto TV','pluto'],['Rakuten Viki','viki'],['Viki','viki'],['JioHotstar','hotstar'],['Disney+ Hotstar','hotstar'],['Plus SBT','sbt'],['Amazon Prime Video with Ads','primevideo'],['Netflix Standard with Ads','netflix']]){
  assert.equal(normalize(name),key,name);assert.equal(source(name),key,name);
 }
 for(const name of ['HBO Max Amazon Channel','Disney+ Amazon Channel','Amazon Prime Video Channels','Apple TV Bundle']){
  assert.equal(normalize(name),source(name));assert(normalize(name).startsWith('channel:'),name);
 }
});
test('TV and mixed-format discovery use TV genre IDs, keeping the requested region and service filter',async()=>{
 for(const [input,expected] of [[28,'10759'],[12,'10759'],[878,'10765'],[14,'10765'],[27,'9648|10765|18']]){
  const s=backend();const r=await s.call({discover:{kind:'tv',genre_ids:[input],provider:'Netflix',region:'BR'}});
  assert.equal(r.status,200);const q=s.requests.find(x=>x.pathname==='/3/discover/tv');assert.equal(q.searchParams.get('with_genres'),expected);
  assert.equal(q.searchParams.get('with_watch_providers'),'8');assert.equal(q.searchParams.get('watch_region'),'BR');
 }
 const s=backend();await s.call({discover:{genre_ids:[878],region:'BR'}});
 assert.equal(s.requests.find(x=>x.pathname==='/3/discover/movie').searchParams.get('with_genres'),'878');
 assert.equal(s.requests.find(x=>x.pathname==='/3/discover/tv').searchParams.get('with_genres'),'10765');
});
test('multiple selected services filter discovery by their union and require exact provider details later',async()=>{
 const s=backend({providerRows:[{provider_id:8,provider_name:'Netflix'},{provider_id:337,provider_name:'Disney Plus'}]});
 const r=await s.call({discover:{kind:'movie',providers:['Netflix','Disney+'],region:'BR',pages:2,page_start:7}});
 assert.equal(r.status,200);const queries=s.requests.filter(x=>x.pathname==='/3/discover/movie');
 assert.equal(queries.length,2);assert.equal(queries[0].searchParams.get('with_watch_providers'),'8|337');
 assert.equal(queries[0].searchParams.get('page'),'7');assert.equal(r.data.total_pages,30);
 assert.equal(r.data.results[0].verifiedProvider,'','a union does not identify an individual provider');
 assert.equal(s.requests.filter(x=>x.pathname.includes('/watch/providers/')).length,1,'one shared directory per region/type');
});
test('limited series, stand-up and short-film discovery use source filters and preserve classification proof',async()=>{
 for(const [format,kind,param,value] of [['limited series','tv','with_type','2'],['stand-up comedy special','movie','with_keywords','9716'],['short film','movie','with_runtime.lte','39']]){
  const s=backend();await s.call({discover:{kind,format}});const q=s.requests.find(x=>x.pathname==='/3/discover/'+kind);assert.equal(q.searchParams.get(param),value);
 }
 const s=backend({details:{type:'Miniseries',number_of_seasons:1,keywords:{results:[{name:'based on a true story'}]}}});
 const r=await s.call({tmdb_id:42,kind:'tv',details:true});assert.equal(r.data.results[0].seriesType,'Miniseries');assert.equal(r.data.results[0].numberOfSeasons,1);assert.deepEqual(r.data.results[0].keywords,['based on a true story']);
});
function discovery({known=[],candidates,details}={}){
 const values={};const calls=[];const w={localStorage:{getItem:k=>values[k]||null,setItem:(k,v)=>values[k]=v},MatchAppCatalogMedia:{regionCode:()=> 'BR'},matchPolicy:{key:t=>t,known:()=>new Set(known),excludes:()=>false},tmdbDiscover:async q=>{calls.push(q);return candidates(q)},tmdbDetails:async(id,kind)=>details(id,kind)};
 const ctx={window:w,SESSION_SHOWN:new Set(),normCriteria:a=>(a||[]).filter(x=>x&&x!=='any'),currentPreferenceExclusions:()=>({genres:new Set(),countries:new Set()}),Math:{...Math,random:()=>0,min:Math.min,max:Math.max,floor:Math.floor},console};
 const start=app.indexOf('const TMDB_GENRE_ID_BY_NAME='),end=app.indexOf('// AI-PROPOSED, SOURCE-VERIFIED FRESH TITLE',start);
 const find=vm.runInNewContext(app.slice(start,end)+';discoverVerifiedExactTMDB',ctx);return {calls,values,find};
}
const row=(id,extra={})=>({tmdbId:id,kind:'movie',title:'Film '+id,year:'2024',genreIds:[35,10751],overview:'A gentle family comedy.',providerFiltered:true,verifiedProvider:'netflix',verifiedRegion:'BR',...extra});
const detail=id=>({tmdbId:id,title:'Film '+id,year:'2024',genres:['Comedy','Family'],overview:'A gentle family comedy.',originCountries:['GB'],availability:{BR:{stream:['Netflix']}}});
const criteria={cat:['movie'],plat:['Netflix'],mood:['cozy comfort watch'],vibe:[],genre:[],rating:[],decade:[]};
function page(rows,total=40){Object.defineProperty(rows,'sourcePages',{value:{total}});return rows}
test('exhausting the first 120 known titles reaches later source pages without recycling',async()=>{
 const h=discovery({known:Array.from({length:120},(_,i)=>'Film '+(i+1)),candidates:q=>page(Array.from({length:60},(_,i)=>row((q.page_start-1)*20+i+1))),details:async id=>detail(id)});
 const pick=await h.find(criteria);assert.equal(pick.title,'Film 121');assert.deepEqual(h.calls.map(q=>q.page_start),[1,4,7]);
});
test('the bounded detail budget advances its cursor so a retry does not rescan only the same rejected titles',async()=>{
 const h=discovery({candidates:q=>page(Array.from({length:60},(_,i)=>row(q.page_start===1?i+1:i+101))),details:async id=>({...detail(id),availability:{BR:{stream:[id<100?'Disney+':'Netflix']}}})});
 assert.equal(await h.find(criteria),null);assert.equal((await h.find(criteria)).title,'Film 101');assert.equal(h.calls[1].page_start,4);
});
test('source mood conflicts are skipped before spending detail calls; TV combined genres retain their mood meaning',async()=>{
 let detailed=0;const h=discovery({candidates:()=>page([...Array.from({length:25},(_,i)=>row(i+1,{genreIds:[35,53]})),row(80)]),details:async id=>{detailed++;return detail(id)}});
 assert.equal((await h.find(criteria)).title,'Film 80');assert.equal(detailed,1);
 const genreRules=app.slice(app.indexOf('const MOOD_SOURCE_GENRES='),app.indexOf('function canonicalProviderName('));
 const fits=vm.runInNewContext(genreRules+';moodFitsVerified');
 assert(fits(['mind-bending'],['Sci-Fi & Fantasy'],'A time travel mystery.','tv'));
 assert(fits(['epic and adventurous'],['Action & Adventure'],'A grand voyage.','tv'));
 assert(fits(['romantic'],['Drama'],'Two friends fall in love.','tv'));
 assert.equal(fits(['romantic'],['Drama'],'A police investigation.','tv'),false);
 assert(fits(['intense and thrilling'],['Drama'],'A suspense thriller.','tv'));
 assert.equal(fits(['cozy comfort watch'],['War & Politics'],'A conflict.','tv'),false);
});
test('OR categories and multiple providers keep live discovery reachable and still check the actual selected service',async()=>{
 const h=discovery({candidates:()=>page([row(1)]),details:async id=>detail(id)});
 const pick=await h.find({...criteria,cat:['movie','YouTube channel'],plat:['Netflix','Disney+']});
 assert.equal(pick.title,'Film 1');assert.equal(pick.platform,'Netflix');assert.deepEqual(Array.from(h.calls[0].providers),['Netflix','Disney+']);
});
test('special format and pace choices require actual source classification, not an invented label',async()=>{
 const get=vm.runInNewContext(fn('categoryFitsVerified')+';categoryFitsVerified',{COUNTRY_CATEGORY_CODES:{}});
 assert.equal(get('tv',['Drama'],['US'],['limited series'],{seriesType:'Scripted'}),false);
 assert.equal(get('tv',['Drama'],['US'],['limited series'],{seriesType:'Miniseries'}),true);
 assert.equal(get('movie',['Comedy'],['US'],['stand-up comedy special'],{keywords:[]}),false);
 assert.equal(get('movie',['Comedy'],['US'],['stand-up comedy special'],{keywords:['stand-up comedy']}),true);
 assert.equal(get('movie',['Drama'],['IN'],['Bollywood'],{originalLanguage:'ta'}),false);
 assert.equal(get('movie',['Drama'],['IN'],['Bollywood'],{originalLanguage:'hi'}),true);
 const h=discovery({candidates:()=>page([row(1)]),details:async id=>({...detail(id),runtimeMinutes:95})});
 assert.equal((await h.find({...criteria,vibe:['one sitting short watch']})).title,'Film 1');
});
test('national cinema and drama choices constrain the source country before spending the detail budget',async()=>{
 const s=backend();await s.call({discover:{kind:'tv',origin_countries:['KR','CN','invalid'],format:'reality show'}});
 const q=s.requests.find(x=>x.pathname==='/3/discover/tv');assert.equal(q.searchParams.get('with_origin_country'),'KR|CN');assert.equal(q.searchParams.get('with_genres'),'10764');
 const h=discovery({candidates:()=>page([]),details:async id=>detail(id)});await h.find({...criteria,cat:['K-drama']});assert.deepEqual(Array.from(h.calls[0].origin_countries),['KR']);
});
test('a genuine empty source does not cause four redundant page requests and an outage does not advance history',async()=>{
 const h=discovery({candidates:()=>page([],0),details:async id=>detail(id)});assert.equal(await h.find(criteria),null);assert.equal(h.calls.length,1);
 const failed=discovery({candidates:()=>[],details:async id=>detail(id)});assert.equal(await failed.find(criteria),null);assert.equal(failed.values.match_source_cursors_v1,undefined);
});
test('source-backed categories and platforms survive a small local shelf while unsupported empty options do not',()=>{
 const {JSDOM}=require('jsdom');const registry=vm.runInNewContext('('+app.match(/const PLATFORMS = (\{[\s\S]*?\n\});/)[1]+')');
 const dom=new JSDOM('<select id="q-category"><option value="movie">Movies</option><option value="Nollywood">Nollywood</option><option value="unknown">Unknown</option></select><select id="q-platform">'+Object.keys(registry).map(p=>'<option>'+p+'</option>').join('')+'</select>');
 const ctx={PLATFORMS:registry,CONTENT_CATALOG:[{title:'Tiny shelf',cats:['movie'],platform:'Netflix',moods:['funny'],vibes:[],ratings:[]}],document:dom.window.document,CustomEvent:dom.window.CustomEvent,console};
 vm.runInNewContext(['sourceDiscoverableCategory','sourceDiscoverablePlatform','pruneUnstockedOptions'].map(fn).join('\n')+';pruneUnstockedOptions()',ctx);
 for(const [name,p] of Object.entries(registry))if(!p.audio&&!p.cats.includes('vertical micro-drama')&&p.cats.some(c=>['movie','series','limited series','documentary','reality show','K-drama','C-drama','J-drama','Turkish dizi','novela brasileira','telenovela','anime','short film','stand-up comedy special','Bollywood','Nollywood','European cinema'].includes(c)))assert([...dom.window.document.querySelector('#q-platform').options].some(x=>x.value===name),name);
 assert(dom.window.document.querySelector('option[value="Nollywood"]'));assert.equal(dom.window.document.querySelector('option[value="unknown"]'),null);dom.window.close();
});
test('live-source guidance is authored in all fourteen languages and does not present an empty shelf as an empty source catalogue',async()=>{
 const {JSDOM}=require('jsdom');const dom=new JSDOM('<div id="questionnaire-box"><button onclick="triggerMatch(false)">Match</button></div>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 try{
  w.getMatchCriteria=()=>({cat:['movie'],mood:['cozy comfort watch'],plat:['Netflix']});w.matchPolicy={matchesCriteria:()=>false,known:()=>new Set(),key:t=>t};w.sourceDiscoverableCategory=c=>c==='movie';
  const source=fs.readFileSync('match-insights.js','utf8');w.setTimeout=fn=>{queueMicrotask(fn);return 1};w.clearTimeout=()=>{};
  w.eval('const CONTENT_CATALOG=[{title:"Other",cats:["movie"]}];\n'+source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const texts=new Set();for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
   w.MATCH_LANG=lang;w.document.dispatchEvent(new w.Event('matchapp:langchange'));await new Promise(r=>setImmediate(r));
   const hint=w.document.getElementById('match-pool-hint');assert.equal(hint.dataset.level,'source',lang);assert.equal(hint.hidden,false);assert(hint.textContent.length>20);texts.add(hint.textContent);
  }
  assert.equal(texts.size,14,'every selected language has its own authored guidance');
 }finally{w.close()}
});
test('live streaming formats are selectable beyond a service\'s incomplete curated format list',()=>{
 const {JSDOM}=require('jsdom');const registry=app.match(/const PLATFORMS = (\{[\s\S]*?\n\});/)[1];
 const dom=new JSDOM('',{runScripts:'outside-only'}),w=dom.window;
 try{
  w.eval('const PLATFORMS='+registry+'; const CONTENT_CATALOG=[];\n'+fn('sourceDiscoverableCategory')+fn('sourceDiscoverablePlatform')+fn('platformAcceptsCategory')+'\n'+fs.readFileSync('locale-results.js','utf8'));
  for(const [name,cat] of [['Prime Video','K-drama'],['Disney+','C-drama'],['Pure Flix','movie'],['MUBI','limited series']]){
   assert(w.criteriaCompatible('cat',cat,{plat:[name]}),name+' / '+cat);
   assert(w.criteriaCompatible('plat',name,{cat:[cat]}),cat+' / '+name);
  }
  assert.equal(w.criteriaCompatible('cat','movie',{plat:['Spotify']}),false);
  assert.equal(w.criteriaCompatible('cat','movie',{plat:['DramaBox']}),false,'vertical specialists keep their true format boundary');
 }finally{w.close()}
});
test('new source requests include genuine low-vote titles without changing the legacy source default',async()=>{
 for(const [extra,expected] of [[{},'20'],[{min_votes:0},'0']]){
  const s=backend();await s.call({discover:{kind:'movie',...extra}});
  assert.equal(s.requests.find(x=>x.pathname==='/3/discover/movie').searchParams.get('vote_count.gte'),expected);
 }
});
test('every actual curated platform/format pair remains selectable even when the legacy registry omitted its format',()=>{
 const registry=app.match(/const PLATFORMS = (\{[\s\S]*?\n\});/)[1],catalog=app.match(/const CONTENT_CATALOG = (\[[\s\S]*?\n\]);/)[1];
 const ctx=vm.createContext({window:{},document:{dispatchEvent:()=>{}},CustomEvent:class{},setTimeout});
 vm.runInContext('const PLATFORMS='+registry+';const CONTENT_CATALOG='+catalog+';'+fn('sourceDiscoverableCategory')+fn('sourceDiscoverablePlatform')+fn('platformAcceptsCategory')+';'+fs.readFileSync('catalog-plus.js','utf8')+';globalThis.rows=CONTENT_CATALOG;globalThis.accept=platformAcceptsCategory;globalThis.registry=PLATFORMS;',ctx);
 let checked=0;for(const e of ctx.rows.filter(e=>ctx.registry[e.platform]))for(const cat of e.cats){assert(ctx.accept(e.platform,cat),e.platform+' / '+cat+' / '+e.title);checked++}assert(checked>400);
 assert(ctx.accept('Netflix','Classical Music'),'Maestro is an actual curated Netflix/classical title');
});
