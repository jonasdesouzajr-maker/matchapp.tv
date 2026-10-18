const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const app=read('app.js').replace(/\r\n/g,'\n');
const fn=name=>app.match(new RegExp('(?:async )?function '+name+'\\([\\s\\S]*?\\n}\\n'))[0];

function browser(){
 const dom=new JSDOM('<main></main>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;
 Object.defineProperty(w.navigator,'language',{value:'en-US',configurable:true});
 w.MATCH_LANG='pt-BR';
 w.eval(read('viewer-country.js'));
 return dom;
}
function sourceContext(w,fetcher){
 w.matchPolicy={known:()=>new Set(),key:title=>String(title).toLowerCase()};
 const ctx=vm.createContext({window:w,fetch:fetcher,PLATFORMS:{},SESSION_SHOWN:new Set(),recentTitles:[],
  MOOD_TERMS:{},DECADE_TERMS:{},CATEGORY_TERMS:{},GOSPEL_TEXT_SIGNALS:[],
  isBlockedText:()=>false,upgradeArtwork:url=>url,console});
 vm.runInContext(['normCriteria','mediaForCategory','discoverFromITunes','platformSearchUrl'].map(fn).join('\n'),ctx);
 return ctx;
}

test('unknown viewing country never queries the default US iTunes storefront',async()=>{
 const dom=browser();let calls=0;
 try{
  const ctx=sourceContext(dom.window,async()=>{calls++;throw Error('An unknown country cannot select a storefront');});
  for(const stored of ['', 'Unknown country']){
   dom.window.localStorage.setItem('match_user_country',stored);
   assert.equal(await ctx.discoverFromITunes(['music album'],[],[],[],[]),null);
   assert.equal(ctx.platformSearchUrl('any','An exact title'),'https://www.justwatch.com/');
  }
  assert.equal(calls,0,'browser en-US and interface pt-BR do not establish a country');
 }finally{dom.window.close();}
});

test('iTunes recovery and streaming search retain the selected country across retries and country changes',async()=>{
 const dom=browser(),queries=[];let failing=true;
 try{
  const w=dom.window;w.localStorage.setItem('match_user_country','Norway');
  const ctx=sourceContext(w,async href=>{
   const query=new URL(href);queries.push(query);
   if(failing)return {ok:false,status:503};
   const country=query.searchParams.get('country').toLowerCase();
   return {ok:true,json:async()=>({results:[{wrapperType:'collection',collectionType:'Album',
    collectionName:'An Exact Album',artistName:'Source Artist',primaryGenreName:'Pop',releaseDate:'2024-03-01',
    artworkUrl100:'https://is1-ssl.mzstatic.com/image/thumb/Music/test/100x100bb.jpg',
    collectionViewUrl:'https://music.apple.com/'+country+'/album/exact/id123'}]})};
  });
  assert.equal(await ctx.discoverFromITunes(['music album'],[],[],[],[]),null);
  failing=false;
  const recovered=await ctx.discoverFromITunes(['music album'],[],[],[],[]);
  assert.equal(recovered?.title,'An Exact Album');
  assert.equal(recovered?.source,'itunes-live');
  assert.equal(recovered?.platformVerified,false,'Apple identity does not verify a third-party streaming platform');
  assert.match(recovered?._meta.storeUrl||'',/\/no\/album\//);
  assert.equal(ctx.platformSearchUrl('any','An exact title'),'https://www.justwatch.com/no/search?q=An%20exact%20title');
  w.localStorage.setItem('match_user_country','France');
  const changed=await ctx.discoverFromITunes(['music album'],[],[],[],[]);
  assert.match(changed?._meta.storeUrl||'',/\/fr\/album\//);
  assert.deepEqual(queries.map(query=>query.searchParams.get('country')),['NO','NO','FR']);
  assert(queries.every(query=>query.searchParams.get('entity')==='album'&&query.searchParams.get('explicit')==='No'));
 }finally{dom.window.close();}
});

test('the actual Home result links to the viewer country before optional metadata enrichment',async()=>{
 const dom=browser(),w=dom.window;
 try{
  const markup=new JSDOM(read('index.html'));
  w.document.body.innerHTML=markup.window.document.body.innerHTML;markup.window.close();
  const no=()=>{};
  class Probe{constructor(){this.naturalWidth=500;}set src(value){this.value=value;queueMicrotask(()=>this.onload?.());}get src(){return this.value;}}
  const ctx=vm.createContext({window:w,document:w.document,CustomEvent:w.CustomEvent,Image:Probe,
   CONTENT_CATALOG:[],globalMatchTitle:'',globalMatchPoster:'',globalPlatform:'',PLATFORMS:{},
   sanitizeDisplayText:value=>String(value||''),generatedCover:()=> 'data:image/svg+xml,<svg/>',
   exactSpotifyPlaylistCover:()=>null,getCuratedPoster:async()=>null,getVerifiedPoster:()=>null,
   getRichMetadata:async()=>null,getRealCoverImage:async()=>null,
   isHighRiskCategory:()=>false,isAudioCategory:()=>false,renderQuotaCorner:no,renderMatchCriteria:no,
   hydrateTitleFacts:no,renderNotePanel:no,isShareRestrictedTitle:()=>false,updateShareButtonState:no,
   applyAudioModeLabels:no,updateActionButtonStates:no,rememberShownTitle:no,
   requestAnimationFrame:no,matchMedia:()=>({matches:false}),tSafe:(_,fallback)=>fallback});
  vm.runInContext(fn('renderResult'),ctx);
  for(const [country,expected] of [['Norway','https://www.justwatch.com/no/search?q=Exact%20Film'],['','https://www.justwatch.com/']]){
   w.localStorage.setItem('match_user_country',country);w.__matchappMatchRunId=(w.__matchappMatchRunId||0)+1;
   await ctx.renderResult({title:'Exact Film',synopsis:'A source-catalogued film.',synopsisLang:'en',cats:['movie'],
    platform:'any',year:2024,_tmdbId:321,_tmdbKind:'movie',_meta:{tmdbId:321,kind:'movie',artwork:'https://image.tmdb.org/t/p/w780/exact-film.jpg'}});
   assert.equal(w.document.getElementById('res-direct-link').href,expected,country||'unknown');
  }
 }finally{dom.window.close();}
});
