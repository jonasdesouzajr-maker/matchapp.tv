'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
// Historical command name retained for existing QA callers. The owner removed
// the viewport frame on 2026-10-20; the same boundary matrix now verifies its
// absence and keeps interactive content inside the visible viewport.
const root=path.resolve(__dirname,'..'),out=path.join(root,'docs','design-reviews','20261020');
const imageDir=path.join(out,'screenshots'),mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2'};
fs.mkdirSync(imageDir,{recursive:true});
const srv=http.createServer((req,res)=>{let f;try{f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname))}catch{res.writeHead(400).end();return}
 if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return}
 try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}catch{res.writeHead(404).end()}});
(async()=>{await new Promise(ok=>srv.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+srv.address().port,browser=await chromium.launch({headless:true}),results=[];
 const routes=['/','/explore.html','/music.html','/about.html','/discover.html','/profile/profile.html','/pricing/pricing.html','/kids/','/privacy.html','/register.html'];
 const widths=[320,390,820,1366,1920];
 try{
 for(const width of widths){
  const context=await browser.newContext({viewport:{width,height:width===820?1180:width>=1366?900:760},reducedMotion:'reduce'});
  await context.addInitScript(()=>{if(window.top===window.self)localStorage.setItem('match_lang','pt-BR')});
  await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
  const page=await context.newPage();
  for(const route of routes){
   const response=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:35000});
   await page.waitForTimeout(180);
   const state=await page.evaluate(()=>{
    const css=getComputedStyle(document.documentElement,'::after'),frame=parseFloat(css.borderTopWidth)||0;
    const els=[...document.querySelectorAll('#mh-topbox.app-header,#trending-rail,#questionnaire-box,.hub-header,.explore-card,.page-panel,.kids-source-card')];
    const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>10&&r.height>10&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]')};
    const floating=[...document.querySelectorAll('nav.ma-cinema-dock,#ma-jonas-home.is-floating:not(.is-chat-stage)')].filter(visible).map(e=>{
      const r=e.getBoundingClientRect();return{selector:e.id||e.className,left:r.left,right:r.right,top:r.top,bottom:r.bottom,inside:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1&&r.bottom<=innerHeight+1};
    });
    return {frame,frameInset:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ma-screen-frame-width'))||0,display:css.display,content:css.content,position:css.position,hitTest:css.pointerEvents,color:css.borderTopColor,shadow:css.boxShadow,overflow:document.documentElement.scrollWidth-innerWidth,floating,
      seen:els.filter(visible).slice(0,10).map(e=>({selector:e.id||e.className?.toString().slice(0,40),border:getComputedStyle(e).borderTopWidth})),isKids:document.documentElement.classList.contains('kids-mode'),isRTL:document.documentElement.dir==='rtl'};
   });
   if(response.status()>=400)throw Error('Route not served '+route+' '+response.status());
   if(state.frame!==0||state.frameInset!==0||state.display!=='none'||state.content!=='none'||state.shadow!=='none')throw Error('Viewport outline was restored '+route+' '+width+' '+JSON.stringify(state));
   if(state.overflow>1)throw Error('Horizontal viewport overflow '+route+' '+width+' '+JSON.stringify(state));
   if(state.floating.some(e=>!e.inside))throw Error('Floating control exceeds viewport '+route+' '+width+' '+JSON.stringify(state));
   if(route==='/explore.html'&&state.seen.filter(x=>x.selector==='explore-card').some(x=>parseFloat(x.border)>1))throw Error('Interior cards not thinner');
   results.push({route,width,...state});
   console.log('PASS',width,route,'outline absent','overflow',state.overflow);
   if(width===390&&['/','/kids/'].includes(route)){
    const slug=route==='/'?'home':route==='/kids/'?'kids':'explore';
    await page.screenshot({path:path.join(imageDir,'after-borderless-'+slug+'-'+width+'.png'),animations:'disabled'});
   }
  }
  await context.close();
 }
 fs.writeFileSync(path.join(out,'qa-borderless-viewport.json'),JSON.stringify({checks:results.length,contract:'No viewport outline; bounded interactive chrome; original 50-case page/width matrix',results},null,2));
 console.log('PASS_BORDERLESS_VIEWPORT '+results.length);
 }catch(error){
 fs.writeFileSync(path.join(out,'qa-borderless-viewport.json'),JSON.stringify({checks:results.length,contract:'No viewport outline; bounded interactive chrome; original 50-case page/width matrix',failure:error.message,results},null,2));
 throw error;
 }finally{await browser.close();srv.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
