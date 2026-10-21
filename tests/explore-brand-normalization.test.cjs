'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const ROOT=path.join(__dirname,'..');
const read=file=>fs.readFileSync(path.join(ROOT,file),'utf8');

function fixture(t,rel,html){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'explore-brand-normalization-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);
 const module={exports:{}};
 vm.runInNewContext(read('tools/finalize-brand.js'),{require,module,__dirname:path.join(dir,'tools'),URLSearchParams});
 return {run:module.exports.finalizeBrand,read:()=>fs.readFileSync(file,'utf8')};
}
const inline='<span class="ma-brand-copy" translate="no"><span class="ma-wordmark"><span class="ma-word-match">Match</span><span class="ma-word-app">App</span></span><span class="ma-word-ai" data-ma-brand-ai>Ai</span></span>';
const page=copy=>'<!doctype html><html><head><title>Brand fixture</title></head><body><header><a href="/" aria-label="MatchApp Ai"><img src="/assets/brand/matchapp-icon-approved.png" alt="">'+copy+'</a><button>Existing control</button></header><main>Existing content</main></body></html>';

test('the approved Explore inline wordmark survives two real normalization passes byte-for-byte',t=>{
 const html=read('explore.html'),dom=new JSDOM(html);
 try{
  const brand=dom.window.document.querySelector('#ref-explore-header .hub-brand');
  assert.equal(brand.querySelector('.ma-brand-copy .ma-wordmark').textContent,'MatchApp');
  assert.equal(brand.querySelector('.ma-brand-copy .ma-word-ai[data-ma-brand-ai]').textContent,'Ai');
  assert.equal(brand.querySelector('.matchapp-wordmark'),null,'the approved header uses the shared inline wordmark');
 }finally{dom.window.close();}
 const f=fixture(t,'explore.html',html);
 for(let pass=1;pass<=2;pass++){
  assert.equal(f.run(),0,'normalization pass '+pass+' must not publish a replacement');
  assert.equal(f.read(),html,'preserve the whole approved page, including runtime hooks and cache keys');
 }
});

test('an incomplete or incorrect adult inline wordmark still receives ordinary brand normalization',t=>{
 for(const [index,copy]of [inline.replace('>App</span>','>Other</span>'),inline.replace(' data-ma-brand-ai',''),inline.replace('>Ai</span>','>Wrong</span>')].entries()){
  const f=fixture(t,'fixture-'+index+'.html',page(copy));assert.equal(f.run(),1);
  const normalized=f.read(),dom=new JSDOM(normalized);
  try{
   const brand=dom.window.document.querySelector('header a');
   assert.equal(brand.querySelectorAll('img.matchapp-wordmark').length,1);
   assert.equal(brand.querySelector('img.matchapp-wordmark').getAttribute('src'),'/assets/brand/matchapp-tv-ai-v2.svg');
   assert.equal(brand.querySelector('img:not(.matchapp-wordmark)').getAttribute('src'),'/assets/brand/matchapp-icon-approved.png');
   assert.equal(brand.getAttribute('href'),'/');
   assert.equal(dom.window.document.querySelector('button').textContent,'Existing control');
   assert.equal(dom.window.document.querySelector('main').textContent,'Existing content');
  }finally{dom.window.close();}
  assert.equal(f.run(),0);assert.equal(f.read(),normalized);
 }
});

test('adult inline recognition leaves the existing Kids normalization path unchanged',t=>{
 const f=fixture(t,'kids/fixture/index.html',page(inline));assert.equal(f.run(),1);
 const normalized=f.read(),dom=new JSDOM(normalized);
 try{
  const brand=dom.window.document.querySelector('header a');
  assert.equal(brand.querySelector('.kids-wordmark').textContent,'MatchApp Ai KIDS');
  assert.equal(brand.querySelector('.ma-brand-copy'),null);
  assert.equal(brand.getAttribute('aria-label'),'MatchApp Ai KIDS');
 }finally{dom.window.close();}
 assert.equal(f.run(),0);assert.equal(f.read(),normalized);
});
