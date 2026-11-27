'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(require.resolve('../'+f),'utf8');
const base='https://play.google.com/store/apps/details?id=com.jonas.papercup';
function page() {
 const dom=new JSDOM(read('android/index.html'),{url:'https://matchapp.tv/android/?invite=private&lang=en',runScripts:'outside-only'});
 dom.window.eval(read('android/play-attribution.js'));
 return dom;
}
test('Store link retains its plain no-JS fallback and adds only fixed campaign attribution on click',()=>{
 const dom=page();
 try {
  const w=dom.window,a=w.document.querySelector('main a.cta');
  assert.equal(a.href,base);
  a.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  const url=new URL(a.href);
  assert.equal(url.origin,'https://play.google.com');
  assert.equal(url.searchParams.get('id'),'com.jonas.papercup');
  const p=new URLSearchParams(url.searchParams.get('referrer'));
  assert.deepEqual(Object.fromEntries(p),{
   utm_source:'matchapp_tv',utm_medium:'web_to_app',
   utm_campaign:'android_landing',utm_content:'primary_cta'
  });
  assert.ok(!a.href.includes('private'));
  a.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(new URLSearchParams(new URL(a.href).searchParams.get('referrer')).get('utm_campaign'),'android_landing');
 }finally{dom.window.close();}
});
test('Store click event requires analytics consent and never sends private data',()=>{
 const dom=page();
 try{
  const w=dom.window,a=w.document.querySelector('main a.cta'),events=[];
  w.gtag=(...args)=>events.push(args);
  a.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(events.length,0,'no event without affirmative consent');
  w.dataLayer=[['consent','default',{analytics_storage:'denied'}],['consent','update',{analytics_storage:'granted'}]];
  a.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(events.length,1);
  assert.equal(events[0][0],'event');
  assert.equal(events[0][1],'app_store_clicked');
  assert.deepEqual(Object.keys(events[0][2]).sort(),['growth_campaign','growth_surface','transport_type']);
  assert.ok(!JSON.stringify(events).includes('private'));
  w.localStorage.setItem('match_cookie_choice','essential');
  a.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(events.length,1,'essential-only overrides analytics grant');
 }finally{dom.window.close();}
});
