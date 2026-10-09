'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const base=path.join(__dirname,'../android-studio/app/src/main');
const preview=fs.readFileSync(path.join(base,'assets/avatar-ai/home-preview.js'),'utf8');
const companion=fs.readFileSync(path.join(base,'assets/avatar-ai/companion-v44.js'),'utf8');
const main=fs.readFileSync(path.join(base,'java/com/jonas/papercup/MainActivity.kt'),'utf8');
const manifest=fs.readFileSync(path.join(base,'AndroidManifest.xml'),'utf8');
async function setup(){
 const dom=new JSDOM('<html lang="en"><head></head><body><section><article id="search-box"><div class="home-ask-composer"><input id="specific-search-input"><button class="gold-btn">Send</button><button id="mic-btn-index">Mic</button></div></article></section></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;w.matchMedia=()=>({matches:false});
 const events={mic:0,stop:0};
 w.MatchAppNativeVoice={setPersona(){},stopSpeaking(){events.stop++},start(){events.mic++},stopListening(){events.cancel=true},speak(text){events.greeting=text}};
 w.document.getElementById('mic-btn-index').onclick=()=>events.mic++;
 w.eval(preview);w.eval(companion);
 await new Promise(r=>setTimeout(r,20));
 return {dom,w,events,node:w.document.getElementById('ma-avatar-home')};
}
test('v44 companion is a circular, viewport-fixed, scroll-independent avatar',async()=>{
 const {dom,w,node}=await setup();
 try{
  assert.equal(node.parentElement,w.document.body);
  assert.equal(node.dataset.companionV44,'1');
  assert.equal(node.querySelector('#ma-av-state').parentElement,node);
  assert.equal(node.dataset.open,'false');
  assert.match(w.document.getElementById('ma-companion-v44-style').textContent,/position:fixed!important/);
  assert.match(w.document.getElementById('ma-companion-v44-style').textContent,/border-radius:50%!important/);
  assert.equal(w.document.querySelector('#search-box #ma-avatar-home'),null);
  assert.equal(w.document.querySelectorAll('#ma-avatar-home').length,1);
  assert.equal(node.querySelector('#ma-av-settings').parentElement,node.querySelector('.ma-av-controls'));
  w.eval(companion);assert.equal(w.document.querySelectorAll('#ma-avatar-home').length,1);
 }finally{dom.window.close()}
});
test('portrait opens chat, greets before listening, and close cancels the microphone',async()=>{
 const {dom,w,node,events}=await setup();
 try{
  node.querySelector('.ma-av-portrait').dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(node.dataset.open,'true');
  assert.equal(events.mic,0);
  assert.match(events.greeting,/Hi, I'm Jonas/);
  w.document.dispatchEvent(new w.CustomEvent('matchapp:avatar-speech',{detail:{speaking:true}}));
  w.document.dispatchEvent(new w.CustomEvent('matchapp:avatar-speech',{detail:{speaking:false}}));
  await new Promise(r=>setTimeout(r,220));
  assert.equal(events.mic,1);
  assert.equal(node.dataset.state,'listening');
  node.querySelector('#ma-av-dismiss').click();
  assert.equal(node.dataset.open,'false');
  assert.equal(events.cancel,true);
  assert.equal(node.querySelector('.ma-av-copy').inert,true);
  assert.ok(node.contains(w.document.querySelector('.home-ask-composer')));
  assert.ok(w.document.documentElement.classList.contains('ma-avatar-chat-installed'));
  assert.equal(w.document.getElementById('search-box').style.getPropertyPriority('display'),'important');
  assert.equal(w.document.getElementById('search-box').hidden,true);
  node.querySelector('#ma-av-menu').click();
  assert.equal(node.dataset.open,'true');
  node.querySelector('#ma-av-settings').click();
  assert.ok(w.document.querySelector('[data-av-auth="register"]'));
  w.document.querySelector('.ma-av-close').click();
  w.document.dispatchEvent(new w.CustomEvent('matchapp:avatar-speech',{detail:{speaking:true}}));
  assert.equal(node.dataset.state,'speaking');
  node.querySelector('#ma-av-stop').click();
  assert.equal(node.dataset.state,'idle');
 }finally{dom.window.close()}
});
test('wrong voice is handled locally rather than charging Ask AI',async()=>{
 const {dom,w,node}=await setup();
 try{
  assert.equal(w.matchappAvatarVoiceCommand('This voice is wrong for my avatar'),true);
  assert.equal(node.dataset.open,'true');
  assert.match(w.document.querySelector('#ma-av-reply').textContent,/male Android text-to-speech/);
  assert.equal(w.matchappAvatarVoiceCommand('What movie has a male singer?'),false);
  const field=w.document.getElementById('specific-search-input');
  field.value='Please change my avatar';
  const click=new w.MouseEvent('click',{bubbles:true,cancelable:true});
  w.document.querySelector('.gold-btn').dispatchEvent(click);
  assert.equal(click.defaultPrevented,true);assert.equal(field.value,'');
 }finally{dom.window.close()}
});
test('native speech recognition is embedded without opening Google dialog',()=>{
 assert.match(main,/SpeechRecognizer\.createSpeechRecognizer/);
 assert.match(main,/ActivityResultContracts\.RequestPermission/);
 assert.match(main,/setRecognitionListener/);
 assert.doesNotMatch(main,/voiceRecognizer\.launch/);
 assert.match(manifest,/android\.speech\.RecognitionService/);
 assert.match(main,/matchappAvatarVoiceCommand/);
 assert.match(main,/androidAvatarCompanionJs/);
});
