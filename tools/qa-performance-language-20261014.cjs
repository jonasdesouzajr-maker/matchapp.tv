'use strict';
// UI-only local browser evidence. Does not send AI prompts, bypass quota or claim live backend coverage.
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/fast-language-20261014');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403).end();return}try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}catch(_){res.writeHead(404).end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const report=[];
 try{
 for(const width of [320,390,820,1366]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
  await context.route(/googletagmanager|googlesyndication|google-analytics/,r=>r.abort());
  await context.addInitScript(()=>localStorage.setItem('match_lang','pt-BR'));
  const page=await context.newPage();const fatal=[];page.on('pageerror',e=>fatal.push(e.message));
  for(const route of ['/','/explore.html','/music.html','/discover.html']){
   await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForTimeout(900);
   const state=await page.evaluate(()=>({lang:window.MATCH_LANG,overflow:document.documentElement.scrollWidth-innerWidth,firstPaint:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,title:document.title,body:!!document.body}));
   assert.equal(state.lang,'pt-BR',route+' selected language');assert.ok(state.overflow<=2,route+' '+width+' overflow '+state.overflow);
   if(route==='/explore.html'){
    await page.locator('#how-it-works summary').click();
    assert.match(await page.locator('#how-it-works summary').innerText(),/MatchApp Ai/);
    for(const language of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
     await page.evaluate(l=>window.setLanguage(l),language);
     assert.equal(await page.locator('html').getAttribute('lang'),language);
     assert.ok((await page.locator('#how-it-works p').first().innerText()).length>20);
    }
    await page.evaluate(()=>window.setLanguage('pt-BR'));
   }
   report.push({width,route,...state});await page.screenshot({path:path.join(out,width+'-'+(route==='/'?'home':route.slice(1,-5))+'.png'),fullPage:false});
  }
  assert.deepEqual(fatal,[],'runtime errors at '+width+': '+fatal.join('; '));await context.close();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({checks:report.length,errors:0,report},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
