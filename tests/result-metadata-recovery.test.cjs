'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const media=read('catalog-media.js');
const helpers=media.slice(media.indexOf('  function adultPosterSurface('),media.indexOf('  function localLikePoster('));
const sourceHelpers=media.slice(media.indexOf('  async function lookupLive('),media.indexOf('  function safePoster('));
const stale='https://image.tmdb.org/t/p/w780/old-landscape.jpg';
const original='https://image.tmdb.org/t/p/w780/correct-portrait.jpg';
const title='Laapataa Ladies';
const exact={title,tmdb_id:1163194,media_kind:'movie',year:2024,poster_large_url:original};
const source={title,tmdbId:1163194,kind:'movie',year:'2024',adult:false,posterLarge:original};
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};

function scene({loaded=true,details=source}={}){
 const probes=[],published=[],lookups=[],timers=new Map();
 let timer=0;
 class Probe{
  naturalWidth=0;
  set src(url){this.url=url;probes.push(this);}
  load(){this.naturalWidth=780;this.onload?.();}
  fail(){this.onerror?.();}
 }
 const win={globalMatchTitle:title,__matchappMatchRunId:3,
  currentMatchIdentity:{title,tmdbId:1163194,kind:'movie',year:2024,artwork:stale},
  tmdbDetails:async()=>details,
  getVerifiedPoster:()=>null,setLoadedMatchPoster:(url,name)=>published.push({url,name})};
 const image={id:'res-poster-img',dataset:{},isConnected:true,complete:true,naturalWidth:500,naturalHeight:281,
  _src:loaded?stale:'data:image/svg+xml,fallback',writes:[],
  get src(){return this._src;},get currentSrc(){return this._src;},
  set src(url){this._src=url;this.writes.push(url);},
  getAttribute(name){return name==='src'?this._src:null;},
  removeAttribute(){},closest:()=>null,addEventListener(){}};
 const context={window:win,Image:Probe,Promise,Map,Set,Date,LIVE_CACHE:new Map(),
  TRUSTED_POSTER:/^https:\/\/(?:image\.tmdb\.org|is\d+-ssl\.mzstatic\.com)\//i,
  normalise:value=>String(value||'').toLowerCase().replace(/[^a-z0-9]/g,''),
  localPoster:()=> 'data:image/svg+xml,fallback',
  lookup:async name=>{lookups.push(name);return null;},
  setTimeout(fn){timers.set(++timer,fn);return timer;},clearTimeout:id=>timers.delete(id)};
 const {recoverAdultPoster,refreshExact,lookupLive}=vm.runInNewContext(sourceHelpers+helpers+'\n({recoverAdultPoster,refreshExact,lookupLive})',context);
 return {win,image,probes,published,lookups,timers,refresh:refreshExact,
  live:()=>lookupLive(title,{tmdbId:1163194,kind:'movie',year:2024}),
  recover:(meta=null,preferred=stale)=>recoverAdultPoster(image,title,meta,preferred)};
}

test('late exact result metadata replaces a loaded stale snapshot only after the original decodes',async()=>{
 const s=scene();
 s.recover();
 assert.deepEqual(s.probes,[],'a loaded original needs no speculative lookup');
 s.win.currentMatchIdentity.artwork=original;
 s.recover(await s.refresh(exact),original);
 assert.equal(s.image.src,stale,'keep current pixels until the exact replacement is loaded');
 assert.ok(s.probes.length>0);
 assert(s.probes.every(probe=>probe.url.includes('correct-portrait')));
 s.probes.forEach(probe=>probe.load());await flush();
 assert.equal(s.image.src,original);
 assert.equal(s.published.at(-1).url,original);
 assert.deepEqual(s.lookups,[],'source identity already supplies the correct art');
 const count=s.probes.length;
 s.recover(null,stale);await flush();
 assert.equal(s.image.src,original,'a late render repeating the old snapshot cannot undo verified metadata');
 assert.equal(s.probes.length,count);
});

test('a decoded stale probe cannot overwrite an original that arrived during its request',async()=>{
 const s=scene({loaded:false});
 s.recover();
 const oldProbes=[...s.probes];
 assert(oldProbes.length>0);
 s.win.currentMatchIdentity.artwork=original;
 s.recover(await s.refresh(exact),original);
 oldProbes.forEach(probe=>probe.load());await flush();
 assert(!s.image.writes.some(url=>url.includes('old-landscape')),'outdated request must not publish');
 const newProbes=s.probes.filter(probe=>probe.url.includes('correct-portrait'));
 assert(newProbes.length>0,'the corrected source gets its own decode attempt');
 newProbes.forEach(probe=>probe.load());await flush();
 assert.equal(s.image.src,original);
 assert(s.published.every(item=>item.url.includes('correct-portrait')));
});

test('same-name metadata for another film, type or edition cannot change a loaded result',async()=>{
 for(const wrong of [{tmdb_id:999},{media_kind:'tv'},{year:1994}]){
  const s=scene();
  s.recover({...await s.refresh(exact),...wrong});
  await flush();
  assert.equal(s.image.src,stale);
  assert.equal(s.probes.length,0,'mismatched metadata cannot authorize another picture');
 }
});

