'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const {load:loadInputs,render,route,LOCALES,DATE:EDITION}=require('../tools/build-tonight-edition.cjs');
const root=path.resolve(__dirname,'..');

test('six different editorial choices preserve separate dated source measures',()=>{
  const {data,copies}=loadInputs();
  assert.equal(data.items.length,6);
  assert.equal(Object.keys(copies).length,15);
  assert.equal(Object.keys(data.sources).length,5);
  assert.equal(data.date,'2026-11-12');
  const song=data.items.find(x=>x.id==='thriller');
  assert.equal(song.previous,20);assert.equal(song.rank,2);
  assert.equal(new Set(Object.values(copies).map(c=>c.description)).size,15);
  assert.match(copies.en.archive,/Not a live chart/);
  assert.match(copies.en.method,/different audiences and periods/);
});

test('the production brand finalizer leaves every generated edition stable',()=>{
  assert.equal(require('../tools/finalize-brand.js').finalizeBrand(['trending/2026-11-12/']),0);
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
      assert.equal(doc.querySelectorAll('[data-trend-id]').length,6);
      assert.equal(doc.querySelectorAll('.ust-method li').length,5);
      assert.equal(doc.documentElement.dir,lang==='ar'?'rtl':'ltr');
      assert.equal(doc.querySelector('time').dateTime,EDITION);
      assert.ok(!/noindex/.test(doc.querySelector('meta[name=robots]').content));
      assert.ok(!doc.querySelector('script[src*="adsbygoogle"],ins.adsbygoogle'));
      assert.ok(doc.querySelector('script[data-ma-consent-defaults]'));
      assert.ok(html.indexOf('data-ma-consent-defaults')<html.indexOf('GTM-M7J3NNBN'),'Consent defaults precede existing analytics');
      const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
      assert.equal(graph.find(x=>x['@type']==='ItemList').numberOfItems,6);
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
  const dom=new JSDOM('<a href="/trending/2026-11-12/" data-tonight-entry data-tonight-section="thriller" style="display:none!important" hidden><span data-tonight-label>U.S. trends</span></a><section data-tonight-web-only style="display:none!important" hidden>U.S. guide</section>',{url:'https://matchapp.tv/'+(kids?'kids/':''),runScripts:'outside-only'});
  if(ua) Object.defineProperty(dom.window.navigator,'userAgent',{value:ua});
  if(nativeBridge) dom.window.MatchAppNativeAuth={};
  dom.window.localStorage.setItem('match_lang',lang);
  dom.window.eval(fs.readFileSync(path.join(root,'trending/tonight-labels.js'),'utf8'));
  dom.window.eval(fs.readFileSync(path.join(root,'trending/tonight-entry.js'),'utf8'));
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
      assert.equal(link.pathname,'/trending/2026-11-12/'+routePart);
      assert.equal(link.hash,'#thriller');
      dom.window.localStorage.setItem('match_lang','ar');
      dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange'));
      assert.equal(link.dir,'rtl');
      assert.equal(link.pathname,'/trending/2026-11-12/ar/');
      dom.window.localStorage.setItem('match_lang','unsupported');
      dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange'));
      assert.equal(link.hidden,true);
      assert.equal(link.style.getPropertyValue('display'),'none');
      assert.equal(link.style.getPropertyPriority('display'),'important');
    }finally{dom.window.close();}
  }
  for(const options of [{ua:'MatchAppAiAndroid/1.1.71'},{nativeBridge:true},{kids:true}]){
    const dom=entryDom(options);
    try{assert.equal(dom.window.document.querySelectorAll('[data-tonight-entry],[data-tonight-web-only]').length,0);}finally{dom.window.close();}
  }
});

test('static article language switches even after the shared UI changes the document locale',()=>{
  const dom=new JSDOM(fs.readFileSync(path.join(root,route('en'),'index.html'),'utf8'),{url:'https://matchapp.tv'+route('en')});
  const destinations=[];
  try{
    // The shared UI can set this before the deferred article script runs.
    dom.window.document.documentElement.lang='pt-BR';
    vm.runInNewContext(fs.readFileSync(path.join(root,'trending/us/guide.js'),'utf8'),{
      document:dom.window.document,window:{MATCH_LANG:'pt-BR'},location:{hash:'#thriller',assign:url=>destinations.push(url)}
    });
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange',{detail:{lang:'pt-BR'}}));
    assert.equal(destinations.pop(),'https://matchapp.tv/trending/2026-11-12/pt-br/#thriller');
    dom.window.document.documentElement.lang='zh-TW';
    dom.window.document.dispatchEvent(new dom.window.CustomEvent('matchapp:langchange',{detail:{lang:'zh-Hant-TW'}}));
    assert.equal(destinations.pop(),'https://matchapp.tv/trending/2026-11-12/zh-tw/#thriller');
  }finally{dom.window.close();}
  for(const file of ['index.html','explore.html','music.html','ebooks/index.html']){
    const page=new JSDOM(fs.readFileSync(path.join(root,file),'utf8'));
    try{
      const entries=page.window.document.querySelectorAll('[data-tonight-entry],[data-tonight-web-only]');
      assert.ok(entries.length>0);
      for(const entry of entries){
        assert.equal(entry.hidden,true,'Must begin hidden until browser/native detection: '+file);
        assert.equal(entry.style.getPropertyValue('display'),'none');
        assert.equal(entry.style.getPropertyPriority('display'),'important','Must survive the existing layered display rules: '+file);
      }
    }finally{page.window.close();}
  }
});
