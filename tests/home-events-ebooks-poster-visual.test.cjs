'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');

test('Home puts its one compact Bookworms matcher IMMEDIATELY below Find what to watch here, not Ask AI',()=>{
 const doc=new JSDOM(read('index.html')).window.document;
 const root=doc.querySelector('#ebook-matcher-root');
 const form=doc.querySelector('#questionnaire-box');
 const loading=doc.querySelector('#loading-box');
 assert.ok(root&&form&&loading);
 assert.equal(doc.querySelectorAll('#ebook-matcher-root').length,1);
 assert.equal(root.previousElementSibling,form,'Bookworms must be directly after the original watch matching field');
 assert.equal(root.nextElementSibling,loading,'Matching loading/result UI follows Bookworms untouched');
 const ask=doc.getElementById('search-box');
 assert.ok(ask,'The unchanged Search/Ask AI card must still exist');
 assert.ok(root.compareDocumentPosition(ask)&doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,'Bookworms must NOT be inside or below Ask AI');
 // Latest News is created dynamically. Its only changed line is the mount anchor.
 const news=read('latest-news.js');
 assert.match(news,/const primaryAction=document\.getElementById\('ebook-matcher-root'\)/);
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
 assert.match(home,/ebooks\/ebook-matcher\.css\?v=20260926-book-crest4/);
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
 assert.equal(root.previousElementSibling.id,'questionnaire-box');
 assert.equal(root.nextElementSibling.id,'loading-box');
 assert.ok(doc.getElementById('questionnaire-box').compareDocumentPosition(root)&doc.defaultView.Node.DOCUMENT_POSITION_FOLLOWING);
 assert.ok(js.includes("const initiallyOpen=!(document.body.classList.contains('page-home')||location.pathname==='/'||location.pathname==='/index.html')||location.hash==='#ebook-matcher-root'"));
 assert.ok(js.includes("return '<details class=\"ebook-fold\"'+(initiallyOpen?' open':'')+'><summary>"));
 assert.ok(js.includes("window.addEventListener('hashchange'"));
 assert.ok(css.includes('Homepage-only compact book-matching card'));
 assert.ok(css.includes('html body.page-home #ebook-matcher-root .ebook-fold>summary'));
 assert.doesNotMatch(read('kids/index.html'),/ebook-matcher-root/);
});


test('Home repairs stale placement under Ask AI and renders a real compact dropdown form',async()=>{
 const html='<!doctype html><html lang="en"><body class="page-home"><main><article id="questionnaire-box"></article><article id="loading-box"></article><article id="search-box"></article><section id="ebook-matcher-root"></section></main></body></html>';
 const win=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 win.eval(read('ebooks/ebook-matcher.js'));
 win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const ebook=win.document.getElementById('ebook-matcher-root');
 assert.equal(ebook.previousElementSibling.id,'questionnaire-box');
 assert.equal(ebook.nextElementSibling.id,'loading-box');
 assert.equal(ebook.querySelectorAll('details.ebook-fold').length,1);
 assert.equal(ebook.querySelector('details.ebook-fold').open,false,'Adult Home must begin collapsed');
 ebook.querySelector('details.ebook-fold').open=true;
 const dropdowns=[...ebook.querySelectorAll('select[data-ebook-select]')];
 assert.deepEqual(dropdowns.map(x=>x.dataset.ebookSelect),['format','mood','genre','pace','length','era','access']);
 assert.ok(ebook.querySelector('[data-ebook-match]'),'The original shared-match mechanism remains present');
 assert.equal(ebook.querySelectorAll('.ebook-chips').length,0,'Home uses compact selects, not hundreds of chips');
 const format=ebook.querySelector('[data-ebook-select="format"]');
 assert.ok([...format.options].some(x=>x.value==='ebook'));
 assert.ok([...format.options].some(x=>x.value==='audiobook'));
 assert.ok([...format.options].some(x=>x.value==='magazine'));
 format.value='magazine';
 format.dispatchEvent(new win.Event('change',{bubbles:true}));
 assert.equal(JSON.parse(win.localStorage.getItem('match_ebook_criteria_v1')).format,'magazine','Magazine choice must reach the same matching preferences');
 const genre=ebook.querySelector('[data-ebook-select="genre"]');
 genre.value='fantasy';
 genre.dispatchEvent(new win.Event('change',{bubbles:true}));
 assert.equal(JSON.parse(win.localStorage.getItem('match_ebook_criteria_v1')).genre,'fantasy');
 const picks=ebook.querySelector('details.ebook-home-picks');
 assert.ok(picks&&!picks.open,'Top reading picks remain available without expanding the initial form');
 win.document.dispatchEvent(new win.Event('matchapp:langchange'));
 assert.equal(ebook.querySelector('[data-ebook-select="format"]').value,'magazine','Language change preserves chosen medium');
 assert.equal(ebook.querySelector('[data-ebook-select="genre"]').value,'fantasy','Language change preserves chosen genre');
 win.close();
});


test('Dedicated Bookworms hub retains its original rich chip controls',async()=>{
 const win=new JSDOM('<!doctype html><html><body class="ebook-page"><main><section id="ebook-matcher-root"></section></main></body></html>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only'}).window;
 win.eval(read('ebooks/ebook-matcher.js'));
 win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const root=win.document.getElementById('ebook-matcher-root');
 assert.equal(root.querySelector('details.ebook-fold').open,true);
 assert.ok(root.querySelectorAll('button[data-ebook-field]').length>50,'Hub must retain original detailed selection chips');
 assert.equal(root.querySelectorAll('select[data-ebook-select]').length,0);
 assert.equal(root.querySelector('.ebook-home-picks'),null);
 win.close();
});
