'use strict';
const {chromium}=require('playwright');
const http=require('node:http');
const path=require('node:path');
const fs=require('node:fs');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const samples=path.join(process.env.USERPROFILE||root,'ma-jonas-floating-qa');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
 try{
  const raw=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  let f=path.resolve(root,'.'+raw);
  if(!(f===root||f.startsWith(root+path.sep))){res.writeHead(403);res.end();return;}
  if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
  if(!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');
  fs.createReadStream(f).pipe(res);
 }catch(e){res.writeHead(404);res.end();}
});
async function run(){
 fs.mkdirSync(samples,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
  for(const [name,width,height] of [['phone',390,844],['small',340,700],['tablet',768,1024],['desktop',1380,920]]){
   const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'});
   await page.route('**/*',route=>{
    const url=route.request().url();
    if(url.startsWith(origin)||url.startsWith('data:'))route.continue();
    else route.abort();
   });
   await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:60000});
   await page.waitForSelector('#ma-jonas-home-bubble',{state:'visible',timeout:22000});
   const home=await page.locator('#ma-jonas-home-bubble').evaluate(b=>{
     const r=b.getBoundingClientRect();const i=b.querySelector('img');
     return {x:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height,loaded:i.complete&&i.naturalWidth>0};
   });
   assert.ok(home.loaded,'Jonas portrait failed '+name+JSON.stringify(home));
   assert.ok(home.x>=0&&home.right<=width+2&&home.top>=0&&home.bottom<=height+2,'floating bubble clipped '+name+JSON.stringify(home));
   if(width>=1180)assert.ok(home.right<=width-200,'avoid AdSense side rails '+JSON.stringify(home));
   await page.screenshot({path:path.join(samples,name+'-home.png'),animations:'disabled'});
   // Consent must remain above the assistant; dismiss it through the real decline action.
   const decline=page.locator('.ma-cookie .no');
   if(await decline.count() && await decline.isVisible())await decline.click({timeout:10000});
   await page.locator('#ma-jonas-home-bubble').click({force:true});
   assert.equal(await page.locator('#ma-jonas-home-panel').isVisible(),true);
   const panel=await page.locator('#ma-jonas-home-panel').evaluate(e=>{const r=e.getBoundingClientRect();return {x:r.left,right:r.right,top:r.top,bottom:r.bottom,w:r.width,h:r.height}});
   assert.ok(panel.x>=0&&panel.right<=width+2,'panel horizontally clipped '+name+JSON.stringify(panel));
   assert.ok(panel.top>=0&&panel.bottom<=height+2,'panel vertically clipped '+name+JSON.stringify(panel));
   await page.screenshot({path:path.join(samples,name+'-open.png'),animations:'disabled'});
   await page.locator('#ma-jonas-home-close').click({force:true});
   assert.equal(await page.locator('#ma-jonas-home-panel').isVisible(),false);
   console.log('PASS',name,'bubble',JSON.stringify(home),'panel',JSON.stringify(panel));
   await page.close();
  }
 }finally{await browser.close();}
}
run().then(()=>server.close(),err=>{console.error(err.stack||err);server.close();process.exitCode=1});
