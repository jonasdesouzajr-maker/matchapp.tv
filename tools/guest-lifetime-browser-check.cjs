'use strict';
// Exercise real IndexedDB transactions in isolated same-origin browser tabs.
// Only the reviewed static scripts are fetched. No account, provider, quota,
// reward or payment endpoint is reachable from these fixture pages.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');

async function runGuestLifetimeChecks(browser,{base,dest}){
 const results=[],origin=new URL(base).origin;
 const assets=new Set(['/guest-reservations.js','/matching-policy.js','/ebooks/ebook-matcher.js']);
 async function fixture(viewport,{noLocks=false,noDatabase=false}={}){
  const ctx=await browser.newContext({viewport});
  if(noLocks||noDatabase)await ctx.addInitScript(({noLocks,noDatabase})=>{
   if(noLocks)Object.defineProperty(navigator,'locks',{value:undefined});
   if(noDatabase)Object.defineProperty(window,'indexedDB',{get(){throw Error('Fixture: database unavailable');}});
  },{noLocks,noDatabase});
  await ctx.route('**/*',route=>{
   const request=route.request(),url=new URL(request.url());
   if(url.origin!==origin||request.method()!=='GET')return route.abort();
   if(assets.has(url.pathname))return route.continue();
   if(url.pathname==='/__qa_guest_lifetime__')return route.fulfill({contentType:'text/html',body:
    '<!doctype html><meta name="viewport" content="width=device-width"><script src="/guest-reservations.js?v=20261019-1"></script>'+
    '<script src="/matching-policy.js?lifetime=20261019-1"></script>'+
    '<script data-reading-state-only="1" src="/ebooks/ebook-matcher.js?lifetime=20261019-1&art=20261020-source1&locale=20261020-books14-1"></script>'+
    '<body>Isolated guest history verification</body>'});
   return route.abort();
  });
  const pages=await Promise.all([ctx.newPage(),ctx.newPage()]);
  const restore=async page=>{
   await page.goto(origin+'/__qa_guest_lifetime__',{waitUntil:'load',timeout:30000});
   await page.evaluate(async()=>{await window.matchPolicy.attach(null);await window.MatchAppEbooks.ready();});
  };
  await Promise.all(pages.map(restore));
  return {ctx,pages,restore};
 }
 for(const [index,viewport] of [{width:320,height:710},{width:390,height:844},{width:820,height:1180},{width:1366,height:900}].entries()){
  let ctx;
  try{
   const scenario=await fixture(viewport,{noLocks:index%2===1});ctx=scenario.ctx;
   const {pages,restore}=scenario;
   for(let round=0;round<40;round++){
    const works=[{title:'Fixture original '+round,originalTitle:'Fixture original '+round,tmdbId:940000+round,kind:'movie'},
     {title:'Fixture localized '+round,tmdbId:940000+round,kind:'movie'}];
    const claims=await Promise.all(pages.map((page,i)=>page.evaluate(item=>window.matchPolicy.claim(item),works[i])));
    assert.equal(claims.filter(Boolean).length,1,'exactly one tab may reserve a translated work');
    const winner=claims[0]?0:1;
    await pages[winner].evaluate(item=>window.matchPolicy.remember(item,'shown'),works[winner]);
    for(const page of pages)assert.equal(await page.evaluate(item=>window.matchPolicy.claim(item),works[1]),false,'a shown work never becomes fresh');
    if(round===0){
     assert.equal(await pages[winner].evaluate(title=>window.matchPolicy.forget(title),works[winner].title),true);
     await Promise.all(pages.map(restore));
     for(const page of pages){
      assert.equal(await page.evaluate(item=>window.matchPolicy.claim(item),works[0]),false,'history removal and reload cannot repeat');
      assert.equal(await page.evaluate(()=>window.matchPolicy.history().length),0,'removed visible history stays hidden');
     }
    }
   }
   const unused={title:'Fixture unused work',tmdbId:949999,kind:'movie'};
   assert.equal(await pages[0].evaluate(item=>window.matchPolicy.claim(item),unused),true);
   assert.equal(await pages[0].evaluate(item=>window.matchPolicy.releaseClaim(item),unused),true);
   assert.equal(await pages[1].evaluate(item=>window.matchPolicy.claim(item),unused),true,'another tab can use a genuinely released work');
   assert.equal(await pages[1].evaluate(item=>window.matchPolicy.releaseClaim(item),unused),true);
   for(let round=0;round<20;round++){
    const id='fixture-reading-'+round;
    const claims=await Promise.all(pages.map(page=>page.evaluate(async id=>{
     window.__guestReadingClaim=await window.MatchAppEbooks.claimSuggestion(id);return !!window.__guestReadingClaim;
    },id)));
    assert.equal(claims.filter(Boolean).length,1,'exactly one reading tab may claim a work');
    const winner=claims[0]?0:1;
    assert.equal(await pages[winner].evaluate(()=>window.MatchAppEbooks.finishSuggestion(window.__guestReadingClaim)),true);
   }
   await Promise.all(pages.map(restore));
   for(const page of pages)assert.equal(await page.evaluate(()=>window.MatchAppEbooks.claimSuggestion('fixture-reading-0')),null,'reading identity survives reload');
   const unusedReading=await pages[0].evaluate(()=>window.MatchAppEbooks.claimSuggestion('fixture-unused-reading'));
   assert(unusedReading,'a fresh reading work can still be reserved');
   await pages[0].evaluate(claim=>window.MatchAppEbooks.releaseSuggestion(claim),unusedReading);
   const reusedReading=await pages[1].evaluate(()=>window.MatchAppEbooks.claimSuggestion('fixture-unused-reading'));
   assert(reusedReading,'an unused active reading receipt can be released and used by another tab');
   await pages[1].evaluate(claim=>window.MatchAppEbooks.releaseSuggestion(claim),reusedReading);
   const uncertainReading=await pages[0].evaluate(()=>window.MatchAppEbooks.claimSuggestion('fixture-uncertain-reading'));
   assert(uncertainReading);
   await restore(pages[0]);
   await pages[0].evaluate(claim=>window.MatchAppEbooks.releaseSuggestion(claim),uncertainReading);
   assert.equal(await pages[1].evaluate(()=>window.MatchAppEbooks.claimSuggestion('fixture-uncertain-reading')),null,'a reloaded tab cannot prove an old reservation was never displayed');
   results.push({label:'guest lifetime '+viewport.width+'px',ok:true,detail:'40 audiovisual and 20 reading cross-tab races; reload, hidden history and unused release; Web Locks '+(index%2?'disabled':'available')});
  }catch(error){results.push({label:'guest lifetime '+viewport.width+'px',ok:false,detail:String(error.stack||error).slice(0,900)});}
  finally{await ctx?.close();}
 }
 let ctx;
 try{
  const scenario=await fixture({width:390,height:844},{noDatabase:true});ctx=scenario.ctx;
  for(const page of scenario.pages){
   assert.equal(await page.evaluate(()=>window.matchPolicy.claim({title:'Unavailable database',kind:'movie',tmdbId:950001})),false);
   assert.equal(await page.evaluate(async()=>{try{return await window.MatchAppEbooks.claimSuggestion('unavailable-reading');}catch(_){return null;}}),null);
  }
  results.push({label:'guest unavailable database',ok:true,detail:'Both matchers deny reservation before debit or reveal'});
 }catch(error){results.push({label:'guest unavailable database',ok:false,detail:String(error.stack||error).slice(0,900)});}
 finally{await ctx?.close();}
 fs.mkdirSync(dest,{recursive:true});
 fs.writeFileSync(path.join(dest,'guest-lifetime-report.json'),JSON.stringify({base,backendBlocked:true,physicalDevice:false,results},null,2)+'\n');
 return results;
}
module.exports={runGuestLifetimeChecks};
