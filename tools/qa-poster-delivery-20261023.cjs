/* Rendered production-DOM artwork fixtures with controlled CDN delays.
 * These checks exercise real browser image events, not live matching or AI. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {matchingFixtureHtml}=require('./qa-matching-fixture-html.cjs');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.MATCHAPP_ARTIFACTS||'/tmp/matchapp-poster-delivery');
const posterFile=process.env.MATCHAPP_POSTER_FIXTURE;
if(!posterFile)throw Error('Set MATCHAPP_POSTER_FIXTURE to the independently downloaded original Nimona poster.');
const poster=fs.readFileSync(posterFile),source='https://image.tmdb.org/t/p/w780/2NQljeavtfl22207D1kxLpa4LS3.jpg';
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{
 const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
const report={kind:'production DOM/CSS and image recovery; controlled CDN; no matching or AI claims',checks:[],scenarios:[]};
const check=(name,ok,detail)=>{report.checks.push({name,ok,detail});assert(ok,name+': '+JSON.stringify(detail));};
(async()=>{
 fs.mkdirSync(out,{recursive:true});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const stale of [false,true]){
   const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce',serviceWorkers:'block'});
   const requests=[];
   const scenario={stale,requests};report.scenarios.push(scenario);
   await context.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith(base))return route.continue();
    if(url.includes('/2NQljeavtfl22207D1kxLpa4LS3.jpg')){
     requests.push({url,at:Date.now()});
     if(url.includes('/w500/')){
      await new Promise(resolve=>setTimeout(resolve,9500));
      return route.fulfill({status:200,contentType:'image/jpeg',body:poster}).catch(()=>{});
     }
    }
    return route.abort('connectionfailed');
   });
   const page=await context.newPage();
   await page.setContent(matchingFixtureHtml(fs.readFileSync(path.join(root,'index.html'),'utf8'),base));
   await page.addScriptTag({content:fs.readFileSync(path.join(root,'catalog-media.js'),'utf8')});
   await page.evaluate(source=>{
    const box=document.getElementById('result-box'),img=document.getElementById('res-poster-img');
    const main=document.createElement('main');main.className='page-wrapper';main.append(box);document.body.replaceChildren(main);
    box.classList.add('ma-one-match');
    box.hidden=false;box.style.display='block';document.getElementById('res-title').textContent='Nimona';
    window.globalMatchTitle='Nimona';window.__matchappMatchRunId=100;
    window.currentMatchIdentity={title:'Nimona',tmdbId:961323,kind:'movie',year:2023,imdbId:'tt19500164',artwork:source};
    img.src=source;window.MatchAppCatalogMedia.recoverAdultPoster(img,'Nimona',null,source);
    box.scrollIntoView({block:'start'});
   },source);
   if(stale)await page.evaluate(()=>{
    window.__matchappMatchRunId++;window.globalMatchTitle='New result';
    document.getElementById('res-poster-img').src='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="500" height="750"><rect width="500" height="750" fill="purple"/></svg>');
   });
   if(stale){
    await page.waitForTimeout(11000);
    check('late original cannot overwrite a newer match generation',await page.locator('#res-poster-img').evaluate(img=>img.src.startsWith('data:')));
   }else{
    await page.waitForFunction(()=>{const img=document.getElementById('res-poster-img');return img.complete&&img.naturalWidth===500&&img.src.includes('/w500/2NQljeavtfl22207D1kxLpa4LS3.jpg');},null,{timeout:22000}).catch(async error=>{
     scenario.failure=await page.locator('#res-poster-img').evaluate(img=>({src:img.src,complete:img.complete,width:img.naturalWidth,state:{...img.__matchappAdultPoster,failed:[...(img.__matchappAdultPoster?.failed||[])]},rect:img.getBoundingClientRect().toJSON()}));throw error;
    });
    check('original recovers after the 6.5-second deadline',true);
    for(const width of [320,360,390,412,600,768,1024,1280,1440,1920]){
     await page.setViewportSize({width,height:900});
     const geometry=await page.locator('#res-poster-img').evaluate(img=>{
      const r=img.getBoundingClientRect(),style=getComputedStyle(img);
      return {width:innerWidth,scrollWidth:document.documentElement.scrollWidth,left:r.left,right:r.right,height:r.height,posterWidth:r.width,fit:style.objectFit,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight};
     });
     check('result poster bounds '+width,geometry.scrollWidth<=width+1&&geometry.left>=-1&&geometry.right<=width+1&&geometry.fit!=='fill'&&geometry.naturalHeight>geometry.naturalWidth,geometry);
     if([320,768,1440].includes(width))await page.screenshot({path:path.join(out,'nimona-'+width+'.png')});
    }
   }
   await context.close();
  }
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
 console.log(JSON.stringify({pass:report.checks.filter(c=>c.ok).length,fail:report.checks.filter(c=>!c.ok).length,out}));
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
