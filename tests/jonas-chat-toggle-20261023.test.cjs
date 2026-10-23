'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height});

for(const width of [320,768,1280])test('maximum chat size keeps Jonas header and dock reachable at '+width+'px',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><header id="ma-reference-header"></header><section id="ma-ambient-panel"><div class="ja-panel-head"></div><iframe></iframe></section><nav class="ma-reference-dock"></nav></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,d=w.document;w.innerWidth=width;w.innerHeight=844;w.matchMedia=()=>({matches:false});
 d.getElementById('ma-reference-header').getBoundingClientRect=()=>rect(0,0,width,120);
 d.querySelector('.ma-reference-dock').getBoundingClientRect=()=>rect(0,780,width,64);
 w.eval(read('patches/chat-resize-20261022.js'));
 const panel=d.getElementById('ma-ambient-panel'),grip=panel.querySelector('.ma-chat-grip');
 grip.dispatchEvent(new w.KeyboardEvent('keydown',{key:'End',bubbles:true}));
 assert.ok(parseFloat(panel.style.top)>=128);
 assert.ok(parseFloat(panel.style.top)+parseFloat(panel.style.height)<=772);
 assert.ok(parseFloat(panel.style.left)>=8);
 assert.ok(parseFloat(panel.style.left)+parseFloat(panel.style.width)<=width-8);
 assert.equal(panel.style.getPropertyValue('display'),'flex');
 panel.hidden=true;await new Promise(resolve=>w.setTimeout(resolve,90));
 assert.equal(panel.style.getPropertyValue('display'),'','the resize observer clears its own inline display when hidden');
 dom.window.close();
});

test('closing the retained ambient conversation blocks late speech and microphone rearming',async()=>{
 const dom=new JSDOM('<!doctype html><html><head></head><body><section class="discover-head"><div id="chat-log"></div><textarea id="discover-new-input"></textarea><button id="mic-btn-discover"></button></section></body></html>',{url:'https://matchapp.tv/discover.html?ambient=1',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;let open=true,speeches=0,stops=0,mics=0,callbacks;
 Object.defineProperty(w,'parent',{value:{MatchAppAmbientJonas:{isOpen:()=>open}}});
 w.MatchAppJonasSpeech={speak(text,lang,opts){speeches++;callbacks=opts;return Promise.resolve(true)},stop(){stops++}};
 w.document.getElementById('mic-btn-discover').addEventListener('click',()=>mics++);
 w.eval(read('jonas/discovery-avatar-stage-20261010.js'));
 await w.MatchAppJonasStage.speak('An already pending reply',{autoListen:true});
 open=false;callbacks.onStart();callbacks.onEnd(true);
 assert.equal(w.MatchAppJonasStage.el.dataset.state,'idle');assert.equal(stops,1);
 assert.equal(await w.MatchAppJonasStage.speak('A reply arriving after close',{autoListen:true}),false);
 w.document.getElementById('jds-microphone').click();
 await new Promise(resolve=>w.setTimeout(resolve,420));
 assert.equal(speeches,1);assert.equal(mics,0);
 open=true;await w.MatchAppJonasStage.speak('Continue the existing conversation',{autoListen:false});
 assert.equal(speeches,2);
 dom.window.close();
});
