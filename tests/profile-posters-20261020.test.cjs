'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'profile.js'),'utf8');
const helper=source.slice(source.indexOf('/* MATCHAPP_PORTFOLIO_POSTERS_BEGIN */'),source.indexOf('/* MATCHAPP_PORTFOLIO_POSTERS_END */'));
const escape=source.slice(source.indexOf('function escapeHtml('),source.indexOf('function platformFallbackUrl('));
const cards=source.slice(source.indexOf('function platformFallbackUrl('),source.indexOf('// Display-only normalization'))+'\n'+source.slice(source.indexOf('function buildPosterCard('),source.indexOf('window.renderBlockedCategories ='));
function fixture(){
 const dom=new JSDOM('<!doctype html><head></head><body><main id="cards"></main></body>',{url:'https://matchapp.tv/profile/profile.html',runScripts:'outside-only'});
 const w=dom.window;w.eval(escape+helper+cards);return {dom,w,api:w.MatchAppPortfolioPosters,host:w.document.getElementById('cards')};
}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

test('all saved artwork aliases and verified metadata resolve without changing the private record',()=>{
 const f=fixture();try{
  const urls=['https://image.tmdb.org/t/p/w500/one.jpg','https://image.tmdb.org/t/p/w342/two.jpg','/assets/music-videos/mw3kSNIxjqo.jpg'];
  const cases=[{title:'One',posterUrl:urls[0]},{title:'One',poster:urls[1]},{title:'One',artwork:urls[0]},{title:'One',cover:urls[2]},{title:'One',_meta:{artwork:urls[0]}},{title:'One',metadata:{poster_large_url:urls[1]}},{title:'One',posterUrl:'data:image/svg+xml,%3Csvg/%3E',poster:urls[0]}];
  cases.forEach(row=>{freeze(row);const before=JSON.stringify(row),art=f.api.record(row);assert.ok(art.posterUrl.startsWith('https://'));assert.equal(JSON.stringify(row),before);assert.match(art.fallbackUrl,/^data:image\/svg\+xml/);});
  assert.equal(f.api.record({title:'One',posterUrl:'invalid-image',cover:urls[0]}).posterUrl,urls[0]);
  assert.equal(f.api.record({title:'One',posterUrl:'javascript:alert(1)'}).posterUrl,'');
 }finally{f.dom.window.close()}
});

test('exact TMDB identity survives both raw metadata and bounded history identity keys',()=>{
 const f=fixture();try{
  for(const row of [{title:'Dune: Part Two',_meta:{tmdbId:693134,kind:'movie',year:2024,artwork:'https://image.tmdb.org/t/p/w500/dune.jpg'}},{title:'Dune: Part Two',identityKeys:['duneparttwo','tmdb:movie:693134'],year:2024}]){
   const img=f.w.document.createElement('img');f.api.apply(img,freeze(row),{eager:true});
   assert.equal(img.dataset.portfolioPoster,'1');assert.equal(img.dataset.posterTitle,'Dune: Part Two');
   assert.equal(img.dataset.tmdbId,'693134');assert.equal(img.dataset.tmdbKind,'movie');assert.equal(img.dataset.tmdbYear,'2024');
   assert.equal(img.getAttribute('loading'),'eager');assert.equal(img.getAttribute('fetchpriority'),'high');assert.equal(img.getAttribute('decoding'),'async');
  }
  const ambiguous=f.api.record({title:'A title',identityKeys:['tmdb:movie:1','tmdb:tv:2']});assert.equal(ambiguous.tmdbId,0,'ambiguous source IDs may not be guessed');
  assert.equal(f.api.record({title:'A title',identityKeys:['tmdb:movie:99999999999999999999']}).tmdbId,0);
 }finally{f.dom.window.close()}
});

