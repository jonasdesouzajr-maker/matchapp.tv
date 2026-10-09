'use strict';
const {chromium}=require('playwright'),http=require('node:http'),path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{try{let p=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname),f=path.resolve(root,'.'+p);if(!f.startsWith(root+path.sep)&&f!==root){res.writeHead(403);res.end();return}if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res);}catch{res.writeHead(404);res.end()}});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const origin='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-gpu','--disable-dev-shm-usage']});
 try{
 for(const [name,width,height] of [['phone',390,844],['small',340,700],['tablet',768,1024],['desktop',1380,900]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:55000});
  await page.waitForFunction(()=>document.body.classList.contains('ma-jonas-inline')&&!!document.getElementById('ma-jonas-inline-dock'),{timeout:16000});
  const original=await page.evaluate(()=>{
    const n=document.getElementById('ma-jonas-home'),q=document.getElementById('ma-ai-entry'),s=document.getElementById('search-box');
    const r=n.getBoundingClientRect(),u=q.getBoundingClientRect(),d=document.getElementById('ma-jonas-inline-dock').getBoundingClientRect();
    return {nested:!!q.querySelector('#ma-jonas-home'),floating:n.classList.contains('is-floating'),searchHidden:getComputedStyle(s).display==='none',searchParent:getComputedStyle(s.parentElement).display,headingHidden:getComputedStyle(q.previousElementSibling).display==='none',slotHeight:d.height,avatar:{x:r.x,y:r.y,w:r.width,h:r.height},parent:{y:u.y,h:u.height}};
  });
  if(!original.headingHidden)console.log('HEADER_DEBUG',name,await page.evaluate(()=>{const q=document.getElementById('ma-ai-entry'),h=q.previousElementSibling;return {html:h?.outerHTML?.slice(0,750),className:h?.className,styles:getComputedStyle(h).display,matched:[...document.querySelectorAll('.lazy-head')].filter(el=>el.matches(':has(+ #ma-ai-entry)')).map(el=>el.outerHTML.slice(0,150))}}));
  assert.ok(original.nested&&!original.floating&&original.headingHidden&&(original.searchHidden||original.searchParent==='none')&&original.slotHeight>=100,JSON.stringify(original));
  assert.ok(original.avatar.y>=original.parent.y-4 && original.avatar.y<=original.parent.y+original.parent.h+4,JSON.stringify(original));
  await page.locator('.ma-cookie .no').first().click({timeout:3000}).catch(()=>{});
  await page.locator('#ma-jonas-inline-dock').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(process.env.USERPROFILE||root,'ma-jonas-inline-'+name+'.png'),animations:'disabled'});
  await page.locator('#ma-jonas-home-bubble').click({force:true});
  assert.equal(await page.locator('#ma-jonas-home-panel').isVisible(),true,'chat open '+name);
  await page.screenshot({path:path.join(process.env.USERPROFILE||root,'ma-jonas-chat-open-'+name+'.png'),animations:'disabled'});
  await page.locator('#ma-jonas-home-close').click({force:true});
  const r=await page.locator('#ma-jonas-home-bubble').boundingBox();
  await page.mouse.move(r.x+r.width/2,r.y+r.height/2);
  await page.mouse.down();
  await page.mouse.move(Math.min(width-55,r.x+r.width/2+45),Math.max(35,r.y+r.height/2-45),{steps:9});
  await page.mouse.up();
  const after=await page.evaluate(()=>{
   const root=document.getElementById('ma-jonas-home');
   return {floating:root.classList.contains('is-floating'),parent:root.parentElement.tagName,stored:!!localStorage.getItem('matchapp-jonas-inline-position-v1'),open:!document.getElementById('ma-jonas-home-panel').hidden,reset:!document.querySelector('.jh-return').hidden};
  });
  assert.equal(after.floating,true,JSON.stringify(after));
  assert.equal(after.parent,'BODY');assert.equal(after.stored,true);assert.equal(after.open,false);assert.equal(after.reset,true);
  await page.locator('.jh-return').click({force:true});
  const restored=await page.evaluate(()=>({dock:!!document.querySelector('#ma-ai-entry > #ma-jonas-inline-dock > #ma-jonas-home'),floating:document.getElementById('ma-jonas-home').classList.contains('is-floating'),stored:!!localStorage.getItem('matchapp-jonas-inline-position-v1')}));
  assert.deepEqual(restored,{dock:true,floating:false,stored:false});
  console.log('PASS',name,width+'x'+height,JSON.stringify(original),JSON.stringify(after));
  await page.close();
 }
 }finally{await browser.close();}
})().then(()=>server.close(),e=>{console.error(e.stack||e);server.close();process.exitCode=1});
