'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {JSDOM} = require('jsdom');
const root = path.join(__dirname,'..');
const read = name => fs.readFileSync(path.join(root,name),'utf8');
function fixture(t, {reduced=false, navigation='navigate'}={}) {
  const dom = new JSDOM('<!doctype html><html style="scroll-padding-top:136px"><body><header id="ma-reference-header" style="position:fixed"></header><main><section id="destination" style="scroll-margin-top:136px"><h2>Destination heading</h2></section></main></body></html>',
    {url:'https://matchapp.tv/explore.html',runScripts:'outside-only'});
  t.after(()=>dom.window.close());
  const w=dom.window, target=w.document.getElementById('destination'), header=w.document.getElementById('ma-reference-header');
  let now=0, sequence=0, y=300, x=14, top=1200, headerHeight=128;
  const calls=[], timers=new Map();
  w.Date.now=()=>now;
  w.setTimeout=(fn,delay)=>{const id=++sequence;timers.set(id,{fn,due:now+(delay||0)});return id;};
  w.clearTimeout=id=>timers.delete(id);
  w.matchMedia=()=>({matches:reduced});
  w.performance.getEntriesByType=()=>[{type:navigation}];
  Object.defineProperties(w,{scrollY:{get:()=>y},scrollX:{get:()=>x},innerHeight:{value:700}});
  Object.defineProperty(w.document.documentElement,'scrollHeight',{value:6000});
  w.Element.prototype.getClientRects=function(){return [this.getBoundingClientRect()];};
  header.getBoundingClientRect=()=>({top:0,bottom:headerHeight,height:headerHeight,left:0,right:390,width:390});
  target.getBoundingClientRect=()=>({top:top-y,bottom:top-y+1800,height:1800,left:0,right:390,width:390});
  w.scrollTo=options=>{calls.push({...options});y=options.top;x=options.left;};
  function advance(ms){const end=now+ms;for(;;){let next;for(const entry of timers)if(entry[1].due<=end&&(!next||entry[1].due<next[1].due))next=entry;if(!next)break;now=next[1].due;timers.delete(next[0]);next[1].fn();}now=end;}
  w.eval(read('patches/activated-scroll.js'));
  return {w,target,header,calls,advance,setTop:value=>{top=value;},setHeader:value=>{headerHeight=value;},scroll:value=>{y=value;}};
}

