'use strict';
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.mp3':'audio/mpeg'};
const server=http.createServer((req,res)=>{
 try{const u=new URL(req.url,'http://localhost'),x=path.resolve(root,'.'+decodeURIComponent(u.pathname));
 if(x!==root&&!x.startsWith(root+path.sep))return res.writeHead(403).end();
 let file=x;if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);
 }catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true});
 const base='http://127.0.0.1:'+server.address().port;
 for(const route of ['/','/explore.html','/how-it-works.html','/discover.html']){
  const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'no-preference'});
  await page.addInitScript(()=>{
   window.__vibes=[];
   Object.defineProperty(navigator,'vibrate',{configurable:true,value:x=>(window.__vibes.push(x),true)});
   localStorage.setItem('match_soundEnabled','false');
   localStorage.setItem('match_hapticsEnabled','true');
   localStorage.setItem('match_cookie_choice','essential');
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await page.goto(base+route,{waitUntil:'domcontentloaded'});
  await page.locator('body').waitFor();
  await page.evaluate(()=>{
   let b=document.createElement('button');b.id='sensory-test-tap';b.textContent='tap';document.body.appendChild(b);
   let m=document.createElement('button');m.id='sensory-test-mic';m.className='mic-btn';m.textContent='mic';document.body.appendChild(m);
  });
  await page.locator('#sensory-test-tap').click();
  await page.waitForTimeout(125);
  await page.locator('#sensory-test-mic').click();
  let vibes=await page.evaluate(()=>window.__vibes);
  assert.ok(vibes.includes(12),route+' missing tap pulse '+JSON.stringify(vibes));
  assert.ok(vibes.includes(115),route+' missing long mic pulse '+JSON.stringify(vibes));
  console.log('PASS subtle tap & long mic feedback',route,JSON.stringify(vibes));
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 await page.addInitScript(()=>{
  window.__vibes=[];
  Object.defineProperty(navigator,'vibrate',{configurable:true,value:x=>(window.__vibes.push(x),true)});
  localStorage.setItem('match_hapticsEnabled','true');
 });
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.goto(base+'/explore.html',{waitUntil:'domcontentloaded'});
 await page.evaluate(()=>{let b=document.createElement('button');b.id='sensory-test-tap';document.body.appendChild(b)});
 await page.locator('#sensory-test-tap').click();
 assert.equal((await page.evaluate(()=>window.__vibes)).length,0,'Reduced motion should disable haptics');
 console.log('PASS accessibility: reduced motion disables haptics');
 await page.close();await browser.close();server.close();
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1)});
