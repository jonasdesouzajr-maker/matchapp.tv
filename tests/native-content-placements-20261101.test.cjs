'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),api=require('../native-news-slot.js');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8'),source=read('native-news-slot.js');
const tick=()=>new Promise(done=>setImmediate(done));
const USER='11111111-1111-4111-8111-111111111111';
async function fixture({route='/',height=1000,width=800,contentWidth=600,header=110,dock=90,account='guest'}={}){
 const home='<article id="result-box" class="is-revealed"><img id="res-poster-img" data-matchapp-media-title="A genuine fixture result"><h2 id="res-title">A genuine fixture result</h2><a id="res-direct-link" href="https://www.netflix.com/title/123">Original provider</a><div class="all-actions"><button id="last-action">Match again</button></div></article>';
 const book='<div id="ebook-matcher-root"><section data-ebook-result><div class="ebook-result-grid"><div class="ebook-result-copy"><h3>A genuine fixture book</h3><p class="ebook-summary">Original synopsis.</p><a data-ebook-provider="Google Books" href="https://books.google.com/books?id=fixture">Original source</a></div></div><div class="ebook-result-actions"><button id="last-action" data-ebook-save="curated-book">Save</button></div></section><section class="after">Original next content</section></div>';
 const explore='<main><div id="explore-topics"><a href="/ebooks/">Books</a><a id="last-action" href="/discover.html">Ask AI</a></div><section class="ref-explore-more"><a href="/music.html">More to discover</a></section></main>';
 const html='<html><body><header id="sticky-header" style="position:fixed"></header>'+
  (route==='/explore.html'?explore:route.startsWith('/ebooks')?book:home+'<section class="after">Original next content</section>')+
  '<nav id="sticky-dock" style="position:fixed"></nav><div id="locked-ad"><ins data-ad-slot="2595698117"></ins></div></body></html>';
 const w=new JSDOM(html,{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true}).window,d=w.document;
 const messages=[],pending=new Map(),rectangles=new Map();let serial=0,now=1000,anchorBottom=2000,titleY=100,slotY=null,overlay=null,slotWidth=contentWidth,controlGap=32;
 Object.defineProperty(w,'innerWidth',{value:width,configurable:true});Object.defineProperty(w,'innerHeight',{value:height,configurable:true});
 w.Date.now=()=>now;w.requestAnimationFrame=fn=>{const id=++serial;pending.set(id,{at:now+16,fn});return id;};w.cancelAnimationFrame=id=>pending.delete(id);
 w.setTimeout=(fn,delay=0)=>{const id=++serial;pending.set(id,{at:now+delay,fn});return id;};w.clearTimeout=id=>pending.delete(id);
 const box=(x,y,rw,rh)=>({x,y,width:rw,height:rh,left:x,top:y,right:x+rw,bottom:y+rh});const left=(width-contentWidth)/2;
 w.Element.prototype.getBoundingClientRect=function(){
  if(rectangles.has(this))return box(...rectangles.get(this));
  if(this.matches('[data-native-news-slot]'))return box((width-slotWidth)/2,slotY??anchorBottom+32,slotWidth,360);
  if(this.id==='sticky-header')return box(0,0,width,header);
  if(this.id==='sticky-dock')return box(0,height-dock,width,dock);
  if(this.matches('#result-box,[data-ebook-result],#explore-topics'))return box(left,anchorBottom-1900,contentWidth,1900);
  if(this.matches('#res-title,.ebook-result-copy h3'))return box(left+16,titleY,contentWidth-32,40);
  if(this.id==='last-action')return box(left+16,(slotY??anchorBottom+32)-controlGap-40,180,40);
  if(this.matches('.after,.ref-explore-more'))return box(left,(slotY??anchorBottom+32)+360+32,contentWidth,400);
  if(this.matches('.ref-explore-more a'))return box(left+16,(slotY??anchorBottom+32)+360+32,200,40);
  return box(left+16,titleY+50,180,40);
 };
 w.Element.prototype.getClientRects=function(){return this.hidden||this.closest('[hidden]')||w.getComputedStyle(this).display==='none'?[]:[this.getBoundingClientRect()];};
 d.elementFromPoint=(x,y)=>{if(overlay)return overlay;const slot=d.querySelector('[data-native-news-slot]'),r=slot?.getBoundingClientRect();return r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom?slot:d.querySelector('#res-title,.ebook-result-copy h3')||d.getElementById('explore-topics');};
 w.globalMatchTitle='A genuine fixture result';w.__matchappMatchRunId=12;w.__matchappMatchPhase='result';
 w.isUserLoggedIn=account!== 'guest';w.matchProfileState=account==='guest'?{status:'signedout',userId:null}:{status:'ready',userId:account};
 // Account bootstrap has its own real-native-sync tests; isolate only geometry here.
 w.ensureCompactMatchSession=async()=>({data:{session:null}});
 w.MatchAppNativeNews={postMessage:raw=>messages.push(JSON.parse(raw))};
 const original=d.getElementById('last-action'),handler=()=>{original.dataset.clicked='yes';};original.addEventListener('click',handler);
 const ad=d.getElementById('locked-ad').outerHTML,storage=Object.keys(w.localStorage);
 w.eval(source);d.dispatchEvent(new w.Event('DOMContentLoaded'));await tick();
 const emit=(values={})=>w.dispatchEvent(new w.CustomEvent('matchapp:nativenews',{detail:{requestId:w.MatchAppNativeNewsSlot.requestId,status:'available',enabled:true,eligible:true,heightCss:360,minWidthCss:280,maxWidthCss:640,placementsVersion:1,...values}}));
 async function advance(ms=500){const end=now+ms;await tick();for(let n=0;n<300;n++){const next=[...pending].filter(([,job])=>job.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next){now=end;await tick();return;}pending.delete(next[0]);now=next[1].at;next[1].fn();await tick();}throw Error('unbounded scheduling');}
 const card=()=>d.querySelector(route.startsWith('/ebooks')?'[data-ebook-result]':'#result-box');
 async function confirm(){if(route==='/explore.html')return;w.MatchAppNativeNewsSlot.confirmValue(route.startsWith('/ebooks')?'ebook':'one_match',route.startsWith('/ebooks')?card():null,route.startsWith('/ebooks')?'book-run':12);await advance(50);}
 function scroll(y=250){slotY=y;anchorBottom=y-32;titleY=-1500;w.dispatchEvent(new w.Event('scroll'));}
 return {w,d,messages,emit,advance,confirm,scroll,card,original,handler,ad,storage,
  slots:()=>messages.filter(m=>m.type==='slot'),slot:()=>d.querySelector('[data-native-news-slot]'),
  setAnchor:bottom=>{anchorBottom=bottom;},setWidth:value=>{slotWidth=value;},setGap:value=>{controlGap=value;},setOverlay:value=>{overlay=value;},
  setRect:(element,rect)=>rectangles.set(element,rect),
  close:()=>{w.MatchAppNativeNewsSlot?.dispose();w.close();}};
}