test('long destination starts below one measured header offset, independent of CSS padding/margin and existing scroll',t=>{
  const f=fixture(t);f.w.MatchAppActivatedScroll.toStart(f.target);
  assert.equal(f.w.scrollY,1064);
  assert.equal(f.target.getBoundingClientRect().top,136);
  assert.equal(f.w.scrollX,14,'horizontal position is preserved');
  assert.equal(f.calls[0].behavior,'smooth');
});
test('late target/header layout changes correct the section start within a bounded window',t=>{
  const f=fixture(t);f.w.MatchAppActivatedScroll.toStart(f.target);
  f.setTop(1500);f.setHeader(180);f.advance(600);
  assert.equal(f.target.getBoundingClientRect().top,188);
  f.advance(2000);const count=f.calls.length;f.setTop(1800);f.advance(5000);
  assert.equal(f.calls.length,count,'no permanent scroll-following loop');
});
test('a late dynamic target is aligned after it becomes visible without opening hidden content',t=>{
  const f=fixture(t);f.target.hidden=true;
  f.w.MatchAppActivatedScroll.toStart(()=>f.w.document.getElementById('destination'));
  f.advance(360);assert.equal(f.calls.length,0);assert.equal(f.target.hidden,true);
  f.target.hidden=false;f.advance(120);assert.equal(f.target.getBoundingClientRect().top,136);
});
test('wheel, touch, pointer and navigation keys cancel late correction immediately',t=>{
  for(const [type,key] of [['wheel'],['touchstart'],['pointerdown'],['keydown','PageDown']]){
    const f=fixture(t);f.w.MatchAppActivatedScroll.toStart(f.target);
    const event=key?new f.w.KeyboardEvent(type,{key,bubbles:true}):new f.w.Event(type,{bubbles:true});
    f.w.document.dispatchEvent(event);f.scroll(450);f.setTop(1800);const count=f.calls.length;f.advance(2400);
    assert.equal(f.calls.length,count,type);assert.equal(f.w.scrollY,450,type);
  }
});
test('reduced motion and the existing disabled scroll gate are honored',t=>{
  const f=fixture(t,{reduced:true});f.w.MatchAppActivatedScroll.toStart(f.target);
  assert.equal(f.calls[0].behavior,'instant');
  f.w.MatchAppScrollGate={canAutoScroll:()=>false};f.setTop(2200);const count=f.calls.length;
  assert.equal(f.w.MatchAppActivatedScroll.toStart(f.target),true,'handled without a caller fallback');
  f.advance(2400);assert.equal(f.calls.length,count);
});
test('initial hash alignment does not compete with browser or native restoration',t=>{
  for(const navigation of ['back_forward','reload']){
    const f=fixture(t,{navigation});f.w.MatchAppActivatedScroll.toStart(f.target,{initial:true});
    assert.equal(f.calls.length,0,navigation);
    f.w.MatchAppActivatedScroll.toStart(f.target);assert.equal(f.calls.length,1,'a fresh explicit activation still works');
  }
  const f=fixture(t);f.w.MatchAppNativePageCapture={isRestoring:()=>true};
  f.w.MatchAppActivatedScroll.toStart(f.target,{initial:true});assert.equal(f.calls.length,0);
});
test('a native restoration starting during initial alignment stops all pending correction',t=>{
  const f=fixture(t);f.w.MatchAppActivatedScroll.toStart(f.target,{initial:true});
  f.w.__MATCHAPP_NATIVE_RESTORE__={url:f.w.location.href};f.scroll(730);f.advance(2400);
  assert.equal(f.w.scrollY,730);assert.equal(f.calls.length,1);
});
test('late startup callbacks cannot pull the reader back after a gesture, while a new explicit click still works',t=>{
  const f=fixture(t);f.w.document.dispatchEvent(new f.w.Event('wheel'));f.scroll(500);
  f.w.MatchAppActivatedScroll.toStart(f.target,{initial:true});f.advance(2400);
  assert.equal(f.calls.length,0);assert.equal(f.w.scrollY,500);
  f.w.MatchAppActivatedScroll.toStart(f.target);assert.equal(f.target.getBoundingClientRect().top,136);
});
test('modified or external links do not activate the shared local destination scroll',t=>{
  const f=fixture(t);f.w.document.body.insertAdjacentHTML('beforeend','<a id="out" href="https://example.com/#destination" target="_blank">External</a><a id="local" href="#destination">Local</a>');
  f.w.document.getElementById('out').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true}));
  f.w.document.getElementById('local').dispatchEvent(new f.w.MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true}));
  f.advance(120);assert.equal(f.calls.length,0);
});
test('profile hub activation reveals the original long card before aligning its start',t=>{
  const f=fixture(t),html=read('profile/profile.html');
  f.target.id='settings-panel';f.target.className='profile-hub-target';f.target.hidden=true;
  const button=f.w.document.createElement('button');button.dataset.profileTarget='settings-panel';f.w.document.body.appendChild(button);
  f.w.requestAnimationFrame=fn=>fn();
  f.w.eval(html.match(/<script id="profile-hub-actions">([\s\S]*?)<\/script>/)[1]);
  f.w.document.dispatchEvent(new f.w.Event('DOMContentLoaded'));button.click();
  assert.equal(f.target.hidden,false);assert.equal(f.target.getBoundingClientRect().top,136);
});
test('saved Discover conversation opens at its first turn while the live-reply scroll owner remains intact',t=>{
  const f=fixture(t);f.target.id='chat-log';f.target.scrollTop=900;
  const source=read('discover.js');
  f.w.matchMedia=()=>({matches:false});
  f.w.eval("let discoverThreadVersion=0,currentThread=null,DISCOVER_ITEMS=[],lastDiscoverQuestion='';function loadThreads(){return [{id:'saved',turns:[{role:'user',text:'First question'}]}]};function parkDiscoverComposer(){};function appendUserBubble(text){document.getElementById('chat-log').textContent=text};function renderThreadList(){};"+
    source.match(/window\.openThread = function \(id\) \{[\s\S]*?\n\};/)[0]);
  f.w.openThread('saved');
  assert.equal(f.target.scrollTop,0);assert.equal(f.target.textContent,'First question');assert.equal(f.target.getBoundingClientRect().top,136);
  assert.match(source,/function revealJonasTurn\(node\)/);assert.match(source,/log\.scrollTop=Math\.max\(0,top\)/);
});
