'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const ia=fs.readFileSync(path.join(__dirname,'../matchapp-ia.js'),'utf8');
const workspace=fs.readFileSync(path.join(__dirname,'../jonas/chat-workspace-20261011.js'),'utf8');
const fixture='<body class="ai-chat-page"><main class="wrap"><section class="premium-card discover-head"><h1></h1><div id="chat-log"></div><div class="newsearch-row"><div class="composer"><textarea id="discover-new-input"></textarea><button class="composer-send"></button></div></div></section></main></body>';
for(const [route,kind] of [['/discover','discover'],['/discover.html','discover'],['/discover/','discover'],['/together','together'],['/together.html','together'],['/pricing/pricing','pricing'],['/pricing/pricing.html','pricing']]){
 test('premium UI activates at '+route,()=>{const dom=new JSDOM(fixture,{url:'https://matchapp.tv'+route,runScripts:'outside-only'});try{dom.window.eval(ia);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));assert.ok(dom.window.document.body.classList.contains('ma-ia-'+kind));}finally{dom.window.close();}});
}
for(const route of ['/discover','/discover.html','/discover/']){
 test('Jonas workspace sizes the real composer at '+route,async()=>{const dom=new JSDOM(fixture,{url:'https://matchapp.tv'+route,runScripts:'outside-only',pretendToBeVisual:true});try{dom.window.eval(workspace);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));await new Promise(resolve=>setTimeout(resolve,35));assert.match(dom.window.document.querySelector('.discover-head').style.getPropertyValue('--jonas-workspace-height'),/^\d+px$/);}finally{dom.window.close();}});
}
test('premium route aliases do not activate adult Ask UI on Kids pages',()=>{const dom=new JSDOM(fixture,{url:'https://matchapp.tv/kids/',runScripts:'outside-only'});try{dom.window.eval(ia);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));assert.equal(dom.window.document.body.classList.contains('ma-ia-discover'),false);}finally{dom.window.close();}});

const settings=fs.readFileSync(path.join(__dirname,'../settings.js'),'utf8');
for(const route of ['/discover','/discover.html','/together','/together.html','/pricing/pricing','/pricing/pricing.html']){
 test('shared premium loader injects the versioned UI at '+route,()=>{const dom=new JSDOM(fixture,{url:'https://matchapp.tv'+route,runScripts:'outside-only'});try{dom.window.eval(settings);assert.match(dom.window.document.querySelector('script[data-matchapp-ia]')?.src||'',/\/matchapp-ia\.js\?v=20260919-ia24&cleanurl=20261013-1$/);assert.ok(dom.window.document.querySelector('link[data-matchapp-ia]'));}finally{dom.window.close();}});
}
test('shared premium loader does not include adult UI on Kids or lookalike routes',()=>{for(const route of ['/kids/','/discover-other','/pricing/pricing-other']){const dom=new JSDOM(fixture,{url:'https://matchapp.tv'+route,runScripts:'outside-only'});try{dom.window.eval(settings);assert.equal(dom.window.document.querySelector('script[data-matchapp-ia]'),null);}finally{dom.window.close();}}});
