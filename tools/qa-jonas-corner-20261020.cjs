'use strict';
// Real Chromium pointer/touch checks on local production pages. External requests
// are blocked; this is presentation/state verification, not an AI speech claim.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=process.env.MATCHAPP_CINEMA_QA_BASE||'http://127.0.0.1:4173';
const out=path.resolve(__dirname,'../docs/design-reviews/20261020');
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
const report={scope:'Local real Chromium mouse/touch, production pages; external requests blocked; no native emulator or speech verification',checks:[],failures:[]};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function check(value,name,details={}){report.checks.push({name,ok:!!value,...details});assert.ok(value,name+' '+JSON.stringify(details));}
async function state(page){return page.evaluate(()=>{
 const r=document.querySelector('#ma-ambient-jonas')||document.querySelector('#ma-jonas-home');
 const rect=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,right:b.right,bottom:b.bottom}};
 const b=rect(r),overlaps=[...document.querySelectorAll('button,input,select,textarea,summary,a,ins.adsbygoogle,iframe')].filter(e=>{
  const closed=e.closest('details:not([open])');if(closed&&!closed.querySelector(':scope > summary')?.contains(e))return false;
  if(e.checkVisibility?.({checkVisibilityCSS:true,contentVisibilityAuto:true})===false)return false;
  if(r.contains(e)||e.closest('#ma-ambient-panel,#ma-jonas-home-panel,[hidden]')||getComputedStyle(e).visibility==='hidden')return false;
  const z=e.getBoundingClientRect();return z.width&&z.height&&Math.min(b.right+5,z.right)>Math.max(b.x-5,z.left)&&Math.min(b.bottom+5,z.bottom)>Math.max(b.y-5,z.top);
 }).map(e=>e.id||e.className||e.tagName);
 return {...b,overlaps,id:r.id,default:r.classList.contains('ja-corner-default'),saved:localStorage.getItem('matchapp-jonas-position-v2'),visibleLaunchers:[...document.querySelectorAll('#ma-ambient-jonas,#ma-jonas-home')].filter(e=>e.getClientRects().length&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden').length,
  open:!!document.querySelector('#ma-ambient-panel:not([hidden]),#ma-jonas-home.is-chat-stage'),frameCount:document.querySelectorAll('#ma-ambient-panel iframe').length};
 });}
