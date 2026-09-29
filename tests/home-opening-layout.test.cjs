const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
test('fresh Home keeps Top Titles unfolded and resets other old folds',async()=>{
 const w=new JSDOM('<body class="page-home"><section id="trending-rail"></section><section id="ma-concierge"><h2>Find what to watch here</h2></section><section id="ma-ai-entry"><h2>Ask MatchApp Ai</h2></section><details id="cooking-home" open></details><section id="ebook-matcher-root"><details class="ebook-fold" open></details></section><div class="tg-entry"></div><details id="premiere-disclosure" open></details><details id="latest-news" open></details><div id="global-events"><details class="global-events-fold" open></details></div></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 w.localStorage.setItem('match_home_fold_state_v2',JSON.stringify({concierge:false,together:true,premiere:true,trending:true}));
 w.localStorage.setItem('match_lazy_mode','1');w.isUserLoggedIn=true;
 w.eval(read('lazy.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(r=>setTimeout(r,10));
 const d=w.document;
 assert.equal(d.querySelector('#ma-concierge').classList.contains('lazy-open'),false);
 assert.equal(d.querySelector('#latest-news').open,false);
 assert.equal(d.querySelector('.lazy-head[data-fold-key="trending"]'),null);
 assert.ok(d.querySelector('#trending-rail').classList.contains('lazy-open'));
 assert.equal(d.querySelector('.lazy-head[data-fold-key="together"]').getAttribute('aria-expanded'),'false');
 assert.equal(d.querySelector('#premiere-disclosure').open,false);
 assert.equal(d.querySelector('#ma-ai-entry').classList.contains('lazy-open'),false);
 assert.equal(d.querySelector('#cooking-home').open,false);
 assert.equal(d.querySelector('.ebook-fold').open,false);
 d.querySelector('.lazy-head[data-fold-key="askai"]').click();
 assert.ok(d.querySelector('#ma-ai-entry').classList.contains('lazy-open'));
 assert.equal(d.querySelector('#ma-concierge').classList.contains('lazy-open'),false);
 const weekly=d.createElement('details');weekly.id='weekly-pick-disclosure';weekly.open=true;d.body.append(weekly);
 await new Promise(r=>setTimeout(r,10));assert.equal(weekly.open,false);
 assert.ok(d.querySelector('#trending-rail').classList.contains('lazy-open'));w.close();
});
test('reading remains independent of the watch and Ask AI panels',async()=>{
 const w=new JSDOM('<body class="page-home"><main><section id="ma-concierge"><div id="ma-panel-match"><article id="questionnaire-box"></article><section id="ebook-matcher-root"></section></div><div id="ma-panel-ask"></div></section><article id="loading-box"></article></main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 w.eval(read('ebooks/ebook-matcher.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(r=>setTimeout(r,10));const root=w.document.querySelector('#ebook-matcher-root');
 assert.equal(root.previousElementSibling.id,'ma-concierge');assert.equal(root.closest('#ma-concierge'),null);assert.equal(root.querySelector('.ebook-fold').open,false);w.close();
});

test('Together fold heading repairs adjacency without moving or changing its sponsored slot',async()=>{
 const w=new JSDOM('<body class="page-home"><main><div class="tg-entry"></div><div class="ma-together-ad"><ins class="adsbygoogle"></ins></div><details id="premiere-disclosure"></details></main></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 w.eval(read('lazy.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(r=>setTimeout(r,10));
 const d=w.document,card=d.querySelector('.tg-entry'),ad=d.querySelector('.ma-together-ad'),head=d.querySelector('.lazy-head[data-fold-key="together"]');
 ad.after(head);head.click();
 assert.equal(head.nextElementSibling,card);assert.equal(card.nextElementSibling,ad);assert.equal(ad.nextElementSibling.id,'premiere-disclosure');
 assert.equal(d.querySelectorAll('ins.adsbygoogle').length,1);w.close();
});
test('fold grid has one uniform arrow, full-width cooking, and aligned left artwork',()=>{
 const css=read('home-fold-grid.css');assert.match(css,/grid-template-columns:30px minmax\(0,1fr\) 28px/);
 assert.match(css,/#cooking-home>summary/);assert.match(css,/position:static!important;inset:auto!important/);
 assert.match(css,/stroke-linecap/);assert.match(css,/\.ge-sum-chev/);
 assert.doesNotMatch(css,/adsbygoogle|ad-banner|sidebar-ad|ma-together-ad/);
});
test('adult density excludes canonical Kids routes and keeps natural covers and real back links',()=>{
 const css=read('adult-page-compact.css');assert.match(css,/:has\(link\[rel="canonical"\]\[href\*="\/kids"\]\)/);
 assert.match(css,/object-fit:contain!important/);assert.match(css,/\.ma-back-button/);
 assert.match(read('cooking/index.html'),/href="\/" class="ma-back-button"/);
 assert.match(read('page-shell.js'),/function polishBackLinks\(\)/);
});
