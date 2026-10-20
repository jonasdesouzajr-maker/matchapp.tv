'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom'),root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const harness=read('tools/live-production-deep-matching.cjs'),start=harness.indexOf("   const fold=root.locator('details.ebook-fold');"),end=harness.indexOf('   const quotaBefore=',start),branch=harness.slice(start,end);
assert.ok(start>0&&end>start,'execute the actual CI audiobook field-navigation branch');
const density=read('patches/reference-density.js'),balance=density.slice(density.indexOf(' function balanced('),density.indexOf(' function textWidth(')),folding=density.slice(density.indexOf(' function foldBooks('),density.indexOf(' function flush('));
function visible(node){if(!node?.isConnected||node.hidden)return false;for(let parent=node.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS'&&!parent.open&&!parent.querySelector(':scope > summary')?.contains(node))return false;return true;}
function locator(node){return{count:async()=>node?1:0,waitFor:async()=>assert.ok(node?.isConnected,'original field must attach'),evaluate:async callback=>callback(node),isVisible:async()=>visible(node),locator:selector=>locator(selector==='xpath=ancestor::details[1]'?node?.closest('details'):node?.querySelector(selector)),click:async options=>{assert.ok(!options?.force,'CI must use real actionable clicks');assert.ok(visible(node),'original field or summary must be visible');assert.ok(!node.disabled,'original field must be enabled');node.click();}};}
async function fixture(lang){
 const dom=new JSDOM('<!doctype html><html class="ma-reference"><body class="ebook-page"><main><input id="typed" value="Keep my text"><section id="ebook-matcher-root"></section></main></body></html>',{url:'https://matchapp.tv/ebooks/',runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,calls=[];
 Object.defineProperty(w.document,'readyState',{get:()=> 'complete'});w.HTMLElement.prototype.scrollIntoView=function(){};w.MATCHAPP_EBOOK_CATALOG=[];w.MATCHAPP_TOP_EBOOKS=[];w.MatchAppCountry={regionCode:()=> 'US'};w.MatchAppBookDetails={hydrate(){}};
 w.fetch=()=>{calls.push('network');throw Error('No provider requests in field-navigation regression');};w.checkDailyLimit=()=>{calls.push('quota');throw Error('No quota requests in field-navigation regression');};
 w.localStorage.setItem('match_lang',lang);w.localStorage.setItem('match_ebook_criteria_v1',JSON.stringify({format:'ebook',access:'free',mood:'cozy',genre:'classics',pace:'balanced',length:'medium',era:'classic'}));
 for(const file of['ebooks/locale.js','ebooks/locale-choices.js','ebooks/locale-interface.js','ebooks/ebook-matcher.js'])w.eval(read(file));
 await new Promise(resolve=>w.setTimeout(resolve,0));
 w.eval('(function(){var bookOpen=Object.create(null);function set(node,key,value){node.setAttribute(key,value)}function schedule(){}'+balance+folding+'foldBooks();})();');
 return{w,calls,close:()=>w.close()};
}
test('actual CI navigation opens the original Books and Access summaries before selecting the original paid/audio controls',async t=>{
 for(const lang of['en','pt-BR'])for(const initiallyOpen of[false,true]){
  const f=await fixture(lang);try{
   const {w}=f,owner=w.document.getElementById('ebook-matcher-root'),outer=owner.querySelector('.ebook-fold'),paid=owner.querySelector('[data-ebook-field="access"][data-ebook-value="paid"]'),audio=owner.querySelector('[data-ebook-field="format"][data-ebook-value="audiobook"]'),access=paid.closest('details'),other=owner.querySelector('[data-ma-density-field="mood"]'),events=[];
   assert.equal(access.dataset.maDensityField,'access');outer.open=initiallyOpen;assert.equal(access.open,false);assert.equal(other.open,false);assert.equal(visible(paid),false);
   outer.querySelector(':scope > summary').addEventListener('click',()=>events.push('outer'));audio.addEventListener('click',()=>events.push('audio'));access.querySelector(':scope > summary').addEventListener('click',()=>events.push('access'));paid.addEventListener('click',()=>events.push('paid'));
   const previous=JSON.parse(w.localStorage.getItem('match_ebook_criteria_v1')),nodes=[...owner.querySelectorAll('[data-ebook-field]')];
   await vm.runInNewContext('(async()=>{'+branch+'})()',{root:locator(owner),assert});
   assert.deepEqual(events,initiallyOpen?['audio','access','paid']:['outer','audio','access','paid']);assert.equal(outer.open,true);assert.equal(access.open,true);assert.equal(other.open,false,'unrelated filters stay closed');assert.equal(visible(paid),true);assert.equal(paid.getAttribute('aria-pressed'),'true');assert.equal(audio.getAttribute('aria-pressed'),'true');assert.deepEqual([...owner.querySelectorAll('[data-ebook-field]')],nodes,'all original field nodes survive');
   const current=JSON.parse(w.localStorage.getItem('match_ebook_criteria_v1'));assert.deepEqual(current,{...previous,format:'audiobook',access:'paid'});assert.equal(w.document.getElementById('typed').value,'Keep my text');assert.deepEqual(f.calls,[]);
  }finally{f.close();}
 }
});
test('CI fails closed when the paid field and its own summary are genuinely unreachable',async()=>{
 const events=[],paid={isVisible:async()=>false,locator:()=>({count:async()=>0}),click:async()=>events.push('paid')},fold={waitFor:async()=>{},evaluate:async()=>true},root={locator:selector=>selector==='details.ebook-fold'?fold:selector.includes('format')?{click:async()=>events.push('audio')}:paid};
 await assert.rejects(vm.runInNewContext('(async()=>{'+branch+'})()',{root,assert}),/paid Access field or its own fold must be reachable/);assert.deepEqual(events,['audio']);
});
