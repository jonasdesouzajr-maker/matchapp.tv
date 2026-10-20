'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {httpsUrl}=require('../tools/availability-evidence.cjs');
const {cinemaAssets}=require('../tools/finalize-brand.js');
const source=fs.readFileSync(path.join(__dirname,'../tools/refresh-weekly-pick.mjs'),'utf8');

function harness(){
  const files=new Map(),writes=[],reads=[],logs=[];
  const fakeFs={
    existsSync:file=>files.has(file),
    readFileSync(file){reads.push(file);if(!files.has(file))throw Error('Unexpected fixture read: '+file);return files.get(file);},
    mkdirSync(){},
    writeFileSync(file,text){writes.push(file);files.set(file,String(text));}
  };
  const end=source.lastIndexOf('try{main();}');
  assert.ok(end>0,'load the actual publisher definitions without invoking it');
  const definitions=source.slice(0,end).replace(/^import .*;\n/gm,'')
    .replace("const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');","const ROOT='/fixture';");
  assert.ok(!definitions.includes('import.meta'),'fixture isolates every filesystem write');
  const api=vm.runInNewContext(definitions+'\n;({page,buildPick,write,main,isoWeekKey});',{
    fs:fakeFs,path,URL,httpsUrl,cinemaAssets,process:{env:{}},
    console:{log:text=>logs.push(text),error:text=>logs.push(text)},
    fetch(){throw Error('Security fixture must never fetch or publish');}
  });
  return {...api,files,writes,reads,logs};
}
function pick(sourceUrl){
  return {auto:true,title:'Original verified title',year:2026,tmdbId:123,kind:'movie',
    poster:'https://image.tmdb.org/t/p/w780/original.jpg',synopsis:'Original source synopsis.',
    genres:['Drama'],cast:['Original actor'],country:'Brazil',runtime:110,rating:'PG-13',
    selectedAt:'2026-10-20T12:00:00Z',sourceUrl,sourceLabel:'TMDB',sourceRank:1,
    streaming:{name:'Netflix',region:'BR',url:'https://www.themoviedb.org/movie/123/watch?locale=BR'},
    platform:'Netflix',watchUrl:'https://www.themoviedb.org/movie/123/watch?locale=BR'};
}
function assertRendered(html,expected,original){
  const dom=new JSDOM(html);
  try{
    const d=dom.window.document;
    const sourceLink=[...d.querySelectorAll('a')].find(a=>a.textContent==='Verified title source: TMDB');
    assert.ok(sourceLink,'retain the original source action and label');
    assert.equal(sourceLink.getAttribute('href'),expected);
    assert.equal(new URL(sourceLink.href).protocol,'https:');
    assert.equal(sourceLink.getAttribute('rel'),'noopener noreferrer');
    const movie=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(x=>x['@type']==='Movie');
    assert.deepEqual(movie.sameAs,[expected],'structured metadata agrees with the actual source action');
    assert.equal(d.querySelector('.hero img').getAttribute('src'),original.poster);
    assert.equal(d.querySelector('.hero h1').textContent,original.title+' ('+original.year+')');
    assert.ok(d.querySelector('a.button').getAttribute('href').startsWith('/discover.html?q='));
    assert.equal(d.querySelector('[onerror],[onload],[onclick]'),null);
  }finally{dom.window.close();}
}

test('weekly source sink rejects executable, insecure, relative and credential-bearing URLs',()=>{
  const h=harness();
  for(const attack of ['javascript:alert(1)','JaVaScRiPt:alert(1)','java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>','file:///tmp/payload','http://example.org/title',
    '//example.org/title','https://user:pass@example.org/title','https://','',null]){
    const original=pick(attack),before=JSON.stringify(original);
    assertRendered(h.page(original),'https://www.themoviedb.org/movie/123',original);
    assert.equal(JSON.stringify(original),before,'rendering never alters the original title/selection');
  }
  assert.equal(h.writes.length,0,'pure rendering does not write or invoke the daily publisher');
});

test('weekly source validation preserves valid HTTPS source identities and existing fallback behavior',()=>{
  const h=harness();
  for(const url of ['https://www.themoviedb.org/movie/123-original?language=pt-BR',
    'https://www.imdb.com/title/tt1234567/?ref_=title','https://publisher.example/title?one=1&two=2']){
    const original=pick(url);assertRendered(h.page(original),url,original);
  }
  const tv={...pick(undefined),kind:'tv'};
  assertRendered(h.page(tv),'https://www.themoviedb.org/tv/123',tv);
});

test('unsafe source without a verified positive TMDB identity fails before any publication',()=>{
  const h=harness();
  for(const id of [0,-1,1.5,null,true,false,[],{},'not-an-id','123/../../payload',Number.MAX_SAFE_INTEGER+1]){
    const original={...pick('javascript:alert(1)'),tmdbId:id};
    assert.throws(()=>h.page(original),/verified HTTPS source or positive TMDB identity/);
    assert.throws(()=>h.write(original),/verified HTTPS source or positive TMDB identity/);
  }
  assert.equal(h.writes.length,0);
});

test('fresh and retained weekly publications normalize the source for JSON, browser data and HTML',()=>{
  for(const retained of [false,true]){
    const h=harness(),unsafe=pick('javascript:alert(1)');
    const original=retained?{...unsafe,weekKey:h.isoWeekKey()}:null;
    if(retained)h.files.set('/fixture/data/weekly-pick.json',JSON.stringify(original));
    else h.files.set('/fixture/data/trending-week.json',JSON.stringify({updated:new Date().toISOString(),titles:[{
      title:unsafe.title,year:unsafe.year,kind:'movie',tmdbId:unsafe.tmdbId,poster:unsafe.poster,
      description:unsafe.synopsis,sourceRank:1,genre:unsafe.genres,cast:unsafe.cast,
      availability:{source_page_url:unsafe.sourceUrl,BR:{stream:['Netflix'],link:unsafe.watchUrl}}
    }]}));
    h.main();
    assert.deepEqual(h.writes,['/fixture/data/weekly-pick.json','/fixture/weekly-pick-data.js','/fixture/featured/this-week/index.html']);
    const published=JSON.parse(h.files.get('/fixture/data/weekly-pick.json'));
    assert.equal(published.sourceUrl,'https://www.themoviedb.org/movie/123');
    assert.equal(published.title,unsafe.title);assert.equal(published.tmdbId,unsafe.tmdbId);
    assert.equal(published.platform,'Netflix');assert.equal(published.watchUrl,unsafe.watchUrl);
    const browser={window:{}};vm.runInNewContext(h.files.get('/fixture/weekly-pick-data.js'),browser);
    assert.equal(browser.window.__MATCHAPP_WEEKLY_PICK__.sourceUrl,published.sourceUrl);
    assertRendered(h.files.get('/fixture/featured/this-week/index.html'),published.sourceUrl,unsafe);
    if(retained){
      assert.equal(h.reads.includes('/fixture/data/trending-week.json'),false,'same-week reuse never rotates the title');
      assert.equal(JSON.parse(h.logs[0]).changed,false);
      assert.equal(original.sourceUrl,'javascript:alert(1)','publication normalizes a clone');
    }
  }
});
