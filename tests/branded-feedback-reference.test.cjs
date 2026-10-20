'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),code=fs.readFileSync(path.join(root,'patches/immersive-feedback-20261014.js'),'utf8');
function fixture(route='/'){
 const dom=new JSDOM('<!doctype html><html><body><button id="tap">Tap</button><button id="ok" class="gold-btn">Confirm</button><button id="mute" class="sound-toggle-btn">Sound</button><button id="blocked" aria-disabled="true">Blocked</button><details><summary id="fold">Fold</summary><p>Panel</p></details></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,stats={notes:[],contexts:0,legacy:0,vibrations:[],fetches:0},listeners=[];
 w.matchMedia=()=>({matches:false});w.navigator.vibrate=p=>stats.vibrations.push(p);
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
 w.AudioContext=class{constructor(){stats.contexts++;this.state='running';this.currentTime=0;this.destination={};}createOscillator(){return{type:'',frequency:{setValueAtTime(f){stats.notes.push(f)}},connect(){},disconnect(){},start(){},stop(){}}}createGain(){return{gain:param(),connect(){},disconnect(){}}}};
 w.fetch=()=>{stats.fetches++;return Promise.reject(Error('offline test'))};
 w.playMatchAppSound=w.maPlayUISound=()=>stats.legacy++;
 const add=w.document.addEventListener.bind(w.document);
 w.document.addEventListener=(name,fn,opt)=>{if(name==='click'&&opt?.capture)listeners.push(fn);return add(name,fn,opt)};
 w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return{w,stats,close:()=>dom.window.close(),click(id){const target=w.document.getElementById(id);listeners.forEach(fn=>fn({isTrusted:true,target}));},listeners};
}
const tick=()=>new Promise(r=>setTimeout(r,10));
test('no initialization or programmatic action plays sound before the first deliberate gesture',()=>{
 const f=fixture();f.w.playMatchAppSound('open');assert.equal(f.stats.contexts,0);assert.equal(f.stats.fetches,0);assert.equal(f.stats.vibrations.length,0);f.close();
});
test('one real action replaces both legacy cue owners with one original glass cue and keeps handlers untouched',async()=>{
 const f=fixture();let handlerRuns=0;f.w.document.getElementById('ok').onclick=()=>handlerRuns++;
 f.click('ok');f.w.document.getElementById('ok').onclick();f.w.playMatchAppSound('nav');f.w.maPlayUISound('primary');await tick();
 assert.equal(handlerRuns,1);assert.equal(f.stats.legacy,0);assert.equal(f.stats.notes.length,9);assert.equal(f.stats.fetches,1);assert.equal(f.stats.vibrations.length,1);assert.equal(f.stats.contexts,1);f.close();
});
test('sound mute, haptic opt out, reduced motion and speech priority are authoritative',async()=>{
 for(const mode of ['mute','haptics','motion','speech']){
  const f=fixture();if(mode==='mute')f.w.localStorage.setItem('match_soundEnabled','false');if(mode==='haptics')f.w.localStorage.setItem('match_hapticsEnabled','false');if(mode==='motion')f.w.document.documentElement.classList.add('reduce-motion');if(mode==='speech')f.w.speechSynthesis={speaking:true};
  f.click('tap');await tick();if(mode==='mute'||mode==='speech')assert.equal(f.stats.notes.length,0,mode);else assert.ok(f.stats.notes.length>0,mode);
  if(mode==='haptics'||mode==='motion')assert.equal(f.stats.vibrations.length,0,mode);f.close();
 }
});
test('muting is silent and enabling sound can play one deliberate confirmation',async()=>{
 const f=fixture();f.click('mute');f.w.localStorage.setItem('match_soundEnabled','false');f.w.playMatchAppSound('soundOn');await tick();assert.equal(f.stats.notes.length,0);f.w.localStorage.setItem('match_soundEnabled','true');f.click('mute');f.w.playMatchAppSound('soundOn');assert.equal(f.stats.notes.length,9);f.close();
});
test('disabled controls and ad inventory never get a feedback cue',async()=>{
 const f=fixture();f.click('blocked');f.w.playMatchAppSound('nav');await tick();assert.equal(f.stats.notes.length,0);assert.equal(f.stats.vibrations.length,0);f.close();
});
test('adult feedback is idempotent and isolated from Kids and authentication callback surfaces',()=>{
 const f=fixture();f.w.eval(code);assert.equal(f.listeners.length,1);f.close();for(const route of ['/kids/','/oauth/consent.html','/private-voice/','/callback.html']){const x=fixture(route);assert.equal(x.w.MatchAppFeedback,undefined,route);x.close();}
});
test('all bundled cues are short original PCM audio with honest authorship',()=>{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'assets/audio/matchapp-sources.json'),'utf8'));assert.equal(Object.keys(manifest.cues).length,7);assert.match(manifest.authorship,/Original local procedural/);
 for(const cue of Object.values(manifest.cues)){const data=fs.readFileSync(path.join(root,'assets/audio',cue.file));assert.equal(data.toString('ascii',0,4),'RIFF');assert.equal(data.toString('ascii',8,12),'WAVE');assert.equal(data.readUInt32LE(24),24000);assert.ok(cue.durationSeconds<=.35);}
});
