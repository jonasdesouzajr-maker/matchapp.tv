'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..','android-studio','app','src','main');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const preview=read('assets/avatar-ai/home-preview.js');
const companion=read('assets/avatar-ai/companion-v44.js');
const premium=read('assets/avatar-ai/premium-jonas.js');
const main=read('java/com/jonas/papercup/MainActivity.kt');
async function setup(lang='en'){
 const dom=new JSDOM('<!doctype html><html lang="'+lang+'"><head></head><body><main><section id="search-box"><div class="home-ask-composer"><textarea id="specific-search-input"></textarea><button class="gold-btn">Send</button><button id="mic-btn-index">Mic</button></div></section></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:false});
 w.document.documentElement.classList.add('matchapp-ai-android');
 const counters={speaks:0,mics:0};
 w.MatchAppNativeVoice={setPersona(){},stopSpeaking(){},stopListening(){},speak(){counters.speaks++}};
 w.document.getElementById('mic-btn-index').addEventListener('click',()=>counters.mics++);
 w.eval(preview);w.eval(companion);w.eval(premium);
 await new Promise(r=>setTimeout(r,45));
 return {dom,w,counters};
}
test('premium Jonas is unique, draggable and opens silently with a concise welcome',async()=>{
 const {dom,w,counters}=await setup();
 try{
  const root=w.document.querySelector('#ma-avatar-home');
  assert.ok(root,'missing persistent companion');
  assert.equal(root.parentElement,w.document.body,'avatar must stay scroll-independent');
  assert.equal(root.dataset.open,'false');
  assert.equal(w.document.querySelectorAll('#ma-jonas-premium-47').length,1);
  root.querySelector('.ma-av-portrait').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(root.dataset.open,'true');
  assert.equal(counters.speaks,0,'opening must not activate automatic TTS');
  assert.equal(counters.mics,0,'opening must not activate microphone');
  assert.match(root.querySelector('#ma-av-reply').textContent,/Hi! I'm Jonas/);
  assert.equal(root.querySelector('#ma-av-name').textContent,'Jonas ✦');
  assert.equal(root.querySelector('.ma-av-copy').contains(w.document.querySelector('.home-ask-composer')),true);
  assert.match(w.document.querySelector('#ma-jonas-premium-47').textContent,/height:min\(455px/);
  assert.match(main,/avatar-ai\/premium-jonas\.js/);
  assert.match(main,/jonasPremiumJs/);
 }finally{dom.window.close()}
});
test('voice errors do not overwrite existing Jonas answer and are dismissible',async()=>{
 const {dom,w,counters}=await setup('pt-BR');
 try{
  const root=w.document.getElementById('ma-avatar-home');
  w.__matchappCompanionV44.open(false);
  const reply=root.querySelector('#ma-av-reply');
  w.matchappAndroidAvatarHome.showReply('Uma resposta útil e detalhada');
  w.document.dispatchEvent(new w.CustomEvent('matchapp:voice-error',{detail:{code:'unavailable'}}));
  const notice=root.querySelector('#ma-jonas-voice-notice');
  assert.ok(notice);
  assert.match(notice.textContent,/Microfone/);
  assert.equal(reply.textContent,'Uma resposta útil e detalhada');
  w.__matchappCompanionV44.close();
  assert.equal(root.dataset.open,'false');
  assert.equal(counters.mics,0);
 }finally{dom.window.close()}
});
test('premium design remains isolated from Kids and preserves native account and credit functions',()=>{
 assert.match(premium,/\/kids/);
 assert.match(premium,/home-ask-composer/);
 assert.match(premium,/reduced-motion/);
 assert.match(premium,/Jonas/);
 assert.doesNotMatch(premium,/fetch\(|supabase\.from|OPENAI_API_KEY/);
 assert.match(companion,/newDiscoverSearch\(\)/);
 assert.match(companion,/matchapp-jonas-global-position-v1/);
});
