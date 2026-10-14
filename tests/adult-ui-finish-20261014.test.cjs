const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const code=read('adult-ui-finish-20261014.js');
test('Home Explore entry localizes without replacing navigation or credit handlers',()=>{
 const dom=new JSDOM('<body class="page-home"><a class="mh-explore-more" href="/explore.html"></a><header class="home-hero"><a class="approved-design-cta" href="/explore.html"></a></header></body>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=dom.window;w.eval(code);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 assert.equal(w.document.querySelector('a').textContent,'Explore more from your Ai');
 for(const lang of ['pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
  w.document.dispatchEvent(new w.CustomEvent('matchapp:langchange',{detail:{lang}}));
  for(const a of w.document.querySelectorAll('a')){assert.ok(a.textContent.includes('Ai'));assert.notEqual(a.textContent,'Explore more from your Ai');assert.equal(a.getAttribute('href'),'/explore.html');}
 }
 dom.window.close();
});
test('adult finish does not initialize on Kids and contains no recommendation or billing request',()=>{
 const dom=new JSDOM('<body class="page-kids"><a class="mh-explore-more">unchanged</a></body>',{url:'https://matchapp.tv/kids/',runScripts:'outside-only'});
 dom.window.eval(code);assert.equal(dom.window.__maAdultUiFinish,undefined);assert.equal(dom.window.document.querySelector('a').textContent,'unchanged');dom.window.close();
 assert.doesNotMatch(code,/fetch\(|consume_match|consume_ask|gemini-proxy|triggerMatch\(/);
});
test('Explore has one shared adult topbox and bubble; Home default floats existing Jonas',()=>{
 const doc=new JSDOM(read('explore.html')).window.document;
 assert.equal(doc.querySelectorAll('header.app-header').length,1);assert.equal(doc.querySelectorAll('#ma-jonas-home').length,1);
 assert.ok(doc.querySelector('script[src*="page-shell.js"]'));assert.ok(doc.querySelector('script[src*="brand-lock-"]'));
 assert.match(read('jonas/floating-home-20261010-v3.js'),/if\(persistentBubble\)\{\s*defaultPosition\(\);\s*if\(dock\)dock.hidden=true/);
});
test('floating Home opens a viewport stage and Back closes it without leaving Home',async()=>{
 const dom=new JSDOM('<body class="page-home"><section id="ma-ai-entry"></section>'+read('jonas/floating-shell-20261013.html')+'</body>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.eval(read('jonas/floating-home-20261010-v3.js'));
 const root=w.document.querySelector('#ma-jonas-home'),bubble=w.document.querySelector('#ma-jonas-home-bubble');
 assert.ok(root.classList.contains('is-floating'));assert.ok(root.style.getPropertyValue('top'));
 bubble.click();assert.ok(root.classList.contains('is-chat-stage'));assert.equal(root.style.getPropertyValue('top'),'');assert.equal(root.classList.contains('is-floating'),false);assert.equal(w.history.state.maJonasOpen,true);
 const popped=new Promise(resolve=>w.addEventListener('popstate',resolve,{once:true}));w.history.back();await popped;
 assert.equal(root.classList.contains('is-chat-stage'),false);assert.equal(w.document.querySelector('#ma-jonas-home-panel').hidden,true);assert.ok(root.classList.contains('is-floating'));assert.equal(w.location.pathname,'/');w.close();
});
test('native ambient Back minimizes the existing metered frame and retains title context',async()=>{
 const dom=new JSDOM('<body><div id="result-box" style="display:block"><h2 id="res-title">Exact selected title</h2></div></body>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.__MATCHAPP_AMBIENT_QA__=true;w.currentMatchIdentity={title:'Exact selected title'};w.MatchAppNativeVoice={speak(){},stop(){},stopSpeaking(){}};
 w.eval(read('jonas/android-ambient-assistant-20261011.js'));w.document.querySelector('.ja-bubble').click();
 const frame=w.document.querySelector('#ma-ambient-chat-frame');assert.equal(new URL(frame.src).searchParams.get('title'),'Exact selected title');assert.equal(w.history.state.maAmbientJonasOpen,true);
 const popped=new Promise(resolve=>w.addEventListener('popstate',resolve,{once:true}));w.history.back();await popped;
 assert.equal(w.document.querySelector('#ma-ambient-panel').hidden,true);assert.equal(w.location.pathname,'/');w.document.querySelector('.ja-bubble').click();assert.equal(w.document.querySelector('#ma-ambient-chat-frame'),frame);w.close();
});
test('debug preview and deployed adult ambient controller remain identical',()=>{
 assert.equal(read('android-studio/app/src/debug/assets/ambient-preview/jonas/android-ambient-assistant-20261011.js'),read('jonas/android-ambient-assistant-20261011.js'));
});

test('news bookmarks focus only the matching verified article',()=>{
 const dom=new JSDOM('<body><article id="wrong"><a href="/?news=other#latest-news">Other</a></article><article id="exact"><a href="/?news=chosen#latest-news">Exact</a></article></body>',{url:'https://matchapp.tv/news/?news=chosen',runScripts:'outside-only'});
 dom.window.HTMLElement.prototype.scrollIntoView=function(){};dom.window.eval(code);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
 assert.equal(dom.window.document.querySelector('#exact').classList.contains('ma-current-news'),true);assert.equal(dom.window.document.querySelector('#wrong').classList.contains('ma-current-news'),false);dom.window.close();
});
