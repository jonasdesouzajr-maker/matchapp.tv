'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
test('Home hero headline and duplicate English CTA buttons stay retired',()=>{
 const dom=new JSDOM('<html><body class="page-home"><header class="home-hero"><h1 class="home-h1">Match</h1><p class="home-h1-sub"></p></header><button class="lazy-head" data-fold-key="concierge"></button><section id="ma-concierge" class="ma-concierge lazy-foldable"><button id="ma-tab-ask"></button><div id="ma-panel-ask" hidden><article id="search-box"></article></div></section><article id="questionnaire-box"></article></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;
 w.eval(read('home-approved.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(w.document.getElementById('ma-hero-ask'),null);
 assert.equal(w.document.getElementById('ma-hero-match'),null);
 assert.equal(w.document.getElementById('ma-hero-ctas'),null);
 assert.match(read('home-approved.css'),/\.home-hero\{position:absolute!important;width:1px!important/);
 w.close();
});
test('dedicated Home Ask card expands fold and scrolls the revealed input without opening keyboard',()=>{
 const s=read('matchapp-ia.js');
 assert.match(s,/ba\.addEventListener\('click',\(\)=>\{/);
 assert.match(s,/if\(fold\)[\s\S]*toggle\.click\(\)/);
 assert.match(s,/tab\('ask'\);\s*requestAnimationFrame/);
 assert.match(s,/window\.MatchAppActivatedScroll\?\.toStart\(target,\{behavior:'auto'\}\) \?\? target\.scrollIntoView\(\{behavior:'auto',block:'start'\}\)/);
 const handler=s.slice(s.indexOf("ba.addEventListener('click',()=>{"),s.indexOf("\n });",s.indexOf("ba.addEventListener('click',()=>{"))+4);
 assert.doesNotMatch(handler,/\.focus\(/,'do not auto-pop the phone keyboard');
});
test('empty chat Send provides accessible bilingual feedback without triggering empty AI requests',()=>{
 const s=read('discover.js'),start=s.indexOf('window.newDiscoverSearch = function () {'),end=s.indexOf('\n};',start);
 assert.ok(start>=0&&end>start);
 const dom=new JSDOM('<html lang="en"><body><div id="discover-compose-help" aria-live="polite">Original help</div><textarea id="discover-new-input"></textarea></body></html>',{url:'https://matchapp.tv/discover.html'});
 const w=dom.window;let queries=[],resizes=0;
 w.autoGrowComposer=()=>resizes++;
 const recoveryStart=s.indexOf('function discoverRecoveryText('),recoveryEnd=s.indexOf('\n}\n',recoveryStart)+2;
 assert.ok(recoveryStart>=0&&recoveryEnd>recoveryStart);
 const fn=new Function('window','document','askAndRender',s.slice(recoveryStart,recoveryEnd)+'\n'+s.slice(start,end+3)+';return window.newDiscoverSearch;')(w,w.document,q=>queries.push(q));
 const hint=w.document.getElementById('discover-compose-help'),input=w.document.getElementById('discover-new-input');
 assert.equal(fn(),false);assert.match(hint.textContent,/Type a question/);assert.deepEqual(queries,[]);
 w.MATCH_LANG='pt-BR';assert.equal(fn(),false);assert.match(hint.textContent,/Digite uma pergunta/);
 input.value='Recommend a comedy series';assert.equal(fn(),true);assert.deepEqual(queries,['Recommend a comedy series']);assert.equal(input.value,'');assert.equal(resizes,1);
 w.close();
});
test('new Ask runtime reaches phones, iPhones, tablets and live Android WebView with unchanged native shell',()=>{
 const home=read('index.html'),chat=read('discover.html');
 assert.match(home,/matchapp-ia\.js\?v=20260926-brandai1-adorder2&amp;askbtn=20260927-2/);
 assert.match(home,/home-approved\.js\?v=20261001-adulttopboxdark1/);
 assert.match(chat,/discover\.js\?v=20260925-intent1[^"]*askbtn=20260927-1/);
 assert.match(home,/class="top-ai-launch" href="\/discover\.html"/);
 assert.doesNotMatch(read('home-approved.js'),/mountDock|ma-dock/);
 assert.doesNotMatch(read('home-approved.css'),/#ma-dock/);
 assert.match(home,/href="\/together\.html" class="tg-entry"/);
 assert.match(home,/id="profile-link-tab" href="\/profile\/profile\.html/);
});

test('live phone/tablet/desktop smoke verifies the current Jonas Ask composer and empty Send',()=>{
 const smoke=read('tools/live-production-smoke.cjs');
 assert.match(smoke,/page\.locator\('#ma-jonas-home-bubble'\)/);
 assert.match(smoke,/Home Jonas Ask AI composer is visible and unfocused/);
 assert.match(smoke,/getElementById\('ma-jonas-home-panel'\)/);
 assert.doesNotMatch(smoke,/page\.locator\('#ma-tab-ask'\)\.click/);
 assert.match(smoke,/noAutoKeyboard/);
 assert.match(smoke,/ir\.top>=0&&ir\.bottom<=innerHeight&&sr\.top>=0&&sr\.bottom<=innerHeight/);
 assert.match(smoke,/Ask AI empty Send is actionable/);
});

test('install prompting preserves Home Ask focus and yields to forms',()=>{
 const home=read('home-approved.js'),tab=read('matchapp-ia.js'),offer=read('browser-install-offer.js'),html=read('index.html');
 assert.doesNotMatch(home,/ma-hero-ask/);
 assert.match(tab,/requestAnimationFrame\(\(\)=>\{\s*if\(!pa\.hidden&&pa\.getClientRects\(\)\.length\)\{\s*const target=qs\('#search-box',pa\)\|\|pa;\s*window\.MatchAppActivatedScroll\?\.toStart\(target,\{behavior:'auto'\}\)/);
 assert.match(offer,/notification-bell only/);
 assert.match(offer,/MatchNotifications/);
 assert.doesNotMatch(offer,/appendChild\(node\)|position:\s*fixed|composerOverlapHandler|closeIfOverlappingComposer/);
 assert.match(html,/browser-install-offer\.js\?v=20261028-playbubble2/);
 assert.doesNotMatch(tab.slice(tab.indexOf("ba.addEventListener('click',()=>{"),tab.indexOf("if(new URLSearchParams",tab.indexOf("ba.addEventListener('click',()=>{"))),/localStorage|focus\(/);
});
test('live smoke checks usable input and Send inside the phone viewport',()=>{
 const smoke=read('tools/live-production-smoke.cjs');
 assert.match(smoke,/const ir=input\?\.getBoundingClientRect\(\),sr=send\?\.getBoundingClientRect\(\)/);
 assert.match(smoke,/ir\.bottom<=innerHeight&&sr\.top>=0&&sr\.bottom<=innerHeight/);
 assert.match(smoke,/launcher\?\.getAttribute\('aria-expanded'\)==='true'/);
});
test('Android invitation is dismissible while other device notifications retain their limit',()=>{
 const s=read('browser-install-offer.js');
 assert.match(s,/MAX_VISITS=2/);
 assert.match(s,/if\(device==='android'\)\{startAndroidBubble\(\);return;\}/);
 assert.match(s,/document.activeElement\?\.matches\('input,textarea,select/);
 assert.match(s,/if\(bubble&&busy\(\)\)dismissBubble\(\)/);
 assert.match(s,/pushLocal/);
 assert.match(s,/kind:'install'/);
 assert.doesNotMatch(s,/function closeIfOverlappingComposer\(\)|composerOverlapHandler/);
 assert.match(s,/document\.getElementById\('ma-install-offer'\)\?\.remove\(\)/);
});
