/* Candidate UI checks. External services are blocked: this is not backend E2E. */
const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),http=require('http'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),dest=path.join(root,'reports/adult-ui-20261014');fs.mkdirSync(dest,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{let pathname=new URL(req.url,'http://x').pathname;let f=path.resolve(root,'.'+pathname);if(!f.startsWith(root+path.sep)&&f!==root)return res.writeHead(403).end();if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)&&fs.existsSync(f.replace(/\/$/,'')+'.html'))f=f.replace(/\/$/,'')+'.html';fs.readFile(f,(e,d)=>{res.writeHead(e?404:200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream','Cache-Control':'no-store'});res.end(e?'missing':d)})});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,b=await chromium.launch({headless:true});const report=[];try{
 for(const [width,height] of [[320,900],[390,900],[800,1180],[820,1180],[1366,900],[1180,820]]){
  const p=await b.newPage({viewport:{width,height}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
  for(const [name,route] of [['home','/'],['explore','/explore.html'],['ask','/discover/'],['together','/together.html'],['pricing','/pricing/pricing'],['books','/ebooks/']]){
   await p.goto(origin+route,{waitUntil:'domcontentloaded'});await p.waitForTimeout(1400);
   await p.getByRole('button',{name:/Essential only/i}).first().click({timeout:500}).catch(()=>{});
   const metrics=await p.evaluate(()=>{const h=document.querySelector('#mh-topbox,header.app-header,.ebook-page-top');const rect=e=>{const r=e.getBoundingClientRect();return{left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};const line=h?.querySelector('.ma-brand-title-line'),word=line?.querySelector('.ma-wordmark'),ai=line?.querySelector('.ma-word-ai');const bubble=document.querySelector('#ma-jonas-home-bubble');return{viewport:[innerWidth,innerHeight],overflow:document.documentElement.scrollWidth-innerWidth,header:h&&rect(h),word:word&&rect(word),ai:ai&&rect(ai),brandGap:word&&ai?ai.getBoundingClientRect().left-word.getBoundingClientRect().right:null,bubble:bubble&&rect(bubble),bubbleCount:document.querySelectorAll('#ma-jonas-home').length,body:document.body.className,visibleDiscovery:[...document.querySelectorAll('#ebook-matcher-root,#cooking-home,#weekly-pick-disclosure,#premiere-disclosure,#global-events,#latest-news')].filter(e=>e.getBoundingClientRect().height>0).map(e=>e.id)}});
   assert(metrics.overflow<=3,`${name} ${width} overflow ${metrics.overflow}`);assert.equal(errors.length,0,errors.join('\n'));
   if(metrics.ai){assert(metrics.brandGap>=7,`${name}: Ai crowds wordmark`);assert(metrics.ai.right<=metrics.header.right-4,`${name}: brand outside topbox`)}
   assert.equal(metrics.bubbleCount,1,`${name}: missing/duplicate bubble`);
   if(name==='home'){assert(metrics.bubble.top>=0&&metrics.bubble.bottom<=height,`Home bubble outside viewport`);assert.deepEqual(metrics.visibleDiscovery,[]);assert.match(await p.locator('.mh-explore-more').textContent(),/Explore more from your Ai/);}
   await p.screenshot({path:path.join(dest,`${name}-${width}x${height}.png`)});
   if(name==='home'||name==='explore'){
    await p.locator('#ma-jonas-home-bubble').click();await p.waitForTimeout(200);assert.equal(await p.locator('#ma-jonas-home-panel').isVisible(),true);
    await p.screenshot({path:path.join(dest,`${name}-open-${width}x${height}.png`)});
    await p.locator('#ma-jonas-home-close').click();assert.equal(await p.locator('#ma-jonas-home-panel').isVisible(),false);
    await p.locator('#ma-jonas-home-bubble').click();assert.equal(await p.locator('#ma-jonas-home-panel').isVisible(),true);await p.goBack();await p.waitForTimeout(100);assert.equal(await p.locator('#ma-jonas-home-panel').isVisible(),false);
   }
   report.push({name,width,height,...metrics,errors:errors.splice(0)});console.log('PASS',name,width,height);
  }
  await p.close();
 }
 const p=await b.newPage();await p.route('**/*',r=>r.request().url().startsWith(origin)?r.continue():r.abort());
 for(const route of ['/explore','/explore.html','/explore/','/discover','/discover.html','/discover/']){const response=await p.goto(origin+route,{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);}
 await p.goto(origin+'/');await p.locator('.mh-explore-more').click();assert.match(p.url(),/\/explore\.html$/);await p.goBack();assert.equal(new URL(p.url()).pathname,'/');
 await p.goto(origin+'/#cooking-home');await p.waitForURL('**/cooking/');await p.goto(origin+'/#global-events');await p.waitForURL('**/events-archive.html');
 await p.close();fs.writeFileSync(path.join(dest,'browser-report.json'),JSON.stringify({coverage:'Chromium headless, local aliases, external requests blocked; no backend or Safari claim',checks:report},null,2));
}finally{await b.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
