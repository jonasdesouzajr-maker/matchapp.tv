'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..');
const media=fs.readFileSync(path.join(root,'catalog-media.js'),'utf8');
const helpers=media.slice(media.indexOf('  function adultPosterSurface('),media.indexOf('  function localLikePoster('));

test('poster verification shares duplicate URLs and reserves two of six lanes for visible artwork',async()=>{
 let active=0,peak=0,starts=0;
 class Probe{
  naturalWidth=342;
  set src(_){starts++;active++;peak=Math.max(peak,active);queueMicrotask(()=>{active--;this.onload?.();});}
 }
 const {posterImageLoads}=vm.runInNewContext(helpers+'\n({posterImageLoads})',{
  Image:Probe,window:{},setTimeout,clearTimeout
 });
 const work=[];
 for(let i=0;i<18;i++){
  const url='https://image.tmdb.org/t/p/w342/verified-'+i+'.jpg';
  const original=posterImageLoads(url);
  assert.equal(posterImageLoads(url),original);
  assert.equal(posterImageLoads(url),original);
  work.push(original);
 }
 assert.equal(starts,4,'background failures leave two lanes available without an unbounded request burst');
 assert.ok((await Promise.all(work)).every(Boolean));
 assert.equal(starts,18);assert.equal(peak,4);assert.equal(active,0);
});

test('a visible result verification runs ahead of queued background rail repairs',async()=>{
 const probes=[];
 class Probe{naturalWidth=342;set src(url){this.url=url;probes.push(this);}}
 const {posterImageLoads}=vm.runInNewContext(helpers+'\n({posterImageLoads})',{
  Image:Probe,window:{},setTimeout,clearTimeout
 });
 const work=Array.from({length:8},(_,i)=>posterImageLoads('background-'+i));
 work.push(posterImageLoads('visible-result',true));
 work.push(posterImageLoads('visible-result-sharp',true));
 work.push(posterImageLoads('next-visible-result',true));
 assert.equal(probes.length,6);
 assert.equal(probes[4].url,'visible-result','a visible result starts while all four background requests are stalled');
 assert.equal(probes[5].url,'visible-result-sharp');
 probes[0].onload();
 assert.equal(probes[6].url,'next-visible-result','the queued visible image still precedes background work');
 for(let i=1;i<probes.length;i++)probes[i].onload?.();
 assert.ok((await Promise.all(work)).every(Boolean));
});

function firstPaint(selected,registry=''){
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 const start=app.indexOf("    const firstPoster = document.getElementById('res-poster-img');");
 const end=app.indexOf('    delete resultBox.dataset.resultClosing;',start);
 assert.ok(start>0&&end>start);
 const listeners=new Map(),loaded=[];
 const img={dataset:{},src:'',naturalWidth:0,complete:false,style:{},
  addEventListener:(type,fn)=>listeners.set(type,fn),
  removeEventListener:(type,fn)=>{if(listeners.get(type)===fn)listeners.delete(type);},
  removeAttribute:()=>{}};
 let registryReads=0;
 const context={selected,document:{getElementById:()=>img},currentRender:()=>true,
  exactSpotifyPlaylistCover:()=>'',generatedCover:()=> 'data:image/svg+xml,named-fallback',
  getVerifiedPoster:()=>{registryReads++;return registry;},
  window:{globalMatchTitle:selected.title,setLoadedMatchPoster:(url,title)=>loaded.push({url,title})}};
 vm.runInNewContext('let globalMatchPoster;\n'+app.slice(start,end),context);
 return {img,loaded,registryReads,load(){img.naturalWidth=780;img.complete=true;listeners.get('load')?.();}};
}

test('verified selected artwork starts in the initial result paint before optional metadata',()=>{
 const source='https://image.tmdb.org/t/p/w780/exact-tv.jpg';
 const scene=firstPaint({title:'Exact TV',_tmdbId:42,_tmdbKind:'tv',_meta:{artwork:source}},'https://image.tmdb.org/t/p/w780/wrong-film.jpg');
 assert.equal(scene.img.src,source.replace('/w780/','/w500/'));
 assert.equal(scene.img.fetchPriority,'high');assert.equal(scene.img.loading,'eager');
 assert.equal(scene.img.decoding,'async');assert.equal(scene.registryReads,0);
 assert.deepEqual(scene.loaded,[],'candidate art is not shared before pixels load');
 scene.load();assert.deepEqual(scene.loaded,[{url:source.replace('/w780/','/w500/'),title:'Exact TV'}]);
});

test('initial poster paint never takes title-only registry art for a pinned same-name source',()=>{
 const wrong='https://image.tmdb.org/t/p/w780/wrong-film.jpg';
 const pinned=firstPaint({title:'Same Name',_tmdbId:53,_tmdbKind:'tv'},wrong);
 assert.equal(pinned.registryReads,0);assert.match(pinned.img.src,/^data:image\/svg/);
 const audio=firstPaint({title:'Same Name',source:'itunes-live',cats:['music album']},wrong);
 assert.equal(audio.registryReads,0);assert.match(audio.img.src,/^data:image\/svg/);
 const known=firstPaint({title:'Known curated title'},wrong);
 assert.equal(known.img.src,wrong.replace('/w780/','/w500/'));assert.equal(known.registryReads,1);
});

test('adult metadata chooses a bounded source rendition while Kids retains its existing image order',async()=>{
 const start=media.indexOf('  function safePoster('),end=media.indexOf('  const COUNTRY_CODES',start);
 const resolveStart=media.indexOf('  async function resolvePoster('),resolveEnd=media.indexOf('  let mainSerial=',resolveStart);
 const prefix='https://image.tmdb.org/t/p/',file='exact-owned-poster.jpg';
 const row={tmdb_id:42,poster_url:prefix+'w500/'+file,poster_large_url:prefix+'w780/'+file,poster_original_url:prefix+'original/'+file};
 const api=vm.runInNewContext(media.slice(start,end)+media.slice(resolveStart,resolveEnd)+'\n({resolvePoster})',{
  TRUSTED_POSTER:/^https:\/\/image\.tmdb\.org\//,lookup:async()=>row,refreshExact:async value=>value,
  lookupLive:async()=>{throw Error('A known poster must not trigger another provider lookup');}
 });
 assert.equal((await api.resolvePoster('Exact title',{tmdbId:42})).url,row.poster_large_url);
 assert.equal((await api.resolvePoster('Exact title',{tmdbId:42,kids:true})).url,row.poster_original_url);
});
