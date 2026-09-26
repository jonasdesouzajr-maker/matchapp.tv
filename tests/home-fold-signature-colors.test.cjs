'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {JSDOM}=require('jsdom');
const base=path.join(__dirname,'..'),read=name=>fs.readFileSync(path.join(base,name),'utf8');
const themes=[
 ['watch','.lazy-head[data-fold-key="concierge"]'],
 ['together','.lazy-head[data-fold-key="together"]'],
 ['news','#latest-news>summary'],
 ['premiere','#premiere-disclosure>summary'],
 ['weekly','#weekly-pick-disclosure>summary'],
 ['events','#global-events>.global-events-fold>.global-events-summary'],
 ['music','#swifties-spotify .swifties-fold'],
 ['filters','.match-more-filters>summary'],
 ['guides','.seo-fold-summary'],
 ['picks','#ebook-matcher-root .ebook-home-picks>summary'],
 ['saved','#ebook-matcher-root .ebook-saved>summary'],
 ['share','.share-how>summary']
];

test('Every prominent fold has a one-off original, self-contained MatchApp SVG crest',()=>{
 const digests=new Set();
 for(const [name] of themes){
  const svg=read('assets/brand/matchapp-fold-'+name+'.svg');
  const doc=new JSDOM(svg,{contentType:'image/svg+xml'}).window.document;
  assert.equal(doc.documentElement.localName,'svg',name);
  assert.equal(doc.documentElement.getAttribute('viewBox'),'0 0 96 96',name);
  assert.match(doc.querySelector('title')?.textContent||'',/MatchApp .* signature crest/,name);
  assert.match(doc.querySelector('desc')?.textContent||'',/Original MatchApp/,name);
  assert.ok(doc.querySelectorAll('path').length>=3,name+' needs handcrafted shapes, not a stock emoji');
  assert.equal(doc.querySelectorAll('image,use,foreignObject,script,style').length,0,name+' must work offline without remote fonts/images');
  digests.add(crypto.createHash('sha256').update(svg).digest('hex'));
 }
 assert.equal(digests.size,themes.length,'No duplicate generic icons or recolored clones');
 assert.match(read('assets/brand/matchapp-bookworms-crest.svg'),/MatchApp Bookworms crest/,'Original Bookworms icon unchanged');
});

