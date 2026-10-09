'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const ROOT=path.resolve(__dirname,'..');
const home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const js=fs.readFileSync(path.join(ROOT,'jonas/floating-home.js'),'utf8');
const css=fs.readFileSync(path.join(ROOT,'jonas/floating-home.css'),'utf8');
const start=home.indexOf('<aside id="ma-jonas-home"');
const end=home.indexOf('</aside>',start);
const markup=home.slice(start,end+8);
function scene(url='https://matchapp.tv/',options={}){
 const dom=new JSDOM('<!doctype html><html lang="en"><head></head><body class="page-home">'+markup+'</body></html>',
   {url,runScripts:'outside-only',pretendToBeVisual:true});
 if(options.native)dom.window.MATCHAPP_ANDROID=true;
 if(options.locale)dom.window.MATCH_LANG=options.locale;
 dom.window.matchMedia=()=>({matches:false});
 dom.window.eval(js);
 return dom;
}
test('official homepage includes exactly one fixed Jonas portrait bubble and local assets',()=>{
 assert.ok(start>0&&end>start);
 const dom=scene(),doc=dom.window.document;
 const launcher=doc.querySelector('#ma-jonas-home-bubble');
 assert.ok(launcher);
 assert.equal(doc.querySelectorAll('#ma-jonas-home-bubble').length,1);
 assert.equal(launcher.getAttribute('aria-expanded'),'false');
 assert.equal(launcher.querySelector('img')?.getAttribute('src'),'/jonas/faces/jonas/rest.jpg');
 assert.ok(fs.existsSync(path.join(ROOT,'jonas/faces/jonas/rest.jpg')));
 assert.ok(home.includes('/jonas/floating-home.js?v=20261009-1'));
 assert.ok(home.includes('/jonas/floating-home.css?v=20261009-1'));
 assert.match(css,/#ma-jonas-home\{[^}]*position:fixed/);
 assert.match(css,/@media\(max-width:374px\)/);
 dom.window.close();
});
test('clicking Jonas opens premium panel, X and Escape dismiss without changing the page',()=>{
 const dom=scene();const w=dom.window,d=w.document;
 const launcher=d.getElementById('ma-jonas-home-bubble');
 const panel=d.getElementById('ma-jonas-home-panel');
 assert.equal(panel.hidden,true);
 launcher.click();
 assert.equal(panel.hidden,false);
 assert.equal(launcher.getAttribute('aria-expanded'),'true');
 assert.equal(panel.getAttribute('role'),'dialog');
 d.getElementById('ma-jonas-home-close').click();
 assert.equal(panel.hidden,true);
 assert.equal(launcher.getAttribute('aria-expanded'),'false');
 launcher.click();
 d.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(panel.hidden,true);
 dom.window.close();
});
test('input and quick prompts use original authenticated AI discovery route',()=>{
 const dom=scene();const d=dom.window.document;
 const form=d.querySelector('.jh-form');
 assert.equal(form.getAttribute('action'),'/discover.html');
 assert.equal(form.getAttribute('method'),'get');
 d.getElementById('ma-jonas-home-input').value='Movies for a rainy evening';
 const params=new URLSearchParams(new dom.window.FormData(form));
 assert.equal(params.get('q'),'Movies for a rainy evening');
 assert.equal(params.get('focus'),'start');
 for(const item of d.querySelectorAll('.jh-suggestion')){
  const u=new URL(item.href);
  assert.equal(u.pathname,'/discover.html');
  assert.ok(u.searchParams.get('q').length>12);
  assert.equal(u.searchParams.get('focus'),'start');
 }
 assert.ok(d.querySelector('.jh-full[href="/jonas/"]'));
 assert.doesNotMatch(js,/\/api\/ask|OPENROUTER_API_KEY|STRIPE_SECRET_KEY/);
 dom.window.close();
});
test('Portuguese locale updates controls and suggestion questions',async()=>{
 const dom=scene('https://matchapp.tv/',{locale:'pt-BR'});const w=dom.window,d=w.document;
 assert.equal(d.getElementById('ma-jonas-home-bubble').getAttribute('aria-label'),'Conversar com Jonas');
 assert.match(d.querySelector('.jh-greeting').textContent,/Sou o Jonas/);
 assert.match(decodeURIComponent(d.querySelector('.jh-suggestion').href),/Recomende uma série documental/);
 w.MATCH_LANG='en';
 d.dispatchEvent(new w.Event('change',{bubbles:true}));
 await Promise.resolve();
 assert.match(d.querySelector('.jh-greeting').textContent,/I'm Jonas/);
 assert.match(decodeURIComponent(d.querySelector('.jh-suggestion').href),/Recommend a documentary/);
 dom.window.close();
});
test('native Android and Kids routes never show an overlapping second widget',()=>{
 for(const options of [{url:'https://matchapp.tv/',native:true},{url:'https://matchapp.tv/kids/'},{url:'https://matchapp.tv/discover.html'}]){
  const dom=scene(options.url,{native:options.native});
  assert.equal(dom.window.document.getElementById('ma-jonas-home').hidden,true);
  dom.window.close();
 }
 assert.match(css,/html\.matchapp-ai-android #ma-jonas-home/);
});
test('widget is independent of locked AdSense units and existing navigation',()=>{
 const index=home.indexOf('id="ma-jonas-home"'),ads=home.indexOf('data-ad-slot="2595698117"');
 assert.ok(index>ads);
 assert.ok(home.includes('href="/jonas/"'));
 assert.ok(home.includes('<!-- MATCH TOGETHER ENTRY -->'));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
