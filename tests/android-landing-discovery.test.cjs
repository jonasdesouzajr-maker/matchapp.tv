'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(require.resolve('../'+f),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const play='https://play.google.com/store/apps/details?id=com.jonas.papercup';
function page(url='https://matchapp.tv/android/',saved){
 const dom=new JSDOM(read('android/index.html'),{url,runScripts:'outside-only'});
 if(saved)dom.window.localStorage.setItem('match_lang',saved);
 dom.window.eval(read('i18n.js')+'\n'+read('android/landing-locale.js'));
 return dom;
}
test('Android landing follows the selected language, including metadata and RTL, without changing store identity',()=>{
 const dom=page('https://matchapp.tv/android/?lang=pt-BR','de');
 try{
  const w=dom.window,d=w.document;
  assert.equal(d.documentElement.lang,'de','saved deliberate language outranks incoming link');
  const headings=new Set();
  for(const lang of languages){
   w.setLanguage(lang);
   headings.add(d.querySelector('main').textContent);
   assert.equal(d.documentElement.lang,lang);
   assert.equal(d.documentElement.dir,lang==='ar'?'rtl':'ltr');
   for(const el of d.querySelectorAll('[data-i18n^="androidLanding."]'))assert.ok(el.textContent.trim()&&!el.textContent.includes('androidLanding.'),'authored visible copy');
   assert.equal(d.querySelector('meta[name="description"]').content,d.querySelector('.lede').textContent);
   assert.equal(d.querySelector('meta[property="og:title"]').content,d.title);
   assert.equal(d.querySelector('meta[name="twitter:description"]').content,d.querySelector('.lede').textContent);
   assert.equal(d.querySelector('.cta').href,play);
   assert.equal(d.querySelector('link[rel="canonical"]').href,'https://matchapp.tv/android/');
   assert.ok(d.querySelector('main a[href="/"]'),'website remains usable');
  }
  assert.equal(headings.size,14);
  w.setLanguage('en');
  assert.match(d.querySelector('.note').textContent,/Kids Mode is separate/);
  assert.match(d.querySelector('.note').textContent,/browser shortcut opens the website/);
  assert.doesNotMatch(d.querySelector('main').textContent,/install the web app|same core.*Kids|Lumina/);
  const graph=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
  assert.equal(graph[0].downloadUrl,play);
  assert.equal(graph[0].operatingSystem,'Android');
  assert.ok(!d.querySelector('.adsbygoogle,script[src*="adsbygoogle"],script[src*="install.js"]'));
 }finally{dom.window.close();}
});
test('Portuguese discovery links reach the localized Android page without requiring a prompt',()=>{
 for(const [file,lang] of [['watch-night/index.html','en'],['pt-br/noite-de-filme/index.html','pt-BR'],['platforms/plus-sbt/index.html','pt-BR']]){
  const dom=new JSDOM(read(file),{url:'https://matchapp.tv/'+file});
  try{
   const link=dom.window.document.querySelector('main a[href="/android/?lang='+lang+'"]');
   assert.ok(link&&link.textContent.includes('MatchApp Ai'));
   assert.ok(!link.closest('[hidden],[inert],[aria-hidden="true"]'));
   assert.ok(!link.hasAttribute('onclick'),'ordinary navigation');
  }finally{dom.window.close();}
 }
 const dom=page('https://matchapp.tv/android/?lang=pt-BR');
 try{assert.equal(dom.window.document.querySelector('h1').textContent,'MatchApp Ai para Android');}
 finally{dom.window.close();}
});
