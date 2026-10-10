'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.join(__dirname,'..');
const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
const host=fs.readFileSync(path.join(root,'jonas/floating-home.js'),'utf8');
const voice=fs.readFileSync(path.join(root,'jonas/floating-voice.js'),'utf8');
const policy=fs.readFileSync(path.join(root,'jonas/male-voice-policy-20261010.js'),'utf8');
const css=fs.readFileSync(path.join(root,'jonas/floating-chat.css'),'utf8');
const markup=home.slice(home.indexOf('<aside id="ma-jonas-home"'),home.indexOf('</aside>',home.indexOf('<aside id="ma-jonas-home"'))+'</aside>'.length);
function fixture(){
 const dom=new JSDOM('<!doctype html><html lang="en"><body class="page-home"><section id="ma-ai-entry"><article id="search-box"><textarea id="specific-search-input"></textarea></article></section>'+markup+'</body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 const state={greeted:[],started:0,permission:0,aborted:0,submitted:0};
 w.matchMedia=()=>({matches:false});
 w.navigator.mediaDevices={getUserMedia:()=>{state.permission++;return Promise.resolve({getTracks:()=>[{stop:()=>{}}]})}};
 w.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
 w.speechSynthesis={cancel:()=>{},speak:u=>state.greeted.push(u),getVoices:()=>[{name:'Daniel',lang:'en-US',localService:true}]};
 w.SpeechRecognition=class{constructor(){state.rec=this}start(){state.started++}abort(){state.aborted++}};
 w.eval(host);
 const field=w.document.getElementById('ma-jonas-home-input');const add=field.addEventListener.bind(field);
 field.addEventListener=function(type,callback,options){if(type==='beforeinput')state.typed=callback;return add(type,callback,options)};
 w.eval(policy);w.eval(voice);
 const form=w.document.querySelector('.jh-form');form.requestSubmit=()=>state.submitted++;
 return {dom,w,doc:w.document,state};
}
test('a genuine bubble tap greets audibly without opening the microphone while speaking',async()=>{
 const {dom,w,doc,state}=fixture();doc.getElementById('ma-jonas-home-bubble').click();
 assert.equal(doc.getElementById('ma-jonas-home-panel').hidden,false);
 assert.equal(doc.getElementById('ma-jonas-home').parentElement,doc.body);
 assert.ok(doc.getElementById('ma-jonas-home').classList.contains('is-chat-stage'));
 assert.ok(doc.body.classList.contains('ma-jonas-chat-open'));
 assert.equal(state.greeted.length,1);assert.match(state.greeted[0].text,/Hi, I'm Jonas/);
 assert.equal(state.permission,0,'microphone capture must not mute the greeting');
 assert.equal(state.started,0,'wait for greeting to finish before listening');
 state.greeted[0].onend();assert.equal(state.started,1);
 assert.match(doc.getElementById('ma-jonas-home-status').textContent,/greeting|microphone/i);
 assert.match(css,/\.is-chat-stage/);
 dom.window.close();
});
test('Jonas prefers a matching masculine voice and moves his face only while speaking',()=>{
 const {dom,doc,w,state}=fixture();
 w.speechSynthesis.getVoices=()=>[
  {name:'Woman US',lang:'en-US',localService:true},
  {name:'Daniel',lang:'en-US',localService:true},
  {name:'Daniel French',lang:'fr-FR',localService:true}
 ];
 doc.getElementById('ma-jonas-home-bubble').click();
 assert.equal(state.greeted[0].voice.name,'Daniel');
 assert.equal(doc.getElementById('ma-jonas-home').classList.contains('jh-speaking'),false);
 state.greeted[0].onstart();
 assert.ok(doc.getElementById('ma-jonas-home').classList.contains('jh-speaking'));
 assert.ok(doc.getElementById('ma-jonas-home').classList.contains('jh-speaking'));
 assert.ok(doc.querySelector('.jh-mouth-layer'));
 state.greeted[0].onend();
 assert.ok(!doc.getElementById('ma-jonas-home').classList.contains('jh-speaking'));
 assert.match(doc.querySelector('.jh-medallion img').src,/\/rest\.jpg$/);
 dom.window.close();
});
test('recognized voice question goes through the existing authenticated /discover route',()=>{
 const {dom,doc,state}=fixture();doc.getElementById('ma-jonas-home-bubble').click();
 state.greeted[0].onend();
 state.rec.onresult({resultIndex:0,results:[Object.assign([{transcript:'Documentary series on Netflix Brazil'}],{isFinal:true})]});
 assert.equal(state.submitted,1);assert.match(doc.getElementById('ma-jonas-home-input').value,/Netflix Brazil/);
 assert.equal(doc.querySelector('.jh-form').getAttribute('action'),'/discover.html');
 dom.window.close();
});
test('closing stops recognition and restores inline placement, not a permanent bottom overlay',()=>{
 const {dom,doc,state}=fixture();doc.getElementById('ma-jonas-home-bubble').click();
 state.greeted[0].onend();doc.getElementById('ma-jonas-home-close').click();
 assert.equal(doc.getElementById('ma-jonas-home-panel').hidden,true);
 assert.equal(doc.getElementById('ma-jonas-home').classList.contains('is-chat-stage'),false);
 assert.ok(doc.querySelector('#ma-ai-entry>#ma-jonas-inline-dock>#ma-jonas-home'));
 assert.ok(state.aborted>0);assert.equal(doc.body.classList.contains('ma-jonas-chat-open'),false);
 dom.window.close();
});
test('dragging without a click never greets or turns on the microphone',()=>{
 const {dom,w,doc,state}=fixture();const btn=doc.getElementById('ma-jonas-home-bubble');
 const ev=(type,x,y)=>{const e=new w.MouseEvent(type,{bubbles:true,clientX:x,clientY:y,button:0});Object.defineProperty(e,'pointerId',{value:1});return e;};
 btn.dispatchEvent(ev('pointerdown',80,150));w.dispatchEvent(ev('pointermove',180,80));w.dispatchEvent(ev('pointerup',180,80));
 btn.click();
 assert.equal(state.greeted.length,0);assert.equal(state.permission,0);assert.equal(state.started,0);
 assert.equal(doc.getElementById('ma-jonas-home-panel').hidden,true);
 dom.window.close();
});
test('explicit text mode disables voice but leaves the official text form usable',()=>{
 const {dom,doc,state}=fixture();doc.getElementById('ma-jonas-home-bubble').click();
 const field=doc.getElementById('ma-jonas-home-input');
 state.typed({isTrusted:true});
 state.greeted[0].onend();
 assert.equal(state.started,0);
 assert.match(doc.getElementById('ma-jonas-home-status').textContent,/Text mode/);
 field.value='Find a great drama';doc.querySelector('.jh-form').requestSubmit();
 assert.equal(state.submitted,1);
 dom.window.close();
});

test('female-only voices never produce speech; microphone/text remain functional',()=>{
 const {dom,w,doc,state}=fixture();
 w.speechSynthesis.getVoices=()=>[
  {name:'Samantha',lang:'en-US',localService:true},
  {name:'Google US English',lang:'en-US',localService:true}
 ];
 doc.getElementById('ma-jonas-home-bubble').click();
 assert.equal(state.greeted.length,0,'no female or unspecified synthesized greeting');
 assert.equal(state.started,1,'speech recognition still starts');
 assert.match(doc.getElementById('ma-jonas-home-input').getAttribute('name'),/q/);
 dom.window.close();
});
test('no enumerated voices never triggers browser default voice',()=>{
 const {dom,w,doc,state}=fixture();
 w.speechSynthesis.getVoices=()=>[];
 doc.getElementById('ma-jonas-home-bubble').click();
 assert.equal(state.greeted.length,0);
 assert.equal(state.started,1);
 dom.window.close();
});
