'use strict';
/* Non-production adult design QA. Uses isolated local servers, no AI calls or test bypass. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),old=process.env.MATCHAPP_BASELINE_ROOT;
const out=path.join(root,'docs','design-reviews','20261014'),screens=path.join(out,'screenshots');
fs.mkdirSync(screens,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
function serve(folder){const rootdir=path.resolve(folder);const app=http.createServer((req,res)=>{
 let f;try{f=path.resolve(rootdir,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch(_){res.writeHead(400).end();return;}
 if(f!==rootdir&&!f.startsWith(rootdir+path.sep)){res.writeHead(403).end();return;}
 try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}
 catch(_){res.writeHead(404).end();}
});return new Promise(ok=>app.listen(0,'127.0.0.1',()=>ok({app,url:'http://127.0.0.1:'+app.address().port})))}
(async()=>{const servers=[await serve(root)];if(old)servers.push(await serve(old));const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const report=[];
try{
 const routes=['/','/explore.html','/music.html','/discover.html','/profile/profile.html','/pricing/pricing.html'];
 for(const [phase,base] of (old?[['before',servers[1].url],['after',servers[0].url]]:[['after',servers[0].url]])){
  const widths=phase==='before'?[390,1366]:[320,390,820,1366,1920];
  for(const width of widths){
   const ctx=await browser.newContext({viewport:{width,height:width===820?1180:900},reducedMotion:'reduce'});
   await ctx.addInitScript(()=>localStorage.setItem('match_lang','pt-BR'));
   await ctx.route(/google-analytics|googletagmanager|googlesyndication|doubleclick/i,r=>r.abort());
   const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
   const these=phase==='before'?routes.slice(0,3):routes;
   for(const route of these){
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
    await page.waitForTimeout(route==='/'?650:300);
    const check=await page.evaluate(()=>({lang:window.MATCH_LANG||'',overflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),title:document.title,docDir:document.documentElement.dir}));
    assert.ok(check.overflow<=2,phase+' '+route+' '+width+' overflow='+check.overflow);
    assert.equal(check.lang,'pt-BR',phase+' '+route+' '+width+' selected locale');
    if(route==='/explore.html'){
     const cards=page.locator('.explore-grid a.explore-card');assert.equal(await cards.count(),8);
     for(const href of await cards.evaluateAll(nodes=>nodes.map(a=>a.getAttribute('href')))){
      assert.ok(href&&href!=='#','Explore destination must not be a placeholder');
     }
     await page.locator('#how-it-works summary').click();
     assert.ok(await page.locator('#how-it-works').evaluate(n=>n.open));
    }
    if(phase==='after'&&route==='/music.html')assert.ok((await page.locator('[data-music-ask]').innerText()).length>5);
    if(phase==='after'&&(route==='/'||route==='/explore.html')){
     const home=route==='/', launcher=home?'#ma-jonas-home-bubble':'#ma-ambient-jonas .ja-bubble';
     const chat=home?'#ma-jonas-home-panel':'#ma-ambient-panel',closer=home?'#ma-jonas-home-close':'#ma-ambient-panel .ja-close';
     await page.locator(launcher).waitFor({state:'visible',timeout:30000});
     const saved=await page.locator(launcher).boundingBox();
     await page.locator(launcher).click();
     await page.locator(chat).waitFor({state:'visible',timeout:12000});
     const box=await page.locator(chat).boundingBox();
     assert.ok(box&&box.width>=width-20&&box.x>=-2&&box.x+box.width<=width+2,route+' fullscreen width '+JSON.stringify(box));
     assert.equal(await page.locator(chat).getAttribute('aria-modal'),'true',route+' aria modal');
     const portrait=await page.locator(home?'#ma-jonas-home > .jh-bubble':'#ma-ambient-panel .ja-face-wrap').boundingBox();
     assert.ok(portrait&&portrait.x<=120&&portrait.y<=135,route+' portrait must be top left');
     const closeBox=await page.locator(closer).boundingBox();
     assert.ok(closeBox&&closeBox.x>=0&&closeBox.x+closeBox.width<=width+2,route+' close visible');
     if(width===390)await page.screenshot({path:path.join(screens,'after-jonas-'+(home?'home':'explore')+'-390.png'),fullPage:false,animations:'disabled'});
     await page.locator(closer).click();
     await page.locator(chat).waitFor({state:'hidden',timeout:10000});
     const restored=await page.locator(launcher).boundingBox();
     assert.ok(restored&&Math.abs(restored.x-saved.x)<=6&&Math.abs(restored.y-saved.y)<=6,route+' saved position restored');
    }
    report.push({phase,width,route,...check,errors:errors.length});
    if((width===390||width===1366)&&['/','/explore.html','/music.html'].includes(route)){
      const slug=route==='/'?'home':route.slice(1,-5);
      await page.screenshot({path:path.join(screens,phase+'-'+slug+'-'+width+'.png'),fullPage:false,animations:'disabled'});
    }
   }
   if(phase==='after'&&width===390){
     await page.goto(base+'/explore.html');
     for(const l of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
      await page.evaluate(lang=>window.setLanguage(lang),l);
      assert.equal(await page.locator('html').getAttribute('lang'),l,'chosen locale '+l);
      assert.ok((await page.locator('#how-it-works summary').innerText()).includes('MatchApp Ai'));
      const t=await page.evaluate(()=>Math.max(0,document.documentElement.scrollWidth-innerWidth));
      assert.ok(t<=2,l+' layout overflow '+t);
     }
     await page.evaluate(()=>window.setLanguage('pt-BR'));
     const link=page.locator('.explore-grid a.explore-card[href="/music.html"]');
     await link.click();await page.waitForURL('**/music.html');
     assert.equal(await page.locator('html').getAttribute('lang'),'pt-BR','navigation retains locale');
     await page.goBack();assert.ok(page.url().endsWith('/explore.html'),'browser Back returns to Explore');
     await page.setViewportSize({width:390,height:460});await page.goto(base+'/discover.html',{waitUntil:'domcontentloaded',timeout:60000});
     const field=page.locator('textarea:visible,input[type=text]:visible').first();
     if(await field.count())await field.focus();
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'short keyboard-style viewport overflow');
     report.push({phase,width:390,route:'/discover.html',scenario:'keyboard-sized-viewport',status:'checked (not physical IME)'});
   }
   await ctx.close();
  }
 }
 fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify({generated:'2026-10-14',checks:report.length,notes:['Local browser only; no production AI, speech or physical keyboard verification','Screenshots show viewport, not full loaded external media'],checksPerformed:report},null,2));
 console.log('Design browser QA passed: '+report.length+' checks, screenshots in '+screens);
}finally{await browser.close();for(const s of servers)s.app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
