'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {createRequire}=require('node:module');
const {JSDOM}=require('jsdom');
const {cinemaAssets}=require('../tools/finalize-brand.js');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const page='guides/worldwide-entertainment-discovery/index.html';
const url='https://matchapp.tv/guides/worldwide-entertainment-discovery/';
const supported=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];

function renderGuide(){
 const filename=path.join(root,'tools/build-world-discovery-guide.js'),target=path.join(root,page),writes=[];
 const requireFromGenerator=createRequire(filename);
 vm.runInNewContext(read('tools/build-world-discovery-guide.js'),{
  __dirname:path.dirname(filename),console:{log(){}},
  require(name){
   if(name==='node:fs')return {
    mkdirSync(dir){assert.equal(dir,path.dirname(target));},
    writeFileSync(file,html,encoding){assert.equal(file,target);assert.equal(encoding,'utf8');writes.push(html);}
   };
   return requireFromGenerator(name);
  },
  fetch(){throw Error('Guide generation must not request sources in this fixture');}
 });
 assert.equal(writes.length,1,'capture the sole generated document without writing to the repository');
 return writes[0];
}

test('global discovery guide regenerates deterministically with all actual interface languages',()=>{
 const before=read(page);
 const after=renderGuide();
 assert.equal(renderGuide(),after,'identical source data produces identical documents');
 assert.equal(read(page),before,'the offline generator fixture never changes committed content');
 const expected=new JSDOM(cinemaAssets(before,page)),actual=new JSDOM(after);
 try{
  const a=actual.window.document,e=expected.window.document;
  assert.equal(a.body.outerHTML,e.body.outerHTML,'all committed source copy, paths, title data and scripts remain exact');
  assert.deepEqual([...a.head.children].map(node=>node.outerHTML),[...e.head.children].map(node=>node.outerHTML),'metadata and source assets remain exact after shared presentation normalization');
  assert.equal(a.documentElement.className,'ma-reference');
  for(const selector of ['style[data-cinema-layer]','link[href^="/patches/reference-system.css?"]','link[href^="/patches/reference-pages.css?"]','script[defer][src^="/patches/reference-system.js?"]'])assert.equal(a.querySelectorAll(selector).length,1);
  assert.equal(new URL(a.querySelector('link[href^="/brand.css"]').href,'https://matchapp.tv').searchParams.get('frame'),'20261020-borderless1');
 }finally{expected.window.close();actual.window.close();}
 for(const lang of supported){
  assert(after.includes('lang="'+lang+'"'),lang+' language section is absent');
  assert(after.includes('/?lang='+lang),'Supported language preference link missing: '+lang);
 }
 assert.match(after,/<html class="ma-reference" lang="en">/);
 assert.equal((after.match(/class="lang-card"/g)||[]).length,14);
 assert.match(after,/<section class="lang-card" id="lang-ar" lang="ar" dir="rtl">/);
});

test('one useful indexable original guide, one correct canonical, and only verified regional hreflang alternates',()=>{
 const html=read(page);
 assert.match(html,/<link rel="canonical" href="https:\/\/matchapp\.tv\/guides\/worldwide-entertainment-discovery\/">/);
 assert.equal((html.match(/<h1>/g)||[]).length,1);
 const regional=[
  ['en-AU','/au/'],['pt-BR','/br/'],['en-US','/us/'],
  ['en-GB','/uk/'],['en-CA','/ca/'],['ja-JP','/jp/']
 ];
 const alternates=[...html.matchAll(/<link rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)">/gi)];
 assert.equal(alternates.length,7,'Only six verified regions plus x-default may be advertised');
 for(const [lang,route] of regional){
  assert(html.includes('<link rel="alternate" hreflang="'+lang+'" href="https://matchapp.tv'+route+'">'),lang+' regional alternate missing');
 }
 assert(html.includes('<link rel="alternate" hreflang="x-default" href="'+url+'">'));
 assert(!alternates.some(m=>/[?&]lang=/i.test(m[2])),'Do not advertise query-string language preferences as indexable alternates');
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
 const workflow=read('.github/workflows/unified-refresh.yml'),runner=read('tools/unified-refresh.cjs');
 assert(home.includes('href="/guides/worldwide-entertainment-discovery/"'));
 assert(sitemap.includes('<loc>'+url+'</loc>'));
 assert(generator.includes("guides/worldwide-entertainment-discovery/"));
 assert(workflow.includes('node tools/unified-refresh.cjs generate'));
 assert(runner.includes('tools/build-world-discovery-guide.js'));
 assert(runner.includes('guides/worldwide-entertainment-discovery'));
});

test('news source summaries retain noindex while legitimate news hub stays indexable',()=>{
 const s=read('tools/refresh-news-rss.js');
 assert.match(s,/name="robots" content="noindex,follow"/);
 assert.match(s,/name="description" content="Country-aware and language-aware film, TV, music/);
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
