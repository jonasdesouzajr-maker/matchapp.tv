'use strict';
// Render existing controls; do not simulate matching, auth, payments or media sources.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts',process.env.MATCHAPP_QA_ANDROID?'ui-consistency-android':'ui-consistency');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'};
const server=http.createServer((req,res)=>{try{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(f!==root&&!f.startsWith(root+path.sep))throw Error();if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).on('error',()=>res.end()).pipe(res)}catch{res.writeHead(404).end()}});
const langs=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true}),report=[];
 try{
  for(const width of (process.env.MATCHAPP_QA_WIDTHS?process.env.MATCHAPP_QA_WIDTHS.split(',').map(Number):[320,390,432,820,1440])){
   const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',...(process.env.MATCHAPP_QA_ANDROID?{userAgent:'Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36 MatchAppAiAndroid/53'}:{})});
   await ctx.addInitScript(()=>{localStorage.setItem('match_lang','en');localStorage.setItem('match_cookie_choice','essential')});
   await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
   const page=await ctx.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
   await page.locator('#premiere-disclosure').scrollIntoViewIfNeeded();
   await page.waitForSelector('#weekly-pick-disclosure',{state:'attached'});
   for(const lang of (process.env.MATCHAPP_QA_LANGS?process.env.MATCHAPP_QA_LANGS.split(','):langs)){
    await page.locator('#lang-switcher-host select').selectOption(lang);
    const result=await page.evaluate(()=>{
     const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&s.display!=='none'&&s.visibility!=='hidden'};
     for(const d of document.querySelectorAll('#premiere-disclosure,#weekly-pick-disclosure'))d.open=true;
     const nav=document.querySelector('.ma-luxe-shortcuts'),shortcuts=[...nav.children].filter(visible);
     const heights=shortcuts.map(e=>e.getBoundingClientRect().height);
     const groups=[...document.querySelectorAll('.spotlight-actions,.weekly-pick-actions')].filter(visible).map(g=>{
      const a=g.getBoundingClientRect();return [...g.children].filter(visible).map(e=>{
       const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{text:e.textContent.trim(),scroll:[e.scrollWidth,e.clientWidth,e.scrollHeight,e.clientHeight],height:r.height,width:r.width,inside:r.left>=a.left-1&&r.right<=a.right+1&&r.bottom<=a.bottom+1,fit:e.scrollWidth<=e.clientWidth+1&&e.scrollHeight<=e.clientHeight+1,case:s.textTransform,font:s.fontWeight,transition:s.transitionDuration};
      });
     });
     const gaps=[...document.querySelectorAll('#premiere-disclosure,#weekly-pick-disclosure')].map(d=>d.querySelector('.spotlight-card').getBoundingClientRect().top-d.querySelector('summary').getBoundingClientRect().bottom);
     return{overflow:document.documentElement.scrollWidth-innerWidth,heights,navGap:getComputedStyle(nav).gap,groups,gaps};
    });
    assert(result.overflow<=1,JSON.stringify({width,lang,...result}));
    assert(Math.max(...result.heights)-Math.min(...result.heights)<1,'unequal shortcut heights '+width+' '+lang);
    assert.equal(result.navGap,'8px');assert(result.gaps.every(g=>g>=12));
    if(result.groups.some(g=>g.some(x=>!x.fit))){await page.locator('#spotlight-ahs13').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'failure-'+width+'-'+lang+'.png')});}
    for(const group of result.groups){assert(Math.max(...group.map(x=>x.height))-Math.min(...group.map(x=>x.height))<1);assert(group.every(x=>x.height>=48&&x.inside&&x.fit&&x.case==='none'&&x.font==='600'&&x.transition==='0s'),JSON.stringify({width,lang,group}));}
    report.push({width,lang,...result});
   }
   await page.locator('#lang-switcher-host select').selectOption('en');
   await page.screenshot({path:path.join(out,'home-'+width+'.png')});
   await page.locator('#weekly-pick').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'weekly-'+width+'.png')});
   await page.locator('#premiere-disclosure').evaluate(d=>d.open=false);assert.equal(await page.locator('#spotlight-ahs13').isVisible(),false);
   await page.locator('#premiere-disclosure > summary').click();assert.equal(await page.locator('#spotlight-ahs13').isVisible(),true);
   await ctx.close();console.log('PASS_CONSISTENCY',width);
  }
  // The app's own motion setting is independent of the OS media preference.
  const ctx=await browser.newContext({viewport:{width:390,height:900},reducedMotion:'no-preference'});
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());const p=await ctx.newPage();await p.goto(base,{waitUntil:'domcontentloaded'});
  const motion=await p.evaluate(()=>{const el=document.querySelector('.ma-luxe-shortcut');const normal=getComputedStyle(el).transitionDuration;document.documentElement.classList.add('reduce-motion');return{normal,reduced:getComputedStyle(el).transitionDuration}});
  assert(motion.normal.includes('0.22s'));assert.equal(motion.reduced,'0s');await ctx.close();
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({checks:report.length,motion,report},null,2));console.log('PASS_ALL_CONSISTENCY',report.length);
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
