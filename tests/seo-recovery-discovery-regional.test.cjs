'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{JSDOM}=require('jsdom');
const {regionalBrand}=require('../tools/finalize-brand.js'),{renderGuideLinks}=require('../tools/search-guide-links.cjs');
const root=path.resolve(__dirname,'..');
test('regional brand normalization reuses the wordmark and removes duplicates without changing navigation',()=>{
 for(const count of [1,2]){const dom=new JSDOM('<header class="site-header"><a href="/" aria-label="MatchApp Ai"><img class="wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg" alt="MatchApp Ai">'+(count===2?'<img class="matchapp-wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg">':'')+'</a><nav><a href="/br/">Brasil</a></nav></header>');
 const brand=dom.window.document.querySelector('header>a'),next=regionalBrand(brand);brand.outerHTML=next;
 assert.equal(dom.window.document.querySelectorAll('header>a img').length,1);assert.equal(dom.window.document.querySelectorAll('header>a .matchapp-wordmark').length,1);
 assert.equal(dom.window.document.querySelector('nav a').getAttribute('href'),'/br/');assert.equal(regionalBrand(dom.window.document.querySelector('header>a')),next);dom.window.close()}
});
test('every regional page has one bounded wordmark, while normal Home is outside the regional rewrite',()=>{
 for(const code of ['au','br','us','uk','ca','jp']){const dom=new JSDOM(fs.readFileSync(path.join(root,code,'index.html'),'utf8'));assert.equal(dom.window.document.querySelectorAll('.site-header .matchapp-brand-link img').length,1,code);dom.window.close()}
 const dom=new JSDOM('<header class="app-header"><a href="/"><img class="wordmark" src="/assets/brand/matchapp-tv-ai-v2.svg"></a></header>');assert.equal(regionalBrand(dom.window.document.querySelector('a')),null);dom.window.close();
});
test('worldwide navigation exposes crawlable links to every submitted featured, family and awareness guide',()=>{
 const sitemap=new JSDOM(fs.readFileSync(path.join(root,'sitemap.xml'),'utf8'),{contentType:'text/xml'}),output=new JSDOM(renderGuideLinks()),page=new JSDOM(fs.readFileSync(path.join(root,'guides/worldwide-entertainment-discovery/index.html'),'utf8'));
 const paths=[...sitemap.window.document.querySelectorAll('loc')].map(n=>new URL(n.textContent).pathname).filter(p=>/^\/(?:featured\/|kids\/titles\/|awareness\/)/.test(p));
 for(const p of paths){assert.ok([...output.window.document.querySelectorAll('a[href]')].some(a=>a.getAttribute('href')===p),p);assert.ok([...page.window.document.querySelectorAll('a[href]')].some(a=>a.getAttribute('href')===p),p)}
 assert.ok(paths.length>22);sitemap.window.close();output.window.close();page.window.close();
});
test('guide navigation excludes noindex and other hosts and escapes visible heading text',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-guide-links-'));
 try{fs.mkdirSync(path.join(dir,'featured','public'),{recursive:true});fs.mkdirSync(path.join(dir,'featured','private'),{recursive:true});
 fs.writeFileSync(path.join(dir,'sitemap.xml'),'<urlset><url><loc>https://matchapp.tv/featured/public/</loc></url><url><loc>https://matchapp.tv/featured/private/</loc></url><url><loc>https://other.example/featured/public/</loc></url></urlset>');
 fs.writeFileSync(path.join(dir,'featured/public/index.html'),'<h1>Title &amp; &lt;script&gt; example</h1>');fs.writeFileSync(path.join(dir,'featured/private/index.html'),'<meta name="robots" content="noindex"><h1>Private</h1>');
 const html=renderGuideLinks(dir),dom=new JSDOM(html);assert.equal(dom.window.document.querySelectorAll('a').length,1);assert.equal(dom.window.document.querySelectorAll('script').length,0);assert.equal(dom.window.document.querySelector('a').textContent,'Title & <script> example');assert.ok(!html.includes('/featured/private/'));dom.window.close();
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
