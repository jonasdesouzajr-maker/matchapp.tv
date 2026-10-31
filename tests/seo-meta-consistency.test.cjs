'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('public home and Ask AI descriptions remain consistent with live metadata and short snippets',()=>{
  const home=fs.readFileSync('index.html','utf8');
  const discover=fs.readFileSync('discover.html','utf8');
  const live=fs.readFileSync('build-meta.js','utf8');
  const featured=fs.readFileSync('weekly-pick.js','utf8');
  const staticDesc=s=>s.match(/<meta name="description" content="([^"]+)"/)?.[1];
  const discoverLive=live.split("if (path === '/discover.html') {")[1]?.split("upsertMeta('description', '")[1]?.split("');")[0];
  assert.equal(discoverLive,staticDesc(discover),'Ask AI dynamic metadata must match crawlable head');
  assert(staticDesc(home).length<=155,'homepage snippet too long');
  assert(discoverLive.length<=160,'Ask AI snippet too long');
  assert.doesNotMatch(featured,/\bdesc\.content\s*=/,'weekly featured must not append past short search snippets');
  assert.match(featured,/weekly-pick-schema/,'preserve original weekly Movie schema');
  assert.match(home,/\/build-meta\.js\?v=20261002-weekly-cover1&amp;seo=20260928-2/,'home must load refreshed metadata runtime');
  assert.match(discover,/\/build-meta\.js\?v=20260924-runtime2&amp;seo=20260928-2/,'Ask AI must load refreshed metadata runtime');
  assert.match(live,/20261010-cloudvoice2/,'refreshed bootstrap must load voice-safe wiring');
  const wiring=fs.readFileSync('final-wiring.js','utf8');
  assert.match(wiring,/20261002-weekly-cover1/,'weekly script must get a fresh browser cache version');
});

test('Home keeps its crawlable English snippet and updates search and share copy on every language switch',()=>{
  const {JSDOM}=require('jsdom');
  const html=fs.readFileSync('index.html','utf8');
  for(const path of ['/', '/index.html']){
    const dom=new JSDOM(html,{url:'https://matchapp.tv'+path,runScripts:'outside-only'});
    try{
      const {document}=dom.window;
      const canonical=()=>document.querySelector('link[rel="canonical"]').href;
      const description=()=>document.querySelector('meta[name="description"]').content;
      const initialTitle=document.title,initialDescription=description();
      dom.window.eval(fs.readFileSync('i18n.js','utf8'));
      dom.window.eval(fs.readFileSync('build-meta.js','utf8'));
      document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
      const unique=new Set();
      for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','en']){
        dom.window.setLanguage(lang);
        const title=document.title, desc=description();
        assert.ok(title.includes('MatchApp Ai')&&desc.length>=35,lang);
        assert.equal(document.querySelector('meta[property="og:title"]').content,title);
        assert.equal(document.querySelector('meta[name="twitter:title"]').content,title);
        assert.equal(document.querySelector('meta[property="og:description"]').content,desc);
        assert.equal(document.querySelector('meta[name="twitter:description"]').content,desc);
        assert.equal(canonical(),'https://matchapp.tv/');
        const locale=document.querySelector('meta[property="og:locale"]').content;
        assert.equal(locale.split('_')[0],lang.split('-')[0]);
        assert.ok(![...document.querySelectorAll('meta[property="og:locale:alternate"]')].some(el=>el.content===locale));
        if(lang==='en'){assert.equal(title,initialTitle);assert.equal(desc,initialDescription);}
        unique.add(desc);
      }
      assert.equal(unique.size,14);
    }finally{dom.window.close();}
  }
});
