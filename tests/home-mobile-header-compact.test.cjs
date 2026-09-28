const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=(p)=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('compact mobile header is enabled in the canonical page without changing other routes',()=>{
 const html=read('index.html'),css=read('mobile-header-compact.css');
 assert.match(html,/\/mobile-header-compact\.css\?v=20260927-single-guide1/);
 assert.match(css,/@media \(max-width:600px\)/);
 assert.match(css,/#mh-topbox\.app-header\.ma-home-header > nav\.mh-deck\.ma-header-actions/);
 assert.match(css,/grid-template-columns:repeat\(12,minmax\(0,1fr\)\)/);
 assert.match(css,/\.ma-kids-mode-entry[\s\S]*?grid-column:1\/6/);
 assert.match(css,/\.ma-how-button[\s\S]*?grid-column:6\/11/);
 assert.match(css,/\.ma-menu-wrap[\s\S]*?grid-column:11\/13/);
 assert.match(css,/@media \(max-width:345px\)/);
});
test('only top-box how-it-works button is created and existing onboarding handler is retained',()=>{
 const js=read('matchapp-ia.js'),css=read('mobile-header-compact.css');
 assert.match(js,/if\(isHome&&!qs\('\.ma-how-button',nav\)\)/);
 assert.match(js,/how\.addEventListener\('click',\(\)=>window\.MatchAppOnboarding\?\.start\?\.\(\)\)/);
 assert.doesNotMatch(js,/if\(!qs\('\.ma-how-link',hero\)\)/);
 assert.match(css,/\.home-hero > \.ma-how-link \{display:none!important\}/);
});
test('header controls and auth anchors are preserved unchanged',()=>{
 const html=read('index.html');
 for(const id of ['mh-topbox','lang-switcher-host','profile-link-tab','nav-reg-btn','nav-logout-btn']){
  assert.match(html,new RegExp('id="'+id+'"'));
 }
 for(const cls of ['sound-toggle-btn','matchapp-notification-button']){
  assert.match(html,new RegExp('class="'+cls+'"'));
 }
});
