const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('android-studio/app/src/main/assets/android-premium-shell.js','utf8');
const helper=source.slice(source.indexOf('  function watchMatchPresentation('),source.indexOf('  function installMatchOverlay('));
function fixture(){
 const dom=new JSDOM('<body><div id="host"><button class="gold-btn ma-primary">Find</button></div><div id="loading-box" style="display:none"></div><div id="result-box" style="display:none"></div></body>',{runScripts:'outside-only'});
 const w=dom.window;w.qs=s=>w.document.querySelector(s);w.eval(helper+';window.watch=watchMatchPresentation;');
 let closed=0;const stop=w.watch(w.qs('#host'),()=>closed++);
 return {w,stop,closed:()=>closed,click:()=>w.qs('button').click(),flush:()=>new Promise(r=>setImmediate(r)),close:()=>dom.window.close()};
}
test('matching loading dismisses its presentation overlay once, without modifying result content',async t=>{
 const f=fixture();t.after(f.close);f.click();f.w.qs('#loading-box').style.display='block';await f.flush();assert.equal(f.closed(),1);
 f.w.qs('#result-box').textContent='A real result';f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:newmatch'));assert.equal(f.closed(),1);assert.equal(f.w.qs('#result-box').textContent,'A real result');
});
test('validation keeps choices open even when an older result is visible',async t=>{
 const f=fixture();t.after(f.close);f.w.qs('#result-box').style.display='block';f.click();await f.flush();assert.equal(f.closed(),0);
 f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:newmatch'));assert.equal(f.closed(),1);
});
test('dismissed overlay leaves no later result or loading listener',async t=>{
 const f=fixture();t.after(f.close);f.click();f.stop();f.w.qs('#loading-box').style.display='block';f.w.document.dispatchEvent(new f.w.CustomEvent('matchapp:newmatch'));await f.flush();assert.equal(f.closed(),0);
});
