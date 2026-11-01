'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'patches/subtle-background-20261101.js'),'utf8');
test('subtle adult loader installs one canonical stylesheet on web and Android while preserving excluded surfaces',()=>{
 for(const [pathname,ua,expected] of [['/','Mozilla/5.0',1],['/about.html','Mozilla/5.0',1],['/kids/','Mozilla/5.0',0],['/oauth/consent.html','Mozilla/5.0',0],['/private-voice/','Mozilla/5.0',0],['/callback.html','Mozilla/5.0',0],['/','MatchAppTVAndroid',1],['/','MatchAppAiAndroid/1.0',1],['/android-studio/','Mozilla/5.0',0]]){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv'+pathname,runScripts:'outside-only'}),w=dom.window;
  Object.defineProperty(w.navigator,'userAgent',{value:ua});w.eval(source);w.eval(source);
  const links=w.document.querySelectorAll('#ma-subtle-bg-20261101');assert.equal(links.length,expected,pathname+' '+ua);
  if(expected){assert.equal(w.document.documentElement.dataset.maSubtleActive,undefined);links[0].dispatchEvent(new w.Event('load'));assert.equal(w.document.documentElement.dataset.maSubtleActive,'true');}
  dom.window.close();
 }
});
test('shared browser loader is versioned and new styles preserve media anchors and chosen typography',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const runtime=dom.window.document.querySelector('script[src^="/patches/reference-system.js"]'),preload=dom.window.document.querySelector('link[as="script"][href^="/patches/reference-system.js"]');
 assert.equal(runtime.src,preload.href);assert.match(dom.window.document.querySelector('script[src^="/patches/jonas-adult-page.js"]').src,/subtle=20261101-4/);dom.window.close();
 const css=fs.readFileSync(path.join(root,'patches/subtle-background-20261101.css'),'utf8');
 assert.match(css,/:not\(:has\(img,picture,svg,video,canvas\)\)/);assert.doesNotMatch(css,/(?:font-size|font-weight|filter|transform)\s*:/);assert.match(css,/min-height: 44px/);
});
test('Grok loader uses a distinct sentinel so the requested stylesheet can actually initialize',()=>{
 const all=fs.readFileSync(path.join(root,'patches/jonas-adult-page.js'),'utf8');
 const loader=all.slice(all.indexOf('/* Subtle background and text links'),all.indexOf('/* Jonas guide'));
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv/about.html',runScripts:'outside-only'}),w=dom.window;
 w.eval(loader);w.eval(loader);
 assert.equal(w.document.querySelectorAll('script[src*="subtle-background-"]').length,1);
 assert.equal(w.document.getElementById('ma-subtle-bg-20261101'),null);
 w.eval(source);assert.ok(w.document.querySelector('link#ma-subtle-bg-20261101'));
 dom.window.close();
});

test('a warm Android cache holding the old parent URL cannot suppress the current child stylesheet hook',async()=>{
 const home=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const parentUrl=home.window.document.querySelector('script[src^="/patches/jonas-adult-page.js"]').getAttribute('src');home.window.close();
 const absolute=new URL(parentUrl,'https://matchapp.tv').href,stale=new URL(absolute);stale.searchParams.set('subtle','20261101-1');
 assert.notEqual(absolute,stale.href,'the HTML must request a fresh parent cache key');
 const cached=new Map([[stale.href,Buffer.from('window.__oldParentCacheHit=true;')]]),requested=[];
 const currentParent=fs.readFileSync(path.join(root,'patches/jonas-adult-page.js'),'utf8');
 class WarmCache extends ResourceLoader{
  fetch(url){
   requested.push(url);if(cached.has(url))return Promise.resolve(cached.get(url));
   if(url===absolute)return Promise.resolve(Buffer.from(currentParent));
   const asset=new URL(url).pathname;
   if(asset==='/patches/subtle-background-20261101.js')return Promise.resolve(Buffer.from(source));
   if(asset==='/patches/subtle-background-20261101.css')return Promise.resolve(Buffer.from(fs.readFileSync(path.join(root,'patches/subtle-background-20261101.css'),'utf8')));
   return Promise.resolve(Buffer.from(''));
  }
 }
 const dom=new JSDOM('<!doctype html><html><head><script defer src="'+parentUrl.replace(/&/g,'&amp;')+'"></script></head><body></body></html>',{
  url:'https://matchapp.tv/',runScripts:'dangerously',resources:new WarmCache(),virtualConsole:new VirtualConsole(),
  beforeParse(w){Object.defineProperty(w.navigator,'userAgent',{value:'MatchAppAiAndroid/68'})}
 });
 try{
  await new Promise(resolve=>dom.window.addEventListener('load',resolve,{once:true}));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(dom.window.__oldParentCacheHit,undefined);
  assert.ok(requested.includes(absolute));assert.ok(!requested.includes(stale.href));
  assert.ok(requested.some(url=>url.endsWith('/patches/subtle-background-20261101.js?v=20261101-4')));
  assert.ok(requested.some(url=>url.endsWith('/patches/subtle-background-20261101.css?v=20261101-4')));
  assert.equal(dom.window.document.documentElement.dataset.maSubtleActive,'true');
  assert.equal(dom.window.document.querySelectorAll('link#ma-subtle-bg-20261101').length,1);
 }finally{dom.window.close()}
});
test('canonical parent versioning updates stale script and preload keys once while preserving all other parameters',()=>{
 const {versionReferenceRuntimeAssets}=require('../tools/finalize-brand.js');
 const home=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const url=home.window.document.querySelector('script[src^="/patches/jonas-adult-page.js"]').getAttribute('src');home.window.close();
 const fixture='<link rel="preload" as="script" href="'+url.replace(/&/g,'&amp;')+'"><script defer src="'+url.replace(/&/g,'&amp;')+'"></script>';
 const stale=fixture.replaceAll('subtle=20261101-4','subtle=20261101-1');
 const next=versionReferenceRuntimeAssets(stale);
 assert.equal(next,fixture);assert.equal(versionReferenceRuntimeAssets(next),next);
});
