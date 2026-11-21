'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('publisher review suppresses every manual ad host without altering future ad inventory',()=>{
 const home=read('index.html'),script=home.match(/<script id="ma-review-ad-visibility-20261121">([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 const d=new JSDOM('<!doctype html><html><body class="page-home"><div class="main-layout"><div class="sidebar-ad-left premium-ad-frame"></div><div class="sidebar-ad-right premium-ad-frame"></div><div class="ad-banner-container premium-ad-frame"></div><div class="mobile-ad-bottom premium-ad-frame"></div><div class="ma-inline-ad"></div></div></body></html>',{url:'https://matchapp.tv',runScripts:'outside-only'});
 try {
  d.window.eval(script);
  d.window.document.dispatchEvent(new d.window.Event('DOMContentLoaded'));
  assert.ok(d.window.document.documentElement.classList.contains('ads-empty'));
  for(const host of d.window.document.querySelectorAll('.premium-ad-frame,.ma-inline-ad')){
   assert.equal(host.style.getPropertyValue('display'),'none',host.className);
   assert.equal(host.style.getPropertyPriority('display'),'important',host.className);
   assert.equal(host.style.getPropertyValue('min-height'),'0',host.className);
  }
  const grid=d.window.document.querySelector('.main-layout');
  assert.equal(grid.style.getPropertyValue('grid-template-columns'),'minmax(0,1fr)');
  assert.equal(grid.style.getPropertyPriority('grid-template-columns'),'important');
  assert.equal((home.match(/data-ad-slot="2595698117"/g)||[]).length,5);
 }finally{d.window.close()}
});
test('voluntary donation prompt waits for explicit support gesture and closes cleanly',()=>{
 const script=read('patches/donate-prompt-20261118.js');
 const d=new JSDOM('<!doctype html><html><body><button data-ma-donate-prompt>Support</button></body></html>',{url:'https://matchapp.tv',runScripts:'outside-only'});
 try{
  d.window.eval(script);
  d.window.document.dispatchEvent(new d.window.Event('DOMContentLoaded'));
  assert.equal(d.window.document.getElementById('ma-donate'),null,'must not prompt on page load');
  d.window.document.querySelector('[data-ma-donate-prompt]').click();
  const prompt=d.window.document.getElementById('ma-donate');assert.ok(prompt,'user can explicitly open support');
  prompt.querySelector('button[aria-label="Close"]').click();
  assert.equal(d.window.document.getElementById('ma-donate'),null);
  assert.equal(d.window.sessionStorage.getItem('ma-donate-shown'),'1');
 }finally{d.window.close()}
});
