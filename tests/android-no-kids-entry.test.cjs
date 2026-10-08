'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const script=fs.readFileSync(path.join(__dirname,'../android-studio/app/src/main/assets/avatar-ai/home-preview.js'),'utf8');
test('Android Kids entry stays hidden after late insertion and repeated injection',()=>{
 const dom=new JSDOM('<html class="matchapp-ai-android"><head></head><body><button id="other">Profile</button></body></html>',{url:'https://matchapp.tv/profile/',runScripts:'outside-only'});
 const w=dom.window;w.eval(script);w.eval(script);
 assert.equal(w.document.querySelectorAll('#matchapp-android-no-kids-entry').length,1);
 for(const markup of ['<a id="matchapp-kids-entry" href="/kids/">Kids</a>','<a class="ma-kids-mode-entry" href="/kids/">Kids</a>']){
  w.document.body.insertAdjacentHTML('beforeend',markup);
  assert.equal(w.getComputedStyle(w.document.body.lastElementChild).display,'none');
 }
 assert.notEqual(w.getComputedStyle(w.document.getElementById('other')).display,'none');dom.window.close();
});
test('Normal browser Kids entry is unaffected by Android-only style',()=>{
 const dom=new JSDOM('<html><head></head><body><a id="matchapp-kids-entry">Kids</a></body></html>',{url:'https://matchapp.tv/profile/',runScripts:'outside-only'});
 dom.window.eval(script);assert.notEqual(dom.window.getComputedStyle(dom.window.document.getElementById('matchapp-kids-entry')).display,'none');dom.window.close();
});