test('failed exact refresh cannot replace a healthy original with cached same-ID artwork',async()=>{
 const s=scene({details:null}),cached={...exact,poster_large_url:stale,updated_at:'2025-01-01T00:00:00Z'};
 s.win.currentMatchIdentity.artwork=original;
 s.image._src=original;s.image.naturalHeight=750;
 s.recover(null,original);
 const metadata=await s.refresh(cached);
 assert.equal(metadata,cached,'failed refresh preserves the existing cache without upgrading its authority');
 // Enrichment can repeat the cached URL while the image already has source pixels.
 s.win.currentMatchIdentity.artwork=stale;
 s.recover(metadata,stale);
 s.probes.forEach(probe=>probe.load());await flush();
 assert.equal(s.image.src,original);
 assert.equal(s.probes.length,0,'cached art does not displace a loaded exact original');
});

test('a verified correction keeps its authority when later cached metadata arrives',async()=>{
 const s=scene(),fresh=await s.refresh(exact);
 s.recover(fresh,original);
 s.probes.forEach(probe=>probe.load());await flush();
 assert.equal(s.image.src,original);
 const count=s.probes.length;
 s.win.tmdbDetails=async()=>{throw new Error('source temporarily unavailable')};
 const cached=await s.refresh({...exact,poster_large_url:stale});
 s.win.currentMatchIdentity.artwork=stale;s.recover(cached,stale);await flush();
 assert.equal(s.image.src,original);
 assert.equal(s.probes.length,count);
 assert(s.published.every(item=>item.url.includes('correct-portrait')));
});

test('cached same-ID artwork remains available to repair a missing original',async()=>{
 const s=scene({loaded:false,details:null});
 s.recover(await s.refresh({...exact,poster_large_url:stale}),stale);
 assert(s.probes.length>0);
 s.probes.forEach(probe=>probe.load());await flush();
 assert.equal(s.image.src,stale,'a decoded cached original is still better than missing artwork');
});

test('unverified source responses cannot lend authority to old cached artwork',async()=>{
 for(const details of [{...source,tmdbId:999},{...source,kind:'tv'},{...source,adult:true},{...source,posterLarge:null}]){
  const s=scene({details});
  s.image._src=original;s.image.naturalHeight=750;s.win.currentMatchIdentity.artwork=original;
  s.recover(null,original);
  s.recover(await s.refresh({...exact,poster_large_url:stale}),stale);
  s.probes.forEach(probe=>probe.load());await flush();
  assert.equal(s.image.src,original,'a different identity, adult response, or no live poster cannot authorize replacement');
  assert.equal(s.probes.length,0);
 }
});

test('the live metadata cache retains verified artwork without another source request',async()=>{
 const s=scene();let calls=0;s.win.tmdbDetails=async()=>{calls++;return source};
 const first=await s.live();s.recover(first,original);
 s.probes.forEach(probe=>probe.load());await flush();
 assert.equal(s.image.src,original);
 const cached=await s.live();assert.equal(cached,first);assert.equal(calls,1);
 s.recover({...exact,poster_large_url:stale},stale);
 s.recover(cached,original);await flush();
 assert.equal(s.image.src,original);
 assert(s.published.every(item=>item.url.includes('correct-portrait')));
});

test('curated result art reuses the exact watch-guide identity when the Home snapshot is missing',async()=>{
 const app=read('app.js');
 const start=app.indexOf('let CURATED_POSTERS_PROMISE = null;'),end=app.indexOf('async function getExactCatalogPoster(',start);
 const url='https://image.tmdb.org/t/p/w780/nimona-original.jpg';
 let identity={tmdbId:961323,kind:'movie',year:2023};
 const row={title:'Nimona',tmdbId:961323,kind:'movie',year:2023,source:'https://www.themoviedb.org/movie/961323',posterLarge:url};
 const calls=[];
 const get=vm.runInNewContext(app.slice(start,end)+'\ngetCuratedPoster',{
  getCatalogTmdbIdentity:async()=>identity,
  catalogIdentityKey:value=>String(value).toLowerCase().replace(/[^a-z0-9]/g,''),
  fetch:async target=>{calls.push(target);return {ok:true,json:async()=>target.includes('watch-poster')?{entries:[row]}:[]};}
 });
 assert.equal(await get('Nimona'),url);
 assert.equal(calls.length,2,'both existing local snapshots load once');
 identity={...identity,tmdbId:999};
 assert.equal(await get('Nimona'),null);
 identity={tmdbId:961323,kind:'tv',year:2023};
 assert.equal(await get('Nimona'),null);
 identity={tmdbId:961323,kind:'movie',year:1990};
 assert.equal(await get('Nimona'),null);
 assert.equal(calls.length,2);
});

test('the Laapataa result snapshot uses the same verified portrait as the exact watch guide',()=>{
 const home=JSON.parse(read('data/poster-identities.json')).find(row=>row.tmdbId===1163194);
 const guide=JSON.parse(read('data/watch-poster-identities.json')).entries.find(row=>row.tmdbId===1163194);
 assert.equal(home.kind,guide.kind);
 assert.equal(Number(home.year),guide.year);
 assert.equal(home.poster,guide.poster);
 assert.equal(home.posterLarge,guide.posterLarge);
 assert.equal(home.posterOriginal,guide.posterOriginal);
});
