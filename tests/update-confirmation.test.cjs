const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app-updates.js'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
function make({standalone=true,live='2026.09.20.1',remote='2026.09.20.1',installed='2026.09.19.9'}={}){
 const d=new JSDOM('<button class="install-btn">Install</button>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window;w.MATCHAPP_BUILD=live;w.matchMedia=()=>({matches:standalone});w.localStorage.setItem('match_app_installed_build',installed);
 w.fetch=async()=>({ok:true,json:async()=>({version:remote})});w.eval(source);return {d,w};
}
test('browser update behavior is non-blocking and has no legacy modal/query reload',()=>{
 assert.doesNotMatch(source,/createElement\(['\"](?:dialog|section)['\"]\)[\s\S]{0,400}app-release|appUpdate=|forceWhatsNew|textContent\s*=\s*['\"]Update app/i);
 assert.match(source,/matchapp-update-toast/);
 assert.match(source,/isStandalone/);
});
test('only a standalone app with consistent live metadata receives the refresh toast',async()=>{
 const good=make();await tick();assert.ok(good.w.document.getElementById('matchapp-update-toast'));good.d.window.close();
 const browser=make({standalone:false});await tick();assert.equal(browser.w.document.getElementById('matchapp-update-toast'),null);browser.d.window.close();
 const mixed=make({remote:'2026.09.20.2'});await tick();assert.equal(mixed.w.document.getElementById('matchapp-update-toast'),null);mixed.d.window.close();
});
