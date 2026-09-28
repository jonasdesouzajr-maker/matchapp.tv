const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(p,'utf8');
test('fresh Home resets old folds, supports manual reopening and late weekly content',async()=>{
 const w=new JSDOM('<body class="page-home"><section id="trending-rail"></section><section id="ma-concierge"><h2>Find what to watch here</h2></section><div class="tg-entry"></div><details id="premiere-disclosure" open></details><details id="latest-news" open></details><div id="global-events"><details class="global-events-fold" open></details></div></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 w.localStorage.setItem('match_home_fold_state_v2',JSON.stringify({concierge:false,together:true,premiere:true,trending:true}));
 w.localStorage.setItem('match_lazy_mode','1');w.isUserLoggedIn=true;
 w.eval(read('lazy.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(r=>setTimeout(r,10));
 const d=w.document;
 assert.ok(d.querySelector('#ma-concierge').classList.contains('lazy-open'));
 assert.ok(d.querySelector('#latest-news').open);
 for(const key of ['trending','together'])assert.equal(d.querySelector(`.lazy-head[data-fold-key="${key}"]`).getAttribute('aria-expanded'),'false');
 assert.equal(d.querySelector('#premiere-disclosure').open,false);
 d.querySelector('.lazy-head[data-fold-key="trending"]').click();
 assert.ok(d.querySelector('#trending-rail').classList.contains('lazy-open'));
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
