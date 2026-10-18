'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),source=read('together.js');
function boot(){
  const dom=new JSDOM('<section id="tg-step-result"><h2 id="tg-result-title"></h2><p id="tg-result-synopsis"></p><span id="tg-result-platform"></span><div id="tg-result-agreed"></div><img id="tg-result-poster"><a id="tg-result-link"></a></section>',{url:'https://matchapp.tv/together.html',runScripts:'outside-only'});
  const w=dom.window,probes=[],pending=new Map();
  w.tgEl=id=>w.document.getElementById(id);w.tgShow=()=>{};w.tgError=()=>{};w.tgEscape=String;
  w.generateLocalPosterSVG=title=>'data:image/svg+xml,'+encodeURIComponent(title);
  w.tmdbKindForCats=cats=>cats.includes('movie')?'movie':'tv';
  w.Image=class {set src(url){this.url=url;probes.push(this);}};
  w.MatchAppCatalogMedia={regionCode:()=> 'BR',
    resolvePoster:(title,options)=>new Promise(resolve=>pending.set(title,{resolve,options})),
    viewingTarget:(meta,title,region)=>meta?.availability?.[region]?.stream?.length
      ?{mode:'stream',provider:meta.availability[region].stream[0],href:'https://www.justwatch.com/'+region.toLowerCase()+'/movie/'+meta.tmdb_id}:null};
  const start=source.indexOf('function tgRenderResult('),end=source.indexOf('\nfunction tgEscape',start);
  w.eval(source.slice(start,end));
  return {dom,w,probes,pending};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('Together retains current title and regional link when an older poster request finishes late',async()=>{
  const {dom,w,probes,pending}=boot();
  try{
    w.tgRenderResult({title:'Old title',year:2018,kind:'movie',tmdbId:100,cats:['movie']},[]);
    w.tgRenderResult({title:'New title',year:2024,kind:'movie',tmdbId:200,cats:['movie']},[]);
    assert.equal(pending.get('New title').options.tmdbId,200);
    pending.get('Old title').resolve({url:'https://image.tmdb.org/t/p/w500/old.jpg',meta:{tmdb_id:100,availability:{BR:{stream:['Old provider']}}}});
    await settle();
    assert.equal(probes.length,0);
    assert.equal(w.tgEl('tg-result-link').href,'https://www.justwatch.com/br/search?q=New%20title');
    assert.equal(w.tgEl('tg-result-poster').alt,'New title');
    pending.get('New title').resolve({url:'https://image.tmdb.org/t/p/w500/new.jpg',meta:{tmdb_id:200,availability:{BR:{stream:['Verified BR provider']}}}});
    await settle();probes[0].naturalWidth=500;probes[0].onload();
    assert.equal(w.tgEl('tg-result-poster').src,'https://image.tmdb.org/t/p/w500/new.jpg');
    assert.equal(w.tgEl('tg-result-link').href,'https://www.justwatch.com/br/movie/200');
    assert.match(w.tgEl('tg-result-link').textContent,/Verified BR provider/);
  }finally{dom.window.close();}
});
test('Together never guesses a US stream when the viewer country is unknown',async()=>{
  const {dom,w,pending}=boot();
  try{
    w.MATCH_LANG='en';w.MatchAppCatalogMedia.regionCode=()=>'';
    w.tgRenderResult({title:'Exact title',year:2024,kind:'movie',tmdbId:200,watchUrl:'https://provider.example/guessed',platform:'Guessed provider'},[]);
    pending.get('Exact title').resolve({meta:{tmdb_id:200,availability:{US:{stream:['US-only provider']}}}});
    await settle();
    assert.equal(w.tgEl('tg-result-link').href,'https://www.justwatch.com/');
    assert.doesNotMatch(w.tgEl('tg-result-link').textContent,/US-only|Guessed provider/);
  }finally{dom.window.close();}
});
