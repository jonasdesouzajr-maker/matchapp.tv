'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const kids=JSON.parse(read('tools/kids-guide-editorial.json'));
const events=JSON.parse(read('tools/global-events.json'));
const {name:brandName}=require('../tools/finalize-brand.js');
const targets=['events/asian-games-2026','events/brasil-game-show-2026','kids/titles/puffin-rock','kids/titles/rugrats'];
for(const route of targets)test('Older guide remains useful and indexable: '+route,()=>{
  const dom=new JSDOM(read(route+'/index.html')),d=dom.window.document;
  assert.equal(d.querySelectorAll('h1').length,1);
  assert.equal(d.querySelector('link[rel="canonical"]').href,'https://matchapp.tv/'+route+'/');
  assert.ok(!/noindex/i.test(d.querySelector('meta[name="robots"]')?.content||''));
  const main=d.querySelector('main');assert.ok(main);
  // Regression floor detects truncated output, not a Google word-count requirement.
  assert.ok(main.textContent.trim().split(/\s+/).length>=300,'Substantive visible guidance must survive regeneration');
  if(route.startsWith('kids/')){
    const slug=route.split('/').pop(),entry=kids[slug];
    assert.equal(d.querySelectorAll('.kids-editorial-guidance').length,1);
    for(const section of entry.sections)for(const paragraph of section.paragraphs)assert.ok(main.textContent.includes(brandName(paragraph,true)));
    assert.ok(d.querySelector('a[href="'+entry.source.url+'"]'));
    assert.equal(d.querySelectorAll('ins.adsbygoogle,script[src*="adsbygoogle"]').length,0);
    assert.ok(d.querySelector('a[href="/kids/#kids-match-stage"]'));
    const schema=JSON.parse(d.querySelector('script[type="application/ld+json"]').textContent);
    assert.equal(schema['@graph'].find(n=>n['@type']==='WebPage').dateModified,entry.updatedAt);
  }else{
    const event=events.find(e=>route.endsWith('/'+e.slug));
    assert.ok(event.visitorNotes.length>=5);
    for(const note of event.visitorNotes)assert.ok(main.textContent.includes(note));
    assert.equal(d.querySelector('[data-event-status]').textContent,'Ended');
    assert.ok(d.querySelector('a[href="'+event.official+'"]'));
  }
  dom.window.close();
});
test('Title guidance has distinct source-backed copy and survives the existing generator',()=>{
  assert.ok(kids['puffin-rock']&&kids.rugrats);
  const seen=new Set();
  for(const entry of Object.values(kids))for(const section of entry.sections)for(const text of section.paragraphs){assert.ok(!seen.has(text));seen.add(text);}
  const source=read('tools/build-kids-pages.js');
  assert.ok(source.includes("tools/kids-guide-editorial.json"));
  assert.ok(source.includes('body+editorialHtml(id)'));
  assert.ok(source.includes('dateModified:revision'));
});
test('Only genuinely revised guide dates are refreshed in the sitemap',()=>{
  const dom=new JSDOM(read('sitemap.xml'),{contentType:'text/xml'});
  for(const route of targets){const url=[...dom.window.document.querySelectorAll('url')].find(n=>n.querySelector('loc')?.textContent==='https://matchapp.tv/'+route+'/');assert.ok(url);const slug=route.split('/').pop();const revision=route.startsWith('kids/')?kids[slug].updatedAt:events.find(e=>e.slug===slug).updatedAt;assert.ok(new Date(url.querySelector('lastmod').textContent)>=new Date(revision));}
  const meta=JSON.parse(read('tools/kids-sitemap-meta.json'));
  for(const slug of Object.keys(kids))assert.ok(meta['https://matchapp.tv/kids/titles/'+slug+'/'].startsWith(kids[slug].updatedAt));
  dom.window.close();
});
