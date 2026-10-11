const {test}=require('node:test'), assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=x=>fs.readFileSync(path.join(root,x),'utf8');
test('Jonas smartphone header uses a one-row grid without duplicate hamburger',()=>{
 const css=read('jonas/premium-chat-finish-20261011.css');
 const html=read('discover.html');
 assert.match(css,/nav\.mh-deck\{\s*display:grid!important;/);
 assert.match(css,/grid-template-rows:43px!important/);
 assert.match(css,/\.mh-home-label\{\s*display:none!important/);
 assert.match(css,/#ai-sidebar-toggle\{display:none!important/);
 assert.match(css,/nav\.mh-deck:has\(>\.ma-menu-wrap\)/);
 assert.match(html,/premium-chat-finish-20261011\.css\?v=20261011-deviceqa4/);
 assert.match(html,/onclick="toggleAiSidebar\(true\)"/);
 assert.match(html,/id="lang-switcher-host"/);
});
test('composer keeps microphone/send handlers, safe-area help and balanced fields',()=>{
 const css=read('jonas/premium-chat-finish-20261011.css');
 const html=read('discover.html');
 assert.match(html,/id="mic-btn-discover"/);
 assert.match(html,/onclick="newDiscoverSearch\(\)"/);
 assert.match(css,/env\(safe-area-inset-bottom,0px\)/);
 assert.match(css,/font-size:10px!important/);
 assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/grid-template-columns:minmax\(0,1fr\) 46px 46px/);
});
test('layout changes remain scoped to Ask AI and cannot alter other mechanisms',()=>{
 const css=read('jonas/premium-chat-finish-20261011.css');
 assert.match(css,/html body\.ai-chat-page/);
 assert.doesNotMatch(css,/\.page-kids|\.adsbygoogle|\.ma-ad-slot/);
 assert.match(css,/#chat-log:empty::before/);
});