test('Every adult Home fold has a different filled hue with its own mapped signature crest',()=>{
 const css=read('fold-colors.css'),colors=new Set();
 for(const [name,selector] of themes){
  const prefix='html body.page-home '+selector+'{';
  const from=css.indexOf(prefix);
  assert.ok(from>=0,'Missing fold: '+name);
  const to=css.indexOf('\n}',from);
  const rule=css.slice(from,to);
  const color=rule.match(/--ma-fold-a:(#[0-9A-Fa-f]{6})/);
  assert.ok(color,name+' has no distinctive colored gradient');
  colors.add(color[1].toLowerCase());
  assert.ok(rule.includes('matchapp-fold-'+name+'.svg'),name+' must not reuse a generic icon');
 }
 assert.equal(colors.size,themes.length,'Every independently foldable area has its own color');
 assert.match(css,/linear-gradient\(115deg,var\(--ma-fold-a\)/);
 assert.match(css,/border:1\.5px solid rgba\(249,213,139/);
 assert.match(css,/object-fit:contain!important/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('Latest News has an interactive native fold with its original blue-violet crest',()=>{
 const news=read('latest-news.js'),css=read('fold-colors.css'),old=read('matchapp-ia.css');
 assert.match(news,/section\.open=true/);
 assert.match(news,/section\.id='latest-news'/);
 assert.match(css,/#latest-news>summary::before\{/);
 assert.match(css,/content:""!important;display:block!important;flex:0 0 62px!important/);
 assert.match(css,/#5369AA,#394E91/);
 assert.match(css,/pointer-events:auto!important;cursor:pointer!important/);
 assert.match(css,/#latest-news:not\(\[open\]\)>\.ma-news-panel\{display:none!important/,'Closed news hides its panel even when older CSS forces display:block');
 assert.doesNotMatch(css,/#latest-news>summary::after\{\s*content:none!important;display:none!important/);
 assert.match(old,/#latest-news>summary::after\{/,'The existing arrow stays visible');
 assert.ok(old.indexOf('#latest-news>summary::before')>=0,'Known legacy CSS override must remain accounted for');
 const html=read('index.html');
 assert.ok(html.indexOf('fold-colors.css?v=20260926-newsfold1')>html.indexOf('matchapp-ia.css'));
 assert.ok(html.indexOf('fold-colors.css?v=20260926-newsfold1')>html.indexOf('frontend-polish.css'));
});

test('Generic globe, music and popcorn header glyphs stay retired, including daily event rebuilds',()=>{
 const html=read('index.html'),gen=read('tools/build-global-events.js'),lazy=read('lazy.js');
 const doc=new JSDOM(html).window.document;
 const ev=doc.querySelector('#global-events>.global-events-fold>.global-events-summary');
 assert.ok(ev);
 assert.ok(!ev.textContent.includes('🌍'));
 assert.match(gen,/class="ge-sum-label"/);
 assert.doesNotMatch(gen,/<span aria-hidden="true">🌍<\/span>/);
 const swift=doc.querySelector('#swifties-spotify .swifties-fold');
 assert.ok(swift);
 assert.doesNotMatch(swift.textContent,/🎵|✨|🫶/);
 assert.equal(swift.getAttribute('aria-controls'),'swifties-spotify-body');
 const together=doc.querySelector('.tg-entry-icon img');
 assert.ok(together);
 assert.equal(together.getAttribute('src'),'/assets/brand/matchapp-fold-together.svg');
 assert.equal(together.getAttribute('alt'),'');
 assert.doesNotMatch(lazy,/label:'(?:🎯|🍿)/);
 assert.match(lazy,/remember\(cfg\.key,open\)/,'Fold persistence must remain intact');
 assert.match(lazy,/function setSwift\(open\)/);
});

test('Bookworms keeps its own previous violet crest, immediate position and all seven select controls',async()=>{
 const html=read('index.html'),doc=new JSDOM(html).window.document;
 const root=doc.getElementById('ebook-matcher-root');
 assert.equal(root.previousElementSibling.id,'questionnaire-box');
 const js=read('ebooks/ebook-matcher.js');
 const win=new JSDOM('<html><body class="page-home"><main><article id="questionnaire-box"></article><section id="ebook-matcher-root"></section></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'}).window;
 win.eval(js);win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
 await new Promise(resolve=>setTimeout(resolve,0));
 const fold=win.document.querySelector('#ebook-matcher-root .ebook-fold');
 assert.equal(fold.open,false);
 assert.equal(fold.querySelector('img.ebook-brand-crest')?.getAttribute('src'),'/assets/brand/matchapp-bookworms-crest.svg');
 assert.equal(win.document.querySelectorAll('#ebook-matcher-root select[data-ebook-select]').length,7);
 const saved=fold.querySelector('.ebook-saved>summary .ebook-saved-crest');
 assert.equal(saved?.getAttribute('src'),'/assets/brand/matchapp-fold-saved.svg');
 assert.equal(saved?.getAttribute('alt'),'');
 win.close();
 assert.match(read('index.html'),/ebook-matcher\.js\?v=20260926-sourceclean1/);
 assert.doesNotMatch(read('kids/index.html'),/fold-colors\.css|matchapp-fold-/);
});

test('Fold color/brand changes cannot alter content or locked ad configuration',()=>{
 const html=read('index.html'),css=read('fold-colors.css');
 assert.match(html,/id="questionnaire-box"/);
 assert.match(html,/id="global-events"/);
 assert.match(html,/id="swifties-spotify"/);
 assert.match(html,/matchapp-fold-together\.svg/);
 assert.doesNotMatch(css,/\.ad-banner|adsbygoogle|\.sidebar-ad|\/kids\//i);
 assert.match(read('AGENTS.md'),/MANDATORY POST-CHANGE MATCHING, BOOKWORMS, AI AND ORIGINAL ART REGRESSION/);
});
