'use strict';
// Read-only rendered UI audit. Native device evidence is collected separately.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {chromium} = require(process.env.MATCHAPP_QA_PLAYWRIGHT || 'playwright');
const root = path.resolve(process.env.MATCHAPP_QA_ROOT || path.join(__dirname, '..'));
const out = path.resolve(process.env.MATCHAPP_QA_OUTPUT || path.join(root, 'reports/android-ui-20261021/browser'));
const routes = JSON.parse(process.env.MATCHAPP_QA_ROUTES || '["/","/how-it-works.html","/profile/profile.html","/explore.html","/discover.html","/ebooks/","/cooking/","/music.html","/news/","/events-archive.html","/together.html","/friends.html","/pricing/pricing.html"]');
const widths = JSON.parse(process.env.MATCHAPP_QA_WIDTHS || '[320,390,800,1366]');
const lang = process.env.MATCHAPP_QA_LANG || 'en';
const report = {scope:'Rendered browser viewports; not Android emulator or native permission/audio verification.', base:process.env.MATCHAPP_QA_BASE || 'local candidate', lang, screenshots:process.env.MATCHAPP_QA_SCREENSHOTS!=='0', cases:[], finished:false};
const mime = {'.html':'text/html','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.mp3':'audio/mpeg','.mp4':'video/mp4'};
fs.mkdirSync(out,{recursive:true});
let server;
const persist = () => fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
function measure() {
 const visible = e => { const r=e.getBoundingClientRect(),s=getComputedStyle(e); return r.width>0 && r.height>0 && s.visibility!=='hidden' && s.display!=='none' && e.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})!==false; };
 const box = e => e?e.getBoundingClientRect().toJSON():null;
 const label = e => (e.getAttribute('aria-label') || e.innerText || e.id || e.tagName).trim().slice(0,100);
 const identify = e => ({tag:e.tagName,id:e.id,classes:String(e.className).slice(0,120),label:label(e),box:box(e)});
 const header=document.querySelector('#ma-reference-header'),dock=document.querySelector('nav.ma-cinema-dock');
 const roots=[...document.querySelectorAll('#ma-ambient-jonas,#ma-jonas-home')].filter(visible);
 const controls=[...document.querySelectorAll('button,summary,input:not([type=hidden]),select,textarea,[role=button],nav.ma-cinema-dock a')].filter(visible);
 const current=controls.filter(e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;});
 const overlaps=[];
 for(let i=0;i<current.length;i++)for(let j=i+1;j<current.length;j++){
  const a=current[i],b=current[j]; if(a.contains(b)||b.contains(a))continue;
  const x=a.getBoundingClientRect(),y=b.getBoundingClientRect();
  if(Math.min(x.right,y.right)-Math.max(x.left,y.left)>2&&Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)>2)overlaps.push({a:identify(a),b:identify(b)});
 }
 const short=controls.filter(e=>{const r=e.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).slice(0,35).map(identify);
 const blocked=current.filter(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit&&!e.contains(hit)&&hit!==e;}).slice(0,25).map(identify);
 const outside=controls.filter(e=>{const r=e.getBoundingClientRect();return r.left<-.5||r.right>innerWidth+.5;}).slice(0,25).map(identify);
 const textClip=controls.filter(e=>!e.matches('input,textarea,select')&&e.scrollWidth>e.clientWidth+2).slice(0,25).map(identify);
 const opacity=[];for(let e=document.querySelector('.journey-intro');e;e=e.parentElement){const s=getComputedStyle(e);opacity.push({tag:e.tagName,classes:e.className,opacity:s.opacity,filter:s.filter});}
 return {url:location.href,viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,header:box(header),headerSpace:box(document.querySelector('#ma-reference-header-space')),dock:box(dock),launchers:roots.map(identify),controlCount:controls.length,smallTargets:short,overlaps,blocked,outside,textClip,journeyOpacity:opacity,lang:document.documentElement.lang,title:document.title};
}
async function screenshot(page,name) {
 if(process.env.MATCHAPP_QA_SCREENSHOTS==='0')return;
 const session=await page.context().newCDPSession(page);
 try{const {data}=await session.send('Page.captureScreenshot',{format:'png',fromSurface:true,captureBeyondViewport:false});const bytes=Buffer.from(data,'base64');if(bytes.length<1000)throw Error('Screenshot contains insufficient image data');fs.writeFileSync(path.join(out,name+'.png'),bytes);}finally{await session.detach();}
}
(async()=>{
 let base=process.env.MATCHAPP_QA_BASE;
 if(!base){server=http.createServer((req,res)=>{try{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(f!==root&&!f.startsWith(root+path.sep))throw Error('outside');if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).on('error',()=>res.end()).pipe(res);}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;}
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of widths){
   const context=await browser.newContext({viewport:{width,height:width>=700&&width<1000?1180:900},hasTouch:width<1100,reducedMotion:'reduce'});
   await context.addInitScript(({lang,scale})=>{localStorage.setItem('match_lang',lang);localStorage.setItem('match_cookie_choice','essential');localStorage.setItem('match_settings',JSON.stringify({fontScale:scale,reduceMotion:true}));},{lang,scale:Number(process.env.MATCHAPP_QA_FONT_SCALE||1)});
   if(!process.env.MATCHAPP_QA_BASE)await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
   const page=await context.newPage();page.setDefaultTimeout(6000);
   for(const route of routes){
    const name=(route==='/'?'home':route.replace(/^\//,'').replace(/[^a-z0-9]+/gi,'-'))+'-'+width+'-'+lang;
    const entry={route,width,name,errors:[],screens:[]};report.cases.push(entry);
    const onError=e=>entry.errors.push(e.message);page.on('pageerror',onError);
    try{
     const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:25000});entry.status=response?.status();
     await page.waitForFunction(()=>document.documentElement.dataset.maJonasHeader==='active',null,{timeout:6000}).catch(()=>{});
     await page.waitForTimeout(600);entry.initial=await page.evaluate(measure);await screenshot(page,name);if(process.env.MATCHAPP_QA_SCREENSHOTS!=='0')entry.screens.push(name+'.png');
     if(route==='/how-it-works.html'){
      await page.locator('[data-guide-goto="13"]').click();entry.lastChapter=await page.locator('.journey-chapter.is-active').getAttribute('data-guide-step');
      await page.locator('#journey-back').scrollIntoViewIfNeeded();entry.guideControls=await page.evaluate(measure);await screenshot(page,name+'-controls');if(process.env.MATCHAPP_QA_SCREENSHOTS!=='0')entry.screens.push(name+'-controls.png');
     }
     if(route==='/profile/profile.html'){
      const tab=page.locator('#tab-history');if(await tab.count()){await tab.click();entry.history={selected:await tab.getAttribute('aria-selected'),visible:await page.locator('#panel-history').isVisible().catch(()=>false)};await screenshot(page,name+'-history');if(process.env.MATCHAPP_QA_SCREENSHOTS!=='0')entry.screens.push(name+'-history.png');}
     }
    }catch(error){entry.failure=error.message;await screenshot(page,name+'-failure').catch(()=>{});}
    page.off('pageerror',onError);persist();console.log(JSON.stringify({route,width,status:entry.status,overflow:entry.initial?.overflow,small:entry.initial?.smallTargets.length,overlaps:entry.initial?.overlaps.length,failure:entry.failure}));
   }
   await context.close();
  }
 }finally{await browser.close();server?.close();report.finished=true;persist();}
})().catch(error=>{report.error=error.message;persist();server?.close();console.error(error);process.exitCode=1;});
