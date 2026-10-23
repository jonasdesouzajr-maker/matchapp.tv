'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../catalog-media.js'),'utf8');
const helpers=source.slice(source.indexOf('  function adultPosterSurface('),source.indexOf('  function localLikePoster('));
const original='https://image.tmdb.org/t/p/w780/exact-owner-art.jpg';
const compact='https://image.tmdb.org/t/p/w500/exact-owner-art.jpg';
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve()};
function scene({rail=false,offscreen=false,cached=[],startUrl=original}={}){
 let now=0,nextTimer=0;const timers=new Map(),probes=[],observerTargets=new Set(),cache=new Set(cached),loaded=[],lookups=[];
 class Probe{
  constructor(){this.naturalWidth=0;this.onload=null;this.onerror=null;}
  set src(url){this.url=url;probes.push(this);if(cache.has(url))queueMicrotask(()=>this.load());}
  load(){cache.add(this.url);this.naturalWidth=Number(this.url.match(/\/w(\d+)\//)?.[1]||780);this.onload?.();}
  fail(){this.naturalWidth=0;this.onerror?.();}
 }
 let observer;
 class Observer{
  constructor(callback,options){observer={callback,options};}
  observe(img){observerTargets.add(img);}
  unobserve(img){observerTargets.delete(img);}
 }
 const listeners=new Map();
 const img={id:rail?'':'res-poster-img',dataset:{},loading:rail?'lazy':'eager',style:{},complete:false,naturalWidth:0,isConnected:true,writes:[],
  _src:startUrl,
  get src(){return this._src;},get currentSrc(){return this._src;},
  set src(url){this._src=url;this.writes.push(url);this.complete=cache.has(url);this.naturalWidth=this.complete?Number(url.match(/\/w(\d+)\//)?.[1]||780):0;},
  getBoundingClientRect(){return {width:146,height:195,left:10,right:156,top:offscreen?2000:120,bottom:offscreen?2195:315};},
  closest(selector){return rail&&selector==='#marquee-track'?{}:null;},
  addEventListener(type,fn){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(fn);},
  removeAttribute(){},getAttribute(name){return name==='src'?this._src:null;}
 };
 const win={innerHeight:844,innerWidth:390,globalMatchTitle:'Exact owner title',setLoadedMatchPoster:(url,title)=>loaded.push({url,title})};
 const ctx=vm.createContext({window:win,Image:Probe,IntersectionObserver:Observer,
  TRUSTED_POSTER:/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i,
  document:{documentElement:{clientHeight:844,clientWidth:390}},
  setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,at:now+ms});return id;},clearTimeout:id=>timers.delete(id),Date:{now:()=>now},
  localPoster:()=> 'data:image/svg+xml,named-fallback',normalise:s=>String(s).toLowerCase(),lookup:async title=>{lookups.push(title);return null;},Promise,Map,Set});
 const api=vm.runInContext(helpers+'\n({recoverAdultPoster})',ctx);
 const recover=()=>api.recoverAdultPoster(img,'Exact owner title',null,startUrl);
 return {img,probes,timers,loaded,lookups,observerTargets,recover,win,
  enter(){offscreen=false;observer.callback([{target:img,isIntersecting:true}]);},
  disconnect(){img.isConnected=false;observer?.callback([{target:img,isIntersecting:false}]);},
  async advance(ms){const target=now+ms;for(;;){const next=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;now=next[1].at;timers.delete(next[0]);next[1].fn();await flush();}now=target;await flush();},
  error(){for(const fn of listeners.get('error')||[])fn();},
  get now(){return now;}};
}

test('visible exact-art requests begin immediately and a compact source paints without the old eight-second wait',async()=>{
 const s=scene();s.recover();
 assert.deepEqual(s.probes.map(p=>p.url),[original,compact]);
 assert.equal(s.now,0);assert.equal(s.timers.size,2);assert.deepEqual(s.lookups,[]);
 await s.advance(40);s.probes[1].load();await flush();
 assert.equal(s.img.src,compact);assert.equal(s.img.complete,true);assert.equal(s.img.naturalWidth,500);
 assert.equal(s.img.dataset.matchappFallbackStage,'verified');
 assert.deepEqual(s.loaded,[{url:compact,title:'Exact owner title'}]);
 await s.advance(160);s.probes[0].load();await flush();
 assert.deepEqual(s.img.writes,[compact,original]);assert.equal(s.img.naturalWidth,780);assert.equal(s.timers.size,0);
});

test('a later compact rendition never downgrades already loaded larger original artwork',async()=>{
 const s=scene();s.recover();s.probes[0].load();await flush();
 assert.equal(s.img.src,original);s.img.complete=true;s.img.naturalWidth=780;
 s.probes[1].load();await flush();
 assert.equal(s.img.src,original);assert.deepEqual(s.img.writes,[]);assert.equal(s.timers.size,0);
});

test('cached exact artwork can paint in the first microtask without metadata or fallback work',async()=>{
 const s=scene({cached:[compact]});s.recover();await flush();
 assert.equal(s.now,0);assert.equal(s.img.src,compact);assert.equal(s.img.complete,true);
 assert.deepEqual(s.lookups,[]);assert(!s.img.writes.some(url=>url.startsWith('data:')));
 s.probes[0].load();await flush();assert.equal(s.timers.size,0);
});

test('lazy offscreen rail images spend no recovery lanes or timers before approaching view',async()=>{
 const s=scene({rail:true,offscreen:true});s.recover();
 assert.equal(s.probes.length,0);assert.equal(s.timers.size,0);assert(s.observerTargets.has(s.img));
 await s.advance(9000);assert.equal(s.probes.length,0);assert.deepEqual(s.img.writes,[]);
 s.enter();assert.equal(s.img.loading,'eager');assert.equal(s.img.fetchPriority,'high');assert(!s.observerTargets.has(s.img));
 assert.deepEqual(s.probes.map(p=>p.url),[original,original.replace('/w780/','/w342/')]);
 s.probes[1].load();s.probes[0].load();await flush();assert.equal(s.timers.size,0);
});

test('disconnected lazy nodes leave the shared observer without starting image work',()=>{
 const s=scene({rail:true,offscreen:true});s.recover();s.disconnect();
 assert(!s.observerTargets.has(s.img));assert.equal(s.probes.length,0);assert.equal(s.timers.size,0);
});

test('stale or disconnected same-art callbacks cannot replace a newer title',async()=>{
 for(const disconnected of [false,true]){
  const s=scene();s.recover();if(disconnected)s.img.isConnected=false;else s.img.__matchappAdultPoster={title:'New title'};
  s.probes[1].load();s.probes[0].load();await flush();
  assert.deepEqual(s.img.writes,[]);assert.deepEqual(s.loaded,[]);assert.equal(s.timers.size,0);
 }
});

test('a primary image error does not cancel the already requested exact-art companion',async()=>{
 const s=scene();s.recover();s.error();assert.deepEqual(s.img.writes,[]);
 s.probes[0].fail();s.probes[1].load();await flush();
 assert.equal(s.img.src,compact);assert.deepEqual(s.lookups,[]);assert.equal(s.timers.size,0);
});

test('a destination error keeps the remaining rendition alive and cannot strand a failed preview',async()=>{
 const s=scene();s.recover();s.probes[1].load();await flush();assert.equal(s.img.src,compact);
 s.img.complete=true;s.img.naturalWidth=0;s.error();s.probes[0].fail();await flush();
 assert(s.probes.some(p=>p.url.includes('/w342/')),'the existing exact-art repair resumes after both displayed candidates fail');
 assert.deepEqual(s.lookups,[]);
});

test('a verified original arriving after the probe deadline replaces the fallback for its current result',async()=>{
 const s=scene();s.recover();
 await s.advance(26000);
 s.img.src='data:image/svg+xml,named-fallback';
 s.probes[1].load();await flush();
 assert.equal(s.img.src,compact,'late decoded pixels must recover the current result');
 assert.equal(s.img.dataset.matchappFallbackStage,'verified');
 assert.equal(s.loaded.at(-1).url,compact);
});

test('late successful downloads cannot overwrite a newer result or corrected artwork',async()=>{
 for(const changed of ['result','artwork','disconnected','generation']){
  const s=scene();s.recover();await s.advance(26000);
  s.img.src='data:image/svg+xml,new-result';
  if(changed==='result')s.img.__matchappAdultPoster={title:'New title'};
  if(changed==='artwork')s.img.__matchappAdultPoster.preferred=original.replace('exact-owner-art','corrected-art');
  if(changed==='disconnected')s.img.isConnected=false;
  if(changed==='generation')s.win.__matchappMatchRunId=1;
  const before=s.loaded.length;
  s.probes[1].load();s.probes[0].load();await flush();
  assert.equal(s.img.src,'data:image/svg+xml,new-result');assert.equal(s.loaded.length,before);
 }
});

test('late compact pixels never downgrade a sharper decoded poster and listeners expire',async()=>{
 const s=scene();s.recover();await s.advance(26000);
 s.img.src='data:image/svg+xml,named-fallback';
 s.probes[0].load();await flush();assert.equal(s.img.src,original);
 s.probes[1].load();await flush();assert.equal(s.img.src,original);
 await s.advance(90000);assert.equal(s.timers.size,0);
 const expired=scene();expired.recover();await expired.advance(100000);
 expired.img.src='data:image/svg+xml,named-fallback';
 expired.probes[0].load();await flush();assert.equal(expired.img.src,'data:image/svg+xml,named-fallback');
 assert.equal(expired.timers.size,0);
});

test('visible delivery bounds huge originals and avoids a needless high-resolution upgrade on small cards',()=>{
 const huge=scene({startUrl:original.replace('/w780/','/original/')});huge.recover();
 assert.deepEqual(huge.probes.map(p=>p.url),[original,compact]);
 const small=scene({startUrl:compact});small.recover();
 assert.deepEqual(small.probes.map(p=>p.url),[compact,original.replace('/w780/','/w342/')]);
});
