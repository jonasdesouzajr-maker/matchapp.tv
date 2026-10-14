'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),root=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(root,f),'utf8');
const supported=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
test('adult design stylesheet and routes are opt-in and do not alter protected ads or Kids',()=>{
 const home=read('index.html'),explore=read('explore.html'),music=read('music.html');
 const style=read('patches/adult-home-finish-20261014.css'),hub=read('patches/explore-hub.css');
 assert.match(home,/patches\/adult-home-finish-20261014\.css/);
 assert.match(explore,/patches\/explore-hub\.css\?v=design20261014-1/);
 assert.match(music,/patches\/explore-hub\.css\?v=design20261014-1/);
 assert.match(style,/body\.page-home/);
 assert.doesNotMatch(style,/(?:\.adsbygoogle|\.premium-ad-frame|\.sidebar-ad-left|\.sidebar-ad-right|#ma-ambient-jonas|\.page-kids)/);
 assert.doesNotMatch(hub,/(?:\.adsbygoogle|\.sidebar-ad|\.page-kids)/);
 assert.equal((home.match(/<ins class="adsbygoogle"/g)||[]).length,5);
 assert.ok(fs.existsSync(path.join(root,'assets/brand/matchapp-icon-approved.png')));
});
test('Explore keeps all eight original destinations and exposes the translated How it works panel',()=>{
 const d=new JSDOM(read('explore.html'),{url:'https://matchapp.tv/explore.html'});
 const links=[...d.window.document.querySelectorAll('.explore-grid a')].map(n=>n.getAttribute('href'));
 assert.deepEqual(links,['/cooking/','/music.html','/news/','/ebooks/#ebook-matcher-root','/events-archive.html','/featured/american-horror-story-13/','/awareness/breast-cancer-awareness-month-2026/','/guides/worldwide-entertainment-discovery/']);
 assert.ok(d.window.document.querySelector('#how-it-works summary[data-i18n="how.title"]'));
 assert.equal(d.window.document.querySelector('[href="/explore.html"]').getAttribute('aria-current'),'page');
 d.window.close();
});
test('Home Explore CTA and description keep all fourteen authored languages',()=>{
 const d=new JSDOM('<html><body class="page-home"><h2 data-explore-more-label>Explore more</h2><p data-home-explore-description></p><a data-explore-more-label href="/explore.html">Explore more</a></body></html>',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=d.window;w.eval(read('patches/home-watch-focus.js'));
 for(const language of supported){
  w.MATCH_LANG=language;
  w.document.dispatchEvent(new w.Event('matchapp:langchange'));
  assert.ok(w.document.querySelector('p').textContent.trim(),language+' description missing');
  assert.ok(w.document.querySelector('h2').textContent.trim(),language+' section heading missing');
  assert.equal(w.document.querySelector('a').getAttribute('href'),'/explore.html');
 }
 w.close();
});
test('Music authored CTA is translated without altering its query context',()=>{
 const html='<html><body class="page-music"><a href="/discover.html?topic=music" data-music-ask>Ask Jonas about music</a><h1 data-hub-copy="6"></h1></body></html>';
 const d=new JSDOM(html,{url:'https://matchapp.tv/music.html',runScripts:'outside-only'}),w=d.window;
 w.eval(read('patches/explore-locales.js'));
 for(const language of supported){
  w.MATCH_LANG=language;w.document.dispatchEvent(new w.Event('matchapp:langchange'));
  assert.ok(w.document.querySelector('a').textContent.trim(),language+' music CTA missing');
  assert.equal(w.document.querySelector('a').getAttribute('href'),'/discover.html?topic=music');
  assert.match(w.document.title,/MatchApp Ai/);
 }
 w.close();
});

test('retired Home anchors reach their dedicated routes without dropping query context',()=>{
 const vm=require('node:vm'),script=read('patches/home-watch-focus.js');
 const cases={
  '#how-it-works':'/explore.html#how-it-works','#cooking-home':'/cooking/','#latest-news':'/news/',
  '#global-events':'/events-archive.html','#billboard':'/music.html#billboard',
  '#spotify-videos':'/music.html#spotify-videos','#premiere-disclosure':'/featured/american-horror-story-13/',
  '#ebook-matcher-root':'/ebooks/#ebook-matcher-root'
 };
 for(const [hash,target] of Object.entries(cases)){
  let redirected='';const location={pathname:'/',href:'https://matchapp.tv/?lang=ja'+hash,replace:u=>redirected=u};
  vm.runInNewContext(script,{location,URL,document:{readyState:'loading',addEventListener(){}},window:{addEventListener(){}}});
  assert.equal(new URL(redirected).pathname+new URL(redirected).hash,target,'old anchor '+hash);
  assert.equal(new URL(redirected).search,'?lang=ja');
 }
 let redirects=0;
 vm.runInNewContext(script,{location:{pathname:'/',href:'https://matchapp.tv/#trending-rail',replace(){redirects++}},URL,document:{readyState:'loading',addEventListener(){}},window:{addEventListener(){}}});
 assert.equal(redirects,0,'visible Top Titles anchor must stay on Home');
});

test('Jonas open conversation fills viewport and restores parked position',()=>{
 const css=read('patches/jonas-premium-glass.css');
 const home=read('jonas/floating-home-20261010-v3.js'),ambient=read('jonas/android-ambient-assistant-20261011.js');
 assert.match(css,/#ma-jonas-home\.is-chat-stage > \.jh-bubble/);
 assert.match(css,/#ma-ambient-panel:not\(\[hidden\]\)/);
 assert.match(css,/\.ja-face-wrap/);
 assert.match(css,/\.jh-form/);
 assert.match(home,/function syncConversationViewport\(\)/);
 assert.match(home,/visualViewport\?\.addEventListener\('resize'/);
 assert.match(home,/panel\.setAttribute\('aria-modal','true'\)/);
 assert.match(home,/stagePosition=\{left:r\.left,top:r\.top\}/);
 assert.match(home,/setFloating\(stagePosition\.left,stagePosition\.top\)/);
 assert.match(ambient,/function syncPanelViewport\(\)/);
 assert.match(ambient,/syncPanelViewport\(\);/);
 assert.match(ambient,/panel\.hidden=true;root\.hidden=false/);
 assert.doesNotMatch(ambient,/panel\.style\.setProperty\('--ja-origin-x'/);
});
