'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {loadInputs,render,route,LOCALES,EDITION}=require('../tools/build-us-trends.cjs');
const root=path.resolve(__dirname,'..');

test('U.S. edition separates chart climbs, debuts and popularity without invented growth',()=>{
  const {data,copies}=loadInputs();
  assert.equal(data.items.length,30);
  assert.equal(Object.keys(copies).length,15);
  assert.equal(data.country,'US');
  assert.equal(data.sources.billboard.chartDate,'2026-11-07');
  assert.equal(data.sources.netflixMovies.end,'2026-11-01');
  assert.equal(data.sources.audible.weekEnding,'2026-10-30');
  for(const item of data.items){
    assert.ok(data.sources[item.source]);
    assert.ok(copies.en.notes[item.id]);
    if(item.status==='rising') assert.ok(item.previous>item.rank);
    if(item.status==='interest') assert.equal(item.rank,undefined);
  }
  assert.match(copies.en.riseNote,/not proof/);
  assert.match(copies.en.archiveNote,/dated edition/);
  assert.ok(data.items.some(i=>i.id==='dracula-song'&&i.group==='music'));
  assert.ok(data.items.some(i=>i.id==='dracula-audio'&&i.group==='audiobooks'));
});

test('all 15 authored editions are crawlable, internally linked, dated and source attributed',()=>{
  const inputs=loadInputs();
  for(const lang of LOCALES){
    const file=path.join(root,route(lang),'index.html');
    const html=fs.readFileSync(file,'utf8');
    assert.equal(html,render(lang,inputs),'Generated edition drift: '+lang);
    const dom=new JSDOM(html),doc=dom.window.document;
    try {
      const canonical='https://matchapp.tv'+route(lang);
      assert.equal(doc.querySelectorAll('h1').length,1);
      assert.equal(doc.querySelector('link[rel=canonical]').href,canonical);
      assert.equal(doc.querySelectorAll('link[hreflang]').length,16);
      assert.equal(doc.querySelectorAll('[data-trend-id]').length,30);
      assert.equal(doc.querySelectorAll('.ust-method li').length,11);
      assert.equal(doc.documentElement.dir,lang==='ar'?'rtl':'ltr');
      assert.equal(doc.querySelector('time').dateTime,EDITION);
      assert.ok(!/noindex/.test(doc.querySelector('meta[name=robots]').content));
      assert.ok(!doc.querySelector('script[src*="adsbygoogle"],ins.adsbygoogle'));
      assert.ok(doc.querySelector('script[data-ma-consent-defaults]'));
      const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
      assert.equal(graph.find(x=>x['@type']==='ItemList').numberOfItems,30);
      assert.equal(graph.find(x=>x['@type']==='ItemList').itemListOrder,'https://schema.org/ItemListUnordered');
      assert.equal(graph.find(x=>x['@type']==='Article').dateModified,EDITION);
      for(const link of doc.querySelectorAll('a[href^="#"]')) assert.ok(doc.getElementById(link.hash.slice(1)),'Broken section link '+link.href);
      for(const link of doc.querySelectorAll('a[href^="/"]')){
        const url=new URL(link.getAttribute('href'),'https://matchapp.tv');
        const target=path.join(root,url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname);
        assert.ok(fs.existsSync(target),'Broken internal link '+url.pathname);
      }
      const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
      assert.ok(sitemap.includes('<loc>'+canonical+'</loc>'));
    } finally {dom.window.close();}
  }
});

function entryDom({lang='en',ua='',nativeBridge=false,kids=false}={}){
  const dom=new JSDOM('<a href="/trending/us/2026-11-05/" data-us-trends-entry data-us-trends-section="music" style="display:none!important" hidden><span data-us-trends-label>U.S. trends</span></a><section data-us-trends-web-only style="display:none!important" hidden>U.S. guide</section>',{url:'https://matchapp.tv/'+(kids?'kids/':''),runScripts:'outside-only'});
  if(ua) Object.defineProperty(dom.window.navigator,'userAgent',{value:ua});
  if(nativeBridge) dom.window.MatchAppNativeAuth={};
  dom.window.localStorage.setItem('match_lang',lang);
  dom.window.eval(fs.readFileSync(path.join(root,'trending/us/labels.js'),'utf8'));
  dom.window.eval(fs.readFileSync(path.join(root,'trending/us/entry.js'),'utf8'));
  return dom;
}
test('new discovery entries follow language, preserve Traditional Chinese and exclude native/Kids',()=>{
  for(const [lang,routePart] of [['pt-BR','pt-br/'],['zh-Hant-TW','zh-tw/'],['ko','ko/'],['en-US','']]){
    const dom=entryDom({lang});
    try{
      const link=dom.window.document.querySelector('a');
      assert.equal(link.hidden,false);
      assert.equal(link.style.display,'');
      assert.equal(dom.window.document.querySelector('section').hidden,false);
      assert.equal(link.pathname,'/trending/us/2026-11-05/'+routePart);
      assert.equal(link.hash,'#music');
      dom.window.localStorage.setItem('match_lang','ar');
      dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange'));
      assert.equal(link.dir,'rtl');
      assert.equal(link.pathname,'/trending/us/2026-11-05/ar/');
      dom.window.localStorage.setItem('match_lang','unsupported');
      dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange'));
      assert.equal(link.hidden,true);
      assert.equal(link.style.getPropertyValue('display'),'none');
      assert.equal(link.style.getPropertyPriority('display'),'important');
    }finally{dom.window.close();}
  }
  for(const options of [{ua:'MatchAppAiAndroid/1.1.71'},{nativeBridge:true},{kids:true}]){
    const dom=entryDom(options);
    try{assert.equal(dom.window.document.querySelectorAll('[data-us-trends-entry],[data-us-trends-web-only]').length,0);}finally{dom.window.close();}
  }
});

test('static article language switches even after the shared UI changes the document locale',()=>{
  const dom=new JSDOM(fs.readFileSync(path.join(root,route('en'),'index.html'),'utf8'),{url:'https://matchapp.tv'+route('en')});
  const destinations=[];
  try{
    // The shared UI can set this before the deferred article script runs.
    dom.window.document.documentElement.lang='pt-BR';
    vm.runInNewContext(fs.readFileSync(path.join(root,'trending/us/guide.js'),'utf8'),{
      document:dom.window.document,window:{MATCH_LANG:'pt-BR'},location:{hash:'#music',assign:url=>destinations.push(url)}
    });
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange',{detail:{lang:'pt-BR'}}));
    assert.equal(destinations.pop(),'https://matchapp.tv/trending/us/2026-11-05/pt-br/#music');
    dom.window.document.documentElement.lang='zh-TW';
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange',{detail:{lang:'zh-Hant-TW'}}));
    assert.equal(destinations.pop(),'https://matchapp.tv/trending/us/2026-11-05/zh-tw/#music');
  }finally{dom.window.close();}
  for(const file of ['index.html','explore.html','music.html','ebooks/index.html','us/index.html']){
    const page=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
    try{
      const entries=page.window.document.querySelectorAll('[data-us-trends-entry],[data-us-trends-web-only]');
      assert.ok(entries.length>0);
      for(const entry of entries){
        assert.equal(entry.hidden,true,'Must begin hidden until browser/native detection: '+file);
        assert.equal(entry.style.getPropertyValue('display'),'none');
        assert.equal(entry.style.getPropertyPriority('display'),'important','Must survive the existing layered display rules: '+file);
      }
    }finally{page.window.close();}
  }
});