test('Home, Books and Explore mount once outside complete content/actions and never mutate paid/web inventory',async()=>{
 for(const route of ['/','/ebooks/','/explore.html']){
  const f=await fixture({route});try{
   await f.confirm();f.emit();await f.advance();const slot=f.slot();assert.ok(slot,route);assert.equal(slot.style.height,'360px');assert.equal(slot.style.margin,'32px auto');
   const anchor=route==='/explore.html'?f.d.getElementById('explore-topics'):f.card();assert.equal(slot.previousElementSibling,anchor);assert.ok(!anchor.contains(slot));assert.ok(anchor.contains(f.original));
   if(route==='/explore.html')assert.ok(slot.nextElementSibling.matches('.ref-explore-more'));
   assert.equal(f.slots().length,0,'below viewport insertion cannot request native inventory');f.scroll();await f.advance();assert.ok(f.slots().length>0,route+' stable full rectangle');
   assert.equal(f.d.querySelectorAll('[data-native-news-slot]').length,1);f.emit();await f.advance();assert.equal(f.d.querySelectorAll('[data-native-news-slot]').length,1);
   assert.equal(f.d.getElementById('last-action'),f.original);f.original.click();assert.equal(f.original.dataset.clicked,'yes');assert.equal(f.d.getElementById('locked-ad').outerHTML,f.ad);assert.deepEqual(Object.keys(f.w.localStorage),f.storage);
   assert.equal(slot.querySelector('a,button,img,iframe,ins'),null);if(route==='/explore.html')assert.ok(f.messages.filter(m=>m.type==='hello').every(m=>m.hasValue===false),'Explore cannot fabricate first value');
  }finally{f.close();}
 }
});

