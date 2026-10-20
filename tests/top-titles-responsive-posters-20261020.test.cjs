'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
function responsiveOriginal(img){
 const src=img.getAttribute('src'),hash=/https:\/\/image\.tmdb\.org\/t\/p\/(?:w\d+|original)\/([A-Za-z0-9_.-]+)$/.exec(src)?.[1];
 assert.ok(hash,'a real TMDB poster source is required');
 const choices=img.getAttribute('srcset').split(',').map(value=>value.trim().split(/\s+/));
 assert.deepEqual(choices.map(([url,width])=>({url,width})),[185,342,500,780].map(w=>({url:'https://image.tmdb.org/t/p/w'+w+'/'+hash,width:w+'w'})),'responsive renditions must use the identical original artwork hash');
 assert.equal(img.getAttribute('sizes'),'(max-width: 384px) 86px, (max-width: 624px) calc((100vw - 40px) / 4), 146px');
 assert.equal(img.width,342);assert.equal(img.height,513);assert.equal(img.getAttribute('decoding')||img.decoding,'async');
}
test('all 26 committed Top Titles and their loop copies share responsive original art without changing identity or priority',()=>{
 const dom=new JSDOM(read('index.html'));try{
  const imgs=[...dom.window.document.querySelectorAll('#marquee-track img[data-title]')];assert.equal(imgs.length,52);
  for(let i=0;i<imgs.length;i++){
   const img=imgs[i];responsiveOriginal(img);assert.ok(img.dataset.tmdbId);assert.ok(img.dataset.tmdbKind);
   assert.equal(img.getAttribute('loading'),i<4?'eager':'lazy');assert.equal(img.getAttribute('fetchpriority'),i<4?'high':null);
   if(i>=26){assert.equal(img.dataset.title,imgs[i-26].dataset.title);assert.equal(img.src,imgs[i-26].src);assert.equal(img.srcset,imgs[i-26].srcset);}
  }
 }finally{dom.window.close();}
});
test('weekly replacement sets responsive attrs before requesting images and keeps title actions and non-TMDB thumbnails intact',async()=>{
 const dom=new JSDOM('<!doctype html><html><body><div id="trending-rail"><div id="marquee-track"></div></div></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 try{
  const w=dom.window,requested=[],calls=[],titles=Array.from({length:6},(_,i)=>({title:'Exact weekly title '+i,poster:i===5?'https://official.publisher.test/original-thumbnail.jpg':'https://image.tmdb.org/t/p/w780/ORIGINAL_'+i+'.jpg'}));
  const descriptor=Object.getOwnPropertyDescriptor(w.HTMLImageElement.prototype,'src');
  Object.defineProperty(w.HTMLImageElement.prototype,'src',{configurable:true,get:descriptor.get,set(value){requested.push({src:value,srcset:this.srcset,sizes:this.sizes,decoding:this.decoding,loading:this.loading});descriptor.set.call(this,value);}});
  w.fetch=async url=>({ok:true,json:async()=>url.includes('trending-week')?{titles}:[]});w.selectMarqueeItem=title=>calls.push(title);
  w.eval(read('trending-rail.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await new Promise(resolve=>setTimeout(resolve,30));
  const cards=[...w.document.querySelectorAll('.marquee-item')],imgs=cards.map(card=>card.querySelector('img'));assert.equal(cards.length,12);assert.equal(w.document.querySelector('#marquee-track').dataset.loopCount,'6');
  for(let i=0;i<imgs.length;i++){
   const img=imgs[i],source=titles[i%6].poster;
   assert.equal(img.getAttribute('src'),source);assert.equal(img.loading,i<4?'eager':'lazy');assert.equal(img.getAttribute('fetchpriority'),i<4?'high':null);
   if(i%6<5){responsiveOriginal(img);const initial=requested.find(request=>request.src===source);assert.ok(initial.srcset&&initial.sizes);assert.equal(initial.decoding,'async');}
   else assert.equal(img.hasAttribute('srcset'),false,'official non-TMDB art must never be rewritten as TMDB');
   assert.equal(cards[i].dataset.loopCopy,i<6?'0':'1');assert.equal(cards[i].textContent,titles[i%6].title);
  }
  cards[0].click();cards[6].click();assert.deepEqual(calls,[titles[0].title],'only the original card invokes the existing title route once');
 }finally{dom.window.close();}
});
