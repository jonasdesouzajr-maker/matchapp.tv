'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../jonas/chat-workspace-20261011.js'),'utf8');
function workspace({embedded=false}={}){
 const properties={},dataset={},events={},viewportEvents={};let top=239,cookie=null,frame=0,resize;
 const input={tagName:'TEXTAREA'};
 const panel={dataset,contains:element=>element===input,style:{setProperty:(key,value)=>properties[key]=value},getBoundingClientRect:()=>({top:dataset.keyboard==='true'?parseFloat(properties['--jonas-workspace-top']):top})};
 const viewport={height:710,offsetTop:0,addEventListener:(key,fn)=>viewportEvents[key]=fn};
 const window={innerHeight:710,visualViewport:viewport,addEventListener:(key,fn)=>events[key]=fn};window.parent=embedded?{}:window;
 const context={window,location:{pathname:'/discover.html',search:embedded?'?ambient=1':''},URLSearchParams,
  document:{readyState:'complete',body:{},documentElement:{clientHeight:710},querySelector:selector=>selector==='body > .ma-cookie'?cookie:selector==='header.app-header'?{}:panel},
  requestAnimationFrame:fn=>{frame=fn;return 1},cancelAnimationFrame:()=>{},setTimeout:()=>{},
  MutationObserver:class{observe(){}},ResizeObserver:class{constructor(fn){resize=fn}observe(){}},getComputedStyle:()=>({display:'block'})};
 vm.runInNewContext(source,context);const flush=()=>{const fn=frame;frame=0;if(typeof fn==='function')fn()};flush();
 return{properties,dataset,viewport,events,viewportEvents,flush,resize:()=>{resize();flush()},setTop:value=>top=value,setCookie:value=>cookie=value,
  resizeNative:height=>{context.document.activeElement=input;window.innerHeight=height;viewport.height=height;context.document.documentElement.clientHeight=height;events.resize();flush()}};
}
test('workspace fits below the rendered header and refits after translated controls wrap',()=>{
 const state=workspace();assert.equal(state.properties['--jonas-workspace-height'],'461px');
 state.setTop(289);state.resize();assert.equal(state.properties['--jonas-workspace-height'],'411px');
});
test('visual keyboard resize and pan keep the composer in the visible viewport and restore normal flow',()=>{
 const state=workspace();state.viewport.height=330;state.viewport.offsetTop=40;state.viewportEvents.resize();state.flush();
 assert.equal(state.dataset.keyboard,'true');assert.equal(state.properties['--jonas-workspace-top'],'50px');
 assert.equal(state.properties['--jonas-workspace-height'],'310px');
 state.viewport.offsetTop=80;state.viewportEvents.scroll();state.flush();assert.equal(state.properties['--jonas-workspace-top'],'90px');
 state.viewport.height=710;state.viewport.offsetTop=0;state.viewportEvents.resize();state.flush();
 assert.equal(state.dataset.keyboard,'false');assert.equal(state.properties['--jonas-workspace-height'],'461px');
});
test('visible consent notice reserves space without changing its state or geometry',()=>{
 const state=workspace();state.setCookie({getBoundingClientRect:()=>({top:650,height:60})});state.resize();
 assert.equal(state.properties['--jonas-workspace-height'],'402px');
});
test('Android adjustResize keyboard is detected when layout and visual viewports shrink together',()=>{
 const state=workspace();state.resizeNative(360);
 assert.equal(state.dataset.keyboard,'true');assert.equal(state.properties['--jonas-workspace-height'],'340px');
});
test('embedded Android ambient conversation keeps its existing independent sizing',()=>{
 const state=workspace({embedded:true});assert.deepEqual(state.properties,{});assert.deepEqual(state.events,{});
});
