'use strict';
/* Real production templates/scripts/styles in guest Chromium. Unavailable source
   images must show explicitly labelled local illustrations, never a fake photo. */
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/news-visual-20261101');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.ico':'image/x-icon'};
const app=http.createServer((req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+path.sep)&&file!==root){res.writeHead(403).end();return;}try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}catch(_){res.writeHead(404).end();}});
(async()=>{await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port,args=['--no-sandbox'];if(process.env.HTTP_PROXY)args.push('--proxy-server='+process.env.HTTP_PROXY,'--proxy-bypass-list=127.0.0.1;localhost');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args}),report={scope:'Full local production /news/ with fresh guest state, PT interface and source headlines intact. External source images may be unavailable under cloud policy. No physical-device or real publisher-image success claim.',checks:[]};
try{
for(const [width,height] of [[320,800],[390,844],[800,1280],[1280,800]])for(const scale of [1,1.5]){
 const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
 try{
  await context.addInitScript(value=>{localStorage.setItem('match_lang','pt-BR');localStorage.setItem('match_settings',JSON.stringify({fontScale:value,reduceMotion:true}));},scale);
  await page.goto(base+'/news/',{waitUntil:'domcontentloaded',timeout:45000});await page.waitForFunction(()=>window.MatchAppNewsImages&&document.querySelector('[data-news-story-card] img'));
  await page.evaluate(value=>{window.MatchSettings?.set?.('fontScale',value);document.documentElement.style.setProperty('--font-scale',value);},scale);
  const images=page.locator('[data-news-story-card] [data-news-media] img');assert.equal(await images.count(),24);
  for(let i=0;i<24;i++){const image=images.nth(i);await image.scrollIntoViewIfNeeded();await image.evaluate(node=>{node.loading='eager';});await page.waitForFunction(index=>{const img=document.querySelectorAll('[data-news-story-card] [data-news-media] img')[index];return img.complete&&img.naturalWidth>0;},i,{timeout:10000});}
  const result=await page.evaluate(()=>{
   const rect=node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
   return {rootFont:getComputedStyle(document.documentElement).fontSize,fontScale:document.documentElement.style.getPropertyValue('--font-scale'),overflow:document.documentElement.scrollWidth>innerWidth+1,cards:[...document.querySelectorAll('[data-news-story-card]')].map(card=>{
    const title=card.querySelector('[data-news-source-title]'),image=card.querySelector('[data-news-media] img'),caption=card.querySelector('[data-news-illustration-label]'),media=card.querySelector('[data-news-media]'),cr=rect(card),tr=rect(title),range=document.createRange();range.selectNodeContents(title);
    return{title:title.textContent,card:cr,titleRect:tr,glyphs:[...range.getClientRects()].filter(r=>r.width>0&&r.height>0).map(r=>({left:r.left,right:r.right,top:r.top,bottom:r.bottom})),src:image.getAttribute('src'),decoded:image.naturalWidth>0,illustration:media.dataset.newsImageKind==='illustration',label:caption.textContent,labelHidden:caption.hidden,objectFit:getComputedStyle(image).objectFit,titleOverflow:getComputedStyle(title).overflow,titleClamp:getComputedStyle(title).webkitLineClamp,actions:[...card.querySelectorAll('[data-news-ui="openLatest"],[data-news-ui="sourceLink"]')].map(rect)};
   })};
  });
  assert.equal(result.overflow,false);for(const card of result.cards){assert(card.decoded);assert.equal(card.objectFit,'contain');assert(card.titleRect.left>=card.card.left+8&&card.titleRect.right<=card.card.right-8);assert.equal(card.titleOverflow,'visible');for(const glyph of card.glyphs)assert(glyph.top>=card.card.top+4&&glyph.bottom<=card.card.bottom-4,'title glyph stays inside card');for(const action of card.actions)assert(action.top>=card.titleRect.bottom-1,'title and action remain separate');if(card.illustration){assert.equal(card.label,'Ilustração');assert.equal(card.labelHidden,false);}}
  const photographed=page.locator('[data-news-source-title]').filter({hasText:'Edinburgh Film Festival Toasts Bollywood'});await photographed.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'news-'+width+'-font'+scale+'.png')});
  const first=images.first(),sourceLink=await page.locator('[data-news-story-card]').first().locator('[data-news-ui="sourceLink"]').getAttribute('href'),originalTitle=await page.locator('[data-news-story-card]').first().locator('[data-news-source-title]').textContent();
  await first.evaluate(img=>{img.setAttribute('srcset','/missing-news-image.jpg 2x');img.src='/missing-news-image.jpg';});
  await page.waitForFunction(()=>{const img=document.querySelector('[data-news-story-card] img');return img.complete&&img.naturalWidth>0&&img.getAttribute('src').startsWith('/assets/news/topics/');});
  assert.equal(await page.locator('[data-news-story-card]').first().locator('[data-news-ui="sourceLink"]').getAttribute('href'),sourceLink);assert.equal(await page.locator('[data-news-story-card]').first().locator('[data-news-source-title]').textContent(),originalTitle);
  report.checks.push({width,height,scale,...result,errorRecovery:'local404 -> same labelled topic illustration; source link and headline unchanged'});console.log(JSON.stringify({width,height,scale,cards:result.cards.length,decoded:result.cards.filter(c=>c.decoded).length,fallbacks:result.cards.filter(c=>c.illustration).length,overflow:result.overflow}));
 }finally{await context.close();}
}
}finally{await browser.close();app.close();fs.writeFileSync(path.join(out,'rendered-news-images.json'),JSON.stringify(report,null,2));}
})().catch(error=>{console.error(error.stack);app.close();process.exitCode=1;});
