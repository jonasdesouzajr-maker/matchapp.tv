'use strict';
// Render the real adult pages, keeping navigation and native disclosure handlers.
// No backend, speech, billing or authentication success is simulated here.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/signature-ui');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{try{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return}if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).on('error',()=>res.end()).pipe(res)}catch{res.writeHead(404).end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.env.MATCHAPP_BROWSER_CHANNEL?{channel:process.env.MATCHAPP_BROWSER_CHANNEL}:{})});const checks=[];
try{
 for(const width of [320,390,820,1440]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  const page=await context.newPage();
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1800);
  const essential=page.locator('.ma-cookie .no');if(await essential.isVisible())await essential.click();
  await page.locator('#ma-worlds-trigger').click();
  const audit=async()=>page.evaluate(()=>{
   const grid=document.querySelector('.ma-worlds-grid'),cards=[...grid.querySelectorAll('.ma-world-card')];
   const r=grid.getBoundingClientRect();
   return {display:getComputedStyle(grid).display,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,overflow:document.documentElement.scrollWidth-innerWidth,
    cards:cards.map(e=>{const b=e.getBoundingClientRect(),i=e.querySelector('.ma-world-icon');return {width:b.width,x:b.x,y:b.y,inside:b.left>=r.left-1&&b.right<=r.right+1,icon:getComputedStyle(i).backgroundImage,
     labelFits:[...e.querySelectorAll('strong,small')].every(n=>{const t=n.getBoundingClientRect();return t.left>=b.left&&t.right<=b.right+.5&&t.bottom<=b.bottom+.5})}})};
  });
  let state=await audit();assert.equal(state.display,'grid');assert.equal(state.cards.length,9);
  assert.equal(state.columns,width<=355?1:width<=660?2:3);assert(state.overflow<=2);
  assert(state.cards.every(c=>c.inside&&c.labelFits&&c.icon.includes('/assets/brand/symbols/')),JSON.stringify(state));
  assert.equal(new Set(state.cards.map(c=>c.icon)).size,9,'each destination has a distinct custom icon');
  await page.locator('#ma-explore-worlds-panel').screenshot({path:path.join(out,'home-worlds-'+width+'.png'),animations:'disabled'});
  await page.screenshot({path:path.join(out,'home-'+width+'.png'),animations:'disabled'});
  if(width===390||width===1440){
   const select=page.locator('#lang-switcher-host select').first();
   for(const lang of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
    const available=await select.locator('option').evaluateAll((options,lang)=>options.some(o=>o.value===lang),lang);
    if(!available)throw Error('Language not available: '+lang);
    await select.selectOption(lang);await page.waitForTimeout(130);state=await audit();
    assert(state.overflow<=2&&state.cards.every(c=>c.inside&&c.labelFits),lang+' '+width+' '+JSON.stringify(state));
   }
   await select.selectOption('en');
   await page.locator('.ma-menu-button').click();
   const menu=await page.locator('.ma-menu > [data-ma-menu-symbol]').evaluateAll(es=>es.map(e=>({icon:getComputedStyle(e,'::before').backgroundImage,legacy:getComputedStyle(e.querySelector('.ma-menu-legacy-symbol')).display,captions:e.querySelectorAll('.ma-menu-caption').length})));
   assert.equal(menu.length,11);assert(menu.every(e=>e.icon.includes('/symbols/')&&e.legacy==='none'&&e.captions===1));
   await page.locator('.ma-menu-button').click();
   const sound=page.locator('.sound-toggle-btn').first();
   const before=await sound.getAttribute('aria-pressed');await sound.click();assert.notEqual(await sound.getAttribute('aria-pressed'),before);await sound.click();assert.equal(await sound.getAttribute('aria-pressed'),before);

  }
  await page.locator('[data-worlds-dismiss="close"]').click();assert.equal(await page.locator('#ma-worlds-trigger').getAttribute('aria-expanded'),'false');
  await page.locator('#ma-worlds-trigger').click();await page.locator('.ma-world-card[href="/together.html"]').click();await page.waitForURL('**/together.html');
  assert.equal(new URL(page.url()).pathname,'/together.html');
  for(const route of ['/explore.html','/music.html','/ebooks/','/friends.html','/profile/profile.html']){
   await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(350);
   const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth-innerWidth,frame:getComputedStyle(document.documentElement,'::after').borderTopWidth}));
   assert(layout.overflow<=2,route+' overflow '+width);assert.equal(layout.frame,width>=700?'4px':'3px');
   if(route==='/explore.html'){
    const cards=await page.locator('.explore-grid > a.explore-card').evaluateAll(es=>es.map(e=>getComputedStyle(e,'::before').backgroundImage));
    assert.equal(cards.length,9);assert(cards.every(c=>c.includes('/assets/brand/symbols/')));assert.equal(new Set(cards).size,9);
    await page.screenshot({path:path.join(out,'explore-'+width+'.png'),animations:'disabled'});
   }
  }
  checks.push({width,pass:true,languages:width===390||width===1440?14:1,topics:9});console.log('PASS_SIGNATURE_UI',width);
  await context.close();
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(checks,null,2));console.log('SIGNATURE_UI_ALL_PASS');
}finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
