'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const {load,route,LOCALES}=require('../tools/build-tonight-edition.cjs');
const root=path.join(__dirname,'..');

test('radar separates measured weekly popularity from release-led editorial opportunities',()=>{
  const {radar}=load(),{data,copies}=radar;
  assert.equal(data.checked,'2026-11-13');
  assert.equal(data.chartPeriod,'2026-11-02/2026-11-08');
  assert.equal(data.facts.length,3);
  assert.deepEqual(data.facts.map(f=>f.rank),[1,1,1]);
  assert.deepEqual(data.facts.slice(0,2).map(f=>f.views),[8600000,12900000]);
  assert.deepEqual(data.candidates.find(x=>x.id==='narnia').dates,['2027-02-12','2027-04-02']);
  assert.deepEqual(data.candidates.find(x=>x.id==='rings-of-power').dates,['2026-11-18','2026-11-25']);
  assert.equal(new Set(Object.values(copies).map(c=>c.description)).size,15);
  assert.match(copies.en.method,/editorial judgments/);
  assert.match(copies.en.method,/no measured probability/);
  assert.match(copies.en.notes[3],/older November\/December 2026/);
});

test('all radar editions expose truthful revision dates, primary sources, metadata and local links',()=>{
  const {radar}=load();
  for(const lang of LOCALES){
    const doc=new JSDOM(fs.readFileSync(path.join(root,route(lang),'index.html'),'utf8')).window.document;
    const canonical='https://matchapp.tv'+route(lang),c=radar.copies[lang];
    assert.equal(doc.querySelector('title').textContent,c.title+' | MatchApp Ai');
    for(const sel of ['meta[name=description]','meta[property="og:description"]','meta[name="twitter:description"]']) assert.equal(doc.querySelector(sel).content,c.description);
    assert.equal(doc.querySelectorAll('[data-radar-id]').length,4);
    assert.equal(doc.querySelectorAll('[data-trend-id]').length,6);
    assert.equal(doc.querySelector('link[rel=canonical]').href,canonical);
    assert.equal(doc.querySelectorAll('link[hreflang]').length,16);
    const article=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(x=>x['@type']==='Article');
    assert.equal(article.datePublished,'2026-11-12');
    assert.equal(article.dateModified,'2026-11-13');
    assert.equal(doc.querySelector('#radar time').dateTime,article.dateModified);
    for(const candidate of radar.data.candidates){
      assert.ok(article.citation.includes(candidate.source));
      assert.ok(doc.querySelector(`[data-radar-id="${candidate.id}"] a[href="${candidate.source}"]`));
      assert.ok(article.mentions.some(x=>x.name===candidate.title));
    }
    const ccxp=doc.querySelector('#radar-ccxp26 nav a:last-child');
    assert.equal(ccxp.getAttribute('href'),lang==='pt-BR'?'/pt-br/ccxp-2026/':'/events/ccxp-2026/');
    for(const a of doc.querySelectorAll('#radar a[href^="/"]')) assert.ok(fs.existsSync(path.join(root,a.getAttribute('href').replace(/\/$/,'/index.html'))));
    assert.equal(doc.querySelector('[data-radar-share]').textContent,c.share);
    assert.ok(!doc.querySelector('meta[name=keywords],script[src*="adsbygoogle"]'));
    doc.defaultView.close();
  }
});

const script=fs.readFileSync(path.join(root,'trending/radar-share.js'),'utf8');
function shareDom(navigatorProps){
  const dom=new JSDOM('<title>Radar</title><link rel="canonical" href="https://matchapp.tv/trending/2026-11-12/pt-br/"><button data-radar-share data-share-text="Uma ideia" data-share-done="Copiado">Compartilhar</button><p data-radar-share-status></p>',{url:'https://preview.example/trending/2026-11-12/pt-br/?secret=ignored',runScripts:'outside-only'});
  for(const [key,value] of Object.entries(navigatorProps))Object.defineProperty(dom.window.navigator,key,{value});
  dom.window.eval(script);return dom;
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('sharing uses the localized production canonical and runs only after a deliberate click',async()=>{
  let calls=[];const dom=shareDom({share:async value=>calls.push(value)});
  try{
    assert.equal(calls.length,0);
    dom.window.document.querySelector('button').click();await settle();
    assert.equal(calls.length,1);assert.equal(calls[0].url,'https://matchapp.tv/trending/2026-11-12/pt-br/#radar');
    assert.equal(calls[0].text,'Uma ideia');
    assert.equal(dom.window.document.querySelector('[data-radar-share-status]').textContent,'');
    assert.equal(dom.window.document.querySelector('button').disabled,false);
  }finally{dom.window.close();}
});
test('clipboard fallback confirms only successful copies',async()=>{
  const written=[];const dom=shareDom({clipboard:{writeText:async text=>written.push(text)}});
  try{dom.window.document.querySelector('button').click();await settle();assert.deepEqual(written,['https://matchapp.tv/trending/2026-11-12/pt-br/#radar']);assert.equal(dom.window.document.querySelector('[data-radar-share-status]').textContent,'Copiado');}finally{dom.window.close();}
});
test('cancelled sharing stays silent and failed clipboard access exposes a real link',async()=>{
  for(const abort of [true,false]){
    const fail=async()=>{const err=new Error('Unavailable');err.name=abort?'AbortError':'NotAllowedError';throw err;};
    const dom=shareDom(abort?{share:fail}:{clipboard:{writeText:fail}});
    try{dom.window.document.querySelector('button').click();await settle();const status=dom.window.document.querySelector('[data-radar-share-status]');assert.equal(status.querySelectorAll('a').length,abort?0:1);assert.ok(!status.textContent.includes('Copiado'));assert.equal(dom.window.document.querySelector('button').disabled,false);}finally{dom.window.close();}
  }
});
test('unsupported sharing is removed without relying on overridden hidden styles',()=>{
  const dom=shareDom({});try{assert.equal(dom.window.document.querySelector('button'),null);}finally{dom.window.close();}
});
