'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../android-studio/app/src/main/assets/avatar-ai/home-preview.js'),'utf8');
async function setup(signed=false){
 const dom=new JSDOM('<html lang="en"><head></head><body><section><div id="trending-rail"></div><section id="ma-ai-entry"><article id="search-box"><div class="home-ask-composer"><input id="specific-search-input"><button class="gold-btn">Send</button><button id="mic-btn-index">Mic</button></div></article></section></section><a id="matchapp-kids-entry">Kids</a></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window,calls={persona:[],spoken:[],mic:0,stop:0};
 w.MATCH_LANG='en';w.matchMedia=()=>({matches:false});
 w.MatchAppNativeVoice={setPersona:p=>calls.persona.push(p),speak:t=>calls.spoken.push(t),stopSpeaking:()=>calls.stop++};
 w.document.getElementById('mic-btn-index').onclick=()=>calls.mic++;
 if(signed)w.localStorage.setItem('sb-test-auth-token',JSON.stringify({user:{id:'test-user'},access_token:'mock-local-only'}));
 w.eval(source);await new Promise(r=>setTimeout(r,10));return {dom,w,calls};
}
test('reference artwork replaces regenerated portrait; mic and speech states are live',async()=>{
 const {dom,w,calls}=await setup();try{
  const d=w.document,node=d.getElementById('ma-avatar-home');
  assert.equal(node.dataset.persona,'jonas');assert.equal(calls.persona.at(-1),'jonas');
  assert.ok(d.getElementById('ma-android-avatar-preview-style').textContent.includes('approved-reference.jpg'));
  assert.equal(d.getElementById('ma-av-photo').getAttribute('src'),null);
  d.getElementById('ma-av-talk').click();assert.equal(calls.mic,1);assert.equal(node.dataset.state,'listening');
  d.dispatchEvent(new w.CustomEvent('matchapp:avatar-speech',{detail:{speaking:true}}));
  assert.equal(node.dataset.state,'speaking');assert.equal(d.getElementById('ma-av-stop').hidden,false);
  d.getElementById('ma-av-stop').click();assert.equal(calls.stop,2);assert.equal(node.dataset.state,'idle');
  assert.equal(w.getComputedStyle(d.getElementById('matchapp-kids-entry')).display,'none');
 }finally{dom.window.close()}
});
test('typed greeting stays silent; spoken greeting uses selected persona and reply stays readable',async()=>{
 const {dom,w,calls}=await setup();try{
  const d=w.document,input=d.getElementById('specific-search-input'),send=d.querySelector('.gold-btn');
  input.value='Hello';send.click();assert.equal(calls.spoken.length,0);assert.match(d.getElementById('ma-av-reply').textContent,/Jonas/);
  w.MatchAppVoiceOrigin={consume:()=>true};input.value='Hello';send.click();
  assert.equal(calls.spoken.length,1);assert.equal(calls.persona.at(-1),'jonas');
  const reply=d.getElementById('ma-av-reply').textContent;
  d.dispatchEvent(new w.CustomEvent('matchapp:avatar-voice-unavailable'));
  assert.equal(d.getElementById('ma-av-reply').textContent,reply);
  input.value='Hello Kitty';const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});send.dispatchEvent(click);assert.equal(click.defaultPrevented,false);
 }finally{dom.window.close()}
});
test('Jonas is the only account avatar; obsolete persona choices cannot override him',async()=>{
 const {dom,w,calls}=await setup(true);try{
  w.localStorage.setItem('matchapp_android_ai_persona_test-user','aureya');
  w.document.getElementById('ma-av-settings').click();
  assert.equal(w.document.querySelector('[data-persona="aureya"]'),null);
  assert.equal(w.document.getElementById('ma-avatar-home').dataset.persona,'jonas');
  assert.equal(calls.persona.at(-1),'jonas');
  w.eval(source);
  assert.equal(w.document.querySelectorAll('#ma-avatar-home').length,1);
  assert.equal(w.document.getElementById('ma-avatar-home').dataset.persona,'jonas');
 }finally{dom.window.close()}
 const guest=await setup();try{
  guest.w.document.getElementById('ma-av-settings').click();
  assert.equal(guest.w.document.querySelector('[data-persona="aureya"]'),null);
  assert.ok(guest.w.document.querySelector('[data-av-auth="register"]'));
 }finally{guest.dom.window.close()}
});
