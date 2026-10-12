'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const src=fs.readFileSync(path.join(root,'jonas','android-ambient-assistant-20261011.js'),'utf8');
const kotlin=fs.readFileSync(path.join(root,'android-studio','app','src','main','java','com','jonas','papercup','MainActivity.kt'),'utf8');
function scene(route='/',enabled=true){
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body><main><div id="result-box" style="display:block"><h2 id="res-title">Some Documentary</h2></div><section id="original-page">Original page stays visible</section></main></body></html>',{url:'https://matchapp.tv'+route,runScripts:'outside-only'});
 const w=dom.window;w.__MATCHAPP_AMBIENT_QA__=enabled;w.currentMatchIdentity={title:'Some Documentary'};
 w.innerWidth=384;w.innerHeight=780;
 let stopped=0,spoken=[];w.MatchAppNativeVoice={stop(){stopped++},stopSpeaking(){},speak(text,lang){spoken.push({text,lang})}};
 w.eval(src);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,dom,stops:()=>stopped,spoken:()=>spoken};
}
test('never auto-inserts Jonas into public website or Kids Mode',()=>{
 const publicWeb=scene('/',false);assert.equal(publicWeb.w.document.querySelector('#ma-ambient-jonas'),null);publicWeb.dom.window.close();
 const kids=scene('/kids/',true);assert.equal(kids.w.document.querySelector('#ma-ambient-jonas'),null);kids.dom.window.close();
});
test('fixed bubble opens same-origin source-backed title conversation without navigating the result page',()=>{
 const {w,dom,stops,spoken}=scene();const root=w.document.getElementById('ma-ambient-jonas'),bubble=root.querySelector('.ja-bubble');
 assert.ok(root&&bubble);assert.equal(w.MatchAppAmbientJonas.getContext(),'Some Documentary');
 bubble.click();let panel=w.document.getElementById('ma-ambient-panel');
 assert.equal(panel.hidden,false);assert.equal(root.hidden,true);
 assert.equal(spoken().length,1,'native greeting must start on bubble tap');
 assert.match(spoken()[0].text,/Jonas/i);
 const iframe=panel.querySelector('iframe');
 assert.equal(new URL(iframe.src).origin,'https://matchapp.tv');
 assert.equal(new URL(iframe.src).searchParams.get('title'),'Some Documentary');
 assert.equal(new URL(iframe.src).searchParams.get('ambient'),'1');
 assert.ok(w.document.getElementById('original-page'));assert.equal(w.location.pathname,'/');
 panel.querySelector('.ja-close').click();assert.equal(panel.hidden,true);assert.equal(root.hidden,false);assert.equal(stops(),1);
 bubble.click();assert.equal(panel.querySelector('iframe'),iframe,'the existing conversation stays mounted on reopen');
 dom.window.close();
});
test('dragging persists bubble position without opening a chat',()=>{
 const {w,dom}=scene();const bubble=w.document.querySelector('.ja-bubble');
 const ptr=(type,x,y)=>{const e=new w.Event(type,{bubbles:true});Object.defineProperties(e,{pointerId:{value:5},clientX:{value:x},clientY:{value:y},pointerType:{value:'touch'},button:{value:0}});bubble.dispatchEvent(e)};
 ptr('pointerdown',90,100);ptr('pointermove',140,170);ptr('pointerup',140,170);
 assert.ok(w.localStorage.getItem('matchapp_jonas_ambient_position_v1'));
 bubble.click();assert.equal(w.document.getElementById('ma-ambient-panel').hidden,true);
 dom.window.close();
});
test('native wrapper loads remotely editable same-origin script and can cancel mic on close',()=>{
 assert.match(kotlin,/fun injectAmbientJonas\(view: WebView\)/);
 assert.match(kotlin,/!isMatchAppHost\(url\.host\.orEmpty\(\)\) && !isDebugSmokeUrl\(url\.toString\(\)\)/);
 assert.match(kotlin,/isKidsUri\(url\)\) return/);
 assert.match(kotlin,/injectAmbientJonas\(view\)/);
 assert.match(kotlin,/fun stop\(\)\s*\{/);
 assert.match(kotlin,/inlineVoiceRecognizer\?\.cancel\(\)/);
 assert.match(kotlin,/android-ambient-assistant-20261011\.js\?live=/);
 const css=fs.readFileSync(path.join(root,'jonas','android-ambient-assistant-20261011.css'),'utf8');
 assert.match(css,/html\.matchapp-ai-android body\.ma-jonas-inline #ma-ai-entry/);
 assert.match(css,/transform-origin:var\(--ja-origin-x/);
 const embed=fs.readFileSync(path.join(root,'jonas','android-ambient-embed-20261011.css'),'utf8');
 assert.match(embed,/header\.app-header\.ma-global-header/);
 assert.match(embed,/#jonas-voice-stage/);
 assert.doesNotMatch(src,/13500|new MutationObserver|Warm the authenticated same-origin chat/);
 assert.match(src,/spokenGreeting\(epoch\)/);
 const discover=fs.readFileSync(path.join(root,'discover.js'),'utf8');
 assert.match(discover,/ambient\?audibleReply\.length:650/);
 assert.match(discover,/if \(ambient\) bubble\.textEl\.textContent = payload\.answer/);
});