test('new placements require explicit native capability and every existing admission field',async()=>{
 for(const route of ['/','/ebooks/','/explore.html'])for(const invalid of [{placementsVersion:undefined},{placementsVersion:0},{placementsVersion:'1'},{enabled:false},{eligible:false},{eligible:'true'},{heightCss:320},{heightCss:480},{requestId:'old-document'}]){
  const f=await fixture({route});try{await f.confirm();f.emit(invalid);await f.advance();assert.equal(f.slot(),null,route+JSON.stringify(invalid));assert.equal(f.slots().length,0);}finally{f.close();}
 }
});

test('a current genuine result is required even after native and JS observed a prior first value',async()=>{
 for(const route of ['/','/ebooks/'])for(const stale of ['hidden','replaced','title','source','account','loading','run']){
  const f=await fixture({route,account:USER});try{
   await f.confirm();assert.equal(f.messages.findLast(m=>m.type==='hello').hasValue,true);f.emit();await f.advance();assert.ok(f.slot());f.scroll();await f.advance();const before=f.slots().length;
   if(stale==='hidden')f.card().hidden=true;
   if(stale==='replaced')f.card().replaceWith(f.card().cloneNode(true));
   if(stale==='title')f.card().querySelector('h2,h3').textContent='Different result';
   if(stale==='source')f.card().querySelector('a').href='https://publisher.example/changed';
   if(stale==='account')f.w.matchProfileState={status:'ready',userId:'22222222-2222-4222-8222-222222222222'};
   if(stale==='loading'){if(route==='/')f.w.__matchappMatchPhase='processing';else f.card().style.display='none';}
   if(stale==='run'){if(route==='/')f.w.__matchappMatchRunId=13;else f.card().querySelector('.ebook-result-grid').replaceWith(f.card().querySelector('.ebook-result-grid').cloneNode(true));}
   await f.advance();assert.equal(f.slots().length,before,route+stale);assert.equal(f.messages.at(-1).type,'hide');assert.equal(f.slot().hidden,true);assert.equal(f.slot().style.display,'none');
  }finally{f.close();}
 }
});

test('unknown/loading/error account state cannot admit result placements or reuse previous owner proof',async()=>{
 for(const status of [undefined,'loading','error']){
  const f=await fixture({account:USER});try{f.w.matchProfileState=status?{status,userId:USER}:undefined;await f.confirm();f.emit();await f.advance();assert.equal(f.slot(),null);assert.equal(f.slots().length,0);}finally{f.close();}
 }
});

test('a different account between proof frames cannot acquire the previous visible result',async()=>{
 const f=await fixture({account:USER});try{
  f.w.MatchAppNativeNewsSlot.confirmValue('one_match',null,12);await f.advance(20);
  f.w.matchProfileState={status:'ready',userId:'22222222-2222-4222-8222-222222222222'};await f.advance();f.emit();await f.advance();
  assert.ok(f.messages.filter(message=>message.type==='hello').every(message=>message.hasValue===false));assert.equal(f.slot(),null);
 }finally{f.close();}
});