async function go(page,route){await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.MatchAppJonasPlacement&&!!document.querySelector('#ma-ambient-jonas,#ma-jonas-home'));await pause(450);}
async function drag(page,x,y){const b=await state(page);await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(x,y,{steps:12});await page.mouse.up();await pause(650);return state(page);}
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 for(const [width,height] of (process.env.JONAS_CORNER_NATIVE_ONLY?[]:[[320,740],[390,844],[820,1180],[1366,900],[820,450]])){
  const ctx=await browser.newContext({viewport:{width,height},hasTouch:true,reducedMotion:'reduce'});
  await ctx.addInitScript(()=>{localStorage.setItem('match_lang','en');localStorage.setItem('match_cookie_choice','essential');localStorage.setItem('match_legal_choice','essential');window.MatchAppJonasSpeech={speak:async()=>false,stop(){}};});
  await ctx.route(/^https?:\/\//,r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
  const p=await ctx.newPage();
  for(const route of ['/','/explore.html','/profile/profile.html','/news/','/ebooks/']){
   await go(p,route);const initial=await state(p);
   check(initial.visibleLaunchers===1,'one visible launcher',{width,height,route,state:initial});
   check(initial.x>=10&&initial.y>=10&&initial.right<=width-10&&initial.bottom<=height-10,'default fits visible screen',{width,height,route,state:initial});
   check(initial.overlaps.length===0,'default clears buttons, fields, links and ads',{width,height,route,state:initial});
   check(initial.default&&!initial.saved,'automatic placement remains unsaved',{width,height,route});
   if((width===390||width===1366)&&(route==='/'||route==='/explore.html'))await p.screenshot({path:path.join(out,'screenshots','jonas-corner-'+(route==='/'?'home':'explore')+'-'+width+'.png')});
  }
  await go(p,'/');
  for(const [x,y]of[[1,1],[width-1,1],[width-1,height-1],[1,height-1]]){
   const end=await drag(p,x,y);check(end.x>=11&&end.y>=11&&end.right<=width-11&&end.bottom<=height-11,'drag corner clamps halo inside screen',{width,height,x,y,state:end});
   check(!end.open&&!!end.saved&&!end.default,'drag saves position without opening chat',{width,height,x,y,state:end});
  }
  const parked=await drag(p,Math.round(width*.45),Math.round(height*.45));
  await go(p,'/explore.html');const shared=await state(p);
  check(Math.abs(shared.x-parked.x)<=2&&Math.abs(shared.y-parked.y)<=2,'saved Home position survives route change',{width,height,parked,shared});
  await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.MatchAppJonasPlacement&&!!document.querySelector('#ma-ambient-jonas'));await pause(450);const reload=await state(p);
  check(Math.abs(reload.x-shared.x)<=2&&Math.abs(reload.y-shared.y)<=2,'saved position survives reload',{width,height,shared,reload});
  const b=await state(p);await p.mouse.click(b.x+b.width/2,b.y+b.height/2);await p.locator('#ma-ambient-panel').waitFor({state:'visible'});
  check(await p.locator('#ma-ambient-panel iframe').count()===1,'single existing conversation iframe opens',{width,height});
  await p.locator('#ma-ambient-panel .ja-close').click();await pause(150);const closed=await state(p);
  check(Math.abs(closed.x-b.x)<=2&&Math.abs(closed.y-b.y)<=2,'closing chat restores parked position',{width,height,b,closed});
  if(width===390){
   await p.evaluate(()=>localStorage.removeItem('matchapp-jonas-position-v2'));await go(p,'/');const s=await state(p),cdp=await ctx.newCDPSession(p);
   await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:s.x+38,y:s.y+38}]});
   for(let i=1;i<=8;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:s.x+38+(100-s.x-38)*i/8,y:s.y+38+(270-s.y-38)*i/8}]});
   await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(650);const touch=await state(p);
   check(!!touch.saved&&!touch.default&&!touch.open&&Math.abs(touch.x-s.x)>20,'real touch drag saves without a chat click',{before:s,after:touch});
   await p.screenshot({path:path.join(out,'screenshots','jonas-touch-dragged-390.png')});
  }
  await ctx.close();console.log('PASS_JONAS_CORNER',width,height);
 }
 const native=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,reducedMotion:'reduce',userAgent:'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 MatchAppAiAndroid/55'});
 await native.addInitScript(()=>{localStorage.setItem('match_lang','en');localStorage.setItem('match_cookie_choice','essential');localStorage.setItem('match_legal_choice','essential');window.MatchAppJonasSpeech={speak:async()=>false,stop(){}};});
 await native.route(/^https?:\/\//,r=>new URL(r.request().url()).origin===base?r.continue():r.abort());
 const np=await native.newPage();
 async function nativeGo(route){
  await np.goto(base+route,{waitUntil:'domcontentloaded'});
  // The real app injects this same remote module from its native WebView bridge.
  await np.addScriptTag({url:base+'/jonas/android-ambient-assistant-20261011.js?v=corner20261020-1'});
  await np.waitForFunction(()=>window.MatchAppJonasPlacement&&!!document.querySelector('#ma-ambient-jonas'));
  await pause(500);
 }
 for(const route of ['/','/explore.html','/profile/profile.html']){
  await nativeGo(route);const n=await state(np);
  check(n.id==='ma-ambient-jonas'&&n.visibleLaunchers===1&&n.overlaps.length===0,'native remote shell uses one collision-safe glass launcher',{route,state:n});
 }
 await nativeGo('/');const nativeParked=await drag(np,140,300);
 await nativeGo('/explore.html');const nativeRestored=await state(np);
 check(Math.abs(nativeParked.x-nativeRestored.x)<=2&&Math.abs(nativeParked.y-nativeRestored.y)<=2,'native shared launcher preserves route position',{nativeParked,nativeRestored});
 await np.screenshot({path:path.join(out,'screenshots','jonas-native-shell-390.png')});
 await native.close();console.log('PASS_JONAS_NATIVE_REMOTE_SHELL');
 }catch(e){report.failures.push({message:e.message,stack:e.stack});console.error(e.stack);process.exitCode=1}
 finally{await browser.close();fs.writeFileSync(path.join(out,process.env.JONAS_CORNER_NATIVE_ONLY?'qa-jonas-native-corner.json':'qa-jonas-corner.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({checks:report.checks.length,failures:report.failures.length}));}
})();
