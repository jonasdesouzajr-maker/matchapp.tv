const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'app-updates.js'),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
function make({standalone=true,remote='2026.09.20.1',installed='2026.09.19.9'}={}){
 const d=new JSDOM('<button class="install-btn">Install</button>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=d.window;w.matchMedia=()=>({matches:standalone});w.localStorage.setItem('match_app_installed_build',installed);
 w.fetch=async()=>({ok:true,json:async()=>({version:remote})});
 w.location={reload(){w.__reloaded=true;}};
 w.eval(source);return {d,w};
}
test('browser update behavior is non-blocking and has no legacy modal/query reload',()=>{
 assert.doesNotMatch(source,/createElement\(['\"](?:dialog|section)['\"]\)[\s\S]{0,400}app-release|appUpdate=|forceWhatsNew|textContent\s*=\s*['\"]Update app/i);
 assert.match(source,/matchapp-update-overlay/);
 assert.match(source,/isStandalone/);
 assert.doesNotMatch(source,/matchapp-update-toast/);
});
test('check() never paints an overlay; only an explicit refresh does',async()=>{
 const good=make();await tick();
 assert.equal(good.w.matchAppUpdatePending.version,'2026.09.20.1');
 assert.equal(good.w.document.getElementById('matchapp-update-overlay'),null);
 assert.equal(good.w.document.getElementById('matchapp-update-toast'),null);
 await good.w.updateMatchAppNow();
 assert.ok(good.w.document.getElementById('matchapp-update-overlay'));
 assert.equal(good.w.document.getElementById('matchapp-update-overlay-text').textContent.includes('Updating')||good.w.document.getElementById('matchapp-update-overlay-text').textContent.includes('Atualizando'),true);
 good.d.window.close();
});
test('browser visitors do not receive an update overlay on load',async()=>{
 const browser=make({standalone:false});await tick();
 assert.equal(browser.w.document.getElementById('matchapp-update-overlay'),null);
 assert.equal(browser.w.document.getElementById('matchapp-update-toast'),null);
 browser.d.window.close();
});
