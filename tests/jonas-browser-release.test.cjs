'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const load=(rel)=>fs.readFileSync(path.join(ROOT,rel),'utf8');
const page=load('jonas/index.html');
const base=load('index.html');
const nativeJs=load('jonas/jonas.js');
const css=load('jonas/experience.css');
const browserCss=load('jonas/browser.css');
const portalCss=load('jonas/entry.css');

test('browser Jonas has its own canonical, original analytics, and secure first-party AI routing',()=>{
 const dom=new JSDOM(page,{url:'https://matchapp.tv/jonas/'});
 const doc=dom.window.document;
 assert.equal(doc.title,'Discover with Jonas | MatchApp Ai');
 assert.equal(doc.querySelectorAll('h1').length,1,'Google receives one document-level H1');
 assert.equal(doc.querySelector('#discover-heading').tagName,'H2');
 assert.equal(doc.querySelector('link[rel="canonical"]')?.href,'https://matchapp.tv/jonas/');
 assert.equal(doc.querySelector('meta[name="robots"]')?.content,'index,follow,max-image-preview:large');
 assert.ok(page.includes('GTM-M7J3NNBN'));
 assert.match(nativeJs,/window\.MATCHAPP_BROWSER && !window\.MatchAppNativeAI/);
 assert.match(nativeJs,/window\.location\.assign\("\/discover\.html\?q=" \+ encodeURIComponent\(text\) \+ "&focus=start"\)/);
 assert.ok(fs.existsSync(path.join(ROOT,'discover.html')));
 assert.ok(load('discover.js').includes("getQueryParam('q')"));
 assert.doesNotMatch(page,/OPENROUTER_API_KEY|SUPABASE_SERVICE_ROLE_KEY|GROQ_API_KEY/);
 dom.window.close();
});
test('all six Discover tiles use different bundled vectors, readable captions and unchanged prompts',()=>{
 const dom=new JSDOM(page);
 const cards=[...dom.window.document.querySelectorAll('.discovery-grid .discovery-card')];
 assert.equal(cards.length,6);
 assert.equal(new Set(cards.map(c=>c.dataset.art)).size,6);
 for(const c of cards){
  assert.ok(c.querySelector('.discovery-art svg'));
  assert.ok(c.querySelector('.discovery-caption strong')?.textContent.trim());
  assert.ok(c.querySelector('.discovery-caption small')?.textContent.trim());
  assert.ok(c.dataset.prompt.length>28);
 }
 assert.match(css,/\.discovery-grid \.discovery-card/);
 assert.match(css,/@media\(max-width:355px\)/);
 dom.window.close();
});
test('all assets in the standalone browser route are self-contained and paths resolve',()=>{
 const dom=new JSDOM(page,{url:'https://matchapp.tv/jonas/'});
 const doc=dom.window.document;
 const local=[...doc.querySelectorAll('link[href],script[src],img[src]')].map(x=>x.getAttribute('href')||x.getAttribute('src'))
  .filter(src=>src&&!src.startsWith('https:')&&!src.startsWith('data:')&&!src.startsWith('#'));
 for(const src of local){
  const clean=src.split('?')[0];
  const rel=clean.startsWith('/')?clean.slice(1):'jonas/'+clean;
  assert.ok(fs.existsSync(path.join(ROOT,rel)),rel+' must exist');
 }
 for(const f of ['rest','aa','oh','ee','smile','blink']){
  const file=path.join(ROOT,'jonas/faces/jonas',f+'.jpg');
  assert.ok(fs.existsSync(file));assert.ok(fs.statSync(file).size>10000);
 }
 dom.window.close();
});
test('responsive edition keeps original matching, plans and browser-only Kids Mode reachable',()=>{
 const dom=new JSDOM(page,{url:'https://matchapp.tv/jonas/'});
 const doc=dom.window.document;
 assert.equal(doc.querySelector('.browser-link-primary')?.getAttribute('href'),'/');
 assert.equal(doc.querySelector('.browser-kids')?.getAttribute('href'),'/kids/');
 assert.equal(doc.querySelector('.primary-nav a[href="/profile/profile.html"]')?.textContent,'My space');
 assert.equal(doc.querySelector('.web-plan-actions a[href="/pricing/pricing.html"]')!==null,true);
 assert.match(browserCss,/@media\(max-width:700px\)/);
 assert.match(browserCss,/@media\(min-width:900px\)/);
 assert.match(browserCss,/\.discovery-grid \.discovery-card/);
 assert.ok(fs.existsSync(path.join(ROOT,'kids/index.html')));
 assert.ok(fs.existsSync(path.join(ROOT,'pricing/pricing.html')));
 dom.window.close();
});
test('original Homepage navigation advertises Jonas without moving Match Together or AdSense',()=>{
 assert.ok(base.includes('href="/jonas/"'));
 assert.ok(load('matchapp-ia.js').includes("link('Jonas experience','/jonas/'"));
 const ix=base.indexOf('class="ma-jonas-web-entry"');
 const together=base.indexOf('<!-- MATCH TOGETHER ENTRY -->',ix);
 const sponsored=base.indexOf('data-ad-slot="2595698117"',together);
 assert.ok(ix>=0&&together>ix&&sponsored>together);
 assert.match(portalCss,/\.ma-jonas-web-entry/);
 const generator=load('tools/update-sitemap.js');
 assert.ok(generator.includes('${SITE}/jonas/'));
 assert.ok(load('sitemap.xml').includes('https://matchapp.tv/jonas/'));
});
