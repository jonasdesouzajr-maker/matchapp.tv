'use strict';
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let p;try{p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname))}catch(_){res.writeHead(400).end();return}
 if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return}
 try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(p)]||'application/octet-stream'});fs.createReadStream(p).pipe(res)}
 catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({headless:true});
 const origin='http://127.0.0.1:'+server.address().port;
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1});
 const page=await ctx.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(String(e.message).slice(0,180)));
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#marquee-viewport').waitFor({state:'visible'});
 const box=await page.locator('#marquee-viewport').boundingBox();
 const before=await page.locator('#marquee-viewport').evaluate(e=>e.scrollLeft);
 assert.ok(box.width>150&&box.height>50);
 const client=await ctx.newCDPSession(page);
 const y=Math.round(box.y+box.height*.5),left=Math.round(box.x+box.width*.82);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:left,y}]});
 const midway=[];
 for(let i=1;i<=11;i++){
  await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:left-i*15,y}]});
  if(i===5||i===11)midway.push(await page.locator('#marquee-viewport').evaluate(e=>e.scrollLeft));
  await page.waitForTimeout(22);
 }
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 const end=await page.locator('#marquee-viewport').evaluate(e=>e.scrollLeft);
 assert.ok(midway.some(x=>Math.abs(x-before)>25),'Real touch swipe did not move Top Titles '+JSON.stringify({before,midway,end}));
 await page.waitForTimeout(720);
 const after=await page.locator('#marquee-viewport').evaluate(e=>e.scrollLeft);
 const cards=await page.locator('#marquee-track .marquee-item img').count();
 assert.ok(cards>=10,'Poster rail unexpectedly empty');
 console.log('PASS real touch Top Titles swipe',{before,midway,end,after,posters:cards,pageerrors:errors.slice(0,3)});
 await page.screenshot({path:path.join(process.env.TEMP||root,'matchapp-motion-home-390.png'),fullPage:false});
 await page.locator('#ma-worlds-trigger').click();
 await page.screenshot({path:path.join(process.env.TEMP||root,'matchapp-motion-inline-390.png'),fullPage:false});
 console.log('PASS inline Explore screenshots captured');
 await browser.close();server.close();
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1)});
