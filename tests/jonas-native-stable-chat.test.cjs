'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('jonas/android-ambient-assistant-20261011.js','utf8');
function scene({saveData=false}={}){
 const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;Object.defineProperty(w.navigator,'userAgent',{value:'MatchAppAiAndroid/74'});Object.defineProperty(w.navigator,'connection',{value:{saveData}});
 w.supabaseClient={};let idle;w.requestIdleCallback=fn=>{idle=fn};
 let speech=0;w.MatchAppJonasSpeech={unlock(){},stop(){},speak(){speech++;return new Promise(()=>{})}};
 w.eval(source);w.dispatchEvent(new w.Event('load'));
 return {w,close:()=>w.close(),warm:()=>idle?.(),speech:()=>speech};
}
test('native idle warmup creates one dormant conversation without speech and reuses it on repeated opens',()=>{
 const s=scene(),w=s.w;
 try{
  s.warm();const frame=w.document.querySelector('iframe');assert(frame);assert.equal(s.speech(),0);
  assert.equal(w.document.querySelector('#ma-ambient-panel').hidden,true);
  assert.equal(new URL(frame.src).searchParams.get('q'),null);
  w.MatchAppAmbientJonas.open();w.MatchAppAmbientJonas.close();w.MatchAppAmbientJonas.open();s.warm();
  assert.equal(w.document.querySelector('#ma-ambient-chat-frame'),frame);assert.equal(w.document.querySelectorAll('#ma-ambient-chat-frame').length,1);
 }finally{s.close()}
});
test('save-data sessions load only on tap; usable composer reveals before image load and stale documents cannot mark ready',()=>{
 const s=scene({saveData:true}),w=s.w;
 try{
  s.warm();assert.equal(w.document.querySelector('iframe'),null);w.MatchAppAmbientJonas.open();
  const panel=w.document.querySelector('#ma-ambient-panel'),frame=panel.querySelector('iframe'),doc=frame.contentDocument;
  assert.equal(panel.dataset.chatState,'loading');
  w.dispatchEvent(new w.CustomEvent('matchapp:jonas-ready',{detail:{document:w.document}}));assert.equal(panel.dataset.chatState,'loading');
  doc.open();doc.write('<html><body><textarea id="discover-new-input">My draft</textarea><div id="chat-log">Saved conversation</div></body></html>');doc.close();
  frame.contentWindow.newDiscoverSearch=()=>{};
  w.dispatchEvent(new w.CustomEvent('matchapp:jonas-ready',{detail:{document:doc}}));
  assert.equal(panel.dataset.chatState,'ready');assert.equal(panel.querySelector('.ja-chat-loading').hidden,true);
  w.MatchAppAmbientJonas.close();w.MatchAppAmbientJonas.open();assert.equal(frame.contentDocument.querySelector('textarea').value,'My draft');
  frame.dispatchEvent(new w.Event('load'));assert.equal(frame.contentDocument.querySelector('#chat-log').textContent,'Saved conversation');
 }finally{s.close()}
});
test('warming before a title is selected preserves contextual title handoff on the first open',()=>{
 const s=scene(),w=s.w;
 try{s.warm();const old=w.document.querySelector('iframe');w.currentMatchIdentity={title:'Arrival'};w.document.body.insertAdjacentHTML('beforeend','<div id="result-box" style="display:block"><h2 id="res-title">Arrival</h2></div>');w.MatchAppAmbientJonas.open();
  const frame=w.document.querySelector('iframe');assert.notEqual(frame,old);assert.equal(new URL(frame.src).searchParams.get('title'),'Arrival');
  assert.equal(w.document.querySelectorAll('#ma-ambient-chat-frame').length,1);
 }finally{s.close()}
});
