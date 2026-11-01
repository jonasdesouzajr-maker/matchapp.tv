'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM,VirtualConsole}=require('jsdom');
const {bootNewsAccount}=require('../native-news-slot.js');
const root=path.join(__dirname,'..'),ambient=fs.readFileSync(path.join(root,'jonas/android-ambient-assistant-20261011.js'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const boot=app.slice(app.indexOf('function sharedMatchAuthClient()'),app.indexOf('let globalMatchTitle'));
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function scene(route='/news/'){
 let reloads=0;const virtualConsole=new VirtualConsole();virtualConsole.on('jsdomError',error=>{if(/navigation/.test(error.message))reloads++;else throw error});
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole}),w=dom.window;
 let now=0,serial=0,creates=0,reads=0,docState='loading';const timers=new Map();
 Object.defineProperty(w.document,'readyState',{get:()=>docState});
 w.setTimeout=(fn,ms=0)=>{const id=++serial;timers.set(id,{fn,at:now+ms});return id};w.clearTimeout=id=>timers.delete(id);
 w.requestAnimationFrame=()=>1;w.cancelAnimationFrame=()=>{};w.__MATCHAPP_AMBIENT_QA__=true;
 w.MatchAppNativeNews={postMessage(){}};w.MatchAppNativeExperience={setAdFree(){},setNewsAccountContext(){}};
 w.MatchAppJonasSpeech={unlock(){},stop(){},speak:()=>new Promise(()=>{})};
 const client={auth:{getSession:async()=>{reads++;return{data:{session:null},error:null}},onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from(){},rpc(){}};
 w.eval(ambient);w.MatchAppAmbientJonas.open();
 const frame=()=>w.document.querySelector('#ma-ambient-chat-frame');
 return{w,dom,client,frame,counts:()=>({creates,reads,reloads}),boot:()=>bootNewsAccount(w),
  parentBoot(){w.eval("const SUPABASE_URL='unused',SUPABASE_ANON_KEY='unused';"+boot)},
  sharedScript(){const script=w.document.createElement('script');script.src='/app.js?fixture';w.document.head.appendChild(script)},
  loaded(){docState='complete';w.document.dispatchEvent(new w.Event('DOMContentLoaded'))},
  sdk(){w.supabase={createClient(){creates++;return client}};w.document.querySelector('script[src*="supabase-js"]')?.dispatchEvent(new w.Event('load'))},
  async advance(ms=0){const end=now+ms;for(let i=0;i<100;i++){await flush();const next=[...timers].filter(([,x])=>x.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next){now=end;return}timers.delete(next[0]);now=next[1].at;next[1].fn()}throw Error('timer loop')},
  close(){w.MatchAppNativeNewsAccount?.dispose();timers.clear();dom.window.close()}
 };
}
test('early native News and Explore taps keep greeting immediate and wait for one parent account client',async()=>{
 for(const route of ['/news/','/explore.html']){
 const f=scene(route);try{
  assert.equal(f.w.document.querySelector('#ma-ambient-panel').hidden,false);
  assert.match(f.w.document.querySelector('.ja-hello').textContent,/Jonas/);
  assert.equal(f.frame().getAttribute('src'),null);
  f.boot();f.loaded();await f.advance();assert.equal(f.counts().creates,0);
  f.sdk();await f.advance();assert.equal(await f.w.MatchAppNativeNewsAccount.ready,true);
  assert.match(f.frame().getAttribute('src'),/^\/discover\.html\?ambient=1/);
  f.frame().contentWindow.eval("const SUPABASE_URL='unused',SUPABASE_ANON_KEY='unused';"+boot);
  assert.equal(f.frame().contentWindow.supabaseClient,f.client);assert.equal(f.counts().creates,1);
 }finally{f.close()}
 }
});
test('failed News and Explore parent SDK bootstrap shows retry without child takeover and restores one client',async()=>{
 for(const route of ['/news/','/explore.html']){
 const f=scene(route);try{
  f.boot();f.loaded();await f.advance(8000);
  assert.equal(await f.w.MatchAppNativeNewsAccount.ready,false);
  assert.equal(f.frame().getAttribute('src'),null);assert.equal(f.counts().creates,0);
  const retry=f.w.document.querySelector('.ja-account-status button');assert.equal(retry.hidden,false);
  assert.match(f.w.document.querySelector('.ja-account-status p').textContent,/unavailable/);
  assert.equal(f.w.document.querySelector('script[src*="supabase-js"]'),null,'failed owned SDK loader is removed so retry can fetch again');
  retry.click();assert.ok(f.w.document.querySelector('script[src*="supabase-js"]'),'retry starts a new parent SDK load');
  f.sdk();await f.advance();
  assert.equal(await f.w.MatchAppNativeNewsAccount.ready,true);assert.equal(f.counts().creates,1);
  assert.match(f.frame().getAttribute('src'),/^\/discover\.html/);
  assert.equal(f.w.document.querySelector('.ja-account-status'),null);
 }finally{f.close()}
 }
});
test('a missing parent bootstrap reaches a finite retry state without starting iframe auth',async()=>{
 const f=scene();try{
  await f.advance(10000);
  assert.equal(f.frame().getAttribute('src'),null);assert.equal(f.counts().creates,0);
  assert.equal(f.w.document.querySelector('.ja-account-status button').hidden,false);
 }finally{f.close()}
});
test('closing or leaving native News cancels late iframe navigation',async()=>{
 for(const action of ['close','pagehide']){
  const f=scene();try{
   f.boot();f.loaded();await f.advance();
   if(action==='close')f.w.MatchAppAmbientJonas.close();else f.w.dispatchEvent(new f.w.Event('pagehide'));
   f.sdk();await f.advance();
   assert.equal(f.frame().getAttribute('src'),null,action+' prevents late iframe source assignment');
  }finally{f.close()}
 }
});
test('disposing pending account bootstrap settles readiness and cannot later create a parent client',async()=>{
 const f=scene();try{
  const controller=f.boot();f.loaded();await f.advance();controller.dispose();
  assert.equal(await controller.ready,false);assert.equal(await controller.retry(),false);
  f.sdk();await f.advance();assert.equal(f.counts().creates,0);assert.equal(f.frame().getAttribute('src'),null);
 }finally{f.close()}
});

test('a restored News page resumes pending account readiness and keeps retry copy in the selected language',async()=>{
 const f=scene();try{
  f.boot();f.loaded();await f.advance();
  f.w.dispatchEvent(new f.w.Event('pagehide'));
  f.w.dispatchEvent(new f.w.Event('pageshow'));
  f.sdk();await f.advance();assert.match(f.frame().getAttribute('src'),/^\/discover\.html/);
 }finally{f.close()}
 const g=scene();try{
  g.boot();g.loaded();await g.advance(8000);
  g.w.MATCH_LANG='pt-BR';g.w.document.dispatchEvent(new g.w.Event('matchapp:langchange'));
  assert.equal(g.w.document.querySelector('.ja-account-status button').textContent,'Tentar novamente');
  assert.match(g.w.document.querySelector('.ja-account-status p').textContent,/conta/);
 }finally{g.close()}
});

test('native Home, ebook and other parent-runtime pages wait for parser account boot before loading Jonas',async()=>{
 for(const route of ['/','/index.html','/ebooks/','/ebooks/index.html','/profile/profile.html']){
  const f=scene(route);try{
   assert.equal(f.w.document.querySelector('#ma-ambient-panel').hidden,false);
   assert.equal(f.frame().getAttribute('src'),null,route+' cannot start an early child client');
   f.sharedScript();f.sdk();f.parentBoot();
   assert.equal(f.counts().creates,1);assert.equal(f.frame().getAttribute('src'),null,'parent parsing must finish first');
   f.loaded();await f.advance();assert.match(f.frame().getAttribute('src'),/^\/discover\.html/);
   f.frame().contentWindow.eval("const SUPABASE_URL='unused',SUPABASE_ANON_KEY='unused';"+boot);
   assert.equal(f.frame().contentWindow.supabaseClient,f.w.supabaseClient);assert.equal(f.counts().creates,1);
  }finally{f.close()}
 }
});
test('failed native Home or ebook parent boot exposes finite explicit page retry without a child client',async()=>{
 for(const route of ['/','/ebooks/']){
  const f=scene(route);try{
   f.sharedScript();f.loaded();await f.advance();
   const retry=f.w.document.querySelector('.ja-account-status button');
   assert.equal(retry.hidden,false);assert.match(f.w.document.querySelector('.ja-account-status p').textContent,/unavailable/);
   assert.equal(f.frame().getAttribute('src'),null);assert.equal(f.counts().creates,0);
   retry.click();await f.advance(30000);
   assert.equal(f.counts().reloads,1,'only the deliberate retry requests a page reload');
   assert.equal(f.frame().getAttribute('src'),null);assert.equal(f.counts().creates,0);
  }finally{f.close()}
 }
});
test('a native page without a parent account runtime permits exactly one child-owned client after parsing',async()=>{
 const f=scene('/about.html');try{
  assert.equal(f.frame().getAttribute('src'),null);
  f.sdk();f.loaded();await f.advance();assert.match(f.frame().getAttribute('src'),/^\/discover\.html/);
  const child=f.frame().contentWindow;child.supabase=f.w.supabase;
  child.eval("const SUPABASE_URL='unused',SUPABASE_ANON_KEY='unused';"+boot);
  assert.equal(child.supabaseClient,f.client);assert.equal(f.w.supabaseClient,undefined);assert.equal(f.counts().creates,1);
 }finally{f.close()}
});

test('shared ambient child URL versions standalone-account readiness while native navigation stays fresh',()=>{
 const parent=fs.readFileSync(path.join(root,'patches/jonas-adult-page.js'),'utf8');
 const url=parent.match(/script\.src='([^']*android-ambient-assistant-20261011\.js[^']*)'/)[1];
 assert.deepEqual(new URL(url,'https://matchapp.tv').searchParams.getAll('account'),['20261101-2']);
 const native=fs.readFileSync(path.join(root,'android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt'),'utf8');
 assert.ok(native.includes("script.src = '/jonas/android-ambient-assistant-20261011.js?live=' + Date.now()"));
 assert.equal(fs.readFileSync(path.join(root,'android-studio/app/src/debug/assets/ambient-preview/jonas/android-ambient-assistant-20261011.js'),'utf8'),ambient);
});
