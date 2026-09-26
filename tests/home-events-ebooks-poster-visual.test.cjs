'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('Home positions the single compact E-books matcher below both Watch Match and Search/Ask AI',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const root=doc.querySelector('#ebook-matcher-root');
 const form=doc.querySelector('#questionnaire-box');
 const loading=doc.querySelector('#loading-box');
 assert.ok(root&&form&&loading);
 assert.equal(doc.querySelectorAll('#ebook-matcher-root').length,1);
 assert.ok(form.compareDocumentPosition(root)&doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
 const ask=doc.getElementById('search-box');
 assert.ok(ask,'Search/Ask AI must remain present');
 assert.equal(root.previousElementSibling,ask,'Bookworms must directly follow the Search/Ask AI card');
 assert.equal(root.nextElementSibling.classList.contains('ma-together-ad'),true,'Preserve sponsored slot DOM and order');
 // Latest News is created dynamically. Its only changed line is the mount anchor.
 const news=read('latest-news.js');
 assert.match(news,/const primaryAction=document\.getElementById\('questionnaire-box'\)/);
 assert.match(news,/anchor\.insertAdjacentElement\('afterend',section\)/);
 assert.match(read('index.html'),/ebooks\/ebook-matcher\.js\?v=/);
});

test('Home events use the existing auto-swipe viewport with accessible left/right arrows at every breakpoint',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const home=doc.querySelector('#global-events'),rail=home?.querySelector('#events-viewport');
 assert.ok(home&&rail);
 assert.ok(rail.classList.contains('global-event-grid'));
 assert.ok(rail.classList.contains('events-viewport'));
 assert.equal(home.querySelectorAll('#events-viewport').length,1);
 assert.ok(rail.querySelectorAll('article.global-event').length>=1);
 const prev=home.querySelector('button.events-prev'),next=home.querySelector('button.events-next');
 assert.equal(prev?.getAttribute('data-rail-dir'),'-1');
 assert.equal(next?.getAttribute('data-rail-dir'),'1');
 assert.equal(prev?.getAttribute('aria-controls'),'events-viewport');
 assert.equal(next?.getAttribute('aria-controls'),'events-viewport');
 const shared=read('app.js'),events=read('global-events.js'),styles=read('events-cover.css');
 assert.match(shared,/\['marquee-viewport','events-viewport'\]/);
 assert.match(shared,/const autoDelay = vp\.id === 'marquee-viewport' \? 1050 : 6500/);
 assert.match(shared,/const railDelay = vp\.id === 'events-viewport' \? 4000 : autoDelay/);
 assert.match(shared,/prefers-reduced-motion/);
 assert.match(events,/retainedEnded.*sort/);
 assert.match(styles,/#global-events \.events-rail-shell \.global-event-grid/);
 assert.match(styles,/#global-events \.events-rail-shell button\.marquee-arrow/);
 assert.match(styles,/@media\(max-width:430px\)/);
});

test('Scheduled event-guide generator retains Home arrows and native scroll viewport',()=>{
 const generator=read('tools/build-global-events.js');
 assert.match(generator,/const homeSection=/);
 assert.match(generator,/class="events-rail-shell"/);
 assert.match(generator,/id="events-viewport"/);
 assert.match(generator,/data-rail-dir="-1"/);
 assert.match(generator,/data-rail-dir="1"/);
 assert.match(generator,/index\.replace\(\/<section id="global-events"/);
});

test('E-books shares Home premium form aesthetics without changes to matcher mechanics',()=>{
 const css=read('ebooks/ebook-matcher.css'),home=read('index.html');
 assert.match(css,/Homepage E-books: same premium shell/);
 assert.match(css,/#ebook-matcher-root \.ebook-fold/);
 assert.match(css,/#ebook-matcher-root \.ebook-fold>summary strong/);
 assert.match(css,/#ebook-matcher-root \.ebook-field/);
 assert.match(home,/id="questionnaire-box" class="premium-card"/);
 assert.match(home,/ebooks\/ebook-matcher\.css\?v=20260926-placement2/);
 assert.match(read('ebooks/ebook-matcher.js'),/root\.innerHTML=markup\(\);bind\(root\);renderTop\(root\)/);
});

test('Antártida feature guide uses existing exact-title poster identity, never a fabricated cover',()=>{
 const main=read('app.js'),feature=read('featured/antartida/index.html');
 const verified=main.match(/"Antártida":\s*"(https:\/\/image\.tmdb\.org\/t\/p\/w780\/[^"]+)"/)?.[1];
 assert.ok(verified,'must reuse the existing verified-title poster lookup');
 assert.ok(feature.includes('src="'+verified+'"'));
 assert.ok(feature.includes('<meta property="og:image" content="'+verified+'">'));
 assert.ok(feature.includes('"image":"'+verified+'"'));
 assert.match(feature,/class="plate antartida-poster"/);
 assert.match(feature,/object-fit:contain/);
 assert.match(feature,/fetchpriority="high"/);
 assert.doesNotMatch(feature,/<div class="plate"><b>Antártida<\/b>/);
});

test('Compact adult homepage book matcher follows the original matcher and opens for deep links',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const root=doc.querySelector('#ebook-matcher-root'),js=read('ebooks/ebook-matcher.js'),css=read('ebooks/ebook-matcher.css');
 assert.equal(root.previousElementSibling.id,'search-box');
 assert.ok(doc.getElementById('questionnaire-box').compareDocumentPosition(root)&doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.ok(js.includes("const initiallyOpen=!(document.body.classList.contains('page-home')||location.pathname==='/'||location.pathname==='/index.html')||location.hash==='#ebook-matcher-root'"));
 assert.ok(js.includes("return '<details class=\"ebook-fold\"'+(initiallyOpen?' open':'')+'><summary>"));
 assert.ok(js.includes("window.addEventListener('hashchange'"));
 assert.ok(css.includes('Homepage-only compact book-matching card'));
 assert.ok(css.includes('html body.page-home #ebook-matcher-root .ebook-fold>summary'));
 assert.doesNotMatch(read('kids/index.html'),/ebook-matcher-root/);
});


test('Home cache-recovery repositions Bookworms after Search/Ask and uses native compact details',async()=>{
 const html='<!doctype html><html lang="en"><body class="page-home"><main><section id="ebook-matcher-root"></section><article id="questionnaire-box"></article><article id="search-box"></article></main></body></html>';
 const win=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 win.eval(read('ebooks/ebook-matcher.js'));
 win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const ebook=win.document.getElementById('ebook-matcher-root');
 assert.equal(ebook.previousElementSibling.id,'search-box');
 assert.equal(ebook.querySelectorAll('details.ebook-fold').length,1);
 assert.equal(ebook.querySelector('details.ebook-fold').open,false,'Adult Home must begin collapsed');
 ebook.querySelector('details.ebook-fold').open=true;
 assert.ok(ebook.querySelectorAll('[data-ebook-match]').length,'Open reveals the complete book-matching controls');
 win.close();
});
