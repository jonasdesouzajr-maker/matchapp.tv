'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('Home hero Ask opens a previously collapsed concierge and reveals the actual Ask panel',()=>{
 const dom=new JSDOM('<html><body class="page-home"><header class="home-hero"><h1 class="home-h1">Match</h1><p class="home-h1-sub"></p></header><button class="lazy-head" data-fold-key="concierge"></button><section id="ma-concierge" class="ma-concierge lazy-foldable"><button id="ma-tab-ask"></button><div id="ma-panel-ask" hidden><article id="search-box"></article></div></section><article id="questionnaire-box"></article></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window,section=w.document.getElementById('ma-concierge'),panel=w.document.getElementById('ma-panel-ask');
 let opens=0,clicks=0,scrolls=0;
 section.previousElementSibling.onclick=()=>{opens++;section.classList.add('lazy-open')};
 w.document.getElementById('ma-tab-ask').onclick=()=>{clicks++;panel.hidden=false};
 w.HTMLElement.prototype.scrollIntoView=function(){scrolls++;};
 w.eval(read('home-approved.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 w.document.getElementById('ma-hero-ask').click();
 assert.equal(opens,1,'expand persisted collapsed fold before selecting Ask');
 assert.equal(clicks,1,'activate Ask panel');
 assert.equal(panel.hidden,false,'Ask input must be revealed');
 assert.equal(scrolls,1,'scroll to the revealed input, not the hidden section');
 assert.match(read('home-approved.js'),/ask\.scrollIntoView\(\{ behavior: 'instant', block: 'start' \}\)/,'mobile first-tap must not wait behind smooth scroll');
 w.close();
});
test('dedicated Home Ask card expands fold and scrolls the revealed input without opening keyboard',()=>{
 const s=read('matchapp-ia.js');
 assert.match(s,/ba\.addEventListener\('click',\(\)=>\{/);
 assert.match(s,/if\(fold\)[\s\S]*toggle\.click\(\)/);
 assert.match(s,/tab\('ask'\);\s*requestAnimationFrame/);
 assert.match(s,/target\.scrollIntoView\(\{behavior:'instant',block:'start'\}\)/);
 const handler=s.slice(s.indexOf("ba.addEventListener('click',()=>{"),s.indexOf("\n });",s.indexOf("ba.addEventListener('click',()=>{"))+4);
 assert.doesNotMatch(handler,/\.focus\(/,'do not auto-pop the phone keyboard');
});
test('empty chat Send provides accessible bilingual feedback without triggering empty AI requests',()=>{
 const s=read('discover.js'),start=s.indexOf('window.newDiscoverSearch = function () {'),end=s.indexOf('\n};',start);
 assert.ok(start>=0&&end>start);
 const dom=new JSDOM('<html lang="en"><body><div id="discover-compose-help" aria-live="polite">Original help</div><textarea id="discover-new-input"></textarea></body></html>',{url:'https://matchapp.tv/discover.html'});
 const w=dom.window;let queries=[],resizes=0;
 w.autoGrowComposer=()=>resizes++;
 const fn=new Function('window','document','askAndRender',s.slice(start,end+3)+';return window.newDiscoverSearch;')(w,w.document,q=>queries.push(q));
 const hint=w.document.getElementById('discover-compose-help'),input=w.document.getElementById('discover-new-input');
 assert.equal(fn(),false);assert.match(hint.textContent,/Type a question/);assert.deepEqual(queries,[]);
 w.MATCH_LANG='pt-BR';assert.equal(fn(),false);assert.match(hint.textContent,/Digite uma pergunta/);
 input.value='Recommend a comedy series';assert.equal(fn(),true);assert.deepEqual(queries,['Recommend a comedy series']);assert.equal(input.value,'');assert.equal(resizes,1);
 w.close();
});
test('new Ask runtime reaches phones, iPhones, tablets and live Android WebView with unchanged native shell',()=>{
 const home=read('index.html'),chat=read('discover.html');
 assert.match(home,/matchapp-ia\.js\?v=20260926-brandai1-adorder2&amp;askbtn=20260927-2/);
 assert.match(home,/home-approved\.js\?v=20260928-no-dock1/);
 assert.match(chat,/discover\.js\?v=20260925-intent1[^"]*askbtn=20260927-1/);
 assert.match(home,/class="top-ai-launch" href="\/discover\.html"/);
 assert.doesNotMatch(read('home-approved.js'),/mountDock|ma-dock/);
 assert.doesNotMatch(read('home-approved.css'),/#ma-dock/);
 assert.match(home,/href="\/together\.html" class="tg-entry"/);
 assert.match(home,/id="profile-link-tab" href="\/profile\/profile\.html/);
});

test('live phone/tablet/desktop smoke opens the real Home Ask card and handles empty Send',()=>{
 const smoke=read('tools/live-production-smoke.cjs');
 assert.match(smoke,/page\.locator\('#ma-hero-ask'\)\.click/);
 assert.match(smoke,/Home Ask AI tap opens visible unfocused composer/);
 assert.match(smoke,/getElementById\('ma-panel-ask'\)/);
 assert.match(smoke,/noAutoKeyboard/);
 assert.match(smoke,/waitForFunction\(\(\)=>\{[\s\S]*input\.top>=0&&input\.bottom<=bottom&&send\.top>=0&&send\.bottom<=bottom/);
 assert.match(smoke,/Ask AI empty Send is actionable/);
});

test('Ask AI closes only an overlapping install suggestion and prevents a new one mid-chat',()=>{
 const home=read('home-approved.js'),tab=read('matchapp-ia.js'),offer=read('browser-install-offer.js'),html=read('index.html');
 assert.match(home,/getElementById\('ma-install-offer'\)\?\.querySelector\('\.ma-offer-close'\)\?\.click/);
 assert.match(tab,/qs\('#ma-install-offer \.ma-offer-close'\)\?\.click/);
 assert.match(offer,/classList\.contains\('ma-ask-tab'\)\) return true/);
 assert.match(tab,/requestAnimationFrame\(\(\)=>\{[\s\S]*?window\.scrollBy\(\{top:rect\.top-desiredTop,behavior:'instant'\}\)/);
 assert.match(html,/browser-install-offer\.js\?v=20260926-playpending1&amp;chat=20260927-1/);
 assert.doesNotMatch(tab.slice(tab.indexOf("ba.addEventListener('click',()=>{"),tab.indexOf("if(new URLSearchParams",tab.indexOf("ba.addEventListener('click',()=>{"))),/localStorage|focus\(/);
});
test('live smoke checks usable input and Send inside the phone viewport',()=>{
 const smoke=read('tools/live-production-smoke.cjs');
 assert.match(smoke,/const dockSpace=dock&&getComputedStyle\(dock\)\.display/);
 assert.match(smoke,/input\.bottom<=bottom&&send\.top>=0&&send\.bottom<=bottom/);
 assert.match(smoke,/controlsUsable&&!document\.getElementById\('ma-install-offer'\)/);
});
