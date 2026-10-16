'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {execFileSync}=require('node:child_process');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(ROOT,'tools/refresh-news-rss.js'),'utf8');
const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/brand-normalize.yml'),'utf8');
// Evaluate only pure renderer definitions. Never invoke the network/archive owner.
const entry=source.search(/^\(async\b/m);
assert.ok(entry>0,'the news owner entry point must be located before evaluation');
const render=vm.runInNewContext(source.slice(0,entry)+'\n;({page,hub})',{
 require,__dirname:path.join(ROOT,'tools'),URL,URLSearchParams,AbortController,console,
 fetch:()=>{throw new Error('Renderer tests must not access upstream feeds');}
});
function fixture(language='en',category='entertainment'){
 return {
  id:'template-regression-fixture',title:'Publisher source template test',
  description:'A renderer test fixture, never published.',language,category,
  event_type:'Release',person:'',source:'Example Publisher',country:'GB',
  source_domain:'example.org',source_home:'https://example.org',
  url:'https://example.org/report',landing_url:'https://matchapp.tv/news/?story=template-regression-fixture',
  matchapp_url:'https://matchapp.tv/news/articles/template-regression-fixture/',
  discovered_at:'2026-10-16T10:00:00Z',published_at:'2026-10-16T09:00:00Z',timestamp_kind:'published',
  seo:{meta_title:'Publisher source template test | MatchApp Ai',
   meta_description:'A renderer test fixture, never published.',keywords:['source fixture'],
   short_tail:[],entity_keywords:[],trend_keywords:[],seo_generated_at:'2026-10-16T10:00:00Z'}
 };
}
const assetSelectors=['link[href^="/brand.css"]','script[src^="/patches/jonas-adult-page.js"]','script[src^="/patches/immersive-feedback-20261014.js"]'];

test('news articles retain exactly the shared assets already approved for their hub',()=>{
 const hub=new JSDOM(render.hub([],fixture().discovered_at));
 try{
  for(const language of ['en','pt','es','ja']){
   const article=new JSDOM(render.page(fixture(language)));
   try{
    for(const selector of assetSelectors){
     const expected=hub.window.document.querySelector(selector);
     assert.ok(expected,'hub owns '+selector);
     const matches=article.window.document.querySelectorAll(selector);
     assert.equal(matches.length,1,language+' must include one '+selector);
     assert.equal(matches[0].outerHTML,expected.outerHTML,language+' must preserve the approved cache key and attributes');
    }
   }finally{article.window.close();}
  }
 }finally{hub.window.close();}
});

test('news template repair preserves source attribution, noindex, canonical and dated structured data',()=>{
 for(const category of ['entertainment','world','sports']){
  const item=fixture('en',category);
  if(category==='sports')item.timestamp_kind='discovered';
  const dom=new JSDOM(render.page(item)),doc=dom.window.document;
  try{
   assert.equal(doc.querySelector('meta[name="robots"]').content,'noindex,follow');
   assert.equal(doc.querySelector('link[rel="canonical"]').getAttribute('href'),item.matchapp_url);
   assert.equal(doc.querySelector('a[rel~="external"]').getAttribute('href'),item.url);
   assert.match(doc.querySelector('a[rel~="external"]').textContent,/Example Publisher/);
   const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'][0];
   assert.equal(graph.citation,item.url);
   assert.equal(graph.dateModified,item.seo.seo_generated_at);
   if(category==='sports'){
    assert.equal(graph.mainEntity.datePublished,undefined,'discovery time is not a publisher date');
    assert.match(doc.body.textContent,/First indexed by news discovery/);
   }
  }finally{dom.window.close();}
 }
});

test('a generated article is already a no-op for the unchanged brand normalizer',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-brand-contract-'));
 try{
  fs.mkdirSync(path.join(temp,'tools'));
  fs.copyFileSync(path.join(ROOT,'tools/finalize-brand.js'),path.join(temp,'tools/finalize-brand.js'));
  const article=path.join(temp,'news/articles/fixture/index.html');
  fs.mkdirSync(path.dirname(article),{recursive:true});
  const html=render.page(fixture());
  fs.writeFileSync(article,html);
  const output=execFileSync(process.execPath,[path.join(temp,'tools/finalize-brand.js')],{
   encoding:'utf8',timeout:30000,
   env:{...process.env,NODE_PATH:[path.join(ROOT,'node_modules'),process.env.NODE_PATH].filter(Boolean).join(path.delimiter)}
  });
  assert.match(output,/normalized on 0 pages/);
  assert.equal(fs.readFileSync(article,'utf8'),html,'news regeneration must not recreate Brand Bot churn');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});

test('Brand Bot joins the existing serialized publisher without changing its triggers',()=>{
 assert.match(workflow,/concurrency:\s*\n\s+group: matchapp-content-publish\s*\n\s+cancel-in-progress: false/);
 assert.doesNotMatch(workflow,/brand-normalize-main|\bcron:/);
 assert.match(workflow,/if: github\.ref == 'refs\/heads\/main'/);
 assert.match(workflow,/fetch-depth: 0/);
 assert.match(workflow,/contents: write\s*\n\s+actions: write/);
 const paths=[...workflow.matchAll(/^      - '([^']+)'$/gm)].map(m=>m[1]);
 assert.deepEqual(paths,['**/*.html','tools/finalize-brand.js','tools/build-kids-pages.js',
  'tools/build-world-discovery-guide.js','tools/refresh-news-rss.js','tools/build-global-events.js',
  'assets/brand/matchapp-tv-ai-v2.svg','brand.css','.github/workflows/brand-normalize.yml']);
});

test('every bounded Brand publication attempt rebuilds and passes the complete existing gates',()=>{
 const start=workflow.indexOf('for attempt in 1 2 3; do');
 const commit=workflow.indexOf("git commit -m 'Normalize public MatchApp branding");
 assert.ok(start>0&&commit>start);
 const attempt=workflow.slice(start,commit);
 for(const gate of ['git fetch --no-tags origin main','git reset --hard origin/main',
  'npm ci --ignore-scripts','node tools/finalize-brand.js','git diff --check',
  'node --test --test-isolation=none tests/adsense-lock.test.cjs',
  'node tools/check-content-rotation.js','npm test','npm run audit:site','npm run build'])assert.ok(attempt.includes(gate),gate);
 assert.match(attempt,/kids\/\*\|android-studio\/\*/);
 assert.match(attempt,/git diff --quiet --diff-filter=ADRT/);
 assert.match(attempt,/git diff --binary \| cmp -s/);
 assert.match(attempt,/git add --update -- '\*\.html'/);
 assert.doesNotMatch(workflow,/git\s+rebase\b|git\s+push[^\n]*--force|git\s+add\s+-A|continue-on-error/);
 assert.match(workflow,/git merge-base --is-ancestor "\$published" origin\/main/);
 assert.match(workflow,/Push failed without a newer main; do not blindly retry/);
});

test('Brand Bot hands off Pages once only after a changed commit and preserves failure evidence',()=>{
 assert.match(workflow,/if git diff --quiet; then[\s\S]*?changed=0[\s\S]*?exit 0/);
 assert.equal((workflow.match(/gh workflow run pages-deploy\.yml --ref main/g)||[]).length,1);
 assert.match(workflow,/if: steps\.publish\.outputs\.changed == '1'/);
 assert.doesNotMatch(workflow,/gh workflow run (?:indexnow|news-refresh|midnight-content-rotation)/);
 assert.match(workflow,/if: failure\(\)\s*\n\s+uses: actions\/upload-artifact@v4/);
 assert.match(workflow,/candidate\.patch/);
 assert.match(workflow,/base-sha\.txt/);
});

test('article navigation stays out of the fixed top-right companion area without changing shared UI',()=>{
 const dom=new JSDOM(render.page(fixture()));
 try{
  assert.ok(dom.window.document.querySelector('header.app-header.news-article-header'));
  const css=[...dom.window.document.querySelectorAll('style')].map(s=>s.textContent).join('\n');
  assert.match(css,/\.news-article-header\{justify-content:left!important;gap:12px!important\}/);
  assert.match(css,/\.news-article-header #matchapp-kids-entry\{margin-inline-start:0!important\}/);
  assert.equal(dom.window.document.querySelector('header a').getAttribute('href'),'/');
 }finally{dom.window.close();}
});
