'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),os=require('node:os'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const out=process.env.QA_SEO_OUTPUT_DIR||path.join(os.tmpdir(),'matchapp-seo-language-qa');
const guides=['choose-what-to-watch','streaming-device-discovery'];
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const mime={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'application/javascript;charset=utf-8','.json':'application/json;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let file;
 try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}catch{res.writeHead(400).end();return;}
 if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}
 catch{res.writeHead(404).end();}
});
(async()=>{
 fs.mkdirSync(out,{recursive:true});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),cases=[];
 try{
  for(const width of [320,820,1366])for(const lang of languages){
   const context=await browser.newContext({viewport:{width,height:width===820?1180:900},reducedMotion:'reduce'});
   await context.addInitScript(language=>localStorage.setItem('match_lang',language),lang);
   await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
   const page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   for(const guide of guides){
    const result=await page.goto(base+'/guides/'+guide+'/',{waitUntil:'domcontentloaded',timeout:35000});
    assert.equal(result.status(),200);
    await page.waitForFunction(language=>document.documentElement.dataset.seoLocaleState==='ready'&&document.documentElement.lang===language,lang,{timeout:15000});
    await page.waitForLoadState('load',{timeout:15000});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const state=await page.evaluate(()=>{
     const css=getComputedStyle(document.documentElement,'::after');
     const h1=document.querySelector('h1').getBoundingClientRect();
     const labels=[...document.querySelectorAll('[data-seo-copy]')];
     const selector=document.querySelector('#seo-guide-language'),rect=selector.getBoundingClientRect(),y=rect.top+rect.height/2;
     const selectorHits=[{name:'center',x:rect.left+rect.width/2},{name:'right',x:rect.right-Math.min(8,rect.width/4)}].map(point=>{
      const hit=document.elementFromPoint(point.x,y);
      return {...point,y,reachable:hit===selector||selector.contains(hit),topElement:hit?hit.tagName.toLowerCase()+(hit.id?'#'+hit.id:''):null};
     });
     return {language:document.documentElement.lang,dir:document.documentElement.dir,overflow:document.documentElement.scrollWidth-innerWidth,
      frame:parseFloat(css.borderTopWidth),framePosition:css.position,frameHitTest:css.pointerEvents,
      heading:{x:h1.x,right:h1.right,width:h1.width},title:document.title,
      hiddenCopy:labels.filter(n=>n.closest('body')&&getComputedStyle(n).visibility==='hidden').length,
      inertContent:document.querySelectorAll('main[inert],footer[inert]').length,
      selectorValue:selector.value,selectorHits};
    });
    assert.ok(state.overflow<=2,guide+' '+lang+' '+width+' horizontal overflow '+state.overflow);
    assert.equal(state.frame,width>=700?4:3);assert.equal(state.framePosition,'fixed');assert.equal(state.frameHitTest,'none');
    assert.ok(state.heading.x>=4&&state.heading.right<=width-4,'Heading crosses frame');
    assert.equal(state.hiddenCopy,0);assert.equal(state.inertContent,0);
    assert.equal(state.selectorValue,lang);assert.equal(state.dir,lang==='ar'?'rtl':'ltr');
    for(const hit of state.selectorHits)assert.ok(hit.reachable,guide+' '+lang+' '+width+' language selector '+hit.name+' is covered at '+hit.x+','+hit.y+' by '+hit.topElement);
    assert.equal(errors.length,0,errors.join('\n'));
    cases.push({guide,width,...state});
    console.log('PASS',width,lang,guide);
    if((width===320&&lang==='pt-BR')||(width===820&&lang==='ar')||(width===1366&&lang==='en')){
     await page.screenshot({path:path.join(out,guide+'-'+width+'-'+lang+'.png'),animations:'disabled'});
     if(guide==='streaming-device-discovery'){
      const table=page.locator('table').first();
      if(await table.count()){await table.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,guide+'-table-'+width+'-'+lang+'.png'),animations:'disabled'});}
     }
    }
   }
   await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:850}});
  await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
  const page=await context.newPage();
  await page.goto(base+'/guides/'+guides[0]+'/',{waitUntil:'domcontentloaded'});
  await page.locator('#seo-guide-language').selectOption('pt-BR');
  await page.waitForFunction(()=>document.documentElement.lang==='pt-BR'&&document.documentElement.dataset.seoLocaleState==='ready');
  await page.locator('a[href="/guides/streaming-device-discovery/"]').click();
  await page.waitForFunction(()=>document.documentElement.lang==='pt-BR'&&document.documentElement.dataset.seoLocaleState==='ready');
  assert.equal(await page.locator('#seo-guide-language').inputValue(),'pt-BR');
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.documentElement.lang==='pt-BR'&&document.documentElement.dataset.seoLocaleState==='ready');
  await context.close();
  const report={at:new Date().toISOString(),passed:cases.length,navigationLanguagePreserved:true,cases};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log('PASS_SEO_GUIDE_LANGUAGES',cases.length,'plus saved language navigation/reload');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error.stack||error);server.close();process.exitCode=1;});
