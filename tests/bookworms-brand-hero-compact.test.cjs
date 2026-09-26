'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const read=name=>fs.readFileSync(path.join(ROOT,name),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));

test('Bookworms uses the original MatchApp-only book + play-star crest on adult Home, while /ebooks/ keeps its own UI',async()=>{
 const logo=read('assets/brand/matchapp-bookworms-crest.svg');
 const svg=new JSDOM(logo,{contentType:'image/svg+xml'}).window.document;
 const top=svg.documentElement;
 assert.equal(top.localName,'svg');
 assert.equal(top.getAttribute('viewBox'),'0 0 160 160');
 assert.match(logo,/MatchApp Bookworms crest/);
 assert.match(logo,/open.book|open-book/i);
 assert.match(logo,/Star\/play|Star\/play monogram/i);
 assert.ok(svg.querySelectorAll('path').length>=6,'Distinct original book spine, pages, play-star and outer flourish');
 assert.equal(svg.querySelectorAll('script,foreignObject,image').length,0,'Self-contained original icon: no network fonts or external art');
 const fixture='<html lang="en"><body class="page-home"><main>'+
  '<article id="questionnaire-box"></article><article id="loading-box"></article>'+
  '<section id="ebook-matcher-root"></section></main></body></html>';
 const dom=new JSDOM(fixture,{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;
 w.eval(read('ebooks/ebook-matcher.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await tick();
 const root=w.document.getElementById('ebook-matcher-root');
 const fold=root.querySelector('details.ebook-fold'),summary=fold.querySelector('summary');
 assert.equal(fold.open,false,'Home begins collapsed to preserve space');
 assert.equal(root.previousElementSibling.id,'questionnaire-box','Icon redesign must not move Bookworms into Ask AI');
 assert.equal(summary.querySelectorAll('img.ebook-brand-crest').length,1,'Custom SVG appears only once');
 const img=summary.querySelector('img.ebook-brand-crest');
 assert.equal(img.getAttribute('src'),'/assets/brand/matchapp-bookworms-crest.svg');
 assert.equal(img.getAttribute('alt'),'','Decorative crest must not obscure the accessible summary label');
 assert.equal(img.closest('.ebook-summary-icon')?.getAttribute('aria-hidden'),'true');
 assert.match(summary.textContent,/Find what to read here/);
 fold.open=true;
 assert.equal(root.querySelectorAll('select[data-ebook-select]').length,7,'Original compact reading controls remain intact');
 assert.ok(root.querySelector('[data-ebook-match]'),'Original book matching remains available after expanding');
 w.close();
 const hub=new JSDOM('<html lang="en"><body class="ebook-page"><main><section id="ebook-matcher-root"></section></main></body></html>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'});
 hub.window.eval(read('ebooks/ebook-matcher.js'));
 hub.window.document.dispatchEvent(new hub.window.Event('DOMContentLoaded'));
 await tick();
 assert.equal(hub.window.document.querySelectorAll('.ebook-brand-crest').length,0,'Bookworms hub UI remains unchanged');
 assert.ok(hub.window.document.querySelector('[data-ebook-match]'));
 hub.window.close();
});

test('Exclusive filled Bookworms treatment wins over legacy icon-hiding rules and stays legible on phones',()=>{
 const css=read('ebooks/ebook-matcher.css'),last=css.slice(css.lastIndexOf('Bookworms exclusive violet/gold crest'));
 assert.ok(last.length>1800,'The new theme must come AFTER earlier conflicting legacy rules');
 assert.match(last,/html body\.page-home #ebook-matcher-root \.ebook-fold\{/);
 assert.match(last,/#57317F/);
 assert.match(last,/#613092/);
 assert.match(last,/#ebook-matcher-root \.ebook-summary-icon\{[\s\S]*?display:grid!important/);
 assert.match(last,/#ebook-matcher-root img\.ebook-brand-crest\{[\s\S]*?object-fit:contain!important/);
 assert.match(last,/grid-template-columns:64px minmax\(0,1fr\) 64px!important/);
 assert.match(last,/@media\(max-width:640px\)/);
 assert.match(last,/grid-template-columns:46px minmax\(0,1fr\) 46px!important/);
 assert.match(last,/min-height:44px!important/,'Mobile and keyboard targets remain at least 44px');
 assert.match(last,/:focus-visible/);
 assert.match(last,/prefers-reduced-motion/);
 assert.doesNotMatch(read('kids/index.html'),/matchapp-bookworms-crest/);
});

test('The compact hero preserves both working shortcuts and the existing How it works button',()=>{
 const dom=new JSDOM('<html><body class="page-home"><header class="home-hero">'+
  '<h1 class="home-h1">What should you watch tonight?</h1><p class="home-h1-sub">Pick a mood.</p>'+
  '<button class="ma-how-link" type="button">How it works</button></header>'+
  '<button id="ma-tab-match"></button><button id="ma-tab-ask"></button>'+
  '<article id="questionnaire-box"></article><div class="ma-concierge"></div></body></html>',
  {url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;
 let matchClicks=0,askClicks=0,scrolls=0;
 w.document.getElementById('ma-tab-match').onclick=()=>matchClicks++;
 w.document.getElementById('ma-tab-ask').onclick=()=>askClicks++;
 w.HTMLElement.prototype.scrollIntoView=()=>{scrolls++};
 w.eval(read('home-approved.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const hero=w.document.querySelector('.home-hero');
 assert.equal(hero.querySelectorAll('#ma-hero-ctas').length,1,'Hero retains one original shortcut row');
 assert.equal(hero.querySelectorAll('.ma-how-link').length,1,'Do not duplicate or break the existing tour launcher');
 hero.querySelector('#ma-hero-match').click();
 hero.querySelector('#ma-hero-ask').click();
 assert.equal(matchClicks,1);
 assert.equal(askClicks,1);
 assert.equal(scrolls,2);
 w.close();
 const css=read('home-approved.css');
 const compact=css.slice(css.lastIndexOf('compact adult Home hero'));
 assert.ok(compact.length>900);
 assert.match(compact,/font-size:clamp\(22px,2\.65vw,36px\)!important/);
 assert.match(compact,/#ma-hero-ctas\{/);
 assert.match(compact,/min-height:44px!important/);
 assert.match(compact,/\.home-hero \.ma-how-link/);
 assert.match(compact,/@media\(max-width:600px\)/);
 const html=read('index.html');
 assert.match(html,/\/ebooks\/ebook-matcher\.js\?v=20260926-publishericon2/);
 assert.match(html,/\/ebooks\/ebook-matcher\.css\?v=20260926-publishericon2/);
 assert.match(html,/\/home-approved\.js\?v=20260926-playpending1/);
 assert.match(read('home-approved.js'),/home-approved\.css\?v=20260926-playpending1/);
});
