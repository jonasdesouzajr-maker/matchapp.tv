'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('daily trend fetch cannot replace the complete curated Home rail or its identical loop copy',async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://matchapp.tv/',runScripts:'outside-only'});
 try{
  const w=dom.window,track=w.document.getElementById('marquee-track');
  const snapshot=()=>[...track.querySelectorAll('img[data-title]')].map(img=>({title:img.dataset.title,src:img.getAttribute('src'),origin:img.dataset.origin}));
  const before=snapshot();assert.equal(before.length,52);
  const duplicate=track.querySelector('.marquee-item[data-loop-copy="0"]').cloneNode(true);track.append(duplicate);
  const dedupe=fs.readFileSync('matchapp-ia.js','utf8').split('\n').find(line=>line.includes("const seen=new Set();qsa('.marquee-item',trending)"));
  new Function('qsa','qs','trending',dedupe)((selector,host)=>[...host.querySelectorAll(selector)],(selector,host)=>host.querySelector(selector),track);
  assert.deepEqual(snapshot(),before,'presentation cleanup preserves intentional loop copies while removing accidental originals');
  w.fetch=async url=>({ok:true,json:async()=>url.includes('trending-week')?JSON.parse(fs.readFileSync('data/trending-week.json','utf8')):[]});
  let count;w.document.addEventListener('matchapp:trendingpainted',event=>count=event.detail.count);
  w.eval(fs.readFileSync('trending-rail.js','utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.deepEqual(snapshot(),before);assert.equal(count,26);
 }finally{dom.window.close();}
});
