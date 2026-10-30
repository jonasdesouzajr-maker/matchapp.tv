'use strict';
// Local, rendered SEO/viewport proof; no ad requests, user account, or game-state seeding.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=process.env.LUMINA_SEO_QA_OUTPUT||path.join(root,'artifacts/lumina-seo');
const source=require('./lumina-seo-copy.json');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{let name;try{name=decodeURIComponent(new URL(req.url,'http://local').pathname);}catch{res.writeHead(400).end();return;}
 const file=path.resolve(root,'.'+name+(name.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+path.sep)||name.includes('/.')){res.writeHead(403).end();return;}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(file).pipe(res);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});const report={started:new Date().toISOString(),scope:'Actual local pages in Chromium. External network blocked; not live analytics delivery or physical-device proof.',checks:[],screenshots:[]};
 try{
 if(process.argv.includes('--capture')){
  const context=await browser.newContext({viewport:{width:1200,height:630},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
  const page=await context.newPage();await page.goto(origin+'/lumina-match/browser/index.html?lang=en');
  await page.locator('.journey-play').click();await page.locator('#app[data-screen="game"]').waitFor({timeout:15000});
  await page.evaluate(()=>Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{}))));
  await page.waitForTimeout(500);
  const target=path.join(root,'lumina-match','lumina-gameplay-1200x630.jpg');
  await page.screenshot({path:target,type:'jpeg',quality:90});
  fs.writeFileSync(path.join(out,'social-capture.json'),JSON.stringify({captured:new Date().toISOString(),source:'Unmodified browser game; first guest campaign level; no scores, progress, cards or text fabricated.',viewport:{width:1200,height:630},url:'/lumina-match/browser/index.html?lang=en',screenshot:'lumina-match/lumina-gameplay-1200x630.jpg'},null,2)+'\n');
  console.log('Captured real first-level game screenshot: '+target);await context.close();return;
 }
 for(const [lang,copy] of Object.entries(source.locales)){
  for(const width of [320,390,820,1366]){
   const context=await browser.newContext({viewport:{width,height:width<500?844:900},reducedMotion:'reduce'});
   await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto(origin+'/lumina-match/'+(lang==='en'?'':lang.toLowerCase()+'/'),{waitUntil:'load'});
   await page.waitForTimeout(500);
   const metrics=await page.evaluate(()=>({width:innerWidth,documentWidth:document.documentElement.scrollWidth,h1:document.querySelector('h1').textContent,main:document.querySelector('main').getBoundingClientRect().toJSON(),canonical:document.querySelector('link[rel="canonical"]').href,sections:document.querySelectorAll('.lumina-guide-panel').length}));
   assert(metrics.documentWidth<=metrics.width+1,lang+' '+width+' horizontal overflow '+JSON.stringify(metrics));assert.equal(errors.length,0,errors.join('; '));
   assert(metrics.h1.includes(copy.h1),lang+' visible authored headline');
   await page.locator('#fewer-moves').scrollIntoViewIfNeeded();assert(await page.locator('#fewer-moves').isVisible());
   if(['en','pt-BR','ar','ja'].includes(lang)&&[390,1366].includes(width)){
    await page.evaluate(()=>scrollTo(0,0));const file=lang+'-'+width+'.png';await page.screenshot({path:path.join(out,file)});report.screenshots.push(file);
   }
   report.checks.push({lang,width,ok:true,...metrics});console.log('PASS '+lang+' '+width);await context.close();
  }
 }
 }finally{fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
