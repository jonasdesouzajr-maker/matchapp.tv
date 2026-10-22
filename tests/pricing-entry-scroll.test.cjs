'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'..','pricing.js'),'utf8');
async function fixture(suffix='',retired=true){
 const dom=new JSDOM('<!doctype html><html><head></head><body><div class="container"><h1>Plans</h1><section class="credits-section"></section></div></body></html>',{url:'https://matchapp.tv/pricing/pricing.html'+suffix,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,calls=[];
 w.console.log=()=>{};w.matchMedia=()=>({matches:true});w.MatchAppTokens={retireLegacyPromotions:retired};
 w.Element.prototype.scrollIntoView=function(options){calls.push({id:this.id,behavior:options.behavior,block:options.block});};
 w.fetch=()=>{throw new Error('Network forbidden in purchase presentation test');};
 await new Promise(resolve=>{if(w.document.readyState==='loading')w.document.addEventListener('DOMContentLoaded',resolve,{once:true});else resolve();});
 w.eval(source);return{dom,w,calls};
}
test('plain pricing entry selects the same default purchase tab without requesting a viewport jump',async t=>{
 for(const retired of [false,true]){
  const f=await fixture('',retired);t.after(()=>f.dom.window.close());
  assert.deepEqual(f.calls,[]);
  const selected=f.w.document.querySelector('.purchase-tab[aria-selected="true"]');
  assert.equal(selected.dataset.target,retired?'credits':'matches');assert.equal(selected.tabIndex,0);
  assert.equal(f.w.location.hash,'');assert.equal(f.w.location.search,'');
 }
});
test('explicit purchase deep links retain their panel scroll and selected state',async t=>{
 for(const [suffix,target]of [['?focus=credits','credits'],['#ask-ai-credits','credits'],['?focus=kids','kids'],['#kids-packs-section','kids'],['?focus=matches','matches']]){
  const f=await fixture(suffix,false);t.after(()=>f.dom.window.close());
  assert.deepEqual(f.calls,[{id:target==='credits'?'ask-ai-credits':target==='kids'?'kids-packs-section':'match-packs-section',behavior:'auto',block:'start'}]);
  assert.equal(f.w.document.querySelector('.purchase-tab[aria-selected="true"]').dataset.target,target);
 }
});
test('user tab clicks and keyboard navigation retain scrolling, focus and existing query parameters',async t=>{
 const f=await fixture('?lang=de&source=profile');t.after(()=>f.dom.window.close());
 const {w}=f,credits=w.document.getElementById('purchase-tab-credits'),kids=w.document.getElementById('purchase-tab-kids');
 assert.deepEqual(f.calls,[]);kids.click();
 assert.equal(f.calls.at(-1).id,'kids-packs-section');assert.equal(w.location.hash,'#kids-packs-section');
 assert.equal(new w.URLSearchParams(w.location.search).get('lang'),'de');assert.equal(new w.URLSearchParams(w.location.search).get('source'),'profile');
 kids.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
 assert.equal(f.calls.at(-1).id,'ask-ai-credits');assert.equal(w.document.activeElement,credits);assert.equal(credits.getAttribute('aria-selected'),'true');
 assert.equal(new w.URLSearchParams(w.location.search).get('focus'),'credits');
});
