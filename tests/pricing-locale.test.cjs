const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
test('purchase labels follow Brazilian Portuguese and English without replacing billing controls or prices',()=>{
 const dom=new JSDOM('<section id="purchase-hub"><h2 id="purchase-hub-title"></h2><p></p><div class="purchase-tabs"><button id="purchase-tab-matches"></button><button id="purchase-tab-credits"></button></div><section id="match-packs-section"><h3></h3><p></p><article class="purchase-pack"><span class="purchase-badge"></span><small></small><b>$2.99</b><button data-match-pack="matches_25" onclick="buyMatches(\'matches_25\')"></button></article></section><section id="ask-ai-credits"><h3></h3><p></p></section></section>',{runScripts:'outside-only'});
 const w=dom.window,button=w.document.querySelector('[data-match-pack]');w.MATCH_LANG='pt-BR';
 w.eval(fs.readFileSync('pricing-locale.js','utf8'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(button.textContent,'Comprar Matches');assert.equal(w.document.querySelector('.purchase-badge').textContent,'Mais popular');
 assert.equal(w.document.querySelector('b').textContent,'$2.99');assert.equal(button.getAttribute('onclick'),"buyMatches('matches_25')");
 w.MATCH_LANG='en';w.document.dispatchEvent(new w.Event('matchapp:langchange'));
 assert.equal(button.textContent,'Buy Matches');assert.equal(w.document.querySelector('[data-match-pack]'),button);
 dom.window.close();
});
