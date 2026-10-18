'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','friends.js'),'utf8');
const start=source.indexOf(' function hydrateFriendResultMedia('),end=source.indexOf(' async function pollMatch(',start);
const hydrate=source.slice(start,end);
function boot(region='BR'){
  const dom=new JSDOM('<img id="friend-result-poster"><a id="friend-result-watch"></a>',{url:'https://matchapp.tv/friends.html',runScripts:'outside-only'}),w=dom.window;
  const requests=[],probes=[],remembered=[],timers=new Map();let now=0,next=0;
  w.isUserLoggedIn=true;w.generateLocalPosterSVG=title=>'data:image/svg+xml,'+encodeURIComponent(title);
  w.matchPolicy={remember:item=>remembered.push(item),claim:()=>{throw Error('server already claimed both participants');}};
  w.MatchAppCatalogMedia={regionCode:()=>region,
    viewingTarget:meta=>meta.target,
    posterVariants:url=>[url,url.replace('/w780/','/w500/')],
    resolvePoster:(title,opts)=>new Promise(resolve=>requests.push({title,opts,resolve}))};
  w.Image=class{constructor(){this.naturalWidth=0;probes.push(this);}set src(value){this.url=value;}};
  w.Date.now=()=>now;w.setTimeout=(fn,ms)=>{timers.set(++next,{fn,at:now+ms});return next;};w.clearTimeout=id=>timers.delete(id);
  w.eval('var friendResultVersion=1,currentCode="first";var $=id=>document.getElementById(id),tr=(en,pt)=>en;'+hydrate);
  const advance=ms=>{now+=ms;for(const [id,timer]of [...timers])if(timer.at<=now){timers.delete(id);timer.fn();}};
  return {dom,w,requests,probes,remembered,timers,advance};
}
const settle=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
test('Friends exact metadata upgrades only the current match and verified viewing country',async()=>{
  const {dom,w,requests,probes,remembered}=boot();
  try{
    const old={title:'Old title',tmdbId:10,kind:'movie',watchUrl:'https://guessed.invalid',platform:'Wrong service'};
    w.hydrateFriendResultMedia(old,1,'first');
    assert.equal(requests[0].opts.tmdbId,10);
    assert.equal(w.document.querySelector('a').href,'https://www.justwatch.com/br/search?q=Old%20title');
    w.friendResultVersion=2;w.currentCode='second';
    w.hydrateFriendResultMedia({title:'Current title',tmdbId:20,kind:'movie'},2,'second');
    requests[1].resolve({url:'https://image.tmdb.org/t/p/w780/current.jpg',meta:{tmdb_id:20,media_kind:'movie',target:{mode:'stream',href:'https://source.example/br/current',provider:'Verified BR source'}}});
    await settle();probes[0].naturalWidth=300;probes[0].onload();
    requests[0].resolve({url:'https://image.tmdb.org/t/p/w780/old.jpg',meta:{target:{mode:'stream',href:'https://source.example/us/old',provider:'Old source'}}});
    await settle();
    assert.equal(w.document.querySelector('img').src,'https://image.tmdb.org/t/p/w780/current.jpg');
    assert.equal(w.document.querySelector('a').href,'https://source.example/br/current');
    assert.match(w.document.querySelector('a').textContent,/Verified BR source/);
    assert.equal(remembered.at(-1)._catalogMedia.tmdb_id,20);
  }finally{dom.window.close();}
});
test('Friends stalled poster keeps the title fallback and retries only the same original image',async()=>{
  const {dom,w,requests,probes,timers,advance}=boot();
  try{
    w.hydrateFriendResultMedia({title:'Current title',tmdbId:20,kind:'movie'},1,'first');
    requests[0].resolve({url:'https://image.tmdb.org/t/p/w780/current.jpg',meta:null});await settle();
    assert.match(w.document.querySelector('img').src,/^data:image\/svg\+xml,/);
    advance(3000);assert.equal(probes.length,2);assert.equal(probes[1].url,'https://image.tmdb.org/t/p/w500/current.jpg');
    probes[1].naturalWidth=300;probes[1].onload();
    assert.equal(w.document.querySelector('img').src,probes[1].url);assert.equal(timers.size,0);
  }finally{dom.window.close();}
});
test('Friends unknown country never inherits a guessed platform or a US default',async()=>{
  const {dom,w,requests}=boot('');
  try{
    w.MATCH_LANG='en';w.hydrateFriendResultMedia({title:'A title',watchUrl:'https://guessed.invalid',platform:'Netflix'},1,'first');
    requests[0].resolve({url:'',meta:{target:{mode:'stream',href:'https://source.example/us/title',provider:'US service'}}});await settle();
    assert.equal(w.document.querySelector('a').href,'https://www.justwatch.com/');
    assert.doesNotMatch(w.document.querySelector('a').textContent,/Netflix|US service|Watch Now/);
  }finally{dom.window.close();}
});
