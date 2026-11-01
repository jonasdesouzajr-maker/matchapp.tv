'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'patches/subtle-background-20261101.js'),'utf8');
test('subtle browser loader installs one canonical stylesheet and preserves excluded surfaces',()=>{
 for(const [pathname,ua,expected] of [['/','Mozilla/5.0',1],['/about.html','Mozilla/5.0',1],['/kids/','Mozilla/5.0',0],['/oauth/consent.html','Mozilla/5.0',0],['/private-voice/','Mozilla/5.0',0],['/callback.html','Mozilla/5.0',0],['/','MatchAppTVAndroid',0],['/','MatchAppAiAndroid/1.0',0]]){
  const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv'+pathname,runScripts:'outside-only'}),w=dom.window;
  Object.defineProperty(w.navigator,'userAgent',{value:ua});w.eval(source);w.eval(source);
  const links=w.document.querySelectorAll('#ma-subtle-bg-20261101');assert.equal(links.length,expected,pathname+' '+ua);
  if(expected){assert.equal(w.document.documentElement.dataset.maSubtleBrowser,undefined);links[0].dispatchEvent(new w.Event('load'));assert.equal(w.document.documentElement.dataset.maSubtleBrowser,'true');}
  dom.window.close();
 }
});
test('shared browser loader is versioned and new styles preserve media anchors and chosen typography',()=>{
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'));
 const runtime=dom.window.document.querySelector('script[src^="/patches/reference-system.js"]'),preload=dom.window.document.querySelector('link[as="script"][href^="/patches/reference-system.js"]');
 assert.equal(runtime.src,preload.href);assert.match(dom.window.document.querySelector('script[src^="/patches/jonas-adult-page.js"]').src,/subtle=20261101-1/);dom.window.close();
 const css=fs.readFileSync(path.join(root,'patches/subtle-background-20261101.css'),'utf8');
 assert.match(css,/:not\(:has\(img,picture,svg,video,canvas\)\)/);assert.doesNotMatch(css,/(?:font-size|font-weight|filter|transform)\s*:/);assert.match(css,/min-height: 44px/);
});
test('Grok loader uses a distinct sentinel so the requested stylesheet can actually initialize',()=>{
 const all=fs.readFileSync(path.join(root,'patches/jonas-adult-page.js'),'utf8');
 const loader=all.slice(all.indexOf('/* Browser-only subtle background;'),all.indexOf('/* Jonas guide'));
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv/about.html',runScripts:'outside-only'}),w=dom.window;
 w.eval(loader);w.eval(loader);
 assert.equal(w.document.querySelectorAll('script[src*="subtle-background-"]').length,1);
 assert.equal(w.document.getElementById('ma-subtle-bg-20261101'),null);
 w.eval(source);assert.ok(w.document.querySelector('link#ma-subtle-bg-20261101'));
 dom.window.close();
});