test('audio, books and magazines retain source art without movie-recovery eligibility',()=>{
 const f=fixture();try{
  for(const row of [{title:'Music',isAudio:true,poster:'https://i.scdn.co/image/actual'},{title:'Podcast',type:'save',metadata:{kind:'podcast',artwork:'https://is1-ssl.mzstatic.com/image/thumb/actual.jpg'}},{title:'Audiobook',kind:'audiobook',poster:'https://example.org/audio.jpg'},{title:'Book',cover:'https://covers.openlibrary.org/b/id/123-L.jpg'},{title:'Magazine',kind:'magazine',poster:'https://publisher.example/current.jpg'}]){
   const img=f.w.document.createElement('img');f.api.apply(img,freeze({...row,tmdbId:99,kind:row.kind||'movie'}));
   assert.ok(['audio','book'].includes(img.dataset.posterSourceKind));assert.equal(img.hasAttribute('data-portfolio-poster'),false);assert.equal(img.hasAttribute('data-tmdb-id'),false);
   assert.ok(img.src.startsWith('https://'));assert.equal(img.getAttribute('loading'),'lazy');
  }
 }finally{f.dom.window.close()}
});

test('failed and missing artwork keep the same visible image slot, links, notes and delete actions',()=>{
 const f=fixture();try{
  const title='A <Title> & Friends';f.w.localStorage.setItem('match_titleNotes',JSON.stringify({[title]:{text:'Keep my private note'}}));
  const row=freeze({title,poster:'https://image.tmdb.org/t/p/w500/expired.jpg',streamUrl:'https://service.example/watch/exact',platform:'Exact Service'});
  const before=f.w.localStorage.getItem('match_titleNotes');f.host.innerHTML=f.w.buildPosterCard(row,'var(--gold)');f.api.bind(f.host);
  const img=f.host.querySelector('img'),link=f.host.querySelector('.poster-card'),remove=f.host.querySelector('.poster-del');
  assert.equal(img.getAttribute('onerror'),null);assert.equal(link.href,row.streamUrl);assert.equal(remove.dataset.title,title);assert.equal(remove.getAttribute('onclick'),'removeFromList(this)');assert.equal(f.host.querySelector('.poster-note').textContent,'Keep my private note');
  img.dispatchEvent(new f.w.Event('error'));assert.equal(f.host.querySelector('img'),img);assert.match(img.src,/^data:image\/svg\+xml/);assert.equal(img.style.display,'block');
  assert.equal(f.w.localStorage.getItem('match_titleNotes'),before);assert.equal(f.host.querySelector('Title'),null);
  const empty=f.w.document.createElement('img');f.api.apply(empty,'Legacy saved title');assert.match(empty.src,/^data:image\/svg\+xml/);assert.equal(empty.dataset.portfolioPoster,'1');
 }finally{f.dom.window.close()}
});

test('visible portfolio cards get eager priority, remaining cards defer, and late shared binding repairs without storage writes',()=>{
 const f=fixture();try{
  const rows=Array.from({length:6},(_,i)=>({title:'Title '+i,poster:'https://image.tmdb.org/t/p/w500/'+i+'.jpg'}));
  f.host.innerHTML=rows.map((row,i)=>f.w.buildPosterCard(row,'var(--gold)',i)).join('');
  assert.deepEqual([...f.host.querySelectorAll('img')].map(i=>i.getAttribute('loading')),['eager','eager','eager','eager','lazy','lazy']);
  const storage=JSON.stringify({...f.w.localStorage}),calls=[];f.w.MatchAppCatalogMedia={hardenWithin:node=>calls.push(node)};
  f.api.bind(f.host);assert.equal(calls[0],f.host);f.w.document.dispatchEvent(new f.w.Event('matchapp:catalog-media-ready'));assert.equal(calls.at(-1),f.w.document);
  assert.equal(JSON.stringify({...f.w.localStorage}),storage);
 }finally{f.dom.window.close()}
});

test('Profile loads shared poster hardening before its portfolio renderer',()=>{
 const html=fs.readFileSync(path.join(root,'profile/profile.html'),'utf8');
 const shared=html.indexOf('src="/catalog-media.js?'),profile=html.indexOf('src="/profile.js?'),history=html.indexOf('src="/portfolio-history.js?');
 assert.ok(shared>0&&shared<profile&&profile<history);assert.match(html.slice(shared,profile),/posters=20261020-1/);assert.match(html.slice(profile,history),/posters=20261020-1/);
});
