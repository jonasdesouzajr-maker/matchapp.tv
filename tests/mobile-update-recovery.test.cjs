'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const UPDATES=read('app-updates.js');
const next=()=>new Promise(resolve=>setTimeout(resolve,35));
function boot({url='https://matchapp.tv/',ua='Mozilla/5.0',standalone=false,build='2026.09.26.9'}={}){
 const dom=new JSDOM('<main><button class="install-btn">Install</button></main>',{url,runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=dom.window;
 Object.defineProperty(w.navigator,'userAgent',{configurable:true,value:ua});
 Object.defineProperty(w.navigator,'serviceWorker',{configurable:true,value:{getRegistrations:async()=>[]}});
 w.MATCHAPP_BUILD=build;
 w.matchMedia=()=>({matches:standalone});
 w.fetch=async()=>({ok:true,json:async()=>({version:build})});
 w.localStorage.setItem('match_app_installed_build','2026.09.23.1');
 w.localStorage.setItem('match_seenList',JSON.stringify(['Do not erase my history']));
 w.localStorage.setItem('match_dailyCount','2');
 w.eval(UPDATES);
 return {dom,w};
}
test('existing build-meta is not overwritten by stale update module on any device',async()=>{
 const {dom,w}=boot();
 await next();
 assert.equal(w.MATCHAPP_BUILD,'2026.09.26.9');
 assert.equal(w.matchAppUpdatePending.version,'2026.09.26.9');
 dom.window.close();
});
test('ordinary desktop and phone website retain existing update behavior; no forced refresh or overlay',async()=>{
 for(const opts of [
  {ua:'Mozilla/5.0 (X11; Linux x86_64)',standalone:false},
  {ua:'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/141 Mobile Safari/537.36',standalone:false},
  {ua:'Mozilla/5.0 (X11; Linux x86_64)',standalone:true}
 ]){
  const {dom,w}=boot(opts);await next();
  assert.equal(w.localStorage.getItem('matchapp_adult_mobile_runtime_20260927_1'),null);
  assert.equal(w.document.querySelector('#matchapp-update-overlay'),null);
  assert.equal(w.localStorage.getItem('match_dailyCount'),'2');
  dom.window.close();
 }
});
test('installed mobile PWA receives one release-scoped refresh without deleting identity or credits',async()=>{
 const ua='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
 const {dom,w}=boot({ua,standalone:true});await next();
 assert.equal(w.localStorage.getItem('matchapp_adult_mobile_runtime_20260927_1'),'pending');
 assert.deepEqual(JSON.parse(w.localStorage.getItem('match_seenList')),['Do not erase my history']);
 assert.equal(w.localStorage.getItem('match_dailyCount'),'2');
 assert.equal(w.document.querySelector('#matchapp-update-overlay'),null);
 dom.window.close();
});
test('native Android app and installed Kids PWA never run adult PWA refresh',async()=>{
 const native=boot({ua:'Mozilla/5.0 (Linux; Android 15) Chrome/141 MatchAppAiAndroid/1.1.35'});
 const kids=boot({url:'https://matchapp.tv/kids/',ua:'Mozilla/5.0 (iPad; CPU OS 18_0) Mobile',standalone:true});
 await next();
 for(const {dom,w} of [native,kids]){
  assert.equal(w.localStorage.getItem('matchapp_adult_mobile_runtime_20260927_1'),null);
  assert.equal(w.localStorage.getItem('match_dailyCount'),'2');
  dom.window.close();
 }
});
test('fresh mobile JS URLs are the only required HTML changes; desktop UI structure remains intact',()=>{
 const home=read('index.html'),ask=read('discover.html');
 for(const html of [home,ask]){
  assert.match(html,/match-ai-rank\.js\?v=20260927-ranked1-mobilefresh1/);
  assert.match(html,/global=20260927-ranked1&amp;mobilefresh=20260927-1/);
  assert.match(html,/app-updates\.js\?v=20260927-mobilefresh1/);
 }
 assert.match(ask,/discover\.js\?v=20260925-intent1[^"]*mobilefresh=20260927-1/);
 assert.match(UPDATES,/!IS_MOBILE_ADULT\|\|IS_NATIVE_ADULT\|\|!isStandalone\(\)/);
 assert.doesNotMatch(UPDATES,/localStorage\.clear\(/);
});
test('next adult Android version cold-loads only Match/Ask documents and preserves native Kids separation',()=>{
 const main=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 const gradle=read('android-studio/app/build.gradle.kts');
 assert.match(main,/isAdultAiDocument/);
 assert.match(main,/WebSettings\.LOAD_NO_CACHE/);
 assert.match(main,/window\.MATCHAPP_ANDROID = true/);
 assert.match(main,/MATCHAPP_ANDROID_KIDS_BLOCKED/);
 assert.match(gradle,/versionCode = 37/);
 assert.match(gradle,/versionName = "1\.1\.35"/);
 assert.doesNotMatch(read('android-studio/kidsapp/src/main/java/tv/matchapp/kids/MainActivity.kt'),/adult-mobile-match-ai-runtime-20260927-1/);
});
