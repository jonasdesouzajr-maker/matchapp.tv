'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

test('pricing sections expose a continuous heading hierarchy below the page title',()=>{
 const window=new JSDOM(read('pricing/pricing.html')).window;
 try{
  const d=window.document,headings=[...d.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  assert.equal(d.querySelectorAll('h1').length,1);
  let level=0;
  for(const heading of headings){
   const next=Number(heading.tagName.slice(1));
   if(level)assert.ok(next<=level+1,'Skipped heading level at '+heading.textContent.trim());
   level=next;
  }
  for(const card of d.querySelectorAll('#pricing-main article.premium-card')){
   assert.ok(card.querySelector(':scope > h2'),'A plan is a direct section below the pricing page title');
  }
  assert.equal(d.querySelector('[data-i18n="pricing.platforms"]').tagName,'H2');
 }finally{window.close();}
});

test('Ask AI treats loading as status copy and the initial conversation as a section',()=>{
 const window=new JSDOM(read('discover.html')).window;
 try{
  const d=window.document,label=d.getElementById('ai-thinking-label');
  assert.ok(label?.textContent.trim());
  assert.equal(label.closest('h1,h2,h3,h4,h5,h6'),null,'Transient progress must not add a document section');
  const status=label.closest('[role="status"],[aria-live]');
  assert.ok(status,'Loading text remains available to assistive technology');
  assert.equal(d.querySelector('[data-i18n="chat.startTitle"]').tagName,'H2');
  assert.equal(d.querySelectorAll('h1').length,1);
 }finally{window.close();}
});
