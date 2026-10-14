'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{
  const u=new URL(req.url,'http://localhost'),target=path.resolve(root,'.'+decodeURIComponent(u.pathname));
  if(!target.startsWith(root)){res.writeHead(403).end();return;}
  let file=target;
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(404).end();}
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 for(const width of [320,390,820,1366]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#ma-worlds-trigger').waitFor({state:'visible'});
  assert.match((await page.locator('[data-match-experience-heading]').textContent()).trim(),/^(Find Your Next Experience|Encontre Sua Próxima Experiência)$/);
  assert.ok(await page.locator('[data-match-experience-heading]').isVisible(),width+' experience headline hidden');
  assert.ok(await page.locator('[data-match-brand-story]').isVisible(),width+' brand story hidden');
  assert.match((await page.locator('[data-match-experience-nav]').textContent()).trim(),/^(Discover with Jonas|Descubra com Jonas)$/);
  const state=await page.evaluate(()=>{
   const box=s=>{let e=document.querySelector(s),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,right:r.right}};
   return {nav:getComputedStyle(document.querySelector('#mh-topbox .ma-luxe-shortcuts')).display,
    profile:box('nav.ma-luxe-shortcuts a[data-ma-nav="4"]'),button:box('#ma-worlds-trigger'),
    headline:box('[data-match-experience-heading]'),utilities:box('#mh-topbox nav.mh-deck'),
    width:innerWidth,premiere:getComputedStyle(document.querySelector('#premiere-disclosure')).display,
    open:document.querySelector('#premiere-disclosure').open,
    together:getComputedStyle(document.querySelector('.tg-entry')).display};
  });
  assert.equal(state.nav,'grid',width+' nav not grid');
  assert.ok(state.headline.y+state.headline.h<=state.utilities.y+1,width+' headline overlaps controls '+JSON.stringify(state));
  assert.ok(state.button.right<=width+1,width+' button offscreen '+JSON.stringify(state));
  assert.ok(state.button.w<width*.75,width+' trigger incorrectly full width '+JSON.stringify(state));
  assert.ok(state.button.x>state.profile.x,width+' trigger not beside Profile');
  assert.ok(Math.abs(state.button.y-state.profile.y)<8,width+' trigger not aligned with Profile');
  assert.notEqual(state.premiere,'none',width+' premiere hidden');
  assert.equal(state.open,true,width+' premiere collapsed');
  assert.equal(state.together,'none',width+' old Together still on Home');
  await page.locator('#ma-worlds-trigger').click();
  await page.locator('#ma-explore-worlds-panel:not([hidden])').waitFor();
  assert.equal(await page.locator('.ma-world-card').count(),9);
  assert.match((await page.locator('[data-match-experience-dialog]').textContent()).trim(),/^(Find Your Next Match|Encontre Seu Próximo Match)$/);
  const dialog=await page.locator('.ma-worlds-panel').boundingBox();
  assert.ok(dialog.x>=-1 && dialog.x+dialog.width<=width+1,width+' overlay horizontal overflow');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#ma-worlds-trigger').getAttribute('aria-expanded'),'false');
  console.log('PASS responsive Worlds',width,JSON.stringify({profile:state.profile,button:state.button,dialog}));
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:850}});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
 await page.goto(base+'/explore.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.explore-grid .explore-card').count(),9);
 assert.ok(await page.locator('.explore-grid a[href="/together.html"]').isVisible());
 assert.ok(await page.locator('.explore-grid a[href="/friends.html"]').isVisible());
 console.log('PASS nine-topic Explore directory on mobile');
 await page.close();await browser.close();server.close();
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1)});
