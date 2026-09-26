'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');

test('matched title has one accessible top-right trash control with in/out and reduced-motion styles',()=>{
 const html=read('index.html'),doc=new JSDOM(html).window.document;
 const box=doc.querySelector('#result-box'),button=box?.querySelector('#result-dismiss');
 assert.ok(box&&button&&button.tagName==='BUTTON');
 assert.equal(doc.querySelectorAll('#result-dismiss').length,1);
 assert.equal(button.getAttribute('onclick'),'dismissMatchResult()');
 assert.equal(button.getAttribute('type'),'button');
 assert.ok(button.getAttribute('aria-label'));
 assert.ok(button.querySelector('svg[aria-hidden="true"]'));
 const css=html.slice(html.indexOf('/* Result controls only:'),html.indexOf('.qc-num {',html.indexOf('/* Result controls only:')));
 assert.match(css,/right:12px!important;top:12px!important/);
 assert.match(css,/maResultFadeIn/);
 assert.match(css,/maResultFadeOut/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.equal((html.match(/<ins class="adsbygoogle"/g)||[]).length,5,'AdSense configuration must not change');
});

test('trash only hides the match after its fade; a new match cannot be hidden by the old timer',()=>{
 const code=read('app.js'),start=code.indexOf('window.dismissMatchResult = function () {'),end=code.indexOf('\n};',start);
 assert.ok(start>=0&&end>start);
 const dom=new JSDOM('<html><body><section id="other-home">Keep me</section><article id="questionnaire-box" style="display:none"></article><article id="search-box" style="display:none"></article><article id="result-box" class="is-revealed" style="display:block"><h2 id="res-title">Real title</h2><img id="res-poster-img" src="data:image/svg+xml,cover"></article></body></html>',{url:'https://matchapp.tv/'});
 const doc=dom.window.document,timers=[];
 let zoomClosed=0;
 const w={__matchappMatchRunId:8,matchMedia:()=>({matches:false}),closePosterZoom:()=>zoomClosed++,setTimeout:(fn)=>timers.push(fn)};
 vm.runInNewContext(code.slice(start,end+3),{window:w,document:doc});
 w.dismissMatchResult();
 const box=doc.getElementById('result-box');
 assert.ok(box.classList.contains('ma-result-closing'));
 assert.equal(box.style.display,'block','keep content in flow during fade-out');
 assert.equal(zoomClosed,1);
 assert.equal(doc.getElementById('other-home').textContent,'Keep me');
 timers.shift()();
 assert.equal(box.style.display,'none');
 assert.equal(box.getAttribute('aria-hidden'),'true');
 assert.equal(doc.getElementById('questionnaire-box').style.display,'');
 assert.equal(doc.getElementById('search-box').style.display,'','Ask AI input must remain usable after closing match');
 assert.equal(box.querySelector('#res-title').textContent,'Real title','dismiss must not delete title/history');
 box.style.display='block';box.removeAttribute('aria-hidden');box.classList.add('is-revealed');
 w.dismissMatchResult();
 w.__matchappMatchRunId=9;delete box.dataset.resultClosing;
 timers.shift()();
 assert.equal(box.style.display,'block','an old dismiss timer must not close a newer match');
 dom.window.close();
});

test('News initializes directly on the homepage and its original-source cards live inside an interactive details fold',async()=>{
 const html=read('index.html'),news=read('latest-news.js'),colors=read('fold-colors.css');
 assert.match(html,/\/latest-news\.js\?v=20260926-newsfold1/,'must not rely on deferred editorial intersection trigger');
 assert.match(html,/\/live-news-loader\.js\?v=20260926-newsfold1/);
 assert.match(colors,/#latest-news>summary\{[\s\S]*?pointer-events:auto!important;cursor:pointer!important/);
 assert.doesNotMatch(colors,/#latest-news>summary::after\{\s*content:none/);
 assert.match(colors,/#latest-news:not\(\[open\]\)>\.ma-news-panel\{display:none!important/);
 const dom=new JSDOM('<!doctype html><html lang="en"><body><main><section id="ma-concierge"><article id="questionnaire-box"></article><section id="ebook-matcher-root"></section></section><details id="premiere-disclosure"></details></main></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;
 w.requestAnimationFrame=fn=>{fn();return 1;};
 w.fetch=async url=>String(url).includes('/cdn-cgi/trace')?{ok:false}:{
   ok:true,json:async()=>({feed_version:'local-test-v1',generated_at:'2026-09-26T08:00:00Z',items:[{
    id:'verified-story',title:'A verified entertainment report',source:'Reuters',source_domain:'reuters.com',
    url:'https://www.reuters.com/world/',published_at:'2026-09-26T08:00:00Z',
    country:'US',category:'entertainment',event_type:'Entertainment'
   }]})
 };
 w.eval(news);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 await new Promise(r=>setTimeout(r,30));
 const section=w.document.getElementById('latest-news');
 assert.ok(section);
 assert.equal(section.tagName,'DETAILS');
 assert.equal(w.document.getElementById('ma-concierge').nextElementSibling,section,'News must remain visible outside a collapsed Match/Ask stage');
 assert.equal(w.document.getElementById('ebook-matcher-root').previousElementSibling.id,'questionnaire-box','Never split the approved matcher/Bookworms pair');
 assert.equal(section.open,true);
 assert.equal(section.querySelectorAll('.ma-news-card').length,1);
 assert.equal(section.querySelector('.ma-news-card-main')?.getAttribute('href'),'https://www.reuters.com/world/');
 section.open=false;assert.equal(section.open,false);
 section.open=true;assert.equal(section.open,true);
 w.close();
});

test('match artwork appears before source awaits and slow fallback cannot replace a decoded original',()=>{
 const app=read('app.js'),media=read('catalog-media.js'),html=read('index.html');
 const first=app.indexOf('firstPoster.src = firstCover;');
 const remote=app.indexOf("if (!meta && !skipLiveLookup && !verified) meta = await getRichMetadata(");
 assert.ok(first>=0&&remote>first,'local artwork must paint before slow source verification');
 assert.match(app,/if \(!originalShown\) posterEl\.src = localCover/);
 assert.match(media,/state\.needsRepair=true/);
 assert.match(media,/if\(!state\.meta&&safeSameTitleMedia\(found,state\)\)/);
 assert.match(html,/catalog-media\.js\?v=20260926-catalogscale1/);
 assert.match(html,/app\.js\?v=20260926-catalogscale1/);
 assert.doesNotMatch(read('kids/index.html'),/result-dismiss|latest-news\.js\?v=20260926-newsfold1/);
});