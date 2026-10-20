'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
test('shared adult header reserves brand space and uses content-sized wrapping controls in the winning layer',()=>{
 const css=fs.readFileSync(path.join(root,'patches/adult-screen-fit-20261015.css'),'utf8');
 const repair=css.slice(css.indexOf('/* shared-header-content-flow-20261017 */'));
 assert.match(repair,/@layer ma-screen-fit/);assert.match(repair,/body\.page-shell header\.app-header\.mh-topbox/);
 assert.match(repair,/flex-wrap:wrap!important/);assert.match(repair,/grid-template-columns:none!important/);
 assert.match(repair,/min-height:44px!important;height:44px!important/);assert.match(repair,/white-space:nowrap!important/);
 assert.doesNotMatch(repair,/body\.page-home|body\.kids-body|display:none/);
 for(const name of ['brand.css'])assert.match(fs.readFileSync(path.join(root,name),'utf8'),/adult-screen-fit-20261015\.css\?[^"]*header=20261018-1/);
});

test('quick quiz launcher floats independently of document scroll while preserving saved placement and controls',async()=>{
 const {JSDOM}=require('jsdom'),js=fs.readFileSync(path.join(root,'patches/jonas-premium-enhancer.js'),'utf8');
 for(const saved of [false,true]){
  const d=new JSDOM('<!doctype html><html data-growth-mode="quick"><body><header class="journey-header"><a href="/">Home</a></header><input value="unsaved"><aside id="ma-ambient-jonas"><button class="ja-bubble"><img></button></aside></body></html>',{url:'https://matchapp.tv/quick-match.html',runScripts:'outside-only',pretendToBeVisual:true});
  try{
   const w=d.window,node=w.document.querySelector('aside'),button=node.querySelector('button'),input=w.document.querySelector('input');
   w.innerWidth=390;w.innerHeight=710;w.scrollY=400;
   Object.defineProperty(node,'offsetWidth',{value:78});Object.defineProperty(node,'offsetHeight',{value:78});
   if(saved){w.localStorage.setItem('matchapp-jonas-position-v2',JSON.stringify({x:.23,y:.47}));node.style.left='91px';node.style.top='247px';}
   let clicks=0;button.onclick=()=>clicks++;input.focus();input.setSelectionRange(1,3);
   w.eval(js);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
   const before={x:node.style.left,y:node.style.top};
   assert.equal(node.style.position,'fixed');assert.equal(before.y,saved?'247px':'522px');
   w.scrollY=700;w.dispatchEvent(new w.Event('scroll'));await new Promise(resolve=>setTimeout(resolve,30));
   assert.deepEqual({x:node.style.left,y:node.style.top},before,'page scroll cannot move the floating launcher');
   assert.equal(w.document.activeElement,input);assert.equal(input.value,'unsaved');assert.equal(input.selectionStart,1);
   button.click();assert.equal(clicks,1,'existing conversation handler retained');
   assert.equal(w.document.querySelector('header a').getAttribute('href'),'/');
   assert.equal(w.localStorage.getItem('matchapp-jonas-position-v2')!==null,saved,'automatic dock never overwrites a drag preference');
  }finally{d.window.dispatchEvent(new d.window.Event('pagehide'));d.window.close()}
 }
});
