'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const matcher=read('ebooks/ebook-matcher.js'),detailsSource=read('ebooks/book-details-20261011.js');
const identitySource=read('ebooks/cover-identity.js');
const book={id:'frankenstein',title:'Frankenstein',author:'Mary Shelley',year:1818};
const cover=id=>'https://covers.openlibrary.org/b/id/'+id+'-L.jpg';
const row=id=>({title:book.title,author_name:[book.author],cover_i:id,first_publish_year:1818});
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve()};

// A deterministic image/network boundary; all cover, metadata, identity and
// renderResult handoff code below is read from the real production sources.
function fixture({cached=[],indexEntries=[]}={}){
 let now=0,nextTimer=0;const timers=new Map(),delays=[],requests=[],waiting=new Map(),images=[],cachedUrls=new Set(cached);
 const clock={
  setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,at:now+ms});delays.push(ms);return id},
  clearTimeout(id){timers.delete(id)},
  async advance(ms){const target=now+ms;await flush();for(;;){
   const due=[...timers].filter(([,t])=>t.at<=target).sort((a,b)=>a[1].at-b[1].at)[0];
   if(!due)break;now=due[1].at;timers.delete(due[0]);due[1].fn();await flush();
  }now=target;await flush()}
 };
 class ImageNode extends EventTarget{
  constructor(){super();this.isConnected=true;this.hidden=true;this.complete=true;this.naturalWidth=0;this.naturalHeight=0;this.style={opacity:''};this.dataset={};this.writes=[];this.listeners=[];this.listenerCallbacks=[];this.handlers={};this._src='';images.push(this)}
  addEventListener(type,fn,options){this.listeners.push({type,once:!!options?.once});this.listenerCallbacks.push({type,fn,once:!!options?.once});super.addEventListener(type,fn,options)}
  set src(value){this._src=String(value);this.writes.push(this._src);this.complete=cachedUrls.has(this._src)&&!(this.loading==='lazy'&&this.hidden);this.naturalWidth=this.complete?480:0;this.naturalHeight=this.complete?720:0}
  get src(){return this._src}
  removeAttribute(name){if(name==='src'){this._src='';this.complete=true;this.naturalWidth=0;this.naturalHeight=0}}
  setHandler(type,fn){if(this.handlers[type])this.removeEventListener(type,this.handlers[type]);this.handlers[type]=fn;if(fn)this.addEventListener(type,fn)}
  set onload(fn){this.setHandler('load',fn)}get onload(){return this.handlers.load||null}
  set onerror(fn){this.setHandler('error',fn)}get onerror(){return this.handlers.error||null}
  load(){cachedUrls.add(this.src);this.complete=true;this.naturalWidth=480;this.naturalHeight=720;this.dispatchEvent(new Event('load'))}
  decode(){return this.complete&&this.naturalWidth>0?Promise.resolve():Promise.reject(Error('No decoded image'))}
  fail(){this.complete=true;this.naturalWidth=0;this.naturalHeight=0;this.dispatchEvent(new Event('error'))}
 }
 const img=new ImageNode(),fallback={hidden:false};
 const frame={querySelector:s=>s==='img'?img:s.includes('fallback')?fallback:null};
 const host={isConnected:true,querySelector(s){
  if(s==='[data-ebook-cover]')return img;
  if(s==='[data-ebook-cover-fallback]')return fallback;
  if(s==='.ebook-top-cover,.ebook-cover')return frame;
  if(s==='.ebook-top-copy,.ebook-result-copy')return null;
  throw Error('Unexpected DOM lookup '+s);
 }};
 function fetchBoundary(raw,{signal}={}){
  const url=String(raw);requests.push(url);
  if(url.startsWith('/ebooks/verified-book-index-20261011.json'))return Promise.resolve({ok:true,json:async()=>({entries:indexEntries})});
  const u=new URL(url);let key;
  if(u.hostname==='openlibrary.org')key=u.searchParams.get('fields').includes('number_of_pages_median')?'detailsOL':'matcherOL';
  else if(u.hostname==='www.googleapis.com')key=u.searchParams.get('maxResults')==='8'?'detailsGoogle':'matcherGoogle';
  else if(u.hostname==='itunes.apple.com')key='matcherApple';
  else throw Error('Unexpected network boundary '+url);
  assert(!waiting.has(key),'only one request per owner/source');
  return new Promise((resolve,reject)=>{
   const abort=()=>{waiting.delete(key);reject(Error('fixture aborted'))};
   signal?.addEventListener('abort',abort,{once:true});
   waiting.set(key,data=>{waiting.delete(key);signal?.removeEventListener('abort',abort);resolve({ok:true,json:async()=>data})});
  });
 }
 const context=vm.createContext({window:{Image:ImageNode},document:{documentElement:{lang:'en'},createElement(){throw Error('Cover fixture must retain its original image')}},
  URL,URLSearchParams,AbortController,fetch:fetchBoundary,setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout,
  market:()=> 'US',APPLE_BOOK_MARKETS:new Set(['US'])});
 vm.runInContext(identitySource,context,{filename:'ebooks/cover-identity.js'});
 vm.runInContext(detailsSource,context,{filename:'ebooks/book-details-20261011.js'});
 // Cover alt text now uses the same pure presentation helper as the full
 // matcher. Include that real function when exercising the isolated art block.
 const copyStart=matcher.indexOf('function ui('),copyEnd=matcher.indexOf('function choice(',copyStart);
 assert(copyStart>=0&&copyEnd>copyStart,'production presentation helper must exist');
 vm.runInContext(matcher.slice(copyStart,copyEnd),context,{filename:'ebooks/ebook-matcher.js'});
 const start=matcher.indexOf('const BOOK_COVER_IDENTITY='),end=matcher.indexOf('function boundedReading(',start);
 assert(start>=0&&end>start,'production cover block must exist');
 vm.runInContext(matcher.slice(start,end),context,{filename:'ebooks/ebook-matcher.js'});
 const renderStart=matcher.indexOf(" const img=host.querySelector('[data-ebook-cover]'),fall=host.querySelector('[data-ebook-cover-fallback]');");
 const renderEnd=matcher.indexOf(' if(audio)paintAudio(root,book,audio);',renderStart);
 assert(renderStart>=0&&renderEnd>renderStart,'actual result handoff must exist');
 const realCover=context.hydrateCover,realDetails=context.window.MatchAppBookDetails;let coverWork,detailsWork;
 context.hydrateCover=(...args)=>(coverWork=realCover(...args));
 context.window.MatchAppBookDetails={...realDetails,hydrate:(...args)=>(detailsWork=realDetails.hydrate(...args))};
 return {img,fallback,host,requests,waiting,delays,timers,clock,preloads:images,
  async start(audio=null){Object.assign(context,{host,book,audio});vm.runInContext('(function(){'+matcher.slice(renderStart,renderEnd)+'})()',context);await flush()},
  async reply(key,data){assert(waiting.has(key),'expected pending '+key);waiting.get(key)(data);await flush()},
  async emptyMatcher(){for(const key of ['matcherOL','matcherGoogle','matcherApple'])if(waiting.has(key))await this.reply(key,{docs:[],items:[],results:[]})},
  async done(){await Promise.all([coverWork,detailsWork]);await flush()},
  ready(){assert.equal(img.complete,true);assert.equal(img.hidden,false);assert(img.naturalWidth>0);assert.notEqual(img.style.opacity,'0');assert.equal(fallback.hidden,true)}
 };
}

