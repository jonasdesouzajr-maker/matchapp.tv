'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../patches/immersive-feedback-20261014.js'),'utf8');
const destinations=['home','explore','matches','mylist','profile'];
function fixture(options={}){
 const anchors=destinations.map((id,i)=>'<a id="'+id+'" data-ma-dock-destination="'+id+'" href="'+['/','/explore.html','/#questionnaire-box','/profile/profile.html#tab-watchlater','/profile/profile.html'][i]+'"><span>'+id+'</span></a>').join('');
 const dom=new JSDOM('<!doctype html><html><body><nav class="ma-cinema-dock">'+anchors+'</nav><a id="other" data-ma-dock-destination="home" href="/about.html">Other link</a><button id="tap">Tap</button></body></html>',{url:'https://matchapp.tv/contact.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,stats={contexts:0,notes:[],starts:[],stops:[],vibrations:[],fetches:[],legacy:0,timers:0},handlers=[];let now=1000;
 w.Date.now=()=>now;w.matchMedia=()=>({matches:!!options.reduced});w.navigator.vibrate=p=>stats.vibrations.push(p);
 const param=()=>({setValueAtTime(){},exponentialRampToValueAtTime(){}});
 w.AudioContext=class{
  constructor(){stats.contexts++;this.state='running';this.currentTime=0;this.destination={};}
  createOscillator(){return{frequency:{setValueAtTime(n){stats.notes.push(n)}},connect(){},disconnect(){},start(at){stats.starts.push(at)},stop(at){stats.stops.push(at)}}}
  createGain(){return{gain:param(),connect(){},disconnect(){}}}
 };
 w.fetch=url=>{stats.fetches.push(url);return Promise.reject(Error('No extra navigation assets are requested'));};
 w.playMatchAppSound=w.maPlayUISound=()=>stats.legacy++;
 const add=w.document.addEventListener.bind(w.document);w.document.addEventListener=(type,fn,opt)=>{if(type==='click'&&opt?.capture)handlers.push(fn);return add(type,fn,opt)};
 const timeout=w.setTimeout.bind(w);w.setTimeout=(fn,delay,...args)=>{stats.timers++;return timeout(fn,delay,...args)};
 if(options.mute)w.localStorage.setItem('match_soundEnabled','false');
 if(options.noHaptics)w.localStorage.setItem('match_hapticsEnabled','false');
 if(options.speech)w.speechSynthesis={speaking:true};
 if(options.jonas)w.document.body.insertAdjacentHTML('beforeend','<div id="ma-ambient-jonas" data-speaking="1"></div>');
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return{w,stats,handlers,advance(ms){now+=ms;},activate(id,trusted=true){const anchor=w.document.getElementById(id),target=anchor.querySelector('span')||anchor;const event={isTrusted:trusted,target,detail:0,button:0,preventDefault(){throw Error('Feedback cannot change navigation')},stopPropagation(){throw Error('Feedback cannot change event propagation')}};handlers.forEach(fn=>fn(event));return anchor;},close(){w.close()}};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
test('each intentional dock destination starts its own short original signature before the existing handler and uses one audio owner',async()=>{
 const firstNotes=[];
 for(const destination of destinations){const f=fixture();try{
  const anchor=f.w.document.getElementById(destination),href=anchor.href,child=anchor.firstChild;let handlerCalls=0;
  anchor.onclick=()=>{handlerCalls++;assert.equal(f.stats.notes.length,9,'signature starts synchronously before native navigation');f.w.playMatchAppSound('nav');f.w.maPlayUISound('primary')};
  assert.equal(f.stats.contexts,0);assert.equal(f.stats.notes.length,0);
  f.activate(destination);anchor.onclick();await tick();
  assert.equal(handlerCalls,1);assert.equal(anchor.href,href);assert.equal(anchor.firstChild,child);assert.equal(f.stats.notes.length,9,'legacy handlers cannot add a second cue');assert.equal(f.stats.contexts,1);assert.equal(f.stats.legacy,0);assert.equal(f.stats.vibrations.length,1);assert.equal(f.stats.fetches.length,0);assert.equal(f.stats.timers,0,'navigation never waits for a sound timer');
  assert.ok(Math.max(...f.stats.stops)<=.29,'the complete authored motif is under290ms');firstNotes.push(f.stats.notes[0]);
 }finally{f.close()}}
 assert.equal(new Set(firstNotes).size,5,'an immediate cross-document navigation still has a distinct first note');
});
test('keyboard activation, repeated mounting and fast duplicate delivery never create a second navigation cue',async()=>{
 const f=fixture();try{f.w.eval(source);assert.equal(f.handlers.length,1);f.activate('home');f.activate('home');f.w.playMatchAppSound('nav');await tick();assert.equal(f.stats.notes.length,9);assert.equal(f.stats.vibrations.length,1);assert.equal(f.stats.contexts,1);
  f.advance(200);f.activate('explore');assert.equal(f.stats.notes.length,18);assert.equal(f.stats.notes[9],587.33);assert.equal(f.stats.contexts,1);
 }finally{f.close()}
});
test('no initialization, programmatic activation, history or hash event plays a destination signature',()=>{
 const f=fixture();try{f.w.MatchAppFeedback.play('navHome');f.activate('home',false);for(const name of ['popstate','hashchange','pageshow'])f.w.dispatchEvent(new f.w.Event(name));assert.equal(f.stats.notes.length,0);assert.equal(f.stats.contexts,0);assert.equal(f.stats.vibrations.length,0);assert.equal(f.stats.fetches.length,0);
  f.activate('home');const notes=f.stats.notes.length;f.advance(200);for(const name of ['popstate','hashchange','pageshow'])f.w.dispatchEvent(new f.w.Event(name));assert.equal(f.stats.notes.length,notes,'history after audio unlock also stays silent');
 }finally{f.close()}
});
test('destination signatures obey sound mute, both speech owners, reduced motion and haptic opt out',()=>{
 for(const options of [{mute:true},{speech:true},{jonas:true},{reduced:true},{noHaptics:true}]){const f=fixture(options);try{f.activate('matches');if(options.mute||options.speech||options.jonas)assert.equal(f.stats.notes.length,0,JSON.stringify(options));else assert.equal(f.stats.notes.length,9);if(options.reduced||options.noHaptics)assert.equal(f.stats.vibrations.length,0);assert.equal(f.stats.fetches.length,0);}finally{f.close()}}
});
test('hidden or disabled navigation stays silent and destination attributes outside the dock keep existing generic feedback',async()=>{
 for(const hidden of [false,true]){const f=fixture();try{if(hidden)Object.defineProperty(f.w.document,'hidden',{get:()=>true});else f.w.document.getElementById('profile').setAttribute('aria-disabled','true');f.activate('profile');await tick();assert.equal(f.stats.notes.length,0);assert.equal(f.stats.vibrations.length,0);}finally{f.close()}}
 const f=fixture();try{f.activate('other');assert.equal(f.stats.notes.length,0,'unrelated links retain their existing deferred cue');await tick();assert.equal(f.stats.notes.length,3);assert.equal(f.stats.notes[0],659.25);assert.equal(f.stats.fetches.length,1);assert.equal(f.stats.vibrations.length,1);}finally{f.close()}
});
