'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'jonas/compact-pill-20261031.js'),'utf8');
const flush=()=>new Promise(r=>setTimeout(r,30));
function make(body){
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body>'+body+'</body></html>',{
  url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true
 });
 const w=dom.window;
 w.matchMedia=()=>({matches:false});
 w.MATCH_LANG='en';
 return dom;
}

test('home composer becomes one compact pill; close folds related results and late speech',async()=>{
 const dom=make('<aside id="ma-jonas-home"><section id="ma-jonas-home-panel" hidden><header class="jh-header"></header><div class="jh-content"><p class="jh-greeting"></p><div id="ma-jonas-home-status"></div><form class="jh-form" action="/discover.html" method="get"><input id="ma-jonas-home-input" name="q"/><button id="ma-jonas-home-mic" class="jh-mic" type="button"></button><button class="jh-send" type="submit"></button></form><div class="jh-suggestions"></div></div></section><button id="ma-jonas-home-bubble"></button></aside>');
 const w=dom.window,d=w.document,rootEl=d.getElementById('ma-jonas-home'),panel=d.getElementById('ma-jonas-home-panel');
 w.eval(source);
 const form=d.querySelector('.jh-form'),results=d.getElementById('ja-home-results');
 assert.ok(form.classList.contains('ja-compact-form'));
 assert.equal(form.querySelectorAll('.ja-voice-fill').length,1);
 assert.ok(form.querySelector('.jh-send svg'));
 assert.ok(form.querySelector('.jh-mic svg'));
 assert.ok(results.hidden);
 assert.equal(w.MatchAppAmbientJonas.isOpen(),false);
 panel.hidden=false;
 assert.equal(w.MatchAppAmbientJonas.isOpen(),true);
 d.getElementById('ma-jonas-home-input').value='Find a documentary';
 const evt=new w.Event('submit',{bubbles:true,cancelable:true});form.dispatchEvent(evt);
 assert.equal(evt.defaultPrevented,true,'should not navigate to /discover on homepage submit');
 assert.equal(d.querySelector('#ja-home-results iframe').getAttribute('src'),'/discover.html?ambient=1');
 assert.equal(d.getElementById('ma-jonas-home-input').value,'');
 results.hidden=false;
 rootEl.dispatchEvent(new w.CustomEvent('matchapp:jonas-close'));panel.hidden=true;
 assert.equal(results.hidden,true);
 assert.equal(w.MatchAppAmbientJonas.isOpen(),false,'late iframe speech gate must be closed');
 d.getElementById('ma-jonas-home-bubble').click();
 assert.equal(results.hidden,true,'folding must not reopen result');
 dom.window.close();
});

test('ambient composer submits to the original metered conversation; mic, speaking meter and result close',async()=>{
 const dom=make('<div id="ma-ambient-jonas"><button class="ja-bubble"></button></div><section id="ma-ambient-panel" hidden><header class="ja-panel-head"></header><p class="ja-hello"></p></section>');
 const w=dom.window,d=w.document,panel=d.getElementById('ma-ambient-panel');
 w.MatchAppAmbientJonas={isOpen:()=>!panel.hidden};
 w.eval(source);
 assert.equal(panel.dataset.jaCompactReady,'1');
 assert.equal(panel.dataset.jaMetered,'0');
 assert.equal(panel.querySelectorAll('.ja-compact-form').length,1);
 assert.equal(panel.querySelectorAll('.ja-results-head').length,1);
 panel.hidden=false;
 const frame=d.createElement('iframe');frame.id='ma-ambient-chat-frame';frame.setAttribute('src','/discover.html?ambient=1');
 panel.appendChild(frame);
 const inner=frame.contentWindow;
 assert.equal(inner.location.pathname,'/discover.html');
 inner.document.open();inner.document.write('<!doctype html><html><head></head><body><div id="chat-log"></div><textarea id="discover-new-input"></textarea><button id="mic-btn-discover"></button></body></html>');inner.document.close();
 let sent='',voiceStarts=0,callbacks;
 inner.newDiscoverSearch=function(){sent=inner.document.getElementById('discover-new-input').value};
 inner.MatchAppJonasStage={speak(text,opts){voiceStarts++;callbacks=opts;return Promise.resolve(true)},stop(){}};
 await flush();
 frame.dispatchEvent(new w.Event('load'));
 await flush();
 assert.ok(inner.document.documentElement.classList.contains('ma-jonas-pill-embed'), 'iframe location '+inner.location.href+' / '+inner.document.URL);
 const composer=panel.querySelector('.ja-compose-input'),form=panel.querySelector('.ja-compact-form');
 composer.value='What movie should I watch?';
 form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 assert.equal(sent,'What movie should I watch?');
 assert.equal(composer.value,'');
 assert.ok(panel.classList.contains('ja-result-open'));
 let measured=null;
 await inner.MatchAppJonasStage.speak('Answer',{onProgress(p){measured=p}});
 callbacks.onProgress(.72);
 assert.equal(measured,.72);
 assert.equal(panel.style.getPropertyValue('--ja-voice-fill'),'72%');
 assert.ok(panel.classList.contains('ja-answer-speaking'));
 callbacks.onComplete(true);
 assert.ok(!panel.classList.contains('ja-answer-speaking'));
 assert.equal(voiceStarts,1);
 const close=panel.querySelector('.ja-result-close');
 close.click();
 assert.ok(!panel.classList.contains('ja-result-open'));
 inner.document.getElementById('chat-log').textContent='Details refined';
 await flush();
 assert.ok(!panel.classList.contains('ja-result-open'),'metadata changes must not reopen a dismissed answer');
 panel.hidden=true;await flush();
 assert.ok(!panel.classList.contains('ja-result-open'));
 dom.window.close();
});

test('all fourteen selected languages and reduced-motion CSS hooks are present',()=>{
 const css=fs.readFileSync(path.join(root,'jonas/compact-pill-20261031.css'),'utf8');
 const embed=fs.readFileSync(path.join(root,'jonas/compact-result-embed-20261031.css'),'utf8');
 const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const ambient=fs.readFileSync(path.join(root,'jonas/android-ambient-assistant-20261011.js'),'utf8');
 for(const locale of ['en','pt','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'])
  assert.ok(source.includes('\n  '+locale+':['),'Missing '+locale+' translation');
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.ja-voice-fill/);
 assert.match(embed,/\.ma-jonas-pill-embed/);
 assert.match(index,/compact-pill-20261031\.js/);
 assert.match(ambient,/compact-pill-20261031\.js/);
 assert.doesNotMatch(source,/functions\.invoke|gemini-proxy|MATCHAI.*KEY/);
});
