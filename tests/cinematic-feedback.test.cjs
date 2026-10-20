'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../patches/immersive-feedback-20261014.js'),'utf8');
function fixture({route='/',stored={}}={}){
 const w=new JSDOM('<!doctype html><html><body><button id="action" class="ma-primary">Action</button><a id="nav" href="/explore.html">Explore</a><button id="save" data-action="save">Save</button><button id="mute" class="sound-toggle-btn">Sound</button><button id="mic" data-action="mic">Mic</button></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true}).window;
 let now=1000;const handlers=[],timers=[],stats={notes:[],noise:[],contexts:0,fetches:0,stopped:0,vibrations:[]};
 w.Date.now=()=>now;w.matchMedia=()=>({matches:false});w.navigator.vibrate=p=>stats.vibrations.push(p);w.setTimeout=fn=>(timers.push(fn),timers.length);
 for(const [key,value] of Object.entries(stored))w.sessionStorage.setItem(key,value);
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}}),node=()=>({connect(){},disconnect(){},stop(){stats.stopped++;}});
 w.AudioContext=class{constructor(){stats.contexts++;this.currentTime=0;this.state='running';this.destination={};this.sampleRate=24000;}
  createGain(){return {...node(),gain:param()};}createBiquadFilter(){return {...node(),frequency:param()};}
  createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){return{...node(),start(time){stats.noise.push(time);}};}
  createOscillator(){return{...node(),frequency:{setValueAtTime(value){stats.notes.push(value);}},start(){}};}
 };
 w.fetch=()=>{stats.fetches++;return Promise.reject(Error('offline'));};w.playMatchAppSound=w.maPlayUISound=()=>assert.fail('legacy engine must be replaced');
 const add=w.document.addEventListener.bind(w.document);w.document.addEventListener=(type,fn,options)=>{if(type==='click'&&options?.capture)handlers.push(fn);return add(type,fn,options);};
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,stats,advance(ms=200){now+=ms;},flush(){while(timers.length)timers.shift()();},click(id,trusted=true){for(const fn of handlers)fn({isTrusted:trusted,target:w.document.getElementById(id)});},close(){w.close();}};
}
const evidence={provider:'stripe',reference:'cs_live_confirmed123',delivered:true};
test('cinematic cues share one engine, suppress duplicate handlers and use original clapper/reel/save graphs',()=>{
 const f=fixture();try{
  assert.equal(f.stats.contexts,0);f.click('action',false);f.flush();assert.equal(f.stats.notes.length,0);
  f.click('action');f.w.playMatchAppSound('primary');f.w.maPlayUISound('tap');f.flush();
  assert.equal(f.stats.contexts,1);assert.equal(f.stats.notes.length,9);assert.equal(f.stats.notes[0],190);assert.equal(f.stats.noise.length,2);assert.equal(f.stats.fetches,0);
  f.advance();f.click('nav');f.flush();assert.equal(f.stats.notes.length,12);assert.equal(f.stats.noise.length,5,'three deliberate reel ticks');
  f.advance();f.click('save');f.flush();assert.equal(f.stats.notes.length,18);assert.equal(f.stats.notes.at(-6),659.25);assert.equal(f.stats.contexts,1);assert.equal(f.stats.fetches,0);
  f.advance();for(const event of ['hashchange','popstate','pageshow'])f.w.dispatchEvent(new f.w.Event(event));assert.equal(f.stats.notes.length,18,'automatic navigation never schedules a reel');
 }finally{f.close();}
});
test('genuine result entry point plays a bling once per match run even during a click intent',()=>{
 const f=fixture();try{
  f.w.__matchappMatchRunId='match-one';f.w.playMatchAppSound('result');assert.equal(f.stats.notes.length,0,'no gesture means silence');
  f.click('action');f.w.playMatchAppSound('result');f.w.maPlayUISound('result');f.flush();
  assert.equal(f.stats.notes.length,12);assert.equal(f.stats.notes[0],783.99);assert.equal(f.stats.noise.length,1);
  f.advance();f.w.playMatchAppSound('result');assert.equal(f.stats.notes.length,12,'same completed run is silent');
  f.w.__matchappMatchRunId='match-two';f.w.playMatchAppSound('result');assert.equal(f.stats.notes.length,24);
 }finally{f.close();}
});
test('cash cannot be requested through generic sound entry points, receipt flags or non-Boolean proof',()=>{
 const f=fixture({route:'/purchase.html?session_id=cs_live_confirmed123&delivered=true'});try{
  f.click('action');f.flush();f.advance();const notes=f.stats.notes.length;
  for(const kind of ['cash','purchase','purchaseCash','chaChing']){assert.equal(f.w.MatchAppFeedback.play(kind),false);f.w.playMatchAppSound(kind);}
  for(const value of [null,{...evidence,delivered:false},{...evidence,delivered:'true'},{...evidence,reference:'garbage'},{...evidence,provider:'other'}])assert.equal(f.w.MatchAppFeedback.purchaseConfirmed(value),false);
  assert.equal(f.stats.notes.length,notes);
 }finally{f.close();}
});
test('verified purchase cues queue behind a deliberate gesture and speech, and replayed receipts stay silent',()=>{
 const f=fixture();try{
  assert.equal(f.w.MatchAppFeedback.purchaseConfirmed(evidence),true);assert.equal(f.stats.contexts,0);assert.equal(f.stats.notes.length,0);
  f.w.speechSynthesis={speaking:true};f.click('action');f.flush();assert.equal(f.stats.notes.length,0);
  f.w.speechSynthesis.speaking=false;f.advance();f.click('action');f.flush();assert.equal(f.stats.notes.length,9);assert.equal(f.stats.notes[0],1174.66);assert.equal(f.stats.noise.length,3);
  f.advance();assert.equal(f.w.MatchAppFeedback.purchaseConfirmed(evidence),false);assert.equal(f.stats.notes.length,9);
  assert.equal(f.w.sessionStorage.getItem('match_cinematic_purchase_pending_v1'),null);assert.equal(f.stats.contexts,1);
 }finally{f.close();}
});
test('mute consumes verified purchase quietly and stops a currently playing cue without unmuted replay',()=>{
 const f=fixture();try{
  f.w.localStorage.setItem('match_soundEnabled','false');f.w.MatchAppFeedback.purchaseConfirmed(evidence);f.click('action');f.flush();assert.equal(f.stats.notes.length,0);
  f.w.localStorage.setItem('match_soundEnabled','true');f.advance();f.click('mute');f.flush();assert.equal(f.w.MatchAppFeedback.purchaseConfirmed(evidence),false);assert.equal(f.stats.notes.length,0);
  f.w.MatchAppFeedback.purchaseConfirmed({...evidence,reference:'cs_live_second123'});assert.equal(f.stats.notes.length,9);
  const stopped=f.stats.stopped;f.click('mute');f.w.localStorage.setItem('match_soundEnabled','false');f.flush();assert.ok(f.stats.stopped>stopped);assert.equal(f.stats.notes.length,9);
 }finally{f.close();}
});
test('verified receipt identity survives checkout navigation and suppresses purchase replay after reload',()=>{
 let stored={};const first=fixture();try{
  first.w.MatchAppFeedback.purchaseConfirmed(evidence);assert.equal(first.stats.notes.length,0);
  stored=Object.fromEntries(Object.entries(first.w.sessionStorage));
 }finally{first.close();}
 const returned=fixture({stored});try{
  assert.equal(returned.stats.notes.length,0,'restoring queued confirmation has no startup audio');
  returned.click('action');returned.flush();assert.equal(returned.stats.notes.length,9);assert.equal(returned.stats.notes[0],1174.66);
  stored=Object.fromEntries(Object.entries(returned.w.sessionStorage));
 }finally{returned.close();}
 const reloaded=fixture({stored});try{
  reloaded.click('mute');reloaded.flush();assert.equal(reloaded.w.MatchAppFeedback.purchaseConfirmed(evidence),false);assert.equal(reloaded.stats.notes.length,0,'same verified receipt is silent after reload');
 }finally{reloaded.close();}
});
test('stored verified cues expire, reject malformed timestamps and stay isolated from Kids',()=>{
 const key='match_cinematic_purchase_pending_v1';
 for(const at of [undefined,NaN,-100000,100000]){const f=fixture({stored:{[key]:JSON.stringify({...evidence,at})}});try{f.click('action');f.flush();assert.equal(f.stats.notes[0],190,'invalid stored cue leaves ordinary clapper');assert.equal(f.w.sessionStorage.getItem(key),null);}finally{f.close();}}
 const f=fixture({route:'/kids/'});try{assert.equal(f.w.MatchAppFeedback,undefined);assert.equal(f.stats.contexts,0);}finally{f.close();}
});
