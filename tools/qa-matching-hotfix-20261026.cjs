'use strict';
// Genuine live-site Android-style WebView regression using locally patched app.js.
// All requests except app.js use production assets and APIs. No credentials are read.
const {chromium}=require('playwright');
const path=require('node:path');
const fs=require('node:fs');
const base=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const patched=path.resolve(__dirname,'..','app.js');
const out=path.resolve(__dirname,'..','artifacts','matching-pipeline-20261026');
const scenarios=[
 {name:'mood-movie-provider',criteria:{cat:['movie'],plat:['Mercado Play'],mood:['light and feel-good'],genre:[],vibe:[],rating:[],decade:[]}},
 {name:'mood-movie-any',criteria:{cat:['movie'],plat:[],mood:['funny'],genre:[],vibe:[],rating:[],decade:[]}},
 {name:'thrilling-any',criteria:{cat:[],plat:[],mood:['intense and thrilling'],genre:[],vibe:[],rating:[],decade:[]}}
];
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const results=[];
 try{
  await Promise.all(scenarios.map(async scenario=>{
   const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,
    userAgent:'Mozilla/5.0 (Linux; Android 17; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 MatchAppAiAndroid/1.1.60',locale:'en-US'});
   const page=await context.newPage();
   const row={name:scenario.name,errors:[],toasts:[],responses:[],criteria:scenario.criteria};
   page.on('pageerror',e=>row.errors.push('PAGE '+String(e.stack||e.message).slice(0,260)));
   page.on('console',m=>{if(m.type()==='error')row.errors.push('CONSOLE '+m.text().slice(0,280))});
   page.on('response',response=>{if(/functions\/v1\/|\/rest\/v1\//.test(response.url())&&response.status()>=400)row.responses.push({url:new URL(response.url()).pathname,status:response.status()})});
   try{
    await page.route('**/app.js?*',route=>route.fulfill({path:patched,contentType:'text/javascript'}));
    await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
    await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:1800}).catch(()=>{});
    await page.waitForFunction(()=>typeof window.setMatchCriteria==='function'&&typeof window.triggerMatch==='function',null,{timeout:30000});
    await page.evaluate(c=>{
      window.__qaToasts=[];const original=window.showToast;window.showToast=function(text,...rest){window.__qaToasts.push(String(text));return original?.call(this,text,...rest)};
      window.setMatchCriteria(c);
    },scenario.criteria);
    row.actualCriteria=await page.evaluate(()=>window.getMatchCriteria());
    row.diagnostics=await page.evaluate(()=>{
      const c=window.getMatchCriteria(), entries=typeof CONTENT_CATALOG!=='undefined'?CONTENT_CATALOG:[],policy=window.matchPolicy;
      const summary=e=>e?{title:e.title,platform:e.platform,cats:e.cats,moods:e.moods,source:e.source,relaxed:e._relaxedStage}:null;
      const safe=fn=>{try{return fn();}catch(e){return 'ERROR '+e.message;}};
      return {
        catalogSize:entries.length, knownCount:safe(()=>policy.known().size), topicFocus:!!window.MatchAppTopicFocus,
        criteriaMatchCount:safe(()=>entries.filter(e=>policy.matches(e,c)).length),
        eligibleCount:safe(()=>entries.filter(e=>policy.matches(e,c)&&window.MatchAppTopicFocus.allow(e,c.cat)).length),
        currentGenres:window.__matchappGenreFilterActive,
        exclusions:safe(()=>({countries:window.MatchSettings?.get?.('blockedOriginCountries'),genres:window.MatchSettings?.get?.('blockedGenres')})),
        selected:safe(()=>summary(window.pickFromCatalog(c.cat,c.plat,c.mood,c.vibe,c.rating,c.decade))),
        recovered:safe(()=>summary(window.pickGuaranteedCatalog(c.cat,c.plat,c.mood,c.vibe,c.rating,c.decade,true)))
      };
    });
    if(process.env.DIAG_ONLY==='1'){row.passed=true;return;}
    const button=page.locator('button[onclick="triggerMatch(false)"]').first();
    await button.scrollIntoViewIfNeeded({timeout:10000});
    await button.click({timeout:12000});
    const started=Date.now();
    try{
      await page.waitForFunction(()=>{
       const el=document.getElementById('result-box');
       return !!el&&!el.hidden&&el.style.display!=='none'&&!!window.globalMatchTitle;
      },null,{timeout:85000});
    }catch(_){}
    row.elapsedMs=Date.now()-started;
    Object.assign(row,await page.evaluate(()=>({
      title:document.getElementById('res-title')?.textContent||'',
      globalTitle:window.globalMatchTitle||'',platform:window.globalPlatform||'',
      revealed:!!document.getElementById('result-box')&&!document.getElementById('result-box').hidden&&document.getElementById('result-box').style.display!=='none',
      phase:window.__matchappMatchPhase||'',
      relaxation:window.lastMatchRelaxation||'',toasts:window.__qaToasts||[],
      formVisible:getComputedStyle(document.getElementById('questionnaire-box')).display!=='none',
      posterSource:document.getElementById('res-poster-img')?.currentSrc||''
    })));
    row.passed=!!row.revealed&&!!row.globalTitle&&!!row.platform&&!row.formVisible&&
      (scenario.criteria.plat.length===0||row.platform!=='Mercado Play'||row.relaxation==='exact');
    await page.screenshot({path:path.join(out,scenario.name+(row.passed?'-pass':'-fail')+'.png'),fullPage:false,animations:'disabled',timeout:7000}).catch(()=>{});
   }catch(error){row.failure=String(error.stack||error).slice(0,1000);}
   finally{results.push(row);console.log(JSON.stringify(row));await context.close();}
  }));
 }finally{await browser.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({results},null,2));}
 process.exitCode=results.some(r=>!r.passed)?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});