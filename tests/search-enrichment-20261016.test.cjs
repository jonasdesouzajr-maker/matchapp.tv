'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8'),seo=require('../data/search-page-copy.json');
const {metadata,enrichWatchHead}=require('../tools/watch-search-metadata.cjs');
for(const [lang,copy]of Object.entries(seo))for(const route of ['founder','sponsor','streaming'])test(`${route} metadata follows ${lang} without changing the canonical destination`,()=>{
 assert.equal(copy.length,5);const dom=new JSDOM(read(route+'/index.html'),{url:`https://matchapp.tv/${route}/`,runScripts:'outside-only'}),w=dom.window,d=w.document;
 w.MATCH_LANG=lang==='pt'?'pt-BR':lang;d.documentElement.lang=w.MATCH_LANG;
 const stem=route==='founder'?'founder':'partnership';w.eval(read('patches/'+stem+'-copy.js'));w.eval(read('patches/'+stem+(route==='founder'?'-page.js':'-pages.js')));d.dispatchEvent(new w.Event('DOMContentLoaded'));
 const expected=copy[route==='founder'?0:route==='sponsor'?1:3],description=route==='founder'?w.MATCHAPP_FOUNDER_COPY[lang].pageDesc:copy[route==='sponsor'?2:4];
 assert.equal(d.title,expected);for(const selector of ['meta[property="og:title"]','meta[name="twitter:title"]'])assert.equal(d.querySelector(selector).content,expected);
 for(const selector of ['meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]'])assert.equal(d.querySelector(selector).content,description);
 const graph=JSON.parse(d.querySelector(route==='founder'?'#founder-schema':'#partnership-schema').textContent)['@graph'];assert.equal(graph[0].description,description);assert.equal(graph[0].inLanguage,w.MATCH_LANG);assert.equal(d.querySelector('link[rel=canonical]').href,`https://matchapp.tv/${route}/`);
 for(const selector of ['meta[property="og:image:alt"]','meta[name="twitter:image:alt"]','meta[name="twitter:image"]'])assert.ok(d.querySelector(selector)?.content);
 assert.equal(d.querySelectorAll('h1').length,1);w.close();
});
test('provider metadata is region-qualified, escaped, idempotent and leaves body and indexing policy untouched',()=>{
 const info={year:2009,regions:{GB:{stream:['Provider'],rent:['Rental']},BR:{stream:[]}}};const original='<html><head><title>Old</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://matchapp.tv/where-to-watch/example/"></head><body><p>Keep this body.</p></body></html>';
 const result=enrichWatchHead(original,'A & B',info),d=new JSDOM(result).window.document;assert.equal(d.title,'Where to Watch A & B (2009) | MatchApp Ai');assert.match(d.querySelector('meta[name=description]').content,/by country/);assert.doesNotMatch(d.querySelector('meta[name=description]').content,/purchase|streaming on Provider/);assert.equal(d.querySelector('meta[name=robots]').content,'noindex,follow');assert.equal(result.slice(result.indexOf('<body>')),original.slice(original.indexOf('<body>')));assert.equal(enrichWatchHead(result,'A & B',info),result);
});
test('metadata enrichment never backdates an existing editorial revision',()=>{
 const {enrichMetadata}=require('../tools/discovery-metadata.js');const html='<head><title>Before</title><script type="application/ld+json">{"@type":"WebPage","dateModified":"2026-10-16"}</script></head><body>Unchanged</body>';
 const result=enrichMetadata(html,'platforms/netflix/index.html');assert.match(result,/"dateModified":"2026-10-16"/);assert.ok(result.endsWith('<body>Unchanged</body>'));
});
test('dated Netflix evidence remains sourced and does not pretend to be a live availability feed',()=>{
 const article=require('../tools/discovery-editorial.json')['platforms/netflix'];assert.equal(article.sourceNote.checked,'2026-10-16');assert.equal(article.sourceNote.source,'https://www.netflix.com/tudum/top10');assert.match(article.sourceNote.heading,/5–11 October 2026/);assert.match(article.sourceNote.text,/not a promise/);const {renderEditorial}=require('../tools/discovery-editorial.cjs');assert.ok(read('platforms/netflix/index.html').includes(renderEditorial('platforms/netflix')));
});
test('Kota programme context is sourced and does not fabricate daily times or tickets',()=>{
 const e=require('../tools/global-events.json').find(e=>e.slug==='kota-dussehra-2026');assert.equal(e.source,'https://www.incredibleindia.gov.in/en/festivals-and-events/rajasthan/dussehra-fair-2026');assert.match(e.programmeNotes.join(' '),/not a complete day-by-day program list/);assert.match(read('events/kota-dussehra-2026/index.html'),/Kota Dussehra Mela 2026 programme and daily schedule/);assert.match(read('tools/build-global-events.js'),/e.programmeNotes/);
});
