'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const records=require('../tools/global-events.json');
const kota=records.find(e=>e.slug==='kota-dussehra-2026');
const relative='events/kota-dussehra-2026/index.html';
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
function check(html){
 const dom=new JSDOM(html),doc=dom.window.document;
 try {
  const graph=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'];
  const event=graph.find(e=>e['@type']==='Event');
  assert.equal(event.startDate,'2026-10-20');
  assert.equal(event.endDate,'2026-11-06');
  assert.equal(event.offers,undefined,'no unverified prices or availability');
  assert.equal(event.performer,undefined,'no unverified performers');
  assert.equal(event.organizer.name,'District Administration, Kota');
  const links=[...doc.querySelectorAll('#where-to-watch .global-event-links a')];
  assert.equal(links.length,2,'overview and dated programme have distinct destinations');
  assert.equal(links[1].href,'https://www.kotadussehramela.in/schedule/events');
  assert.match(links[1].textContent,/dated programme list/);
  assert.equal(links[0].href,kota.source);
  assert.match(links[0].textContent,/Incredible India.*overview/);
  assert.doesNotMatch(links[0].textContent,/tickets|highlights|livestream/i);
  assert.match(doc.body.textContent,/not a complete day-by-day program list/);
  assert.match(doc.body.textContent,/11 October–5 November/);
  assert.match(doc.body.textContent,/does not reconcile the closing-date discrepancy/);
  const article=doc.querySelector('article.event-guide');
  assert.equal(article.dataset.eventStart,kota.start,'preserve lifecycle boundary');
  assert.equal(article.dataset.eventEnd,kota.end,'preserve retention boundary');
  assert.equal(article.dataset.eventZone,'Asia/Kolkata');
  assert.equal(doc.querySelector('link[rel="canonical"]').href,'https://matchapp.tv/events/kota-dussehra-2026/');
  for(const selector of ['meta[name="description"]','meta[property="og:description"]','meta[name="twitter:description"]']){
   const content=doc.querySelector(selector).content;
   assert.equal(content,kota.searchDescription);
   assert.match(content,/tourism dates \(20 Oct–6 Nov\)/);
   assert.ok(content.length<160);
  }
 } finally {dom.window.close();}
}
test('Kota published guide uses source precision and accurately labelled overview',()=>check(read(relative)));
test('event regeneration preserves Kota accuracy and other events retain their links and times',()=>{
 const writes=new Map();
 const script=read('tools/build-global-events.js');
 vm.runInNewContext(script,{
  __dirname:path.join(root,'tools'),console:{log(){}},Date,
  require(name){
   if(name==='fs')return {...fs,mkdirSync(){},writeFileSync(file,content){writes.set(path.relative(root,file),content);}};
   if(name==='./finalize-brand.js')return {finalizeBrand(){}};
   if(name==='./event-lifecycle')return require('../tools/event-lifecycle');
   return require(name);
  }
 },{filename:'build-global-events.js'});
 check(writes.get(relative));
 for(const e of records.filter(e=>e.slug!==kota.slug)){
  const dom=new JSDOM(writes.get(`events/${e.slug}/index.html`));
  try {
   const doc=dom.window.document;
   const event=JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)['@graph'].find(x=>x['@type']==='Event');
   assert.equal(event.startDate,e.datePrecision==='date'?e.start.slice(0,10):e.start,e.slug);
   assert.equal(event.endDate,e.datePrecision==='date'?e.end.slice(0,10):e.end,e.slug);
   assert.deepEqual([...doc.querySelectorAll('#where-to-watch .global-event-links a')].map(a=>a.getAttribute('href')),e.sourceLinks?e.sourceLinks.map(x=>x.url):[e.watch,e.recorded,e.official,e.source],e.slug);
  } finally {dom.window.close();}
 }
});