test('late matcher source cannot replace Frankenstein cover already loaded by real BookDetails',async()=>{
 const f=fixture();await f.start();
 await f.reply('detailsOL',{docs:[row(220)]});
 assert.deepEqual(f.img.writes,[cover(220)]);
 assert.equal(f.img.loading,'eager');assert.equal(f.img.decoding,'async');
 assert.equal(f.img.hidden,false);assert.equal(f.img.style.opacity,'0');assert.equal(f.fallback.hidden,false);
 assert.deepEqual(f.img.listeners.filter(x=>x.once),[{type:'load',once:true},{type:'error',once:true}]);
 f.img.load();f.ready();
 await f.reply('matcherOL',{docs:[row(110)]});
 await f.emptyMatcher();
 assert.deepEqual(f.img.writes,[cover(220)],'a late verified alternative must not restart the visible image request');
 f.ready();await f.done();assert.equal(f.timers.size,0);
});

test('matcher image timeout preserves a cover completed by BookDetails cached-image fast path',async()=>{
 const f=fixture({cached:[cover(220)]});await f.start();
 await f.reply('matcherOL',{docs:[row(110)]});
 assert.equal(f.img.src,cover(110));assert.equal(f.img.complete,false);
 const matcherLoad=f.img.onload;assert.equal(typeof matcherLoad,'function');
 await f.reply('detailsOL',{docs:[row(220)]});
 assert.equal(f.img.onload,matcherLoad,'BookDetails uses separate once listeners, not property replacement');
 f.ready();assert(f.delays.includes(7000));
 await f.emptyMatcher();await f.clock.advance(7000);
 f.ready();assert.deepEqual(f.img.writes,[cover(110),cover(220)]);await f.done();assert.equal(f.timers.size,0);
});

