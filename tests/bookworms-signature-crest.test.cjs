'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const icon='/assets/brand/matchapp-bookworms-crest.svg?v=20260926-crest1';

test('Original transparent MatchApp Bookworms crest is a self-contained authored open book with play-star signature',()=>{
 const raw=read('assets/brand/matchapp-bookworms-crest.svg');
 const doc=new JSDOM(raw,{contentType:'image/svg+xml'}).window.document;
 const svg=doc.documentElement;
 assert.equal(svg.localName,'svg');
 assert.equal(svg.getAttribute('viewBox'),'0 0 120 120');
 assert.match(doc.querySelector('title')?.textContent||'',/MatchApp Bookworms original crest/);
 assert.match(doc.querySelector('desc')?.textContent||'',/open violet storybook.*gold play emblem.*reading star/);
 assert.ok(doc.querySelectorAll('path').length>=9,'Crest needs its original illustrated book, ring, star and play artwork');
 assert.ok(doc.querySelectorAll('linearGradient').length>=3,'Gold foil and violet page gradients are integral to the design');
 assert.equal(doc.querySelectorAll('image,use,foreignObject,script').length,0,'No downloaded logo, external dependency or script');
 assert.doesNotMatch(raw,/https?:\/\/(?!www\.w3\.org\/2000\/svg)/,'No third-party graphics');
});

test('Only adult Home uses proprietary crest; the separate /ebooks/ hub stays unmodified',async()=>{
 async function render(html,url){
  const win=new JSDOM(html,{url,runScripts:'outside-only'}).window;
  win.eval(read('ebooks/ebook-matcher.js'));
  win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  await new Promise(resolve=>setTimeout(resolve,0));
  return win;
 }
 const home=await render('<!doctype html><html lang="en"><body class="page-home"><main><article id="questionnaire-box"></article><article id="loading-box"></article><section id="ebook-matcher-root"></section><article id="search-box"></article></main></body></html>','https://matchapp.tv/');
 const book=home.document.getElementById('ebook-matcher-root');
 assert.equal(book.previousElementSibling.id,'questionnaire-box','Crest must not move Bookworms under Ask AI');
 const fold=book.querySelector('details.ebook-fold'),summary=fold.querySelector('summary');
 assert.equal(fold.open,false,'The branded homepage card remains compact by default');
 const img=summary.querySelector('img.ebook-bookworms-crest');
 assert.ok(img,'Custom asset must render inside the actual matching card header');
 assert.equal(img.getAttribute('src'),icon);
 assert.equal(img.getAttribute('alt'),'');
 assert.equal(img.parentElement.getAttribute('aria-hidden'),'true');
 assert.equal(summary.querySelector('strong').textContent,'Find what to read here');
 assert.equal(summary.querySelector('.ebook-chevron').textContent,'⌄');
 assert.equal(book.querySelectorAll('select[data-ebook-select]').length,7,'The actual matching dropdowns remain intact');
 home.close();
 const hub=await render('<!doctype html><html><body class="ebook-page"><main><section id="ebook-matcher-root"></section></main></body></html>','https://matchapp.tv/ebooks/');
 const hubRoot=hub.document.getElementById('ebook-matcher-root');
 assert.equal(hubRoot.querySelectorAll('.ebook-bookworms-crest').length,0);
 assert.equal(hubRoot.querySelector('details.ebook-fold').open,true);
 assert.ok(hubRoot.querySelectorAll('button[data-ebook-field]').length>50,'Keep the existing hub matching controls');
 hub.close();
});

test('Royal-violet filled homepage retains centered text, custom crest and accessible responsive control',()=>{
 const styles=read('ebooks/ebook-matcher.css'),home=read('index.html');
 const signed=styles.slice(styles.indexOf('/* Adult HOME signature Bookworms field.'));
 assert.ok(signed.length>1000,'Original homepage crest style is required');
 assert.match(signed,/#ebook-matcher-root \.ebook-fold>summary\{/);
 assert.match(signed,/display:grid!important;grid-template-columns:76px minmax\(0,1fr\) 76px/);
 assert.match(signed,/linear-gradient\(105deg,#70379f,#572983/,'Colored fill must be clearly visible on desktop');
 assert.match(signed,/\.ebook-bookworms-crest\{/);
 assert.match(signed,/object-fit:contain!important/,'Never distort proprietary crest');
 assert.match(signed,/@media\(max-width:640px\)/);
 assert.match(signed,/@media\(max-width:360px\)/);
 assert.match(signed,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(home,/ebook-matcher\.css\?v=20260926-book-crest4/);
 assert.match(home,/ebook-matcher\.js\?v=20260926-book-crest4/);
 assert.doesNotMatch(read('kids/index.html'),/matchapp-bookworms-crest/);
});
