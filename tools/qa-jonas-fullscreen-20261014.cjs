'use strict';
/* Isolated Chromium interaction test of the EXISTING production Jonas JS and CSS.
   No simulated backend, speech, credit or quota success is claimed. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),output=path.join(root,'docs/design-reviews/20261014'),screens=path.join(output,'screenshots');
fs.mkdirSync(screens,{recursive:true});
const realHtml=fs.readFileSync(path.join(root,'index.html'),'utf8');
const match=realHtml.match(/<aside id="ma-jonas-home"[\s\S]*?<\/aside>/);
assert.ok(match,'production Home Jonas markup must be present');
const homeHtml='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'+
 '<link rel="stylesheet" href="/jonas/floating-home-20261010-v3.css"><link rel="stylesheet" href="/patches/jonas-premium-glass.css"></head>'+
 '<body class="page-home ma-jonas-inline">'+match[0]+'<script src="/jonas/locales-20261009-v2.js"></script><script src="/jonas/floating-home-20261010-v3.js"></script></body></html>';
const androidHtml='<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head>'+
 '<body class="page-explore"><script>window.__MATCHAPP_AMBIENT_QA__=true;window.MATCH_LANG="pt-BR";</script>'+
 '<script src="/jonas/android-ambient-assistant-20261011.js"></script></body></html>';
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const app=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(u.pathname==='/'||u.pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'}).end(homeHtml);return}
 if(u.pathname==='/__qa_android__'||u.pathname==='/explore.html'){res.writeHead(200,{'Content-Type':'text/html'}).end(androidHtml);return}
 if(u.pathname==='/discover.html'&&u.searchParams.has('ambient')){res.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html><body><input id="discover-new-input"><button id="mic-btn-discover"></button></body></html>');return}
 let f=path.resolve(root,'.'+u.pathname);if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+app.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const report=[];
 try{
 for(const [kind,width,height] of [['home',320,740],['home',390,844],['home',820,1180],['home',1366,900],['home',1920,1080],['android-webview',320,740],['android-webview',390,844],['android-webview',820,450],['android-webview',1366,900],['android-webview',1920,1080]]){
   if(process.env.JONAS_ONLY_ANDROID==='1'&&kind!=='android-webview')continue;
   const ctx=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'});
   await ctx.addInitScript(()=>{window.MATCH_LANG='pt-BR';window.MatchAppJonasSpeech={speak:async()=>false,stop(){}};});
   const page=await ctx.newPage();await page.goto(base+(kind==='home'?'/':'/explore.html'),{waitUntil:'domcontentloaded',timeout:30000});
   const mobile=kind==='home',rSel=mobile?'#ma-jonas-home':'#ma-ambient-jonas',pSel=mobile?'#ma-jonas-home-panel':'#ma-ambient-panel';
   const bSel=mobile?'#ma-jonas-home-bubble':'#ma-ambient-jonas .ja-bubble',closeSel=mobile?'#ma-jonas-home-close':'#ma-ambient-panel .ja-close';
   await page.locator(rSel).waitFor({state:'visible',timeout:10000});
   await page.waitForTimeout(350);
   await page.evaluate(({rSel,width,height})=>{
    const r=document.querySelector(rSel),w=Math.max(74,r.getBoundingClientRect().width),h=Math.max(74,r.getBoundingClientRect().height);
    if(r.id==='ma-jonas-home')r.classList.add('is-floating');
    r.style.setProperty('left',Math.max(8,width-w-10)+'px','important');
    r.style.setProperty('top',Math.max(8,height-h-10)+'px','important');
    r.style.setProperty('right','auto','important');r.style.setProperty('bottom','auto','important');
   },{rSel,width,height});
   const parked=await page.locator(rSel).boundingBox();
   await page.locator(bSel).click();
   await page.locator(pSel).waitFor({state:'visible',timeout:10000});
   await page.waitForTimeout(180);
   const data=await page.evaluate(({mobile,pSel,bSel})=>{
    const box=e=>{let r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
    const panel=document.querySelector(pSel),portrait=panel.querySelector(mobile?'.jh-medallion':'.ja-face-wrap');
    const launcher=document.querySelector(bSel),launcherVisible=launcher.getClientRects().length>0;
    const portraitVisible=portrait.getClientRects().length>0;
    const composer=panel.querySelector(mobile?'#ma-jonas-home-mic':'iframe');
    return {panel:box(panel),face:box(mobile&&launcherVisible?launcher:portrait),composer:box(composer),modal:panel.getAttribute('aria-modal'),
      bubbleVisible:launcherVisible,portraitVisible,
      visibleHeight:window.visualViewport?.height||innerHeight};
   },{mobile,pSel,bSel});
   const msg=kind+' '+width+' '+JSON.stringify(data);
   assert.ok(data.panel.left<=14&&data.panel.top<=14,msg+' starts at screen edge');
   assert.ok(data.panel.right>=width-14&&data.panel.bottom>=Math.min(height,data.visibleHeight)-14,msg+' fills screen');
   assert.ok(data.face.width>=40&&data.face.left<Math.max(90,width*.25)&&data.face.top<=data.panel.top+125,msg+' portrait top left');
   assert.ok(data.composer.width>40&&data.composer.left>=0&&data.composer.right<=width+1,msg+' visible composer/mic');
   assert.equal(data.bubbleVisible,kind==='home',msg+' Home moves the same bubble into the header; Android shows the existing chat portrait');
   assert.equal(data.portraitVisible,!data.bubbleVisible,msg+' exactly one avatar visible in the conversation');
   assert.equal(data.modal,'true',msg+' accessibility dialog');
   if((kind==='home'&&(width===390||width===1366))||(kind==='android-webview'&&width===390)){
    await page.screenshot({path:path.join(screens,'after-'+kind+'-chat-'+width+'.png'),animations:'disabled'});
   }
   await page.locator(closeSel).click();await page.locator(pSel).waitFor({state:'hidden',timeout:6000});
   await page.waitForTimeout(180);
   const restored=await page.locator(rSel).boundingBox();
   assert.ok(Math.abs(restored.x-parked.x)<13&&Math.abs(restored.y-parked.y)<13,msg+' parked placement restored '+JSON.stringify({parked,restored}));
   report.push({kind,width,height,modal:data.modal,origin:{x:parked.x,y:parked.y},restored:{x:restored.x,y:restored.y},composedInViewport:true});
   await ctx.close();
 }
 fs.writeFileSync(path.join(output,'jonas-chat-qa.json'),JSON.stringify({method:'production JS/CSS on isolated local fixture; not physical device/IME/AI speech testing',count:report.length,results:report},null,2));
 console.log('Jonas full-screen modal checks passed: '+report.length);
 }finally{await browser.close();app.close()}
})().catch(e=>{console.error(e);app.close();process.exitCode=1});
