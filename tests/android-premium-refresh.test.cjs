const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const source=fs.readFileSync('android-studio/app/src/main/assets/android-premium-shell.js','utf8');
const refresh=source.slice(source.indexOf('  function refreshForStructuralChanges('),source.indexOf('  function schedulePremiumRefresh('));
test('live text ticks do not restyle the Android shell; inserted and replaced controls do',async()=>{
  const dom=new JSDOM('<body><span id="count">10</span><section></section></body>',{runScripts:'outside-only'}),w=dom.window;
  try{
    let passes=0;w.schedulePremiumRefresh=()=>passes++;
    w.eval(refresh+';window.structuralRefresh=refreshForStructuralChanges;');
    const observer=new w.MutationObserver(w.structuralRefresh);observer.observe(w.document.body,{childList:true,subtree:true});
    for(let i=10;i>=0;i--)w.document.querySelector('#count').textContent=String(i);
    await Promise.resolve();assert.equal(passes,0);
    w.document.querySelector('section').innerHTML='<button>New result</button>';
    await Promise.resolve();assert.equal(passes,1);
    w.document.querySelector('button').replaceWith(w.document.createElement('input'));
    await Promise.resolve();assert.equal(passes,2);
    observer.disconnect();
  }finally{w.close()}
});