test('unknown proof cannot bind a later owner, while a verified loading owner retains genuine value until ready',async()=>{
 const unknown=await fixture({account:USER});try{
  unknown.w.isUserLoggedIn=false;unknown.w.matchProfileState={status:'loading',userId:null};assert.equal(unknown.w.MatchAppNativeNewsSlot.confirmValue('one_match',null,12),false);
  unknown.w.isUserLoggedIn=true;unknown.w.matchProfileState={status:'ready',userId:USER};unknown.d.dispatchEvent(new unknown.w.CustomEvent('matchapp:profilehydrated'));await unknown.advance();unknown.emit();await unknown.advance();
  assert.ok(unknown.messages.filter(m=>m.type==='hello').every(m=>m.hasValue===false));assert.equal(unknown.slot(),null);
 }finally{unknown.close();}
 const known=await fixture({account:USER});try{
  known.w.matchProfileState={status:'loading',userId:USER};await known.confirm();assert.equal(known.messages.findLast(m=>m.type==='hello').hasValue,true);known.emit();await known.advance();assert.equal(known.slot(),null);
  known.w.matchProfileState={status:'ready',userId:USER};known.d.dispatchEvent(new known.w.CustomEvent('matchapp:profilehydrated'));known.emit();await known.advance();assert.ok(known.slot());
 }finally{known.close();}
});

test('revoked entitlement/account collapses only new reservations, and same-anchor proof restores below the viewport',async()=>{
 for(const reason of ['adfree','account']){
  const f=await fixture();try{
   await f.confirm();f.emit();await f.advance();const slot=f.slot(),anchor=slot.previousElementSibling;f.scroll();await f.advance();
   if(reason==='adfree')f.emit({eligible:false});else f.d.dispatchEvent(new f.w.CustomEvent('matchapp:authchange'));await f.advance();
   assert.equal(slot.hidden,true);assert.equal(slot.style.display,'none');assert.equal(slot.getClientRects().length,0);assert.equal(slot.previousElementSibling,anchor);assert.equal(f.d.querySelectorAll('[data-native-news-slot]').length,1);
   f.emit();await f.advance();assert.equal(slot.hidden,true,'a collapsed reservation cannot shift content currently being read');
  }finally{f.close();}
 }
 const f=await fixture();try{
  await f.confirm();f.emit();await f.advance();const slot=f.slot();f.emit({eligible:false});assert.equal(slot.hidden,true);f.emit();await f.advance();assert.equal(slot.hidden,false);assert.equal(slot.style.display,'');assert.equal(f.slot(),slot);
 }finally{f.close();}
});

test('actual eligible:false native load/creative failures retain the visible reservation without another request',async()=>{
 const bridge=read('android-studio/app/src/main/java/com/jonas/papercup/NativeNewsBridge.kt');
 assert.match(bridge,/\.put\("eligible", eligible\(value\) && unavailableReason\.isEmpty\(\)\)/);
 for(const reason of ['no_fill','load_failed','load_timeout','sdk_unavailable','viewport_changed','creative_does_not_fit','creative_expired']){
  const f=await fixture();try{
   await f.confirm();f.emit();await f.advance();const slot=f.slot();f.scroll();await f.advance();const count=f.slots().length;assert.ok(count>0);
   f.emit({status:'unavailable',eligible:false,reason});await f.advance();assert.equal(slot.hidden,false,reason);assert.notEqual(slot.style.display,'none');assert.equal(slot.getClientRects().length,1);assert.equal(slot.style.height,'360px');assert.equal(f.slots().length,count);
   f.emit();await f.advance();assert.equal(f.slots().length,count,'terminal failure cannot request another ad');
   f.emit({status:'unavailable',eligible:false,reason:'consent_or_entitlement'});assert.equal(slot.hidden,true);assert.equal(slot.getClientRects().length,0);
  }finally{f.close();}
 }
});

