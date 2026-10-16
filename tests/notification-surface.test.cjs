'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'notifications.js'),'utf8');
function fixture(native=true){
 const dom=new JSDOM('<!doctype html><html><body><header class="app-header"><nav></nav></header><button id="previous">Previous control</button><section id="already-inert"></section></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:false});w.setTimeout=()=>0;w.clearTimeout=()=>{};w.setInterval=()=>0;w.clearInterval=()=>{};w.fetch=async()=>({ok:false});
 w.document.getElementById('already-inert').inert=true;
 if(native){
  w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};
 }
 w.eval(source);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {dom,w,panel:w.document.querySelector('.matchapp-notification-panel'),api:w.MatchNotifications};
}
function item(id){return {id,localKey:id,kind:'suggestion',title:'A long localized title '+id,body:'A full description that must remain readable.',createdAt:'2026-10-16T12:00:00Z'};}
test('notification surface owns its geometry and does not use bare home button pills',()=>{
 const css=fs.readFileSync(path.join(root,'notifications.css'),'utf8');
 const home=fs.readFileSync(path.join(root,'home-cinematic.css'),'utf8');
 assert.match(css,/#matchapp-notifications::backdrop/);
 assert.match(css,/\.matchapp-notification-scroll\{[^}]*min-height:0;overflow:auto/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) 44px/);
 assert.match(css,/width:44px!important[^}]*height:44px!important/s);
 assert.match(css,/#matchapp-notifications h2:focus\{outline:none!important/);
 assert.doesNotMatch(home,/body\.page-home button,\s*body\.page-home \.btn/);
 assert.doesNotMatch(home,/body\.page-home summary\s*\{\s*border-radius:\s*999px/);
});
test('open/close provides an accessible dialog, scroll isolation and focus restoration',()=>{
 const {dom,w,panel,api}=fixture();try{
  const opener=w.document.getElementById('previous');opener.focus();api.open();
  assert.equal(panel.tagName,'DIALOG');assert.equal(panel.hidden,false);assert.equal(panel.open,true);
  assert.equal(panel.getAttribute('aria-modal'),'true');
  assert.equal(w.document.activeElement.id,'matchapp-notifications-title');
  assert.equal(w.document.body.classList.contains('matchapp-notifications-open'),true);
  assert.equal(panel.querySelector('.matchapp-notification-scroll').contains(panel.querySelector('.matchapp-notification-header')),false);
  api.close();assert.equal(panel.hidden,true);assert.equal(panel.open,false);assert.equal(w.document.activeElement,opener);
  assert.equal(w.document.body.classList.contains('matchapp-notifications-open'),false);
 }finally{dom.window.close();}
});
test('a stale native close event cannot close a freshly reopened dialog',()=>{
 const {dom,w,panel,api}=fixture();try{api.open();api.close();api.open();panel.dispatchEvent(new w.Event('close'));assert.equal(panel.hidden,false);assert.equal(panel.open,true);}finally{dom.window.close();}
});
test('Escape closes the panel and restores the invoking control',()=>{
 const {dom,w,panel,api}=fixture();try{const opener=w.document.getElementById('previous');opener.focus();api.open();w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));assert.equal(panel.hidden,true);assert.equal(w.document.activeElement,opener);}finally{dom.window.close();}
});
test('older-browser fallback restores only the background state it changed',()=>{
 const {dom,w,panel,api}=fixture(false);try{api.open();assert.equal(w.document.getElementById('previous').inert,true);assert.ok(w.document.querySelector('.matchapp-notification-backdrop'));api.close();assert.equal(w.document.getElementById('previous').inert,false);assert.equal(w.document.getElementById('already-inert').inert,true);assert.equal(w.document.querySelector('.matchapp-notification-backdrop'),null);assert.equal(panel.hidden,true);}finally{dom.window.close();}
});
test('removing a local notification keeps keyboard focus in the notification list',async()=>{
 const {dom,w,panel,api}=fixture();try{const a=item('a'),b=item('b');api.pushLocal(a);api.pushLocal(b);api.open();const remove=panel.querySelector('[data-notification-key="b"] .matchapp-notification-delete');assert.ok(remove);remove.focus();remove.click();await Promise.resolve();assert.equal(panel.querySelectorAll('.matchapp-notification-item').length,1);assert.equal(w.document.activeElement.className,'matchapp-notification-delete');assert.equal(w.document.activeElement.closest('article').dataset.notificationKey,'a');}finally{dom.window.close();}
});
test('opening notifications does not silently mark existing unread items as read',()=>{
 const {dom,panel,api}=fixture();try{api.pushLocal(item('unread'));api.open();assert.equal(panel.querySelectorAll('.is-unread').length,1);}finally{dom.window.close();}
});
test('declining delete-all preserves items and their existing handlers',async()=>{
 const {dom,w,panel,api}=fixture();try{api.pushLocal(item('keep'));api.open();w.confirm=()=>false;assert.equal(await api.deleteAll(),false);assert.equal(panel.querySelectorAll('article').length,1);}finally{dom.window.close();}
});
test('guest preferences hand off to the existing auth modal after closing notifications',async()=>{
 const {dom,w,panel,api}=fixture();try{let called=false;w.openAuthModal=()=>{called=true;assert.equal(panel.hidden,true);assert.equal(w.document.body.classList.contains('matchapp-notifications-open'),false);};api.open();assert.equal(await api.savePrefs({suggestions:false}),false);assert.equal(called,true);}finally{dom.window.close();}
});
