const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {JSDOM}=require('jsdom');
const read=f=>fs.readFileSync(require('node:path').join(__dirname,'..',f),'utf8');
function setup({installed=false,path='/profile/profile.html'}={}) {
 const d=new JSDOM('<button class="install-btn" onclick="installMatchApp()">Install</button>',{url:'https://matchapp.tv'+path,runScripts:'dangerously',pretendToBeVisual:true});
 const w=d.window;w.matchMedia=()=>({matches:false});w.isSecureContext=true;
 w.matchAppInstallState={isInstalled:()=>installed};
 const timers=new Map();let id=0;
 w.setTimeout=(fn,ms)=>{timers.set(++id,{fn,ms});return id;};
 w.clearTimeout=id=>timers.delete(id);
 const run=ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}};
 for(const f of ['install-progress.js','install.js','install-onetap.js'])w.eval(read(f));
 return {d,w,run,timers,setInstalled:v=>{installed=v;}};
}
function prompt(w,outcome,fn=()=>{}){
 const e=new w.Event('beforeinstallprompt');let calls=0;
 e.prompt=async()=>{calls++;fn();};e.userChoice=Promise.resolve({outcome});
 w.dispatchEvent(e);return ()=>calls;
}
test('Settings installed help never leaves a loading overlay behind after OK',async()=>{
 const {d,w}=setup({installed:true});
 w.document.querySelector('.install-btn').click();await Promise.resolve();
 assert.ok(w.document.getElementById('match-installed-help').open);
 assert.equal(w.document.getElementById('ma-install-meter'),null);
 // Even a stale meter must be cleared by the installed-help path.
 w.matchAppInstallState.isInstalled=()=>false;w.matchAppInstallProgress.start();
 w.matchAppInstallState.isInstalled=()=>true;await w.installMatchApp();
 assert.equal(w.document.getElementById('ma-install-meter').hidden,true);
 d.window.close();
});
test('one genuine native prompt per gesture, no meter before acceptance, success auto-closes',async()=>{
 const {d,w,run,setInstalled}=setup();
 const calls=prompt(w,'accepted',()=>assert.equal(w.document.getElementById('ma-install-meter'),null));
 await w.installMatchApp();assert.equal(calls(),1);
 const meter=w.document.getElementById('ma-install-meter');assert.equal(meter.hidden,false);
 assert.equal(meter.querySelector('.ma-im-close').hidden,false);
 setInstalled(true);w.dispatchEvent(new w.Event('appinstalled'));
 assert.match(meter.querySelector('h2').textContent,/successfully installed/);
 run(2500);assert.equal(meter.hidden,true);d.window.close();
});
test('dismissal, rejection, manual guidance and repeated taps do not leave progress',async()=>{
 for(const outcome of ['dismissed','error','manual']){
  const {d,w}=setup();let calls;
  if(outcome!=='manual')calls=prompt(w,'dismissed');
  if(outcome==='error') {const e=new w.Event('beforeinstallprompt');e.prompt=async()=>{throw Error('blocked');};w.dispatchEvent(e);}
  await w.installMatchApp();assert.ok(!w.document.getElementById('ma-install-meter')||w.document.getElementById('ma-install-meter').hidden);
  if(outcome==='dismissed'){assert.equal(calls(),1);await w.installMatchApp();assert.equal(calls(),1);}
  if(outcome==='manual')assert.ok(w.document.getElementById('install-modal').open);
  d.window.close();
 }
});
test('missing appinstalled event times out without fabricating installed state',async()=>{
 const {d,w,run}=setup();prompt(w,'accepted');await w.installMatchApp();
 run(15000);assert.equal(w.document.getElementById('ma-install-meter').hidden,true);
 assert.equal(w.matchAppInstallState.isInstalled(),false);d.window.close();
});
test('progress is dismissible by close, backdrop and Escape and restores focus',()=>{
 for(const method of ['close','backdrop','escape']){
  const {d,w}=setup();const btn=w.document.querySelector('button');btn.focus();
  w.matchAppInstallProgress.start();const meter=w.document.getElementById('ma-install-meter');
  if(method==='close')meter.querySelector('.ma-im-close').click();
  if(method==='backdrop')meter.click();
  if(method==='escape')w.document.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape'}));
  assert.equal(meter.hidden,true);assert.equal(w.document.activeElement,btn);d.window.close();
 }
});
test('completion before userChoice resolves never resurrects a loading overlay',async()=>{
 const {d,w,setInstalled}=setup();prompt(w,'accepted',()=>{setInstalled(true);w.dispatchEvent(new w.Event('appinstalled'));});
 await w.installMatchApp();assert.equal(w.document.getElementById('ma-install-meter').hidden,true);d.window.close();
});
test('installed apps check first, update when available, otherwise offer safe removal steps',async()=>{
 for(const available of [false,true]){
  const {d,w}=setup({installed:true});let checked=0,updated=0;
  w.checkMatchAppRelease=async()=>{checked++;w.matchAppUpdatePending=available?{version:'2026.09.30.1'}:null;};
  w.updateMatchAppNow=async()=>updated++;
  await w.installMatchApp();assert.equal(checked,1);assert.equal(updated,available?1:0);
  if(!available){
   const help=w.document.getElementById('match-installed-help');
   assert.match(help.querySelector('button').textContent,/Cancel and return Home/);
   help.querySelectorAll('button')[1].click();
   assert.match(help.querySelector('p').textContent,/cannot uninstall apps/);
   assert.equal(w.matchAppInstallState.isInstalled(),true);
   assert.equal(help.querySelectorAll('button')[1].hidden,true);
  }else assert.equal(w.document.getElementById('match-installed-help'),null);
  assert.equal(w.document.getElementById('ma-install-meter'),null);d.window.close();
 }
});
test('current installations are not labelled update and version comparison handles numeric suffixes',async()=>{
 const {d,w}=setup({installed:true});w.MATCHAPP_BUILD='2026.09.30.9';
 w.localStorage.setItem('match_app_installed_build','2026.09.30.9');
 let remote='2026.09.30.9';w.fetch=async()=>({ok:true,json:async()=>({version:remote})});
 w.eval(read('app-updates.js'));await w.checkMatchAppRelease();
 assert.equal(w.matchAppUpdatePending,null);assert.equal(w.document.querySelector('.install-btn').textContent,'Installed');
 remote='2026.09.30.10';await w.checkMatchAppRelease();assert.equal(w.matchAppUpdatePending.version,remote);
 remote='2026.09.29.20';await w.checkMatchAppRelease();assert.equal(w.matchAppUpdatePending,null);
 d.window.close();
});
test('desktop install guide does not intercept installed app management',async()=>{
 const {d,w}=setup({installed:true});
 Object.defineProperty(w.navigator,'userAgent',{value:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/140'});
 w.matchMedia=()=>({matches:true});w.eval(read('desktop-install.js'));
 w.document.querySelector('.install-btn').click();await Promise.resolve();
 assert.ok(w.document.getElementById('match-installed-help').open);d.window.close();
});
