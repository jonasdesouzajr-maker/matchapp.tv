'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const code=read('patches/browser-guide-copy-20261111.js');
test('embedded browser chat prepares its existing compact shell before window load, with a separate native shell and excluding standalone',()=>{
  const vm=require('node:vm');
  const source=new JSDOM(read('discover.html'));
  const script=source.window.document.querySelector('[data-ma-browser-ambient-shell]').textContent;
  for(const kind of ['browser','standalone','native','bridge','other-query','cross-origin']){
    const dom=new JSDOM('<html><head></head><body></body></html>');
    const w={parent:{location:{origin:kind==='cross-origin'?'https://example.com':'https://matchapp.tv'}}};
    w.top=kind==='standalone'?w:{};if(kind==='bridge')w.parent.MatchAppFx={};
    vm.runInNewContext(script,{window:w,document:dom.window.document,location:{origin:'https://matchapp.tv',search:kind==='other-query'?'':'?ambient=1'},navigator:{userAgent:kind==='native'?'MatchAppAiAndroid/73':'Chrome/157'},URLSearchParams,setTimeout:()=>0});
    assert.equal(dom.window.document.documentElement.classList.contains('matchapp-ambient-frame'),(kind==='browser'||kind==='native'),kind);
    assert.equal(dom.window.document.querySelectorAll('link[data-ma-ambient-embed]').length,(kind==='browser'||kind==='native')?1:0,kind);
    dom.window.close();
  }
  source.window.close();
});
test('browser guide translations retain destinations and restore the crawlable English copy',()=>{
  for(const file of ['index.html','explore.html']){
    const dom=new JSDOM(read(file),{url:'https://matchapp.tv/'+file,runScripts:'outside-only'}),w=dom.window;
    const section=w.document.querySelector('#ma-home-static-intro,.ma-explore-static-guide');
    const links=Array.from(section.querySelectorAll('a')).map(a=>a.getAttribute('href'));
    w.eval(code);
    for(const lang of ['pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh','zh-TW','en']){
      w.MATCH_LANG=lang;w.document.documentElement.lang=lang;w.document.dispatchEvent(new w.Event('matchapp:langchange'));
      for(const href of links)assert.ok(Array.from(section.querySelectorAll('a')).some(a=>a.getAttribute('href')===href),lang+' retains '+href);
      assert.ok(section.querySelector('h2').textContent.length>3);
      if(lang!=='en')assert.doesNotMatch(section.textContent,/What this Home page does|MatchApp Ai is a finished entertainment guide/);
    }
    if(file==='explore.html'){
      assert.equal(w.document.querySelector('.ref-explore-hero .ma-explore-lede-extra'),null);
      assert.ok(section.querySelector('.ma-explore-lede-extra'));
      assert.ok(w.document.querySelector('.ref-explore-more').compareDocumentPosition(section)&w.Node.DOCUMENT_POSITION_FOLLOWING);
    }
    dom.window.close();
  }
});
test('native bridge leaves its existing page content untouched',()=>{
  const dom=new JSDOM(read('explore.html'),{url:'https://matchapp.tv/explore.html',runScripts:'outside-only'});
  dom.window.MatchAppFx={};const before=dom.window.document.body.innerHTML;dom.window.eval(code);
  assert.equal(dom.window.document.body.innerHTML,before);dom.window.close();
});
test('Home defers its full ordered reading chain without dropping a helper',()=>{
  const dom=new JSDOM(read('index.html'));
  const scripts=Array.from(dom.window.document.querySelectorAll('script[src^="/ebooks/"]'));
  assert.equal(scripts.length,12);assert.ok(scripts.every(s=>s.defer));
  assert.match(scripts[0].src,/\/locale\.js/);assert.match(scripts.at(-1).src,/\/ebook-matcher\.js/);
  dom.window.close();
});