test('terminal empty matcher sources retain the independently loaded original cover',async()=>{
 const f=fixture();await f.start();await f.reply('detailsOL',{docs:[row(220)]});f.img.load();f.ready();
 await f.emptyMatcher();await f.done();
 f.ready();assert.deepEqual(f.img.writes,[cover(220)]);assert.equal(f.timers.size,0);
});

test('wrong identity and a failed real BookDetails image still keep an honest fallback',async()=>{
 const f=fixture();await f.start();await f.reply('detailsOL',{docs:[row(220)]});
 assert.equal(f.img.style.opacity,'0');f.img.fail();
 await f.reply('matcherOL',{docs:[{...row(999),author_name:['Another Writer']}]});
 await f.emptyMatcher();await f.done();
 assert.deepEqual(f.img.writes,[cover(220)],'wrong-author art is never assigned');
 assert.equal(f.img.hidden,true);assert.equal(f.img.style.opacity,'0');assert.equal(f.fallback.hidden,false);
 assert.equal(f.timers.size,0);
});

test('slow verified audio sharp download keeps priority when the exact original rendition starts',async()=>{
 const original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact-audio/100x100';
 const sharp=original.replace('/100x100','/600x600bb.jpg'),f=fixture();
 await f.start({apple:{coverUrl:original}});
 await f.reply('detailsOL',{docs:[row(220)]});
 assert.deepEqual(f.img.writes,[],'pending downloads do not replace the result image');
 assert.deepEqual(f.preloads.slice(1).map(img=>img.src),[sharp]);
 assert.equal(f.img.listeners.filter(x=>x.once).length,0,'BookDetails skips all setCover listeners for verified audio');
 await f.clock.advance(2500);
 assert.deepEqual(f.preloads.slice(1).map(img=>img.src),[sharp,original]);
 assert.deepEqual(f.preloads[1].writes,[sharp],'starting the original cannot abort the sharp request');
 assert.deepEqual(f.img.writes,[]);assert(f.delays.includes(9500));
 await f.clock.advance(700);f.preloads[1].load();await flush();await f.done();f.ready();
 assert.deepEqual(f.img.writes,[sharp],'already decoded audio pixels hand off once');
 assert.equal(f.requests.filter(x=>{const u=new URL(x,'https://fixture.invalid/');return u.searchParams.get('maxResults')==='10'||u.hostname==='itunes.apple.com'}).length,0);
 assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('late sources cannot write to a disconnected result and still settle within existing budgets',async()=>{
 const f=fixture();await f.start();await f.reply('matcherOL',{docs:[row(110)]});
 f.img.isConnected=false;f.host.isConnected=false;
 await f.reply('detailsOL',{docs:[row(220)]});
 await f.clock.advance(7000);await f.done();
 assert.deepEqual(f.img.writes,[cover(110)],'disconnected metadata cannot replace the old image');
 assert.equal(f.img.hidden,true);assert.equal(f.fallback.hidden,false);
 assert(f.delays.includes(6000));assert(f.delays.includes(5500));
 assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('verified audio cover starts eagerly when inherited lazy loading would leave a hidden image unfetched',async()=>{
 const original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact-audio/100x100';
 const sharp=original.replace('/100x100','/600x600bb.jpg'),f=fixture({cached:[sharp]});
 f.img.loading='lazy';await f.start({apple:{coverUrl:original}});
 assert.equal(f.img.loading,'eager');assert.equal(f.img.decoding,'async');
 f.ready();assert.equal(f.img.style.opacity,'1');
 await f.reply('detailsOL',{docs:[row(220)]});await f.done();
 assert.deepEqual(f.img.writes,[sharp],'verified audio identity retains priority');
});

test('pending verified audio pixels stay transparent with fallback visible and real image errors still fail closed',async()=>{
 const original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact-audio/100x100',f=fixture();
 f.img.loading='lazy';await f.start({apple:{coverUrl:original}});
 assert.equal(f.preloads[1].loading,'eager','a detached preloader eagerly requests the exact audio asset');
 assert.equal(f.img.hidden,true,'the result retains its fallback until a verified asset is decoded');
 assert.equal(f.img.style.opacity,'0');assert.equal(f.fallback.hidden,false);
 f.preloads[1].fail();await flush();assert.equal(f.preloads[2].src,original);
 f.preloads[2].fail();await flush();await f.reply('detailsOL',{docs:[row(220)]});
 await f.done();
 assert.equal(f.img.hidden,true);assert.equal(f.img.style.opacity,'0');
 assert.equal(f.img.naturalWidth,0);assert.equal(f.fallback.hidden,false);
 assert.deepEqual(f.img.writes,[],'a verified ebook edition is never substituted for failed audio art');
 assert.equal(f.waiting.size,0,'failed audio art must not start matcher work-level source searches');
 assert.equal(f.timers.size,0);
});

test('verified audio image deadline remains bounded and never degrades to work-level art',async()=>{
 const original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact-audio/100x100',f=fixture();
 await f.start({apple:{coverUrl:original}});await f.reply('detailsOL',{docs:[row(220)]});
 await f.clock.advance(9500);await f.done();
 assert.equal(f.img.hidden,true);assert.equal(f.fallback.hidden,false);
 assert.deepEqual(f.img.writes,[]);assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
 f.preloads[1].load();await flush();assert.deepEqual(f.img.writes,[],'late pixels cannot revive an expired handoff');
});

test('verified audio keeps the original-only 7000ms deadline and disconnects cannot paint a stale result',async()=>{
 const original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact-audio/600x600bb.jpg',f=fixture();
 await f.start({apple:{coverUrl:original}});await f.reply('detailsOL',{docs:[row(220)]});
 assert(f.delays.includes(7000));assert(!f.delays.includes(9500));
 f.img.isConnected=false;f.host.isConnected=false;
 f.preloads[1].load();await flush();await f.done();
 assert.deepEqual(f.img.writes,[]);assert.equal(f.img.hidden,true);assert.equal(f.fallback.hidden,false);
 assert.equal(f.preloads[1].src,'','disconnected completion releases its pending loader');
 assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('failed sharp decoding uses only the exact original audio rendition and cancels the unused loader',async()=>{
 const original='https://is1-ssl.mzstatic.com/image/thumb/Books/exact-audio/100x100',f=fixture();
 await f.start({apple:{coverUrl:original}});await f.reply('detailsOL',{docs:[row(220)]});
 f.preloads[1].decode=()=>Promise.reject(Error('Cannot decode sharp rendition'));
 f.preloads[1].load();await flush();assert.equal(f.preloads[2].src,original);
 f.preloads[2].load();await flush();await f.done();f.ready();
 assert.deepEqual(f.img.writes,[original]);assert.equal(f.preloads[1].src,'');
 assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('an audio edition without its own verified artwork never borrows ebook art',async()=>{
 const f=fixture();await f.start({apple:{coverUrl:null}});
 await f.reply('detailsOL',{docs:[row(220)]});await f.done();
 assert.deepEqual(f.img.writes,[]);assert.equal(f.img.hidden,true);assert.equal(f.fallback.hidden,false);
 assert.equal(f.preloads.length,1);assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('a reused verified work cover cannot satisfy an audio edition without its own art',async()=>{
 const source=cover(330),f=fixture({cached:[source],indexEntries:[{...book,source:'Open Library',cover:source}]});
 await f.start();await f.done();f.ready();
 assert.equal(f.img.dataset.bookCoverVerified,source);
 await f.start({apple:{coverUrl:null}});await f.done();
 assert.deepEqual(f.img.writes,[source],'audio never assigns the already verified ebook source again');
 assert.equal(f.img.hidden,true);assert.equal(f.fallback.hidden,false);
 assert.equal(f.requests.length,1,'the audio art boundary adds no work-level source lookup');
 assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('a loaded branded fallback is replaced by exact local-index art without any remote search',async()=>{
 const source=cover(330),f=fixture({cached:[source],indexEntries:[{...book,source:'Open Library',cover:source,url:'https://openlibrary.org/works/OL123W'}]});
 f.img.src='data:image/svg+xml,branded-placeholder';f.img.load();
 f.img.hidden=false;f.img.style.opacity='1';f.img.dataset.maFallback='1';f.fallback.hidden=true;
 await f.start();await f.done();f.ready();
 assert.deepEqual(f.img.writes,['data:image/svg+xml,branded-placeholder',source]);
 assert.equal(f.img.dataset.bookCoverVerified,source);assert.equal(f.img.dataset.maFallback,undefined);
 assert.equal(f.img.dataset.bookCoverPending,undefined);
 assert.equal(f.img.alt,'Frankenstein — Mary Shelley (source cover)');
 assert.equal(f.requests.length,1,'the shared same-origin index is sufficient for both owners');
 assert(f.requests[0].startsWith('/ebooks/verified-book-index-20261011.json'));
 assert.equal(f.waiting.size,0);assert.equal(f.timers.size,0);
});

test('local-index art starts before remote searches and waits for real pixels behind the honest fallback',async()=>{
 const source=cover(330),f=fixture({indexEntries:[{...book,source:'Open Library',cover:source}]});
 await f.start();
 assert.deepEqual(f.img.writes,[source],'both owners share one in-flight approved asset');
 assert.equal(f.requests.length,1);assert.equal(f.img.hidden,false);assert.equal(f.img.style.opacity,'0');
 assert.equal(f.fallback.hidden,false);assert.equal(f.img.dataset.bookCoverVerified,undefined);
 f.img.load();await f.done();f.ready();assert.equal(f.img.dataset.bookCoverVerified,source);
 assert.equal(f.requests.length,1);assert.equal(f.timers.size,0);
});

test('an indexed title with a different full author never supplies its artwork',async()=>{
 const f=fixture({indexEntries:[{...book,author:'Mary Shelley Smith',source:'Open Library',cover:cover(999)}]});
 await f.start();assert.deepEqual(f.img.writes,[]);
 await f.reply('detailsOL',{docs:[]});await f.reply('detailsGoogle',{items:[]});
 await f.reply('matcherOL',{docs:[row(110)]});f.img.load();await f.emptyMatcher();await f.done();f.ready();
 assert.deepEqual(f.img.writes,[cover(110)]);assert.equal(f.img.dataset.bookCoverVerified,cover(110));
});

test('generic pixels cannot satisfy a pending source and a stale metadata error cannot hide the recovered cover',async()=>{
 const f=fixture();await f.start();await f.reply('detailsOL',{docs:[row(220)]});
 const staleError=f.img.listenerCallbacks.find(x=>x.type==='error'&&x.once).fn;
 f.img.src='data:image/svg+xml,legacy-placeholder';f.img.dataset.maFallback='1';f.img.load();
 assert.equal(f.img.dataset.bookCoverVerified,undefined,'a generic load is never attributed to the approved source');
 assert.equal(f.fallback.hidden,false);
 await f.reply('matcherOL',{docs:[row(110)]});
 assert.equal(f.img.style.opacity,'0');assert.equal(f.fallback.hidden,false);
 f.img.load();f.ready();assert.equal(f.img.dataset.bookCoverVerified,cover(110));
 staleError();f.ready();
 await f.emptyMatcher();await f.done();f.ready();assert.equal(f.timers.size,0);
});

test('a late metadata error for the same source cannot undo a genuinely loaded cover',async()=>{
 const source=cover(220),f=fixture();await f.start();await f.reply('detailsOL',{docs:[row(220)]});
 const staleError=f.img.listenerCallbacks.find(x=>x.type==='error'&&x.once).fn;
 f.img.load();f.ready();staleError();f.ready();
 await f.emptyMatcher();await f.done();f.ready();assert.equal(f.img.dataset.bookCoverVerified,source);
});

test('both rendering pages request the handoff repair without changing earlier loader query contracts',()=>{
 const pin='/ebooks/ebook-matcher.js?v=20261011-meta1&amp;tokens=20261017-1&amp;reliability=20261018-1&amp;cover=20261019-handoff1';
 for(const page of ['index.html','ebooks/index.html']){
  const html=read(page);assert.equal(html.split(pin).length-1,1,page);
  assert(html.indexOf('/ebooks/book-details-20261011.js')<html.indexOf(pin),page+' retains the real metadata owner before matching');
  assert(html.includes(pin+'&amp;lifetime=20261019-1&amp;coverload=20261019-eager1'),page+' invalidates the repaired cover loader while retaining lifetime exclusion');
  assert(html.includes('&amp;audioart=20261020-exact1'),page+' invalidates the exact audio preloading repair');
 }
});
