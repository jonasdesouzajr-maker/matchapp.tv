const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const root=path.join(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const tick=()=>new Promise(r=>setTimeout(r,15));
function dom(standalone=false){
 const d=new JSDOM('<button class="install-btn" style="display:none">Install</button>',{url:'https://matchapp.tv/',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:new VirtualConsole()});
 const w=d.window;w.MATCHAPP_BUILD='2026.09.20.1';w.matchMedia=()=>({matches:standalone});return d;
}
test('confirmed install state is recorded without inventing an install',()=>{
 const d=dom(),w=d.window;w.eval(read('app-install-state.js'));
 assert.equal(w.matchAppInstallState.isInstalled(),false);
 w.dispatchEvent(new w.Event('appinstalled'));
 assert.equal(w.matchAppInstallState.isInstalled(),true);
 assert.equal(w.localStorage.getItem('match_app_installed_build'),'2026.09.20.1');
 d.window.close();
});
test('ordinary browser visitors never receive an update prompt or install-button rewrite',async()=>{
 const d=dom(false),w=d.window;w.fetch=async()=>({ok:true,json:async()=>({version:'2026.09.20.1'})});
 w.eval(read('app-updates.js'));await tick();
 assert.equal(w.document.getElementById('app-release-notice'),null);
 assert.equal(w.document.getElementById('matchapp-update-toast'),null);
 assert.equal(w.document.querySelector('.install-btn').textContent,'Install');
 d.window.close();
});
test('standalone installs get one small refresh toast only after live metadata matches',async()=>{
 const d=dom(true),w=d.window;w.localStorage.setItem('match_app_installed_build','2026.09.19.9');
 w.fetch=async()=>({ok:true,json:async()=>({version:'2026.09.20.1'})});
 w.eval(read('app-updates.js'));await tick();
 assert.equal(w.matchAppUpdatePending.version,'2026.09.20.1');
 assert.ok(w.document.getElementById('matchapp-update-toast'));
 assert.equal(w.document.querySelectorAll('#matchapp-update-toast').length,1);
 assert.equal(w.document.getElementById('app-release-notice'),null);
 d.window.close();
});
test('mismatched deploy metadata never announces a refresh',async()=>{
 const d=dom(true),w=d.window;w.localStorage.setItem('match_app_installed_build','2026.09.19.9');
 w.fetch=async()=>({ok:true,json:async()=>({version:'2026.09.20.2'})});
 w.eval(read('app-updates.js'));await tick();
 assert.equal(w.matchAppUpdatePending,null);
 assert.equal(w.document.getElementById('matchapp-update-toast'),null);
 d.window.close();
});
