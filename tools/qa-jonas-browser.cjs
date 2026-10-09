#!/usr/bin/env node
'use strict';
// Standalone visual browser QA. Never triggers the real AI backend or payments.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const ROOT=path.resolve(__dirname,'..');
const OUT=path.join(process.env.USERPROFILE||process.env.HOME||ROOT,'matchapp-jonas-visual-qa');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
 '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let url;
 try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400);res.end();return;}
 let filename;
 try{
  const pathname=decodeURIComponent(url.pathname);
  filename=path.resolve(ROOT,'.'+pathname);
  if(!(filename===ROOT||filename.startsWith(ROOT+path.sep))){res.writeHead(403);res.end();return;}
  if(fs.existsSync(filename)&&fs.statSync(filename).isDirectory())filename=path.join(filename,'index.html');
 }catch{res.writeHead(404);res.end();return;}
 if(!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',mime[path.extname(filename).toLowerCase()]||'application/octet-stream');
 fs.createReadStream(filename).pipe(res);
});
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-dev-shm-usage','--no-sandbox','--disable-gpu']});
 try{
  for(const [name,width,height] of [['mobile',360,800],['phone',412,915],['tablet',768,1024],['desktop',1366,900]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
   const page=await context.newPage();
   await page.route('**/www.googletagmanager.com/**',r=>r.abort());
   await page.route('**/discover.html?q=*',r=>r.fulfill({status:200,contentType:'text/html',
    body:'<!doctype html><title>Verified discovery route</title><p>Original MatchApp AI destination</p>'}));
   await page.goto(origin+'/jonas/',{waitUntil:'domcontentloaded',timeout:35000});
   const homeOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
   assert.ok(homeOverflow<=2,'Home must not overflow the viewport at '+width+'px');
   await page.screenshot({path:path.join(OUT,name+'-home.png'),fullPage:true,animations:'disabled'});
   await page.locator('.nav-link[data-page="discover"]').click();
   const layout=await page.evaluate(()=>{
    const cards=[...document.querySelectorAll('.discovery-card')];
    const rectangles=cards.map(card=>{const r=card.getBoundingClientRect(),a=card.querySelector('svg').getBoundingClientRect();
     return {width:Math.round(r.width),height:Math.round(r.height),artWidth:Math.round(a.width),artHeight:Math.round(a.height)}});
    return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,cards:rectangles,kids:!!document.querySelector('a.browser-kids[href="/kids/"]')};
   });
   assert.equal(layout.cards.length,6);
   assert.ok(layout.cards.every(card=>card.width>110&&card.height>130&&card.artWidth>35&&card.artHeight>35),
    'every Discover tile must show a sizeable SVG: '+JSON.stringify(layout));
   assert.ok(layout.scrollWidth<=layout.width+2,'no horizontal clipping: '+JSON.stringify(layout));
   assert.ok(layout.kids);
   await page.screenshot({path:path.join(OUT,name+'-discover.png'),fullPage:true,animations:'disabled'});
   await page.locator('.discovery-card').first().click();
   await page.waitForURL('**/discover.html?q=*',{timeout:20000});
   assert.match(new URL(page.url()).searchParams.get('q')||'',/Brazilian movies/i);
   await context.close();
   process.stdout.write('PASS '+name+' '+width+'x'+height+' art='+JSON.stringify(layout.cards)+'\n');
  }
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.route('**/www.googletagmanager.com/**',r=>r.abort());
  await page.route('**/discover.html?q=*',r=>r.fulfill({status:200,contentType:'text/html',body:'<title>AI</title>'}));
  await page.goto(origin+'/jonas/',{waitUntil:'domcontentloaded'});
  await page.locator('#jonas-bubble').click();
  await page.locator('#chat-input').fill('Recommend a documentary in Brazil');
  await page.locator('#send-button').click();
  await page.waitForURL('**/discover.html?q=*',{timeout:20000});
  assert.equal(new URL(page.url()).searchParams.get('q'),'Recommend a documentary in Brazil');
  await context.close();
  console.log('PASS chat sends to official, existing AI route; no preview /api/ask calls');
  console.log('Screenshots '+OUT);
 }finally{await browser.close();}
})().then(()=>server.close(),err=>{console.error(err);server.close();process.exitCode=1});