test('unknown, disabled, mismatched capability and unowned failure packets still collapse content reservations',async()=>{
 for(const invalid of [{reason:'unknown_failure'},{reason:'no_fill',enabled:false},{reason:'no_fill',placementsVersion:0},{reason:'no_fill',heightCss:480},{reason:'no_fill',beforeRequest:true}]){
  const f=await fixture();try{
   await f.confirm();f.emit();await f.advance();const slot=f.slot();if(!invalid.beforeRequest){f.scroll();await f.advance();}
   const {beforeRequest,...packet}=invalid;f.emit({status:'unavailable',eligible:false,...packet});await f.advance();assert.equal(slot.hidden,true,JSON.stringify(invalid));assert.equal(slot.style.display,'none');assert.equal(slot.getClientRects().length,0);
  }finally{f.close();}
 }
});

test('short or narrow viewports and already-viewed anchors reserve nothing; full creative may fit without both gaps onscreen',async()=>{
 for(const options of [{height:600,header:160,dock:100},{width:320,contentWidth:248},{height:490},{height:1000}]){
  const f=await fixture(options);try{if(options.height===1000)f.setAnchor(900);await f.confirm();f.emit();await f.advance();assert.equal(f.slot(),null,JSON.stringify(options));}finally{f.close();}
 }
 const f=await fixture({height:715,header:200,dock:80});try{await f.confirm();f.emit();await f.advance();assert.ok(f.slot());f.scroll(220);await f.advance();assert.ok(f.slots().length>0,'360px creative fits even if a32px content gap is offscreen');}finally{f.close();}
});

test('32px control separation, complete viewport, fixed overlays and modal gates remain mandatory',async()=>{
 for(const failure of ['gap','dock','header','width','modal']){
  const f=await fixture();try{await f.confirm();f.emit();await f.advance();f.scroll();await f.advance();const before=f.slots().length;
   if(failure==='gap')f.setGap(20);
   if(failure==='dock')f.scroll(650);
   if(failure==='header')f.scroll(80);
   if(failure==='width')f.setWidth(650);
   if(failure==='modal'){const modal=f.d.createElement('section');modal.setAttribute('role','dialog');f.d.body.append(modal);}
   f.w.dispatchEvent(new f.w.Event('resize'));await f.advance();assert.equal(f.slots().length,before,failure);assert.equal(f.messages.at(-1).type,'hide');
  }finally{f.close();}
 }
});

test('rendered-visibility API excludes non-rendered boxes while rendered open overlays still block',async()=>{
 const f=await fixture({route:'/explore.html',width:384,height:715,contentWidth:352,header:230,dock:80});try{
  const panel=f.d.createElement('aside');panel.style.position='fixed';f.d.body.append(panel);f.setRect(panel,[-264,418,360,238]);
  const options=[];panel.checkVisibility=value=>{options.push(value);return false;};
  assert.equal(panel.getClientRects().length,1);assert.equal(f.w.getComputedStyle(panel).display,'block');
  f.emit();await f.advance();assert.ok(f.slot(),'non-rendered offcanvas box cannot split the available viewport');f.scroll();await f.advance();assert.ok(f.slots().length>0);
  assert.ok(options.length>0);assert.ok(options.every(value=>value.visibilityProperty===true&&value.opacityProperty===true));
  const before=f.slots().length;panel.checkVisibility=()=>true;f.w.dispatchEvent(new f.w.Event('resize'));await f.advance();assert.equal(f.slots().length,before);assert.equal(f.messages.at(-1).type,'hide');
 }finally{f.close();}
});

