'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page='guides/worldwide-entertainment-discovery/index.html';
const url='https://matchapp.tv/guides/worldwide-entertainment-discovery/';
const supported=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];

test('global discovery guide regenerates deterministically with all actual interface languages',()=>{
 const before=read(page);
 execFileSync(process.execPath,['tools/build-world-discovery-guide.js'],{cwd:root,stdio:'pipe'});
 const after=read(page);
 assert.equal(after,before,'Generated global guide must be committed exactly as produced');
 for(const lang of supported){
  assert(after.includes('lang="'+lang+'"'),lang+' language section is absent');
  assert(after.includes('/?lang='+lang),'Supported language preference link missing: '+lang);
 }
 assert.match(after,/<html lang="en">/);
 assert.equal((after.match(/class="lang-card"/g)||[]).length,14);
 assert.match(after,/<section class="lang-card" id="lang-ar" lang="ar" dir="rtl">/);
});

test('one useful indexable original guide, one correct canonical, no fabricated translated alternates',()=>{
 const html=read(page);
 assert.match(html,/<link rel="canonical" href="https:\/\/matchapp\.tv\/guides\/worldwide-entertainment-discovery\/">/);
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 assert(!/<link rel="alternate"[^>]+hreflang=/i.test(html));
 assert(!/<meta name="keywords"/i.test(html),'Avoid keyword stuffing on the page');
 assert.match(html,/Audiobook links are checked against title and author/);
 assert.match(html,/Content and store availability vary by region/);
 assert.match(html,/\/collections\/indian-cinema\//);
 assert.match(html,/\/guides\/peliculas-series-tendencia-mexico-septiembre-2026\//);
 assert.match(html,/\/guides\/filmes-series-em-alta-brasil-setembro-2026\//);
 const js=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
 assert(js,'JSON-LD missing');
 const schema=JSON.parse(js[1]);
 assert(schema['@graph'].some(x=>x['@type']==='WebPage'&&x.url===url));
});

test('global route is internally linked, sitemapped and retained by the scheduled refresh',()=>{
 const home=read('index.html');
 const sitemap=read('sitemap.xml');
 const generator=read('tools/update-sitemap.js');
 const workflow=read('.github/workflows/midnight-content-rotation.yml');
 assert(home.includes('href="/guides/worldwide-entertainment-discovery/"'));
 assert(sitemap.includes('<loc>'+url+'</loc>'));
 assert(generator.includes("guides/worldwide-entertainment-discovery/"));
 assert(workflow.includes('node tools/build-world-discovery-guide.js'));
 assert(workflow.includes('git add -A -- guides/worldwide-entertainment-discovery'));
});

test('news source summaries retain noindex while legitimate news hub stays indexable',()=>{
 const s=read('tools/refresh-news-rss.js');
 assert.match(s,/name="robots" content="noindex,follow"/);
 assert.match(s,/name="description" content="Verified film, TV, music/);
});

test('existing regression harnesses cover adult matching, books, audio, Ask AI and touch viewports without Android emulator',()=>{
 const triple=read('.github/workflows/matching-ai-triple-audit.yml');
 assert.match(triple,/one-complete-pass:/);
 assert.doesNotMatch(triple,/matrix\.pass|pass:\s*\[1,\s*2,\s*3\]/,'run one complete audit per workflow invocation');
 assert(triple.includes('npm test'));
 assert(triple.includes('tools/live-production-smoke.cjs'));
 assert(triple.includes('tools/live-production-deep-matching.cjs'));
 assert(triple.includes('tools/mobile-runtime-smoke.cjs'));
 const live=read('tools/live-production-smoke.cjs');
 const deep=read('tools/live-production-deep-matching.cjs');
 assert(/ebook|e-book/i.test(live));
 assert(/ask ai|aiQuestion|ask-ai/i.test(live));
 assert(/audiobook/i.test(deep));
 assert(/kids/i.test(deep));
});
