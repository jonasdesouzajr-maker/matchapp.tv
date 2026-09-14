const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8').replace(/\r\n/g,'\n');
function declaration(name){
  const start=app.search(new RegExp('(?:async )?function '+name+'\\('));
  assert.notEqual(start,-1,'Missing function '+name);
  const end=app.indexOf('\n}',start);
  assert.notEqual(end,-1,'Missing end of '+name);
  return app.slice(start,end+2);
}
function context(extra={}){
  const c=vm.createContext({window:{},COVER_CACHE:{'Beauty in Black':'https://unrelated.example/wrong-poster.jpg'},COVER_SAFE_MODE:new Set(),OFFLINE_COVERS:{},generatedCover:title=>'data:image/svg+xml,'+encodeURIComponent(title),...extra});
  const registry=app.match(/const VERIFIED_POSTERS = \{[\s\S]*?\n\};/);
  assert(registry,'Verified artwork registry exists');
  vm.runInContext(registry[0]+'\n'+declaration('getVerifiedPoster')+'\n'+declaration('getRealCoverImage'),c);
  return c;
}

test('Beauty in Black uses its verified artwork before a stale or ambiguous provider result',async()=>{
  let remoteCalls=0;
  const c=context({itunesLookup:async()=>{remoteCalls++;return 'https://unrelated.example/wrong-poster.jpg';},fetchWithTimeout:async()=>{remoteCalls++;return {ok:false};}});
  const poster=c.getVerifiedPoster('Beauty in Black');
  assert(poster,'The reported ambiguous title needs a verified poster');
  assert.notEqual(poster,'https://unrelated.example/wrong-poster.jpg');
  assert.equal(await c.getRealCoverImage('Beauty in Black'),poster);
  assert.equal(await c.getRealCoverImage('BEAUTY IN BLACK'),poster);
  assert.equal(c.getVerifiedPoster('Black Beauty'),null,'A different word order is a different title');
  assert.equal(remoteCalls,0,'Verified artwork must not fall through to fuzzy searches');
});

test('marquee hydration cannot replace verified Beauty in Black artwork with iTunes artwork',async()=>{
  let remoteCalls=0;
  const img={src:'https://unrelated.example/old-cached-poster.jpg',getAttribute:key=>key==='src'?img.src:key==='data-title'?'Beauty in Black':''};
  const c=context({document:{querySelectorAll:()=>[img]},getRichMetadata:async()=>{remoteCalls++;return {artwork:'https://unrelated.example/wrong-poster.jpg'};}});
  vm.runInContext(declaration('hydrateMarqueeCovers'),c);
  const poster=c.getVerifiedPoster('Beauty in Black');
  assert(poster,'The title has a verified poster');
  await c.hydrateMarqueeCovers();
  assert.equal(img.src,poster);
  assert.equal(remoteCalls,0);
  assert.equal(typeof img.onerror,'function');
  img.onerror.call(img);
  assert.match(img.src,/^data:image\/svg\+xml,/,'A broken verified image falls back locally');
});

test('film and TV artwork cannot come from music, unrelated episodes, remakes or fuzzy names',()=>{
  const c=vm.createContext({isExplicitResult:r=>r.trackExplicitness==='explicit'});
  vm.runInContext(declaration('artworkTitleKey')+'\n'+declaration('iTunesArtworkMatches'),c);
  const tv={kind:'tv-episode',collectionName:'Love Is Blind: UK, Season 1',trackName:'Episode 1',releaseDate:'2024-01-01'};
  assert(c.iTunesArtworkMatches('Love Is Blind: UK','tvShow',{year:2024},tv));
  assert.equal(c.iTunesArtworkMatches('Love Is Blind: UK','tvShow',{year:2024},{...tv,collectionName:'Buddy Daddies',trackName:'Love Is Blind: UK'}),false);
  assert.equal(c.iTunesArtworkMatches('Beauty in Black','tvShow',{year:2024},{kind:'music-video',trackName:'Beauty in Black',releaseDate:'2024-01-01'}),false);
  for(const patch of [{trackName:'Black Beauty'},{releaseDate:'1985-01-01'},{trackExplicitness:'explicit'},{kind:'song'}])
    assert.equal(c.iTunesArtworkMatches('Beauty in Black','movie',{year:2024},{kind:'feature-movie',trackName:'Beauty in Black',releaseDate:'2024-01-01',...patch}),false);
});

test('local poster fallback succeeds without optional metadata, including failed remote image handlers',()=>{
  const c=vm.createContext({});vm.runInContext(declaration('generateLocalPosterSVG'),c);
  for(const title of ['An Unindexed Film','A <Title> & Friends']){
    const image=c.generateLocalPosterSVG(title);
    assert.match(image,/^data:image\/svg\+xml;charset=utf-8,/);
    const svg=decodeURIComponent(image.split(',')[1]);assert(svg.includes('<svg'));assert(!svg.includes('undefined'));assert(!svg.includes('<Title>'));
  }
  assert.notEqual(c.generateLocalPosterSVG('A Film'),c.generateLocalPosterSVG('Another Film'));
});

test('screen covers go through typed TMDB lookup before any secondary artwork source',async()=>{
  const calls=[],img={src:'',getAttribute:key=>key==='src'?img.src:key==='data-title'?'A Known Series':''};
  const c=vm.createContext({window:{tmdbCover:async()=>{calls.push('tmdb');return 'https://image.tmdb.org/t/p/w500/correct.jpg';}},document:{querySelectorAll:()=>[img]},CONTENT_CATALOG:[{title:'A Known Series',cats:['series'],year:2024}],COVER_SAFE_MODE:new Set(),COVER_CACHE:{},OFFLINE_COVERS:{},generatedCover:t=>'data:image/svg+xml,'+t,getVerifiedPoster:()=>null,isHighRiskCategory:()=>false,getRichMetadata:async()=>{throw Error('Wrong lookup path');}});
  vm.runInContext(declaration('getRealCoverImage')+'\n'+declaration('hydrateMarqueeCovers'),c);
  await c.hydrateMarqueeCovers();assert.deepEqual(calls,['tmdb']);assert.match(img.src,/correct.jpg$/);
});