test('older WebViews ignore closed details content across every ancestor but preserve the visible first summary',async()=>{
 for(const visibility of ['absent','throws']){
  const f=await fixture({route:'/explore.html',width:384,height:715,contentWidth:352,header:230,dock:80});try{
   Object.defineProperty(f.w.Element.prototype,'checkVisibility',{configurable:true,value:visibility==='throws'?()=>{throw new TypeError('unsupported visibility options');}:undefined});
   const details=f.d.createElement('details');details.style.position='fixed';details.innerHTML='<summary>App controls</summary><summary style="position:fixed">Second summary is closed content</summary><div class="ma-cinema-tools-content" style="position:fixed"><button>Hidden menu action</button><details open style="position:fixed"><summary>Nested summary</summary></details></div>';
   f.d.body.append(details);const summary=details.firstElementChild,panel=details.querySelector('.ma-cinema-tools-content'),nested=panel.querySelector('details');
   f.setRect(details,[8,180,140,24]);f.setRect(summary,[8,180,140,24]);f.setRect(details.children[1],[20,300,180,32]);f.setRect(panel,[-264,418,360,238]);f.setRect(panel.querySelector('button'),[20,300,180,32]);f.setRect(nested,[20,300,180,32]);f.setRect(nested.firstElementChild,[20,300,180,32]);
   assert.equal(panel.getClientRects().length,1);assert.equal(f.w.getComputedStyle(panel).display,'block');assert.equal(nested.open,true);assert.equal(details.open,false);
   f.emit();await f.advance();assert.ok(f.slot(),visibility+' closed details content has no rendered obstruction');f.scroll();await f.advance();assert.ok(f.slots().length>0);
   const closed=f.slots().length;details.open=true;await f.advance();assert.equal(f.slots().length,closed,'open menu blocks native creative');assert.equal(f.messages.at(-1).type,'hide');
   details.open=false;await f.advance();assert.ok(f.slots().length>closed,'closing the menu restores safe geometry');
   const restored=f.slots().length;f.setRect(summary,[20,300,140,32]);f.setRect(details,[20,300,140,32]);f.w.dispatchEvent(new f.w.Event('resize'));await f.advance();assert.equal(f.slots().length,restored,'the first direct summary remains a real visible control');assert.equal(f.messages.at(-1).type,'hide');
  }finally{f.close();}
 }
});

test('account reset and document teardown invalidate native capability and current result without moving the reservation',async()=>{
 const f=await fixture();try{await f.confirm();f.emit();await f.advance();const slot=f.slot(),old=f.w.MatchAppNativeNewsSlot.requestId;f.scroll();await f.advance();
  f.d.dispatchEvent(new f.w.CustomEvent('matchapp:authchange'));await f.advance();const before=f.slots().length;assert.notEqual(f.w.MatchAppNativeNewsSlot.requestId,old);f.emit({requestId:old});await f.advance();assert.equal(f.slots().length,before);
  f.emit();await f.advance();assert.equal(f.slots().length,before);assert.equal(f.slot(),slot);f.w.dispatchEvent(new f.w.Event('pagehide'));await f.advance();assert.equal(f.messages.at(-1).type,'dispose');
 }finally{f.close();}
});

test('only the four approved native hooks and the News generator carry the current matching asset pins',()=>{
 for(const file of ['index.html','ebooks/index.html','explore.html','news/index.html']){
  const dom=new JSDOM(read(file));try{const d=dom.window.document;assert.equal(d.querySelector('[data-native-news-slot]'),null);assert.equal(d.querySelector('script[src^="/native-news-slot.js"]').getAttribute('src'),'/native-news-slot.js?v=20261101-placements2');assert.equal(d.querySelector('link[href^="/native-news-slot.css"]').getAttribute('href'),'/native-news-slot.css?v=20261101-placements2');}finally{dom.window.close();}
 }
 assert.ok(read('tools/refresh-news-rss.js').includes('href="/native-news-slot.css?v=20261101-placements2"'));assert.ok(read('tools/refresh-news-rss.js').includes('src="/native-news-slot.js?v=20261101-placements2"'));
 assert.equal(api.scope({get top(){return this;},location:{origin:'https://matchapp.tv',pathname:'/explore.html'},document:{documentElement:{dataset:{}}}}),'explore');
});
