/* Real adult category requests, twice each. No fixtures, quota resets or provider overrides.
 * This tests the public guest UI; account purchases and physical devices need separate QA. */
'use strict';
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const {fetchDeploymentMarker}=require('./deployment-marker.cjs');
const base=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const out=path.resolve('artifacts/category-matching');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const report={base,sha:(await fetchDeploymentMarker(base)).trim(),started:new Date().toISOString(),results:[]};
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  const seed=await browser.newPage();await seed.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
  const categories=await seed.locator('#q-category option').evaluateAll(options=>options.map(o=>o.value));await seed.close();
  for(let pass=1;pass<=2;pass++){
   let next=0;
   async function worker(){while(next<categories.length){
    const category=categories[next++],row={pass,category,ok:false};
    const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'en-US'});
    const page=await context.newPage();
    try{
     await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
     await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:1200}).catch(()=>{});
     await page.waitForFunction(()=>typeof window.setMatchCriteria==='function',null,{timeout:25000});
     await page.evaluate(cat=>window.setMatchCriteria({cat:[cat],plat:[],genre:[],mood:[],vibe:[],rating:[],decade:[]}),category);
     const head=page.locator('.lazy-head[data-fold-key="concierge"]');if(await head.getAttribute('aria-expanded')!=='true')await head.click();
     const started=Date.now();await page.locator('button[onclick="triggerMatch(false)"]').click();
     await page.waitForFunction(()=>{
      const b=document.getElementById('result-box');return b&&getComputedStyle(b).display!=='none'&&window.currentMatchIdentity?.title;
     },null,{timeout:115000});
     row.elapsedMs=Date.now()-started;
     await page.waitForFunction(()=>{const i=document.getElementById('res-poster-img');return i&&i.complete&&i.naturalWidth>0&&/^https:\/\//.test(i.currentSrc||i.src)&&!/fallback|placeholder|brand/i.test(i.currentSrc||i.src)},null,{timeout:22000}).catch(()=>{});
     Object.assign(row,await page.evaluate(()=>{
      const i=document.getElementById('res-poster-img');return {identity:window.currentMatchIdentity,title:document.getElementById('res-title')?.textContent,
       artwork:{url:i?.currentSrc||i?.src,loaded:!!i?.naturalWidth,width:i?.naturalWidth,height:i?.naturalHeight,fit:i?getComputedStyle(i).objectFit:''}};
     }));
     row.categoryMatches=category==='any'||row.identity.cats.includes(category);
     row.originalArtwork=!!row.artwork.loaded&&/^https:\/\//.test(row.artwork.url||'')&&!/fallback|placeholder|fake-poster|dummy/i.test(row.artwork.url);
     row.ok=!!row.title&&row.categoryMatches&&row.originalArtwork&&row.artwork.fit!=='fill';
     if(!row.ok)await page.screenshot({path:path.join(out,pass+'-'+categories.indexOf(category)+'-failure.png'),animations:'disabled'});
    }catch(error){row.error=String(error.stack||error).slice(0,1500);await page.screenshot({path:path.join(out,pass+'-'+categories.indexOf(category)+'-failure.png'),timeout:10000}).catch(()=>{});}
    finally{report.results.push(row);console.log((row.ok?'PASS':'FAIL')+' '+pass+' '+category+' '+JSON.stringify({title:row.title,elapsedMs:row.elapsedMs,categoryMatches:row.categoryMatches,originalArtwork:row.originalArtwork,error:row.error}));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await context.close();}
   }}
   await Promise.all([worker(),worker()]);
  }
 }finally{report.finished=new Date().toISOString();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));await browser.close();}
 process.exitCode=report.results.some(r=>!r.ok)?1:0;
})().catch(error=>{console.error(error);process.exitCode=1});
