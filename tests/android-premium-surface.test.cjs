'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const assets=path.join(__dirname,'..','android-studio','app','src','main');
const read=p=>fs.readFileSync(path.join(assets,p),'utf8');
const surface=read('assets/avatar-ai/android-surface-polish.js');
const panels=read('assets/avatar-ai/android-header-panels.js');
const premium=read('assets/avatar-ai/premium-jonas.js');
const activity=read('java/com/jonas/papercup/MainActivity.kt');
function setup(){
 const html=`<!doctype html><html><head></head><body class="page-home">
 <header id="mh-topbox" class="app-header ma-home-header">
 <div class="mh-head"><div id="home-brand-lockup"></div></div>
 <nav class="mh-deck ma-header-actions">
 <div id="lang-switcher-host"><select><option value="en">English</option><option value="pt-BR">Português</option></select></div>
 <button class="sound-toggle-btn" type="button">Sound</button>
 <button class="matchapp-notification-button" type="button">Alerts</button>
 <button id="nav-reg-btn" type="button">Sign in</button>
 <button class="ma-how-button" type="button">How it works</button>
 <div class="ma-menu-wrap"><button class="ma-menu-button" type="button">Settings</button>
 <div class="ma-menu" hidden><button type="button">Theme</button></div></div>
 </nav></header></body></html>`;
 const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.MATCHAPP_ANDROID=true;
 w.matchMedia=()=>({matches:true});
 w.playMatchAppSound=()=>{};
 w.eval(surface);w.eval(panels);
 return dom;
}
test('native Home gets tidy two-row responsive layout without affecting the website',()=>{
 assert.match(surface,/#mh-topbox\.app-header\.ma-home-header > nav\.mh-deck/);
 assert.match(surface,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
 assert.match(surface,/prefers-reduced-motion:reduce/);
 const dom=setup();assert.ok(dom.window.document.getElementById('matchapp-android-surface-20261009'));
 dom.window.close();
 const web=new JSDOM('<html><body class="page-home"></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 web.window.eval(surface);web.window.eval(panels);
 assert.equal(web.window.document.getElementById('ma-android-unfold-style'),null);
 web.window.close();
});
test('language button unfolds and changes the original select, then closes',()=>{
 const dom=setup(),w=dom.window,doc=w.document;
 let changes=0;doc.querySelector('select').addEventListener('change',()=>changes++);
 doc.querySelector('#lang-switcher-host select').click();
 const panel=doc.querySelector('.ma-unfold-box');assert.ok(panel);
 assert.equal(panel.getAttribute('role'),'dialog');
 assert.equal(panel.getAttribute('aria-modal'),'true');
 const options=[...panel.querySelectorAll('.ma-unfold-grid button')];
 assert.equal(options.length,2);options[1].click();
 assert.equal(doc.querySelector('select').value,'pt-BR');
 assert.equal(changes,1);
 assert.equal(doc.querySelector('.ma-unfold-veil'),null);
 dom.window.close();
});
test('the sound panel preserves the original toggle handler',()=>{
 const dom=setup(),w=dom.window,doc=w.document;
 let count=0;
 doc.querySelector('.sound-toggle-btn').addEventListener('click',()=>{count++;w.localStorage.setItem('match_soundEnabled','false')});
 doc.querySelector('.sound-toggle-btn').click();
 assert.ok(doc.querySelector('.ma-unfold-box'));
 assert.equal(count,0);
 doc.querySelector('.ma-unfold-choice').click();
 assert.equal(count,1);
 assert.equal(doc.querySelector('.ma-unfold-status').textContent,'Sound effects muted');
 doc.querySelector('.ma-unfold-x').click();assert.equal(doc.querySelector('.ma-unfold-veil'),null);
 dom.window.close();
});
test('settings menu is moved into its animated sheet and restored on dismiss',()=>{
 const dom=setup(),doc=dom.window.document;
 doc.querySelector('.ma-menu-button').click();
 const menu=doc.querySelector('.ma-unfold-original-menu');assert.ok(menu);
 assert.equal(menu.hidden,false);
 doc.querySelector('.ma-unfold-x').click();
 assert.equal(doc.querySelector('#mh-topbox .ma-menu-wrap .ma-menu'),menu);
 assert.equal(menu.hidden,true);
 dom.window.close();
});
test('avatar has a stable base face, localized overlays, and no ring blinking',()=>{
 assert.match(premium,/base\.className='ma-jonas-base'/);
 assert.match(premium,/clip-path:ellipse\(25% 17% at 50% 72%\)/);
 assert.match(premium,/\.ma-jonas-frame\.is-blink/);
 assert.match(premium,/animation:none!important/);
 assert.match(premium,/Prevent min-content shrink/);
 assert.match(premium,/word-break:normal!important/);
});
test('native intro soundtrack is audible without bypassing device volume',()=>{
 assert.match(activity,/player\.setVolume\(1f, 1f\)/);
 assert.match(activity,/private fun startStartupExperience\(\) \{[\s\S]*?startIntro\(\)/);
 assert.match(activity,/androidHeaderPanelsJs/);
 assert.match(activity,/window\.matchappAndroidCloseHeaderPanel/);
 assert.doesNotMatch(activity,/player\.setVolume\(0f, 0f\)/);
});

test('My space deletes a saved reply only after the explicit trash confirmation',()=>{
 const html=read('assets/jonas/index.html');
 const js=read('assets/jonas/jonas.js');
 const dom=new JSDOM(html,{url:'https://appassets.androidplatform.net/assets/jonas/index.html',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;
 w.matchMedia=()=>({matches:true});
 w.scrollTo=()=>{};
 const key='matchapp-jonas-saved-local-v1';
 w.localStorage.setItem(key,JSON.stringify([{text:'A movie I saved',savedAt:'2026-10-09T15:00:00.000Z'}]));
 try{
  w.eval(js);
  w.document.querySelector('[data-page="saved"]').click();
  const remove=w.document.querySelector('.saved-item-trash');
  assert.ok(remove,'there should be a labeled trash button');
  assert.equal(remove.getAttribute('aria-label'),'Delete this saved reply');
  remove.click();
  assert.equal(JSON.parse(w.localStorage.getItem(key)).length,1,'first click must not delete');
  assert.equal(remove.textContent,'Delete?');
  remove.click();
  assert.equal(JSON.parse(w.localStorage.getItem(key)).length,0,'confirmed click deletes only the saved local reply');
  assert.match(w.document.getElementById('saved-list').textContent,/No saved replies/);
 }finally{w.close();}
});
