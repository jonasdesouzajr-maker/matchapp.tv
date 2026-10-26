'use strict';
// Invoked by the existing candidate/production smoke owner. No fixture data,
// app-code interception, user sessions, account writes or provider quota use.
async function auditNewsDiscovery({browser,base,record,shot}){
 for(const screen of [{name:'phone',width:390,height:844},{name:'tablet',width:820,height:1180},{name:'desktop',width:1440,height:900}]){
  const context=await browser.newContext({viewport:{width:screen.width,height:screen.height},locale:'en-US'});
  const page=await context.newPage();
  try{
   for(const [name,route,event] of [
    ['storm','/news/articles/overnight-winds-hit-85mph-as-scotland-is-hit-by-storm-beolo-e1e478/','World'],
    ['music','/news/articles/sam-fender-calls-out-ticket-prices-ahead-of-tour-c869fd/','Music'],
    ['roma','/where-to-watch/roma/'],['october','/guides/streaming-music-books-october-2026/']
   ]){
    await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:30000});
    // The preserved October guide places its semantic H1 in its hero header,
    // before main. Require a visible page heading without assuming its parent.
    await page.getByRole('heading',{level:1}).first().waitFor({state:'visible',timeout:10000});
    const state=await page.evaluate(()=>({heading:document.querySelector('h1')?.textContent,
     overflow:document.documentElement.scrollWidth>innerWidth+2,
     event:document.querySelector('[data-news-ui-event]')?.getAttribute('data-news-ui-event'),
     robots:document.querySelector('meta[name="robots"]')?.content||'',
     adUnits:document.querySelectorAll('ins.adsbygoogle,script[src*="pagead2.googlesyndication.com"]').length,
     canonical:document.querySelector('link[rel="canonical"]')?.href,
     source:document.querySelector('a[rel~="external"]')?.href,
     mainText:document.querySelector('main')?.textContent?.trim().length||0}));
    const valid=!!state.heading&&!state.overflow&&state.canonical==='https://matchapp.tv'+route&&
     (event?state.event===event&&state.robots.includes('noindex,follow')&&state.adUnits===0&&!!state.source:!state.robots.includes('noindex')&&state.mainText>500);
    record('LIVE news discovery '+name+' '+screen.name,valid,JSON.stringify(state));
    await shot(page,'news-discovery-'+screen.name+'-'+name);
   }
   for(const [language,hubTitle] of [['en','Latest Entertainment, World and Sports News'],['pt-BR','Últimas notícias de entretenimento, mundo e esportes']]){
    // This fresh test context is already on the site. Store one explicit
    // choice before navigation instead of accumulating competing init scripts.
    await page.evaluate(lang=>localStorage.setItem('match_lang',lang),language);
    await page.goto(base+'/news/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(expected=>document.querySelector('main h1')?.textContent===expected,hubTitle,{timeout:10000});
    const directGuideVisible=await page.locator('main a[href="/guides/streaming-music-books-october-2026/"]').isVisible();
    // The approved runtime folds the how-to section. Open its real disclosure
    // first, then the editorial comparison nested inside it.
    const guideFold=page.locator('details.ma-density-news-guide');
    await guideFold.waitFor({state:'visible',timeout:10000});
    if(!await guideFold.evaluate(el=>el.open))await guideFold.locator(':scope > summary').click();
    await page.locator('[data-news-editorial] summary').click();
    await page.locator('[data-news-ui="albumComparison"]').waitFor({state:'visible'});
    const state=await page.evaluate(()=>({language:document.documentElement.lang,
     overflow:document.documentElement.scrollWidth>innerWidth+2,
     guidance:document.querySelector('[data-news-ui="guideChoice"]')?.textContent||'',
     viewingGuide:!!document.querySelector('main a[href="/where-to-watch/roma/"]'),
     currentGuide:!!document.querySelector('main a[href="/guides/streaming-music-books-october-2026/"]'),
     albumComparison:document.querySelector('[data-news-ui="albumComparison"]')?.textContent||'',
     filmComparison:document.querySelector('[data-news-ui="filmComparison"]')?.textContent||'',
     repeatedNotes:document.querySelectorAll('[data-native-news-feed] [data-news-ui="sourceNote"]').length}));
    record('LIVE useful news hub '+language+' '+screen.name,directGuideVisible&&state.language===language&&!state.overflow&&state.guidance.length>80&&state.albumComparison.length>100&&state.filmComparison.length>100&&state.viewingGuide&&state.currentGuide&&state.repeatedNotes===0,JSON.stringify({...state,directGuideVisible}));
    await shot(page,'news-discovery-'+screen.name+'-hub-'+language);
   }
  }catch(error){record('LIVE news discovery '+screen.name,false,String(error.stack||error).slice(0,500));}
  finally{await context.close();}
 }
}
module.exports={auditNewsDiscovery};
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
 const {captureAuditedScreenshot}=require('./live-qa-screenshot.cjs');
 const dir=path.resolve('artifacts/live-smoke');fs.mkdirSync(dir,{recursive:true});
 let passed=0,failed=0;
 const record=(name,ok,detail)=>{if(ok)passed++;else failed++;console.log((ok?'PASS ':'FAIL ')+name+' '+detail);};
 (async()=>{const browser=await chromium.launch({headless:true});
  try{await auditNewsDiscovery({browser,base:process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv',record,
   shot:async(page,name)=>{await captureAuditedScreenshot(page,path.join(dir,name+'.png'));}});}
  finally{await browser.close();console.log('NEWS DISCOVERY TOTAL '+passed+' passed '+failed+' failed');if(failed)process.exitCode=1;}
 })().catch(error=>{console.error(error);process.exitCode=1;});
}
