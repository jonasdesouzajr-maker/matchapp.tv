'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('Home Explore invitation updates every label and description without altering the destination',()=>{
 const html=read('index.html');const card=html.match(/<section class="premium-card" style="text-align:center; padding: 28px 24px; margin: 24px auto; max-width: 720px;">[\s\S]*?<\/section>/);
 assert.ok(card,'Home Explore invitation is present as a dedicated compact entry');
 assert.match(card[0],/data-home-explore-description/);
 assert.equal((card[0].match(/data-explore-more-label/g)||[]).length,2);
 const dom=new JSDOM('<!doctype html><html><body class="page-home"><main>'+card[0]+'</main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 w.MATCH_LANG='en';w.eval(read('patches/home-watch-focus.js'));
 const href=w.document.querySelector('a.gold-btn').getAttribute('href');assert.equal(href,'/explore.html');
 const seen=new Set();
 for(const language of languages){
  w.MATCH_LANG=language;
  w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:language}}));
  const desc=w.document.querySelector('[data-home-explore-description]').textContent.trim();
  assert.ok(desc.length>=12,language+' invitation needs meaningful authored copy');
  seen.add(desc);
  for(const n of w.document.querySelectorAll('[data-explore-more-label]'))assert.ok(n.textContent.trim().length>0,language+' CTA');
  assert.equal(w.document.querySelector('a.gold-btn').getAttribute('href'),href,'language must not rewrite Explore href');
 }
 assert.equal(seen.size,languages.length,'all supported languages have separately authored descriptions');
 w.close();
});
test('Explore and Music label their menu and call to action in every selected language',()=>{
 for(const file of ['explore.html','music.html']){
  const dom=new JSDOM(read(file),{url:'https://matchapp.tv/'+file,runScripts:'outside-only'}),w=dom.window;
  w.MATCH_LANG='en';w.eval(read('patches/explore-locales.js'));
  const expectedRoutes=Array.from(w.document.querySelectorAll('a'),a=>a.getAttribute('href'));
  const labels=new Set();
  for(const language of languages){
   w.MATCH_LANG=language;
   w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang:language}}));
   const nav=w.document.querySelector('[data-hub-aria="menu"]');
   assert.ok(nav?.getAttribute('aria-label')?.length>2,file+' '+language+' menu');
   labels.add(nav.getAttribute('aria-label'));
   if(file==='music.html')assert.ok(w.document.querySelector('[data-music-ask]').textContent.trim().length>5,language+' Music CTA');
   assert.deepEqual(Array.from(w.document.querySelectorAll('a'),a=>a.getAttribute('href')),expectedRoutes,'localization must preserve destinations');
  }
  assert.ok(labels.size>=12,'menu labels contain proper localization across writing systems; synonymous translations may match');
  w.close();
 }
});
test('design changes remain scoped to adult surfaces and respect artwork, reduced motion and AdSense inventory',()=>{
 const home=read('patches/adult-home-finish-20261014.css'),hub=read('patches/explore-hub.css'),shell=read('page-shell.css'),html=read('index.html');
 assert.match(home,/body\.page-home/);assert.match(hub,/body\.page-explore/);assert.match(shell,/body\.page-shell/);
 assert.match(home,/prefers-reduced-motion:reduce/);assert.match(hub,/prefers-reduced-motion:reduce/);
 assert.match(home,/#res-poster-img\{object-fit:contain/);
 assert.ok(!/\.adsbygoogle|\.sidebar-ad-left|\.sidebar-ad-right|\.ad-banner-container/.test(home));
 assert.ok(!/\/kids\/|\.kids-body|\.kids-mode/.test(home));
 assert.match(html,/matchapp-icon-approved\.png/);
 assert.match(html,/adult-home-finish-20261014\.css/);
});
