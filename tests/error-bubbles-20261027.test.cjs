'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const source=fs.readFileSync('error-bubbles.js','utf8');
function setup(path='/'){
 const d=new JSDOM('<html lang="en"><head></head><body><main><form><input id="question"><button id="retry">Retry</button><p id="kids-answer" role="status"></p></form><button id="next">Next</button></main></body></html>',{url:'https://matchapp.tv'+path,runScripts:'outside-only'});
 const w=d.window,calls=[];w.fetch=async(url,options)=>{calls.push(['record_ui_error_20261027',JSON.parse(options.body),options]);return {ok:true,json:async()=>true}};w.eval(source);return {d,w,calls};
}
test('errors replace one in-flow notice, wrap text safely, preserve form and dismiss with X',()=>{
 const {d,w}=setup();try{
  w.document.querySelector('#question').value='Keep my draft';w.document.querySelector('#retry').focus();
  w.MatchAppErrors.show('<img src=x onerror=alert(1)>');w.MatchAppErrors.show('A second error');
  const n=w.document.querySelector('#ma-error-notice');assert.equal(w.document.querySelectorAll('#ma-error-notice').length,1);assert.equal(n.parentElement.tagName,'FORM');
  assert.equal(n.querySelector('img'),null);assert.equal(n.getAttribute('role'),'alert');
  assert.equal(n.querySelector('button').type,'button');assert.equal(n.querySelector('button').getAttribute('aria-label'),'Close message');
  n.querySelector('button').click();assert.equal(w.document.querySelector('#ma-error-notice'),null);assert.equal(w.document.querySelector('#question').value,'Keep my draft');
 }finally{d.window.close()}
});
test('private diagnostics contain only enums, are bounded and exclude message/input/query data',async()=>{
 const {d,w,calls}=setup('/discover.html?token=secret');try{
  w.document.querySelector('input').value='private question';
  for(let i=0;i<20;i++)w.MatchAppErrors.show('Name email@example.com child message token');
  w.MatchAppErrors.report('arbitrary private string');await Promise.resolve();
  assert.equal(calls.length,1);assert.equal(calls[0][0],'record_ui_error_20261027');
  assert.deepEqual(JSON.parse(JSON.stringify(calls[0][1])),{p_code:'ui-error',p_surface:'web',p_page:'chat',p_viewport:'desktop'});
  assert.doesNotMatch(JSON.stringify(calls.map(c=>c[1])),/private|secret|email|Name|child/);assert.equal(calls[0][2].credentials,'omit');assert.equal(calls[0][2].referrerPolicy,'no-referrer');
 }finally{d.window.close()}
});
test('Kids retains its own status node and next success clears only decoration',async()=>{
 const {d,w,calls}=setup('/kids/');try{
  const n=w.document.querySelector('#kids-answer');n.textContent='Retry';
  w.document.dispatchEvent(new w.CustomEvent('matchapp:kids-ai-error',{detail:{code:'quota-error',text:'private child input'}}));
  assert.ok(n.querySelector('.ma-error-close'));assert.equal(calls[0][1].p_surface,'kids');
  n.textContent='Success';await Promise.resolve();assert.equal(n.classList.contains('ma-error-bubble'),false);assert.equal(n.textContent,'Success');assert.equal(n.getAttribute('role'),'status');
  assert.equal(w.localStorage.length,0,'no guardian/session/storage changes');
 }finally{d.window.close()}
});
test('all supported close labels update with language, including RTL',()=>{
 const {d,w}=setup();try{
  const labels=new Set();for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){w.MATCH_LANG=lang;w.MatchAppErrors.show('Error');labels.add(w.document.querySelector('.ma-error-close').getAttribute('aria-label'));}
  assert.equal(labels.size,14);
 }finally{d.window.close()}
});
test('rapid replacement retains the latest bubble and original status role',async()=>{
 const {d,w}=setup();try{
  const n=w.document.querySelector('#kids-answer');
  n.textContent='First failure';w.MatchAppErrors.decorate(n);
  n.textContent='Second failure';w.MatchAppErrors.decorate(n);
  await new Promise(r=>setImmediate(r));
  assert.equal(n.querySelectorAll('.ma-error-close').length,1);
  assert.equal(n.classList.contains('ma-error-bubble'),true);
  assert.equal(n.getAttribute('role'),'alert');
  n.querySelector('button').click();await Promise.resolve();
  assert.equal(n.getAttribute('role'),'status');assert.equal(n.textContent,'');
 }finally{d.window.close()}
});
test('explicit form errors survive late loading and return to progress without altering fields',async()=>{
 const {d,w,calls}=setup();try{
  const n=w.document.querySelector('#kids-answer');w.document.querySelector('input').value='unsent private draft';
  n.textContent='Invalid field';n.setAttribute('data-ma-error','true');
  await new Promise(r=>setImmediate(r));assert.ok(n.querySelector('.ma-error-close'));
  n.textContent='Checking';n.setAttribute('data-ma-error','false');w.MatchAppErrors.sync(n);
  await new Promise(r=>setImmediate(r));assert.equal(n.textContent,'Checking');assert.equal(n.getAttribute('role'),'status');assert.equal(n.classList.contains('ma-error-bubble'),false);
  n.textContent='Another error';n.setAttribute('data-ma-error','true');w.MatchAppErrors.sync(n);n.querySelector('button').click();
  await new Promise(r=>setImmediate(r));assert.equal(n.textContent,'');assert.equal(w.document.querySelector('input').value,'unsent private draft');assert.equal(calls.length,1);
 }finally{d.window.close()}
 const d2=new JSDOM('<head></head><body><p data-ma-error="true" role="status">Initial failure</p></body>',{url:'https://matchapp.tv',runScripts:'outside-only'});
 try{d2.window.eval(source);assert.ok(d2.window.document.querySelector('.ma-error-close'));}finally{d2.window.close()}
});
test('preview reports never send; reporting failure does not create recursive bubbles',async()=>{
 const d=new JSDOM('<head></head><body><main></main></body>',{url:'http://127.0.0.1:18928/',runScripts:'outside-only'});let calls=0;
 try{d.window.fetch=()=>{calls++;throw Error('offline')};d.window.eval(source);d.window.MatchAppErrors.show('Test');await Promise.resolve();assert.equal(calls,0);assert.equal(d.window.document.querySelectorAll('.ma-error-bubble').length,1);}finally{d.window.close()}
 const scene=setup();try{scene.w.fetch=()=>Promise.reject(Error('offline'));scene.w.MatchAppErrors.show('Test');await new Promise(r=>setImmediate(r));assert.equal(scene.w.document.querySelectorAll('.ma-error-bubble').length,1);}finally{scene.d.window.close()}
});
test('existing match recovery dismiss restores pool guidance without changing matching',()=>{
 const {d,w}=setup();try{
  w.document.body.innerHTML='<div id="questionnaire-box"><button onclick="triggerMatch(false)">Match</button><p id="match-pool-hint">Hint</p></div>';
  const app=fs.readFileSync('app.js','utf8');w.eval(app.slice(app.indexOf('window.clearMatchRecovery ='),app.indexOf('window.matchRecoveryHeading =')));
  w.showMatchRecovery('No exact match');assert.equal(w.document.querySelector('#match-pool-hint').hidden,true);
  w.document.querySelector('#match-recovery .ma-error-close').click();assert.equal(w.document.querySelector('#match-recovery'),null);assert.equal(w.document.querySelector('#match-pool-hint').hidden,false);
 }finally{d.window.close()}
});

test('third-party script failures stay separate and first-party exceptions never expose their raw text',()=>{
 const {d,w,calls}=setup();try{
  w.dispatchEvent(new w.ErrorEvent('error',{message:'provider failure',filename:'https://ads.example/script.js'}));
  w.dispatchEvent(new w.ErrorEvent('error',{message:'Script error.'}));
  assert.equal(w.document.querySelector('.ma-error-bubble'),null);assert.equal(calls.length,0);
  w.dispatchEvent(new w.ErrorEvent('error',{message:'private error details',filename:'https://matchapp.tv/app.js'}));
  assert.match(w.document.querySelector('.ma-error-copy').textContent,/Something went wrong/);
  assert.doesNotMatch(w.document.querySelector('.ma-error-copy').textContent,/private/);assert.equal(calls[0][1].p_code,'runtime-error');
 }finally{d.window.close()}
});
