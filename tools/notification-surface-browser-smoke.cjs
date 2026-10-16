'use strict';
/* Read-only UI fixtures: no account login, provider calls, purchases or server notifications. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=process.env.MATCHAPP_UI_QA_OUT||path.join(root,'artifacts','notification-ui');fs.mkdirSync(out,{recursive:true});
const report={startedAt:new Date().toISOString(),cases:[],failures:[],pageErrors:[]};
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.woff2':'font/woff2','.mp4':'video/mp4'};
let server,browser;
function check(ok,message){if(!ok)throw Error(message);}
async function startServer(){
 server=http.createServer((req,res)=>{try{const u=decodeURIComponent(new URL(req.url,'http://localhost').pathname);let f=path.resolve(root,'.'+u);if(!f.startsWith(root+path.sep)&&f!==root)throw Error('path');if(/(?:^|[\\/])(?:\.git|node_modules|android-studio|\.env)(?:[\\/]|$)/.test(f))throw Error('private');if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');fs.createReadStream(f).on('error',()=>res.end()).pipe(res);}catch(_){res.writeHead(404);res.end('Not found');}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));return `http://127.0.0.1:${server.address().port}`;
}
async function runCase(name,fn){try{await fn();report.cases.push({name,passed:true});}catch(e){report.cases.push({name,passed:false});report.failures.push({name,error:e.message});}}
async function geometry(page){
 const r=await page.evaluate(()=>{
  const p=document.querySelector('#matchapp-notifications'),header=p.querySelector('.matchapp-notification-header'),scroll=p.querySelector('.matchapp-notification-scroll');
  const rect=e=>e.getBoundingClientRect().toJSON();
  return {modal:p.matches(':modal'),viewport:{width:innerWidth,height:innerHeight},panel:rect(p),header:rect(header),scroll:rect(scroll),overflow:scroll.scrollWidth-scroll.clientWidth,solid:getComputedStyle(p).backgroundColor,rows:[...p.querySelectorAll('.matchapp-notification-item')].map(row=>{const open=row.querySelector('.matchapp-notification-open'),copy=row.querySelector('.matchapp-notification-copy'),del=row.querySelector('.matchapp-notification-delete');return {row:rect(row),open:rect(open),copy:rect(copy),del:rect(del),radius:getComputedStyle(open).borderRadius,border:getComputedStyle(open).borderWidth,overflow:copy.scrollWidth-copy.clientWidth,delPosition:getComputedStyle(del).position};}),close:rect(p.querySelector('.matchapp-notification-close'))};
 });
 check(r.modal,'Notification surface did not enter the native modal layer');
 check(r.panel.left>=-1&&r.panel.top>=-1&&r.panel.right<=r.viewport.width+1&&r.panel.bottom<=r.viewport.height+1,'Panel escaped the viewport');
 check(r.header.bottom<=r.scroll.top+1,'Header overlaps the content scroll area');
 check(r.scroll.height>=40,'No usable notification scrolling area');check(r.overflow<=1,'Content scroller has horizontal overflow');
 check(r.close.width>=44&&r.close.height>=44,'Close control is smaller than 44px');
 check(r.solid==='rgb(25, 17, 34)','Notification surface is not opaque');
 for(const row of r.rows){
  check(row.del.width>=44&&row.del.height>=44,'Delete control is smaller than 44px');
  check(row.delPosition!=='absolute','Delete control escaped the card grid');
  check(row.radius==='0px'&&row.border==='0px','A global pill outline leaked onto a notification content button');
  check(row.overflow<=1,'Notification copy overflows its column');
  check(row.copy.right<=row.del.left+1||row.del.right<=row.copy.left+1,'Delete control overlaps the notification text');
  check(row.row.left>=r.panel.left-1&&row.row.right<=r.panel.right+1,'Card escaped the panel horizontally');
 }
 return {width:r.viewport.width,height:r.viewport.height,rows:r.rows.length,panel:r.panel};
}
(async()=>{try{
 const supplied=process.argv.find(a=>a.startsWith('--base-url='));const base=supplied?supplied.slice(11).replace(/\/$/,''):await startServer();report.baseUrl=base;
 browser=await chromium.launch({headless:true,...(process.env.MATCHAPP_QA_CHANNEL?{channel:process.env.MATCHAPP_QA_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block',reducedMotion:'reduce'});
 await context.route(/supabase\.co\/.*|google-analytics\.com\/.*|googlesyndication\.com\/.*|doubleclick\.net\/.*|posthog\.com\/.*/,r=>r.fulfill({status:200,contentType:'application/json',body:'{}'}));
 await context.route('https://notification-qa.invalid/poster.svg',r=>r.fulfill({status:200,contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="180"><rect width="120" height="180" rx="12" fill="#352248"/><circle cx="60" cy="70" r="24" fill="none" stroke="#e5c158" stroke-width="3"/><path d="M54 56l20 14-20 14z" fill="#e5c158"/><text x="60" y="128" text-anchor="middle" fill="#fff" font-size="12">QA FIXTURE</text></svg>'}));
 await context.addInitScript(()=>{localStorage.setItem('match_soundEnabled','false');localStorage.setItem('match_lang','en');window.MATCH_LANG='en';});
 const page=await context.newPage();page.on('pageerror',e=>report.pageErrors.push(e.message));
 await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>!!window.MatchNotifications,{timeout:20000});await page.waitForTimeout(1800);
 await page.evaluate(()=>{
  const opener=document.createElement('button');opener.id='notification-qa-opener';opener.textContent='QA opener';document.body.appendChild(opener);opener.focus();
  const descriptions=['A calm, warm-hearted choice for your evening. The full description stays inside its card, with a clear action beside it.','A longer recommendation to verify that content can wrap naturally on small screens without crossing a gold outline or colliding with another control.','An intentionally long update to exercise scrolling, full-width text, and the independent settings section. '.repeat(4)];
  for(let i=4;i>=0;i--)window.MatchNotifications.pushLocal({id:'notification-ui-qa-'+i,localKey:'notification-ui-qa-'+i,kind:i<3?'suggestion':'system',title:i<3?'Your next shared discovery — a warm evening':'MatchApp Ai: a thoughtful update',body:descriptions[i%3],createdAt:'2026-10-16T12:00:00Z',payload:{title:'UI test fixture',posterUrl:'https://notification-qa.invalid/poster.svg'}});
  window.MatchNotifications.open();
 });
 const sizes=[[320,568],[360,740],[390,844],[412,915],[600,960],[800,1280],[1024,768],[1440,900],[844,390],[320,320]];
 for(const [width,height] of sizes)await runCase(`viewport-${width}x${height}`,async()=>{await page.setViewportSize({width,height});await page.waitForTimeout(120);await geometry(page);if([390,800,1440].includes(width))await page.screenshot({path:path.join(out,`notifications-${width}x${height}.png`)});});
 await page.setViewportSize({width:390,height:844});
 const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
 for(const lang of languages)await runCase(`language-geometry-${lang}`,async()=>{await page.evaluate(lang=>{window.MATCH_LANG=lang;document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr';document.dispatchEvent(new CustomEvent('matchapp:langchange',{detail:{lang}}));},lang);await geometry(page);});
 await page.evaluate(()=>{window.MATCH_LANG='en';document.documentElement.lang='en';document.documentElement.dir='ltr';document.dispatchEvent(new CustomEvent('matchapp:langchange',{detail:{lang:'en'}}));});
 await runCase('independent-scroll-and-settings',async()=>{
  const before=await page.locator('.matchapp-notification-header').boundingBox();
  await page.evaluate(()=>{const s=document.querySelector('.matchapp-notification-scroll');s.scrollTop=s.scrollHeight;document.querySelector('.matchapp-notification-settings').open=true;s.scrollTop=s.scrollHeight;});
  await page.waitForTimeout(100);const after=await page.locator('.matchapp-notification-header').boundingBox();check(Math.abs(before.y-after.y)<1,'Header moved when content scrolled');
  await page.locator('.matchapp-notification-settings summary').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'notifications-settings-phone.png')});await geometry(page);
 });
 await runCase('keyboard-focus-trap-and-Escape',async()=>{await page.locator('#matchapp-notifications h2').focus();await page.keyboard.press('Shift+Tab');check(await page.evaluate(()=>document.querySelector('#matchapp-notifications').contains(document.activeElement)),'Keyboard focus escaped the dialog');await page.keyboard.press('Escape');check(await page.locator('#matchapp-notifications').isHidden(),'Escape did not close the panel');check(await page.evaluate(()=>document.activeElement.id==='notification-qa-opener'),'Focus was not restored');check(await page.evaluate(()=>!document.body.classList.contains('matchapp-notifications-open')),'Scroll lock leaked after closing');});
 await runCase('backdrop-dismissal',async()=>{await page.evaluate(()=>window.MatchNotifications.open());await page.mouse.click(2,420);check(await page.locator('#matchapp-notifications').isHidden(),'Backdrop click did not close the dialog');});
 await runCase('reduced-motion',async()=>{await page.evaluate(()=>window.MatchNotifications.open());check(await page.evaluate(()=>getComputedStyle(document.querySelector('#matchapp-notifications')).animationName==='none'),'Reduced-motion preference ignored');await page.evaluate(()=>window.MatchNotifications.close());});
 // Verify a second page that loads the same notifications module.
 await runCase('profile-shared-notification-surface',async()=>{await page.goto(base+'/profile/profile.html',{waitUntil:'domcontentloaded',timeout:60000});await page.waitForFunction(()=>!!window.MatchNotifications,{timeout:15000});await page.evaluate(()=>{window.MatchNotifications.pushLocal({id:'profile-qa',localKey:'profile-qa',kind:'system',title:'Shared UI contract',body:'This notification uses the same component on the profile page.'});window.MatchNotifications.open();});await geometry(page);await page.evaluate(()=>window.MatchNotifications.close());});
 await context.close();
 }catch(e){report.failures.push({name:'setup-or-runtime',error:e.stack});}finally{if(browser)await browser.close();if(server)await new Promise(r=>server.close(r));report.finishedAt=new Date().toISOString();report.passed=report.failures.length===0&&report.pageErrors.length===0;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:report.passed,cases:report.cases.length,failures:report.failures,pageErrors:report.pageErrors.length,out},null,2));if(!report.passed)process.exitCode=1;}})();
