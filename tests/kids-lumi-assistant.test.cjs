const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const root=path.join(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('Kids page exposes only the voice-first Luma assistant, not a typed Ask AI surface',()=>{
 const html=read('kids/index.html'),doc=new JSDOM(html).window.document;
 const backend=doc.querySelector('.kids-voice-backend');
 assert(backend,'voice backend remains available for the vetted Kids AI path');
 assert.equal(backend.hidden,true);
 assert.equal(backend.getAttribute('aria-hidden'),'true');
 assert.match(html,/lumi-assistant\.css\?v=20261001-voice1/);
 assert.match(html,/lumi-assistant\.js\?v=20261002-luma1/);
 assert.match(html,/voice-input\.js\?v=20261005-voiceorigin1/);
 assert.match(html,/with Luma, a voice-first Kids assistant/);
 assert.doesNotMatch(html,/with Lumi, a voice-first Kids assistant/);
 assert.match(html,/kids\/immersive\.js\?v=20261002-luma2/);
});

test('Floating Luma is compact, draggable, stateful and persists a safe viewport-relative position',()=>{
 const js=read('kids/lumi-assistant.js'),css=read('kids/lumi-assistant.css');
 for(const token of ['pointerdown','pointermove','pointerup','setPointerCapture','match_kids_lumi_assistant_pos','localStorage.setItem','matchapp:voice-transcript','matchapp:kids-ai-result','matchapp:kids-ai-error'])assert(js.includes(token),token);
 assert.match(css,/--lumi-size:clamp\(68px,7\.2vw,88px\)/);
 assert.match(css,/@media\(max-width:560px\)[\s\S]*--lumi-size:70px/);
 for(const state of ['idle','prompt','listening','thinking','speaking'])assert(css.includes('data-state="'+state+'"'),state);
 assert.doesNotMatch(js,/innerHTML=.*(?:input|textarea)/i);
});

test('Tapping Luma speaks the prompt, then starts the hidden Kids microphone and speaks the approved answer',async()=>{
 const html='<!doctype html><body class="page-kids"><form id="kids-ask-form"><input id="kids-question"><button id="kids-mic" type="button"></button></form></body>';
 const dom=new JSDOM(html,{url:'https://matchapp.tv/kids/',runScripts:'outside-only'}),w=dom.window;
 let spoken=[],done=null,micClicks=0;
 w.MatchAppLumi={t:key=>({askQuestion:'Ask your question!',assistantLabel:'Ask Luma a question by voice',asked:"Here's a safe idea.",empty:'Out of power.'}[key]||key),enable:()=>{},stop:()=>{},speak:(text,cb)=>{spoken.push(text);done=cb||null;return true}};
 Object.defineProperty(w.navigator,'mediaDevices',{value:{getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})},configurable:true});
 w.document.getElementById('kids-mic').addEventListener('click',()=>{micClicks++});
 w.eval(read('kids/lumi-assistant.js'));
 if(!w.document.getElementById('kids-lumi-assistant'))w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const lumi=w.document.getElementById('kids-lumi-assistant');assert(lumi);
 lumi.click();
 await new Promise(resolve=>setTimeout(resolve,0));
 assert.equal(spoken[0],'Ask your question!');
 assert.equal(micClicks,0,'listening waits until Lumi finishes the prompt');
 done();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(micClicks,1);
 w.document.dispatchEvent(new w.CustomEvent('matchapp:voice-transcript',{detail:{inputId:'kids-question',text:'funny animals'}}));
 assert.equal(lumi.dataset.state,'thinking');
 const beforeTyped=spoken.length;
 w.document.dispatchEvent(new w.CustomEvent('matchapp:kids-ai-result',{detail:{speech:'Typed answers stay silent.',voiceOrigin:false}}));
 assert.equal(lumi.dataset.state,'idle');assert.equal(spoken.length,beforeTyped,'typed Kids answers must not auto-speak');
 w.document.dispatchEvent(new w.CustomEvent('matchapp:voice-transcript',{detail:{inputId:'kids-question',text:'funny animals'}}));
 assert.equal(lumi.dataset.state,'thinking');
 w.document.dispatchEvent(new w.CustomEvent('matchapp:kids-ai-result',{detail:{speech:'Bluey. A playful family adventure.',voiceOrigin:true}}));
 assert.equal(lumi.dataset.state,'speaking');
 assert.match(spoken.at(-1),/Bluey\. A playful family adventure\./);
 done();assert.equal(lumi.dataset.state,'idle');
 dom.window.close();
});

test('Luma voice remains childlike, local-first and audio-only for Kids results',()=>{
 const immersive=read('kids/immersive.js'),voice=read('voice-input.js'),kids=read('kids/kids.js');
 assert.match(immersive,/utter\.rate=1\.12/);assert.match(immersive,/utter\.pitch=1\.24/);
 assert.match(immersive,/voice\.localService/);assert.match(immersive,/askQuestion:'Ask your question!'/);
 assert.match(voice,/audioOnlyKids=inputId==='kids-question'/);assert.match(voice,/matchapp:voice-state/);assert.match(voice,/matchapp:voice-error/);
 assert.match(kids,/speech:syn\?lead\.title\+'\. '\+syn:lead\.title/);
 assert.match(kids,/matchapp:kids-ai-error/);
});
