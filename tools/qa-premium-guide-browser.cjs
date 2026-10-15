'use strict';
const {chromium}=require('playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((request,response)=>{
 const u=new URL(request.url,'http://localhost');let target=path.resolve(root,'.'+decodeURIComponent(u.pathname));
 if(!target.startsWith(root+path.sep)&&target!==root){response.writeHead(403).end();return}
 try{if(fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  response.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream'});
  fs.createReadStream(target).pipe(response);
 }catch(_){response.writeHead(404).end()}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true});
 for(const width of [320,390,820,1366]){
  const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await page.goto(base+'/how-it-works.html',{waitUntil:'domcontentloaded'});
  await page.locator('.journey-chapter.is-active').waitFor({state:'visible'});
  let m=await page.evaluate(()=>{
   const rect=selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,bottom:r.bottom}};
   return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,
    heading:rect('.journey-intro h1'),stage:rect('.journey-chapter.is-active'),
    prev:rect('#journey-back'),next:rect('#journey-next'),
    chapters:document.querySelectorAll('.journey-chapter:not([hidden])').length,
    font:getComputedStyle(document.querySelector('.journey-intro h1')).fontFamily,
    reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
  });
  assert.ok(m.scroll<=width+2,width+' horizontal overflow '+JSON.stringify(m));
  assert.ok(m.heading.x>=0&&m.heading.x+m.heading.w<=width+1,width+' heading out of bounds');
  assert.ok(m.stage.w>=200 && m.stage.x>=0 && m.stage.x+m.stage.w<=width+1,width+' stage out of bounds');
  assert.equal(m.chapters,1);assert.match(m.font,/Outfit/);
  await page.locator('#journey-next').click();
  assert.equal((await page.locator('.journey-chapter.is-active').getAttribute('data-guide-step')),'1');
  await page.locator('[data-guide-goto="13"]').click();
  assert.equal((await page.locator('.journey-chapter.is-active').getAttribute('data-guide-step')),'13');
  assert.equal(await page.locator('.journey-visit').count(),14);
  assert.equal(await page.locator('.journey-home').getAttribute('href'),'/');
  console.log('PASS guide responsive',width,JSON.stringify({scroll:m.scroll,heading:m.heading,stage:m.stage}));
  await page.close();
 }
 const page=await browser.newPage({viewport:{width:390,height:850}});
 await page.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
 await page.goto(base+'/explore.html',{waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('#how-it-works a[href="/how-it-works.html"]').count(),1);
 await page.goto(base+'/how-it-works.html',{waitUntil:'domcontentloaded'});
 await page.context().addCookies([{name:'irrelevant',value:'1',domain:'127.0.0.1',path:'/'}]);
 await page.evaluate(()=>localStorage.setItem('match_lang','pt-BR'));
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await page.locator('h1').textContent(),/Encontre Sua Próxima Experiência/);
 assert.equal(await page.locator('.journey-chapter.is-active').count(),1);
 console.log('PASS Portuguese guide and Explore entry');
 await page.close();await browser.close();server.close();
})().catch(e=>{console.error(e.stack||e);server.close();process.exit(1)});
