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
    await page.locator('main h1').first().waitFor({state:'visible',timeout:10000});
    const state=await page.evaluate(()=>({heading:document.querySelector('main h1')?.textContent,
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
    await page.addInitScript(lang=>localStorage.setItem('match_lang',lang),language);
    await page.goto(base+'/news/',{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(expected=>document.querySelector('main h1')?.textContent===expected,hubTitle,{timeout:10000});
    const state=await page.evaluate(()=>({language:document.documentElement.lang,
     overflow:document.documentElement.scrollWidth>innerWidth+2,
     guidance:document.querySelector('[data-news-ui="guideChoice"]')?.textContent||'',
     viewingGuide:!!document.querySelector('main a[href="/where-to-watch/roma/"]'),
     currentGuide:!!document.querySelector('main a[href="/guides/streaming-music-books-october-2026/"]'),
     repeatedNotes:document.querySelectorAll('[data-native-news-feed] [data-news-ui="sourceNote"]').length}));
    record('LIVE useful news hub '+language+' '+screen.name,state.language===language&&!state.overflow&&state.guidance.length>80&&state.viewingGuide&&state.currentGuide&&state.repeatedNotes===0,JSON.stringify(state));
    await shot(page,'news-discovery-'+screen.name+'-hub-'+language);
   }
  }catch(error){record('LIVE news discovery '+screen.name,false,String(error.stack||error).slice(0,500));}
  finally{await context.close();}
 }
}
module.exports={auditNewsDiscovery};
