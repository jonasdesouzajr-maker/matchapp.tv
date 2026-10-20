'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const vm=require('node:vm'),{createRequire}=require('node:module'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const pages=['index.html','explore.html','how-it-works.html','discover.html','music.html',
'together.html','friends.html','cooking/index.html','ebooks/index.html','news/index.html',
'profile/profile.html','pricing/pricing.html','about.html','contact.html','privacy.html',
'terms.html','where-to-watch/index.html','android/index.html'];
test('18 main adult routes enable lightweight sensory feedback, Kids is excluded',()=>{
 for(const file of pages){
  const body=read(file);
  const dom=new JSDOM(body);
  try {
   const scripts=dom.window.document.querySelectorAll('script[src^="/patches/immersive-feedback-20261014.js?"]');
   assert.equal(scripts.length,1,file+' retains the sole feedback owner');
   const script=scripts[0],url=new URL(script.getAttribute('src'),'https://matchapp.tv');
   assert.ok(script.hasAttribute('defer'),file);
   assert.equal(url.searchParams.get('v'),'immersive1',file+' retains its original cache prefix');
   assert.equal(url.searchParams.get('dock'),'20261020-1',file+' invalidates the destination-signature runtime');
  } finally { dom.window.close(); }
  assert.equal((body.match(/immersive-feedback-20261014\.js/g)||[]).length,1,file);
 }
 assert.doesNotMatch(read('kids/index.html'),/immersive-feedback-20261014\.js/);
});
test('hourly news hub regeneration preserves its approved adult presentation assets',()=>{
 const source=read('tools/refresh-news-rss.js');
 const entry=source.search(/^\(async\b/m);
 assert.ok(entry>0,'evaluate only renderer definitions, never the news publisher');
 const render=vm.runInNewContext(source.slice(0,entry)+'\n;hub;',{
  require:createRequire(path.join(root,'tools/refresh-news-rss.js')),__dirname:path.join(root,'tools'),URL,URLSearchParams,AbortController,console,
  fetch:()=>{throw Error('The presentation fixture cannot request publisher feeds');}
 });
 const output=new JSDOM(render([],'2026-10-20T12:00:00Z')),committed=new JSDOM(read('news/index.html'));
 try {
  for(const selector of ['link[href^="/brand.css?"]','script[src^="/patches/jonas-adult-page.js?"]','script[src^="/patches/immersive-feedback-20261014.js?"]','link[href^="/patches/reference-system.css?"]','link[href^="/patches/reference-pages.css?"]','script[src^="/patches/reference-system.js?"]']){
   const current=committed.window.document.querySelector(selector),fresh=output.window.document.querySelectorAll(selector);
   assert.ok(current,'committed hub owns '+selector);assert.equal(fresh.length,1,'regeneration keeps one '+selector);
   assert.equal(fresh[0].outerHTML,current.outerHTML,'regeneration retains the current approved asset and complete cache key: '+selector);
  }
  assert.ok(output.window.document.documentElement.classList.contains('ma-reference'));
  assert.equal(output.window.document.querySelectorAll('style[data-cinema-layer]').length,1);
 } finally { output.window.close();committed.window.close(); }
});
test('original bundled video keeps its soundtrack, with media volume below full scale',()=>{
 const src=read('android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt');
 assert.match(src,/player\.setVolume\(0\.55f, 0\.55f\)/);
 assert.doesNotMatch(src,/player\.setVolume\(0f, 0f\)/);
 const mp4=fs.readFileSync(path.join(root,'android-studio/app/src/main/res/raw/matchapp_launch_intro.mp4'));
 assert.ok(mp4.includes(Buffer.from('soun'))&&mp4.includes(Buffer.from('mp4a')));
});
test('feedback respects sound mute, haptic and motion settings with no startup timers',()=>{
 const js=read('patches/immersive-feedback-20261014.js');
 assert.match(js,/match_soundEnabled/);
 assert.match(js,/match_hapticsEnabled/);
 assert.match(js,/prefers-reduced-motion: reduce/);
 assert.match(js,/mic\?115:12/);
 assert.match(js,/kind==='result'/);
 assert.match(js,/!e\.isTrusted/);
 assert.doesNotMatch(js,/setInterval\(|requestAnimationFrame\(|mutationObserver/i);
});
test('existing sound engine gains mic notes and retains result cue',()=>{
 assert.match(read('app.js'),/mic:\s*\[\{freq:493\.88/);
 assert.match(read('app.js'),/result:\s*\[\{freq:392/);
 assert.match(read('matchapp-ia.js'),/kind==='mic'/);
});
