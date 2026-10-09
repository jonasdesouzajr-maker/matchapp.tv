'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const src=fs.readFileSync(path.join(root,'jonas-chat-plus.js'),'utf8');
const android=fs.readFileSync(path.join(root,'android-studio/app/src/main/assets/avatar-ai/jonas-chat-plus.js'),'utf8');
const native=fs.readFileSync(path.join(root,'android-studio/app/src/main/assets/avatar-ai/companion-v44.js'),'utf8');
const kotlin=fs.readFileSync(path.join(root,'android-studio/app/src/main/java/com/jonas/papercup/MainActivity.kt'),'utf8');

function setup(hasSession=true,subscriptionActive=true,url='https://matchapp.tv/together.html'){
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><main id="main"></main></body></html>',{
  url,runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window;w.MatchAppNativeVoice={};
 let calls=0;
 w.supabaseClient={
  auth:{getSession:async()=>({data:{session:hasSession?{user:{id:'test-user'}}:null}})},
  functions:{invoke:async(name,{body})=>{
   calls++;
   assert.equal(name,'jonas-chat');
   if(body.action==='status')return{data:{active:subscriptionActive,status:subscriptionActive?'active':'none',remaining:{day:29,week:149,cycle:449}},error:null};
   throw Error('Other actions not expected during subscription check');
  }}
 };
 w.eval(src);
 return{dom,w,getCalls:()=>calls};
}
test('subscriber taps sole Jonas on any Android adult page and opens paid conversation',async()=>{
 const {dom,w,getCalls}=setup(true,true);
 try{
  assert.equal(typeof w.MatchAppJonasPlus.openFromBubble,'function');
  assert.equal(w.document.querySelector('#jonas-plus-entry'),null);
  assert.equal(await w.MatchAppJonasPlus.openFromBubble(),true);
  assert.equal(getCalls(),1);
  assert.equal(w.document.querySelector('#jonas-plus-box')?.hidden,false);
  assert.equal(w.document.querySelector('#jonas-plus-shade')?.hidden,false);
 }finally{dom.window.close();}
});
test('inactive subscriber keeps original Ask AI route instead of bypassing credits',async()=>{
 const {dom,w,getCalls}=setup(true,false);
 try{
  assert.equal(await w.MatchAppJonasPlus.openFromBubble(),false);
  assert.equal(getCalls(),1);
  assert.equal(w.document.querySelector('#jonas-plus-box'),null);
 }finally{dom.window.close();}
});
test('guest cannot use paid chat or create a Stripe purchase in Play WebView',async()=>{
 const {dom,w,getCalls}=setup(false,false,'https://matchapp.tv/');
 try{
  assert.equal(await w.MatchAppJonasPlus.openFromBubble(),false);
  assert.equal(getCalls(),0);
  assert.equal(w.document.querySelector('#jonas-plus-entry'),null);
  assert.match(src,/if\(play\(\)\)return/);
 }finally{dom.window.close();}
});
test('Android uses bundled first-party JS and a single shared draggable bubble',()=>{
 assert.equal(android,src);
 assert.match(kotlin,/assets\.open\("avatar-ai\/jonas-chat-plus\.js"\)/);
 assert.match(kotlin,/androidAvatarCompanionJs \+ ";" \+ jonasPaidChatJs/);
 assert.match(native,/plus\.openFromBubble\(\)/);
 assert.match(native,/openingPlus/);
 assert.match(native,/pointerdown/);
 assert.match(native,/dragMove/);
 assert.doesNotMatch(native,/Aureya is/i);
});
