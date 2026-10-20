'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {cinemaAssets}=require('../tools/finalize-brand.js');
function verify(raw,route,family){
 const output=cinemaAssets(raw,route),before=new JSDOM(raw),after=new JSDOM(output);
 try{
  const doc=after.window.document;
  assert.equal([...doc.documentElement.classList].filter(value=>value==='ma-reference').length,1);
  assert.equal(doc.querySelectorAll('style[data-cinema-layer]').length,1);assert.equal(doc.head.firstElementChild.getAttribute('data-cinema-layer'),'');
  assert.equal(doc.querySelector('style[data-cinema-layer]').textContent,'@layer ma-reference;');
  assert.equal(doc.querySelectorAll('link[href^="/patches/reference-system.css"]').length,1);
  assert.equal(doc.querySelectorAll('link[href^="/patches/reference-'+family+'.css"]').length,1);
  assert.equal(doc.querySelectorAll('link[rel="stylesheet"][href^="/patches/reference-"]:not([href^="/patches/reference-system.css"]):not([href^="/patches/reference-'+family+'.css"])').length,0);
  assert.equal(doc.querySelectorAll('script[src^="/patches/reference-system.js"]').length,1);assert.equal(doc.querySelector('script[src^="/patches/reference-system.js"]').defer,true);
  assert.equal(new URL(doc.querySelector('script[src^="/patches/reference-system.js"]').getAttribute('src'),'https://matchapp.tv').searchParams.get('dialogs'),'20261020-1','fresh and previously copied runtime references receive the current dialog loader');
  assert.equal(new URL(doc.querySelector('script[src^="/patches/reference-system.js"]').getAttribute('src'),'https://matchapp.tv').searchParams.get('pills'),'20261020-1','copied runtime references receive the current pill loader');
  assert.equal(new URL(doc.querySelector('link[href^="/patches/reference-system.css"]').getAttribute('href'),'https://matchapp.tv').searchParams.get('pills'),'20261020-1','copied base styles receive the current pill styles');
  for(const link of doc.querySelectorAll('link[href^="/patches/reference-system.css"],link[href^="/patches/reference-home.css"],link[href^="/patches/reference-pages.css"]'))assert.equal(new URL(link.href,'https://matchapp.tv').searchParams.get('premium'),'20261020-2');
  assert.equal(doc.body.outerHTML,before.window.document.body.outerHTML,'source content, paths, posters, controls and reserved ad geometry remain exact');
  assert.equal(cinemaAssets(output,route),output,'partial repair must be byte-idempotent');
  return output;
 }finally{before.window.close();after.window.close();}
}
const source='<main><article data-source-id="verified-123"><img src="https://publisher.test/exact.jpg" alt="Original title"><a href="/discover.html?q=Original">Watch</a><button id="original-action">Choose</button></article><ins class="adsbygoogle" style="display:block;min-height:250px" data-ad-slot="2595698117"></ins></main>';
test('script-only and copied-founder-CSS partial hooks receive the missing theme once',()=>{
 for(const hook of ['<script src="/patches/reference-system.js?v=preserve-script"></script>','<link rel="stylesheet" href="/patches/reference-system.css?v=preserve-system"><link rel="stylesheet" href="/patches/reference-pages.css?v=preserve-pages">']){
  const output=verify('<!doctype html><html lang="ar" dir="rtl" class="publisher"><head><meta charset="utf-8">'+hook+'</head><body>'+source+'</body></html>','founder/index.html','pages');
  assert.match(output,/class="publisher ma-reference"/);assert.match(output,/lang="ar" dir="rtl"/);
  if(hook.includes('preserve-script'))assert.ok(output.includes('v=preserve-script'));
  else{assert.ok(output.includes('v=preserve-system'));assert.ok(output.includes('v=preserve-pages'));}
 }
});
test('duplicate partial hooks repair the correct Home, Explore and secondary family without duplicating runtime ownership',()=>{
 const hooks='<style data-cinema-layer>@layer obsolete;</style><style data-cinema-layer>@layer ma-reference;</style><link rel="stylesheet" href="/patches/reference-home.css?v=legacy-family"><link rel="stylesheet" href="/patches/reference-pages.css?v=duplicate-family"><link rel="stylesheet" href="/patches/reference-system.css?v=one"><link rel="stylesheet" href="/patches/reference-system.css?v=two"><script defer src="/patches/reference-system.js?v=one"></script><script defer src="/patches/reference-system.js?v=two"></script>';
 for(const [route,family] of [['index.html','home'],['explore.html','explore'],['awareness/example/index.html','pages']])verify('<!doctype html><html class="ma-reference ma-reference existing"><head><title>Exact title</title>'+hooks+'</head><body>'+source+'</body></html>',route,family);
});
test('future raw output stamps the existing brand query with the borderless frame without changing its prefix',()=>{
 const output=verify('<!doctype html><html lang="ja"><head><title>Publisher title</title><link rel="stylesheet" href="/brand.css?v=20261018-nativeheader1&amp;keep=source"><meta name="description" content="Publisher facts"></head><body>'+source+'</body></html>','news/articles/future/index.html','pages');
 const w=new JSDOM(output).window;try{const params=new URL(w.document.querySelector('link[href^="/brand.css"]').href,'https://matchapp.tv').searchParams;assert.equal(params.get('v'),'20261018-nativeheader1');assert.equal(params.get('keep'),'source');assert.equal(params.get('frame'),'20261020-borderless1');assert.equal(w.document.title,'Publisher title');assert.equal(w.document.querySelector('meta[name="description"]').content,'Publisher facts');}finally{w.close();}
});
test('excluded Kids, auth callbacks, native previews and no-body inputs remain untouched by the pure helper',()=>{
 const raw='<html><head><link rel="stylesheet" href="/brand.css?v=original"></head><body><button>Exact existing action</button></body></html>';
 for(const route of ['kids/index.html','callback.html','confirm.html','yandex_fixture.html','private-voice/index.html','oauth/callback.html','android-studio/preview/index.html'])assert.equal(cinemaAssets(raw,route),raw,route);
 assert.equal(cinemaAssets('<head><title>Only metadata</title></head>','news/head.html'),'<head><title>Only metadata</title></head>');
});
