'use strict';
const {chromium}=require('playwright'),http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch(_){res.writeHead(400).end();return}
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res)
 }catch(_){res.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 const langs=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
 for(const width of [320,390,820,1366]){
  const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#ma-worlds-trigger').waitFor({state:'visible'});
  const failed=[];
  for(const lang of langs){
   const issues=await page.evaluate(l=>{
    window.MATCH_LANG=l;document.documentElement.lang=l;
    document.dispatchEvent(new Event('matchapp:langchange'));
    document.dispatchEvent(new Event('matchapp:languagechange'));
    const roots=[...document.querySelectorAll('nav.ma-luxe-shortcuts > a,nav.ma-luxe-shortcuts > button')];
    return roots.map((e,i)=>{
     let r=e.getBoundingClientRect(),text=e.querySelector('.ma-luxe-text')||e;
     return {i,label:text.textContent.trim().slice(0,40),
       horizontal:e.scrollWidth-e.clientWidth,vertical:e.scrollHeight-e.clientHeight,
       textHorizontal:text.scrollWidth-text.clientWidth,offscreen:r.x<0||r.right>innerWidth+2};
    }).filter(x=>x.offscreen||x.horizontal>5||x.vertical>5||x.textHorizontal>6);
   },lang);
   if(issues.length)failed.push({lang,issues});
  }
  assert.deepEqual(failed,[],width+' translated top-box labels clip or overflow: '+JSON.stringify(failed));
  await page.locator('#ma-worlds-trigger').click();
  const region=await page.locator('#ma-explore-worlds-panel').evaluate(el=>{
   const r=el.getBoundingClientRect(),s=getComputedStyle(el);
   return {position:s.position,display:s.display,top:r.top,edge:r.right,locked:document.body.classList.contains('ma-worlds-open')};
  });
  assert.equal(region.position,'relative');assert.ok(region.top>50);
  assert.equal(region.locked,false);
  assert.equal(await page.locator('.ma-worlds-shade').count(),0);
  assert.equal(await page.locator('#ma-explore-worlds-panel [aria-modal="true"]').count(),0);
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ma-worlds-trigger').getAttribute('aria-expanded'),'false');
  const rail=await page.locator('#marquee-viewport').evaluate(el=>({
   exists:!!el,scroll:el.scrollWidth>el.clientWidth,touch:getComputedStyle(el).touchAction,
   snap:getComputedStyle(el).scrollSnapType
  }));
  assert.equal(rail.snap,'none');
  assert.ok(rail.scroll);
  console.log('PASS motion locale + inline Explore + single-owner rail',width,langs.length+' locales',JSON.stringify(region));
  if(width===390){
   await page.waitForTimeout(900);
   const bubble=page.locator('#ma-jonas-home.is-floating');
   if(await bubble.count()){
    const r=await bubble.boundingBox();
    assert.ok(r.y>350,'Homepage Jonas obscures header: '+JSON.stringify(r));
    await bubble.locator('#ma-jonas-home-bubble').scrollIntoViewIfNeeded();
    console.log('PASS home Jonas lower-right default',JSON.stringify(r));
   }else console.log('WARN Home Jonas floating owner not active on this fixture');
  }
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:850}});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.goto(base+'/how-it-works.html',{waitUntil:'domcontentloaded'});
 const bubble=page.locator('#ma-ambient-jonas .ja-bubble');
 await bubble.waitFor({state:'visible',timeout:14000});
 const start=await page.locator('#ma-ambient-jonas').boundingBox();
 assert.ok(start.y>=400&&start.y<820,'Jonas subpage dock wrong '+JSON.stringify(start));
 const b=await bubble.boundingBox();
 await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
 await page.mouse.down();await page.mouse.move(b.x+b.width/2-120,b.y+b.height/2-105,{steps:8});await page.mouse.up();
 await page.waitForTimeout(650);
 const moved=await page.locator('#ma-ambient-jonas').boundingBox();
 assert.ok(moved.x<start.x-20,'Jonas drag failed: '+JSON.stringify({start,moved}));
 const saved=await page.evaluate(()=>localStorage.getItem('matchapp-jonas-position-v2'));
 assert.ok(saved,'Dragged bubble position not saved');
 await page.reload({waitUntil:'domcontentloaded'});
 await bubble.waitFor({state:'visible',timeout:14000});
 const persisted=await page.locator('#ma-ambient-jonas').boundingBox();
 assert.ok(Math.abs(persisted.x-moved.x)<14,'Drag position not restored');
 console.log('PASS Jonas default + drag + persistence',JSON.stringify({start,moved,persisted}));
 await page.close();await browser.close();server.close();
})().catch(err=>{console.error(err.stack||err);server.close();process.exit(1)});
