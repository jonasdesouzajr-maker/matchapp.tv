const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{JSDOM}=require('jsdom');
const app=fs.readFileSync('app.js','utf8'),discover=fs.readFileSync('discover.js','utf8');
test('recovery toasts render a bold accessible heading without interpreting HTML',()=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only'}),w=dom.window;
 const timers=[];w.setTimeout=(_fn,ms)=>{timers.push(ms);return 1;};
 w.eval(app.slice(app.indexOf('window.matchRecoveryHeading ='),app.indexOf('// "NOT FOR ME" RE-MATCH FLOW')));
 try{
  w.showToast('<img src=x onerror=alert(1)>',true,{recovery:true});
  const toast=w.document.querySelector('.match-toast');
  assert.equal(toast.getAttribute('role'),'alert');assert.match(toast.querySelector('strong').textContent,/TRY AGAIN SHORTLY/);
  assert.equal(toast.querySelector('img'),null);assert.deepEqual(timers,[12000]);
  w.showToast('No verified exact title',true,{recovery:'empty'});
  assert.match(w.document.querySelectorAll('strong')[1].textContent,/NO EXACT MATCH/);
 }finally{w.close();}
});
test('Ask AI restores its composer and permits a new attempt when all fallback work throws',async()=>{
 const dom=new JSDOM('<div id="discover-loading"></div><input id="discover-new-input">'),w=dom.window;
 let calls=0,stops=0;const messages=[];
 w.showToast=(...args)=>messages.push(args);
 const ctx=vm.createContext({window:w,document:w.document,console:{warn(){}},finishAiWorkflow:()=>stops++,runAskAndRender:async()=>{calls++;throw Error('source failed');}});
 vm.runInContext(discover.slice(discover.indexOf('let askInFlight = null;'),discover.indexOf('/* ---------- Auto-growing composer')),ctx);
 try{
  const first=ctx.askAndRender('Recommend a film');assert.equal(first,ctx.askAndRender('duplicate'));
  assert.equal(await first,null);assert.equal(calls,1);assert.equal(stops,1);
  assert.equal(w.document.getElementById('discover-loading').style.display,'none');
  assert.equal(w.document.getElementById('discover-new-input').value,'Recommend a film');
  assert.equal(messages[0][2].recovery,true);
  await ctx.askAndRender('Try again');assert.equal(calls,2);
 }finally{w.close();}
});
