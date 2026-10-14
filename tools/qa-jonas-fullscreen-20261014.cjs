'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs/design-reviews/20261014/screenshots');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return;}try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res);}catch(_){res.writeHead(404).end();}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const report=[];
 try{
 for(const [kind,width,height] of [['web',320,740],['web',390,844],['web',820,1180],['web',1366,900],['web',1920,1080],['android',390,844],['android',820,450]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',...(kind==='android'?{userAgent:'MatchAppAiAndroid/1 QA Chromium'}:{})});
  await context.addInitScript(()=>{localStorage.setItem('match_lang','pt-BR');window.MatchAppJonasSpeech={speak:async()=>true,stop:()=>{}};});
  await context.route(/google-analytics|googletagmanager|googlesyndication|doubleclick/i,r=>r.abort());
  const page=await context.newPage();await page.goto(url+(kind==='android'?'/explore.html':'/'),{waitUntil:'domcontentloaded',timeout:60000});
  if(kind==='android')await page.addScriptTag({url:'/jonas/android-ambient-assistant-20261011.js'});
  const rootSelector=kind==='android'?'#ma-ambient-jonas':'#ma-jonas-home';
  const panelSelector=kind==='android'?'#ma-ambient-panel':'#ma-jonas-home-panel';
  const bubbleSelector=kind==='android'?'#ma-ambient-jonas .ja-bubble':'#ma-jonas-home-bubble';
  await page.locator(rootSelector).waitFor({state:'attached',timeout:30000});
  await page.waitForTimeout(900);
  console.log('PROBE',kind,width,await page.evaluate(s=>{const e=document.querySelector(s);const c=getComputedStyle(e);return {display:c.display,visibility:c.visibility,rect:e.getBoundingClientRect().toJSON(),bodyClass:document.body.className,htmlClass:document.documentElement.className,hidden:e.hidden,other:!!document.querySelector('#ma-ambient-jonas')}},rootSelector));
  await page.locator(rootSelector).waitFor({state:'visible',timeout:6000});
  const before=await page.locator(rootSelector).boundingBox();
  if(kind==='web'){
   const targetX=Math.max(8,width-before.width-10),targetY=Math.max(8,height-before.height-10);
   await page.evaluate(({x,y})=>{const r=document.querySelector('#ma-jonas-home');r.classList.add('is-floating');r.style.setProperty('left',x+'px','important');r.style.setProperty('top',y+'px','important');r.style.setProperty('right','auto','important');r.style.setProperty('bottom','auto','important');},{x:targetX,y:targetY});
  }else{
   await page.evaluate(({x,y})=>{const r=document.querySelector('#ma-ambient-jonas');r.style.setProperty('left',x+'px','important');r.style.setProperty('top',y+'px','important');r.style.setProperty('right','auto','important');r.style.setProperty('bottom','auto','important');},{x:Math.max(8,width-88),y:Math.max(8,height-88)});
  }
  const parked=await page.locator(rootSelector).boundingBox();
  await page.locator(bubbleSelector).click();
  await page.locator(panelSelector).waitFor({state:'visible'});
  const info=await page.evaluate(({kind,panelSelector,bubbleSelector})=>{
   const rect=e=>{let r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   const panel=document.querySelector(panelSelector),head=kind==='android'?panel.querySelector('.ja-face-wrap'):document.querySelector('#ma-jonas-home > .jh-bubble');
   const mic=kind==='android'?panel.querySelector('iframe'):panel.querySelector('#ma-jonas-home-mic');
   const input=kind==='android'?panel.querySelector('iframe'):panel.querySelector('#ma-jonas-home-input');
   return {panel:rect(panel),face:rect(head),mic:rect(mic),input:rect(input),
    rootHidden:document.querySelector(bubbleSelector).getClientRects().length===0,
    modal:panel.getAttribute('aria-modal'),width:innerWidth,height:innerHeight,
    vh:visualViewport?.height||innerHeight};
  },{kind,panelSelector,bubbleSelector});
  console.log('CHAT_OPEN',kind,width,JSON.stringify(info));
  const tolerance=14;
  assert.ok(info.panel.left<=tolerance&&info.panel.top<=tolerance,kind+' '+width+' panel must begin at viewport origin '+JSON.stringify(info));
  assert.ok(info.panel.right>=width-tolerance,kind+' '+width+' panel width must cover viewport');
  assert.ok(info.panel.bottom>=Math.min(info.vh,height)-tolerance,kind+' '+width+' panel height must cover visible viewport');
  assert.ok(info.face.left<width*.25&&info.face.top<=info.panel.top+125,kind+' '+width+' Jonas face must be top-left');
  assert.ok(info.mic.left>=0&&info.mic.right<=width+2,kind+' '+width+' mic/frame horizontal visibility');
  assert.equal(info.modal,'true');
  assert.equal(info.rootHidden,kind==='android','home avatar remains top-left; Android uses dialog header portrait');
  if(kind==='web'&&(width===390||width===1366))await page.screenshot({path:path.join(out,'after-home-chat-'+width+'.png'),animations:'disabled'});
  if(kind==='android'&&width===390)await page.screenshot({path:path.join(out,'after-android-sim-chat-'+width+'.png'),animations:'disabled'});
  if(kind==='web')await page.locator('#ma-jonas-home-close').click();else await page.locator('#ma-ambient-panel .ja-close').click();
  await page.locator(panelSelector).waitFor({state:'hidden'});
  const restored=await page.locator(rootSelector).boundingBox();
  assert.ok(Math.abs(restored.x-parked.x)<=12&&Math.abs(restored.y-parked.y)<=12,kind+' '+width+' bubble must return to its parked coordinates');
  report.push({kind,width,height,modal:info.modal,parked:{x:parked.x,y:parked.y},restored:{x:restored.x,y:restored.y},fullScreen:true});
  await context.close();
 }
 fs.writeFileSync(path.join(root,'docs/design-reviews/20261014','jonas-chat-qa.json'),JSON.stringify({checks:report.length,environment:'local Chromium; Android is user-agent simulation, not a physical device',report},null,2));
 console.log('Jonas fullscreen modal checks passed: '+report.length);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
