'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../catalog-media.js'),'utf8');
const helpers=source.slice(source.indexOf('  function adultPosterSurface('),source.indexOf('  function localLikePoster('));
const art=w=>'https://image.tmdb.org/t/p/w'+w+'/same-exact-art.jpg';
const sizes='(max-width: 384px) 86px, (max-width: 624px) calc((100vw - 40px) / 4), 146px';
const srcset=[185,342,500,780].map(w=>art(w)+' '+w+'w').join(', ');
const flush=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
function scene(){
 const events={},timers=new Map(),probes=[],observers=[],decoded=new Set([art(185),art(342)]);let next=0;
 class Probe{
  set src(value){this.url=value;probes.push(this);}
  load(){decoded.add(this.url);this.naturalWidth=Number(this.url.match(/\/w(\d+)\//)?.[1]||780);this.onload?.();}
  fail(){this.naturalWidth=0;this.onerror?.();}
 }
 class Observer{
  constructor(callback,options){this.callback=callback;this.options=options;this.targets=new Set();observers.push(this);}
  observe(img){this.targets.add(img);}
  unobserve(img){this.targets.delete(img);}
 }
 const window={innerWidth:800,innerHeight:1200,addEventListener:(name,fn)=>{assert.equal(events[name],undefined,'only one shared resize owner');events[name]=fn;}};
 const context={window,Image:Probe,IntersectionObserver:Observer,
  setTimeout:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},clearTimeout:id=>timers.delete(id),
  TRUSTED_POSTER:/^https:\/\/image\.tmdb\.org\//,normalise:s=>s.toLowerCase(),localPoster:()=> 'data:image/svg+xml,exact-title-fallback',
  lookup:async()=>{throw Error('Responsive resize must not query titles');},Date,Set,Map};
 const api=vm.runInNewContext(helpers+'\n({recoverAdultPoster})',context);
 function image(){
  const attrs={srcset,sizes},listeners={};let src=art(185);
  const img={id:'',dataset:{tmdbId:'42',tmdbKind:'movie'},isConnected:true,complete:true,naturalWidth:185,attributeWrites:[],
   get src(){return src;},set src(value){src=value;this.complete=decoded.has(value);this.naturalWidth=this.complete?Number(value.match(/\/w(\d+)\//)?.[1]||780):0;},get currentSrc(){return src;},
   getBoundingClientRect:()=>({width:146,height:195,left:0,right:146,top:100,bottom:295}),
   closest:selector=>selector==='#marquee-track'?{}:null,addEventListener(name,fn){(listeners[name]??=[]).push(fn);},
   emit(name){for(const fn of listeners[name]||[])fn();},
   getAttribute:name=>name==='src'?src:attrs[name]||null,
   setAttribute(name,value){attrs[name]=value;this.attributeWrites.push([name,value]);},removeAttribute:name=>delete attrs[name]};
  api.recoverAdultPoster(img,'Exact original',null,art(780));return img;
 }
 function resize(){events.resize();for(const [id,timer] of [...timers])if(timer.ms===120){timers.delete(id);timer.fn();}}
 return {image,resize,events,probes,observers,timers,recover:img=>api.recoverAdultPoster(img,'Exact original',null,art(780)),
  reveal(img){img.getBoundingClientRect=()=>({width:146,height:195,left:0,right:146,top:100,bottom:295});for(const observer of observers)if(observer.targets.has(img))observer.callback([{target:img,isIntersecting:true}]);}};
}
test('a pinned recovery rendition regains browser-selected density and window-size variants after rotation',()=>{
 const s=scene(),img=s.image();assert.equal(img.getAttribute('srcset'),srcset);
 img.src=art(342);img.removeAttribute('srcset');s.resize();
 assert.equal(img.getAttribute('srcset'),srcset);assert.equal(img.getAttribute('sizes'),sizes);
 assert.equal(img.src,art(342),'retain the decoded fallback while the browser chooses and loads a sharper rendition');
});
test('resize excludes failed renditions, unrelated artwork and offscreen or disconnected images',()=>{
 const s=scene(),failed=s.image(),changed=s.image(),offscreen=s.image(),removed=s.image();
 for(const img of [failed,changed,offscreen,removed]){img.src=art(342);img.removeAttribute('srcset');}
 failed.__matchappAdultPoster.failed.add(art(780));changed.src='https://image.tmdb.org/t/p/w500/new-exact-art.jpg';
 offscreen.getBoundingClientRect=()=>({width:146,height:195,left:0,right:146,top:2000,bottom:2195});removed.isConnected=false;
 s.resize();assert(!failed.getAttribute('srcset').includes(art(780)));assert(failed.getAttribute('srcset').includes(art(500)));
 for(const img of [changed,offscreen,removed])assert.equal(img.getAttribute('srcset'),null);
});
test('a resize during the actual fast recovery is remembered until its final candidate settles',async()=>{
 const s=scene(),recovering=s.image(),healthy=s.image();recovering.src=art(780);s.recover(recovering);
 assert.deepEqual(s.probes.map(p=>p.url),[art(780),art(342)]);
 s.resize();assert.equal(recovering.__matchappAdultPoster.responsiveResizePending,true);
 assert.equal(recovering.attributeWrites.length,0,'do not disturb active recovery even while its original srcset remains');
 s.probes[1].load();await flush();assert.equal(recovering.src,art(342));assert.equal(recovering.getAttribute('srcset'),null);
 s.probes[0].fail();await flush();
 assert.equal(recovering.getAttribute('srcset'),[185,342,500].map(w=>art(w)+' '+w+'w').join(', '));
 assert.equal(recovering.__matchappAdultPoster.responsiveResizePending,false);
 assert.equal(healthy.getAttribute('srcset'),srcset);assert.equal(healthy.attributeWrites.length,0);
 assert.equal(s.probes.length,2,'only the existing exact-art probes run');assert.equal(s.timers.size,0,'no polling or deferred retry loop');
 const writes=recovering.attributeWrites.length;recovering.emit('load');s.resize();assert.equal(recovering.attributeWrites.length,writes);
});
test('a resize during failed-poster repair resumes after the verified repair finishes without a second resize',async()=>{
 const s=scene(),img=s.image();img.src=art(500);img.complete=true;img.naturalWidth=0;img.emit('error');
 assert.equal(img.__matchappAdultPoster.repairing,true);s.resize();
 assert.equal(img.__matchappAdultPoster.responsiveResizePending,true);assert.equal(img.getAttribute('srcset'),null);
 const compact=s.probes.find(p=>p.url===art(342));assert(compact);compact.load();await flush();
 assert.equal(img.__matchappAdultPoster.repairing,false);assert.equal(img.src,art(342));
 assert.equal(img.getAttribute('srcset'),[185,342,780].map(w=>art(w)+' '+w+'w').join(', '));
 assert.equal(img.__matchappAdultPoster.responsiveResizePending,false);
 s.probes.find(p=>p.url===art(780))?.load();await flush();assert.equal(s.timers.size,0);
});
test('one visibility observer restores offscreen pinned posters only when revealed, with no eager probes',()=>{
 const s=scene(),first=s.image(),second=s.image();
 for(const img of [first,second]){
  img.src=art(342);img.removeAttribute('srcset');
  img.getBoundingClientRect=()=>({width:146,height:195,left:0,right:146,top:2000,bottom:2195});
 }
 s.resize();assert.equal(s.observers.length,1);assert.equal(s.observers[0].options.rootMargin,'0px');
 assert.equal(s.observers[0].targets.size,2);assert.equal(s.probes.length,0);assert.equal(s.timers.size,0);
 s.reveal(first);assert.equal(first.getAttribute('srcset'),srcset);assert.equal(second.getAttribute('srcset'),null);
 assert(!s.observers[0].targets.has(first));assert(s.observers[0].targets.has(second));assert.equal(s.probes.length,0);
 second.isConnected=false;s.observers[0].callback([{target:second,isIntersecting:false}]);
 assert.equal(s.observers[0].targets.size,0);assert.equal(second.getAttribute('srcset'),null);
});
test('a destination load completes pending resize without a new resize and rejects a newer artwork identity',()=>{
 const s=scene(),loading=s.image(),changed=s.image();
 for(const img of [loading,changed]){img.src=art(342);img.removeAttribute('srcset');img.complete=false;img.naturalWidth=0;}
 s.resize();assert.equal(loading.getAttribute('srcset'),null);assert.equal(loading.__matchappAdultPoster.responsiveResizePending,true);
 loading.complete=true;loading.naturalWidth=342;loading.emit('load');assert.equal(loading.getAttribute('srcset'),srcset);
 changed.src='https://image.tmdb.org/t/p/w500/new-exact-art.jpg';changed.complete=true;changed.naturalWidth=500;changed.emit('load');
 assert.equal(changed.getAttribute('srcset'),null);assert.equal(changed.__matchappAdultPoster.responsiveResizePending,false);
});
