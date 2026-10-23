'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const media=read('catalog-media.js'),app=read('app.js');
const id='tt21626284',title='Laapataa Ladies';
const source={tmdbId:1163194,kind:'movie',title:'Lost Ladies',year:'2024',adult:false,imdbId:id,
 poster:'https://image.tmdb.org/t/p/w500/yXt07MYeiyQRzS69PMHy0BPjCGP.jpg'};

test('exact live and refreshed media retain the validated IMDb identity without a database schema change',async()=>{
 const begin=media.indexOf('  async function lookupLive('),end=media.indexOf('  function safePoster(',begin);
 let detail=source;
 const ctx={window:{tmdbDetails:async()=>detail},LIVE_CACHE:new Map(),normalise:v=>String(v).toLowerCase(),Map,Date,Promise};
 const {lookupLive,refreshExact}=vm.runInNewContext(media.slice(begin,end)+'\n({lookupLive,refreshExact})',ctx);
 const found=await lookupLive(title,{tmdbId:1163194,kind:'movie',year:2024});
 assert.equal(found.tmdb_id,1163194);
 assert.equal(found.imdb_id,id);
 const refreshed=await refreshExact({title,tmdb_id:1163194,media_kind:'movie',year:2024});
 assert.equal(refreshed.imdb_id,id);
 detail={...source,imdbId:'tt21626284/unsafe'};
 const invalid=await refreshExact({title,tmdb_id:1163194,media_kind:'movie',year:2024});
 assert.equal(invalid.imdb_id,null);
 assert(!media.match(/\.select\('[^']*\bimdb_id\b/),'IMDb data is in-memory enrichment, not a new SQL column requirement');
});

test('verified original-title aliases retain source identity when TMDB returns a localized display title',async()=>{
 const start=media.indexOf('  async function lookupLive('),end=media.indexOf('  function safePoster(',start);
 const safeStart=media.indexOf('  function safeSameTitleMedia('),safeEnd=media.indexOf('  const ADULT_IMAGE_PROBES',safeStart);
 const original='Como caído del cielo';
 const movie={...source,title:'Out of the Clear Blue Sky',originalTitle:original,tmdbId:654299,year:'2019',imdbId:'tt10946934'};
 const ctx={window:{tmdbLookup:async()=>movie,tmdbDetails:async()=>movie},LIVE_CACHE:new Map(),
  normalise:v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),Map,Date,Promise};
 const api=vm.runInNewContext(media.slice(start,end)+media.slice(safeStart,safeEnd)+'\n({lookupLive,safeSameTitleMedia})',ctx);
 const row=await api.lookupLive(original,{kind:'movie',year:2019});
 assert.equal(row.original_title,original);
 const current={title:original,tmdbId:0,kind:'movie',year:2019};
 assert.equal(api.safeSameTitleMedia(row,current),true);
 assert.equal(api.safeSameTitleMedia({...row,source_key:'tmdb:movie:654299'},current),true,'a freshly verified database identity retains the original-title alias');
 assert.equal(api.safeSameTitleMedia({...row,source_key:'tmdb:movie:654299',_verifiedPosterUrl:null},current),false,'unrefreshed cached metadata cannot authorize an alias');
 assert.equal(api.safeSameTitleMedia({...row,source_key:'unverified'},current),false);
 assert.equal(api.safeSameTitleMedia({...row,year:1990},current),false);
 assert.equal(api.safeSameTitleMedia(row,{...current,tmdbId:999}),false);
 assert.equal(api.safeSameTitleMedia(row,{...current,kind:'tv'}),false);
});

test('enrichment publishes IMDb only for the same selected TMDB identity',async()=>{
 const start=media.indexOf('  let mainSerial=0;'),end=media.indexOf('  let kidsSerial=',start);
 const safeStart=media.indexOf('  function safeSameTitleMedia('),safeEnd=media.indexOf('  const ADULT_IMAGE_PROBES',safeStart);
 for(const tmdbId of [1163194,999]){
  const box={hidden:false,style:{display:'block'}},titleEl={textContent:title};
  const events=[];
  const win={globalMatchTitle:title,__matchappMatchRunId:4,
   currentMatchIdentity:{title,tmdbId:1163194,kind:'movie',year:2024,cats:['movie']}};
  const ctx={window:win,document:{getElementById:key=>key==='result-box'?box:key==='res-title'?titleEl:null,
    dispatchEvent:event=>events.push(event)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},
   normalise:value=>String(value).toLowerCase(),desktopResultInfo:()=>false,ensurePlayerHost:()=>({}),
   resolvePoster:async()=>({url:source.poster,meta:{title:'Lost Ladies',tmdb_id:tmdbId,media_kind:'movie',year:2024,imdb_id:id}}),
   applyDetails(){},renderAvailability(){},renderPreview(){},regionCode:()=> 'US'};
  await vm.runInNewContext(media.slice(safeStart,safeEnd)+media.slice(start,end)+'\nenrichMain',ctx)();
  if(tmdbId===1163194){
   assert.equal(win.currentMatchIdentity.imdbId,id);
   assert.equal(events[0].detail.imdbId,id);
   assert.equal(events[0].detail.tmdbId,1163194);
  }else{
   assert.equal(win.currentMatchIdentity.imdbId,undefined);
   assert.equal(events.length,0);
  }
 }
});

test('initial result identity preserves the exact source release year and validates IMDb before publication',()=>{
 const marker=app.indexOf('    const sourceImdbId = ',app.indexOf('async function renderResult('));
 const end=app.indexOf("    document.dispatchEvent(new CustomEvent('matchapp:newmatch'",marker);
 assert(marker>0&&end>marker);
 for(const value of [id,'tt21626284/unsafe']){
  const win={};
  vm.runInNewContext(app.slice(marker,end),{window:win,selected:{title,cats:['movie'],_tmdbId:1163194,_tmdbKind:'movie',
    _meta:{year:'2024',imdbId:value}},exactSpotifyPlaylistCover:()=>null});
  assert.equal(win.currentMatchIdentity.year,'2024','iTunes source years must survive before optional enrichment');
  assert.equal(win.currentMatchIdentity.imdbId,value===id?id:'');
 }
});
