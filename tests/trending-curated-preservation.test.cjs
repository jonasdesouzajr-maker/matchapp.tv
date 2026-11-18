'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
test('daily trend fetch replaces the Home rail with the latest titled posters and an identical loop',async()=>{
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'https://matchapp.tv/',runScripts:'outside-only'});
 try{
  const w=dom.window,track=w.document.getElementById('marquee-track');
  const week=JSON.parse(fs.readFileSync('data/trending-week.json','utf8'));
  const expected=week.titles.filter(item=>item&&item.kind!=='music-video'&&item.poster);
  assert.ok(expected.length>=6,'the daily file has enough artwork to replace the rail');
  assert.notEqual(expected[0].title,[...track.querySelectorAll('img[data-title]')][0].dataset.title,'fixture still starts from the committed rail');
  w.fetch=async url=>({ok:true,json:async()=>String(url).includes('trending-week')?week:[]});
  let count;w.document.addEventListener('matchapp:trendingpainted',event=>count=event.detail.count);
  w.eval(fs.readFileSync('trending-rail.js','utf8'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await new Promise(resolve=>setTimeout(resolve,40));
  const cards=[...track.querySelectorAll('.marquee-item')];
  assert.equal(cards.length,expected.length*2);
  assert.equal(count,expected.length);
  assert.deepEqual(cards.map(card=>card.querySelector('img').dataset.title),expected.map(item=>item.title).concat(expected.map(item=>item.title)));
  assert.equal(cards[0].dataset.loopCopy,'0');
  assert.equal(cards[0].getAttribute('role'),'button');
  assert.equal(cards[expected.length].dataset.loopCopy,'1');
  assert.equal(cards[expected.length].getAttribute('aria-hidden'),'true');
  assert.equal(cards[0].querySelector('img').getAttribute('src'),expected[0].poster);
  assert.equal(track.dataset.loopCount,String(expected.length));
  assert.equal(cards.some(card=>card.dataset.musicVideo),false);
 }finally{dom.window.close();}
});
