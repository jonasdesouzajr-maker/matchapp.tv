'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const app=path.join(root,'android-studio','app','src','main');
const read=p=>fs.readFileSync(path.join(app,p),'utf8');
const premium=read('assets/avatar-ai/premium-jonas.js');
const voice=read('assets/avatar-ai/index.html');
const previewHtml=read('assets/jonas/index.html');
const previewCss=read('assets/jonas/experience.css');
const previewJs=read('assets/jonas/jonas.js');

test('runtime Jonas chat keeps a pinned circular face inside the visible sheet',async()=>{
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><main><section id="search-box"><div class="home-ask-composer"><textarea id="specific-search-input"></textarea><button class="gold-btn">Send</button><button id="mic-btn-index">Mic</button></div></section></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.matchMedia=()=>({matches:false});
 w.innerWidth=390;w.innerHeight=844;
 w.MatchAppNativeVoice={setPersona(){},stopSpeaking(){},stopListening(){},speak(){}};
 w.eval(read('assets/avatar-ai/home-preview.js'));
 w.eval(read('assets/avatar-ai/companion-v44.js'));
 w.eval(premium);
 await new Promise(r=>setTimeout(r,40));
 try{
  const node=w.document.getElementById('ma-avatar-home');
  node.dataset.open='true';
  w.__matchappJonasPremium47.placeSheet();
  const css=w.document.getElementById('ma-jonas-premium-47').textContent;
  assert.match(css,/border-radius:50%/);
  assert.match(css,/object-fit:cover/);
  assert.match(css,/overflow-y:auto/);
  assert.match(css,/height:min\(455px/);
  assert.match(css,/min-width:720px/);
  assert.match(css,/min-width:1000px/);
  assert.equal(node.querySelectorAll('.ma-jonas-frame').length,2);
  assert.ok(node.querySelector('.ma-av-copy').contains(w.document.querySelector('.home-ask-composer')));
  assert.equal(node.querySelector('.ma-av-chat-content').contains(w.document.querySelector('.home-ask-composer')),false);
  const top=node.style.getPropertyValue('top');
  const height=parseFloat(node.style.getPropertyValue('height'));
  assert.ok(top.endsWith('px'));
  assert.ok(height>=220&&height<=455);
  assert.doesNotMatch(premium,/fetch\(|stripe-checkout|OPENAI_API_KEY/);
 }finally{dom.window.close()}
});

test('Jonas Plus copy explains plan, limits, refresh, and disabled Play billing without bypassing entitlement',()=>{
 assert.match(premium,/30 chats \/ 24h/);
 assert.match(premium,/Refresh status/);
 assert.match(premium,/Google Play billing is not active/);
 assert.match(premium,/Stripe checkout is blocked/);
 assert.match(premium,/plus\.refresh/);
 assert.doesNotMatch(premium,/startVerifiedCheckout|functions\.invoke/);
 assert.match(previewHtml,/30 chats every 24 hours/);
 assert.match(previewHtml,/restore, and manage stay unavailable/);
 assert.match(previewHtml,/does not sell a plan/);
 assert.doesNotMatch(previewHtml,/checkout\.stripe\.com/);
});

test('preview sheet pins the circular avatar outside the scrolling transcript',()=>{
 assert.match(previewHtml,/id="sheet-face"/);
 assert.match(previewHtml,/id="sheet-expression"/);
 assert.match(previewCss,/sheet-presence\{position:relative;width:72px;height:72px/);
 assert.match(previewCss,/border-radius:50%/);
 assert.match(previewCss,/--keyboard/);
 assert.match(previewCss,/chat-is-open \.jonas-bubble/);
 assert.match(previewCss,/min-width:840px/);
 assert.match(previewJs,/sheet-face/);
 assert.match(previewJs,/className = "retry-ask"/);
 assert.match(previewJs,/trackKeyboard/);
 assert.doesNotThrow(()=>new vm.Script(previewJs,{filename:'jonas-preview.js'}));
 assert.doesNotMatch(previewHtml,/Python preview/);
});

test('voice stage stays a single local script and a circular created face',()=>{
 assert.match(voice,/border-radius:50%/);
 assert.match(voice,/min-width:840px/);
 assert.match(voice,/safe-area-inset/);
 assert.match(voice,/data-mode="error"/);
 assert.match(voice,/visemeAmount/);
 assert.match(voice,/not phoneme-accurate lip-sync/i);
 assert.match(voice,/img\.src="created-avatar\.jpg"/);
 assert.match(voice,/class="stage-copy"/);
 assert.match(voice,/stage-copy[\s\S]*id="wave"[\s\S]*<\/div><\/main>/);
 assert.match(voice,/grid-column:2;grid-row:3/);
 assert.match(voice,/canvas\.ellipse\(/);
 assert.doesNotMatch(voice,/visemeAmount\(currentViseme\)\*speech\)\*\.04/);
 const scripts=[...voice.matchAll(/<script>([\s\S]*?)<\/script>/gi)];
 assert.equal(scripts.length,1);
 assert.doesNotThrow(()=>new vm.Script(scripts[0][1],{filename:'voice-avatar-index.js'}));
});

test('python files are tooling, not the Android interface',()=>{
 const icon=fs.readFileSync(path.join(root,'android-studio','scripts','design_jonas_icon.py'),'utf8');
 const verify=fs.readFileSync(path.join(root,'android-studio','scripts','verify_adult_release.py'),'utf8');
 assert.match(icon,/ImageDraw|PIL/);
 assert.match(verify,/aab|bundle|release/i);
 assert.doesNotMatch(icon+verify,/tkinter|flask|streamlit|gradio/i);
});
