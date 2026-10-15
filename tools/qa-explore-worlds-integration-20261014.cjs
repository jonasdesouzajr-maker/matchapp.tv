'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs');
const url='http://127.0.0.1:8899',out=[];
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  for(const width of [320,390,820,1440]){
   const context=await browser.newContext({viewport:{width,height:width===820?1140:width>1000?900:780},serviceWorkers:'block',reducedMotion:'reduce'});
   await context.addInitScript(()=>localStorage.setItem('match_lang','pt-BR'));
   await context.route('**/*',r=>r.request().url().startsWith(url)?r.continue():r.abort());
   const page=await context.newPage();
   await page.goto(url+'/',{waitUntil:'domcontentloaded',timeout:35000});
   await page.locator('#ma-worlds-trigger').waitFor({state:'visible',timeout:20000});
   const trigger=page.locator('#ma-worlds-trigger'),panel=page.locator('#ma-explore-worlds-panel');
   assert.equal(await trigger.getAttribute('aria-expanded'),'false');
   await trigger.click({timeout:12000});
   await panel.waitFor({state:'visible',timeout:8000});
   assert.equal(await trigger.getAttribute('aria-expanded'),'true');
   assert.equal(await panel.locator('a.ma-world-card[href]').count(),9);
   const destination=panel.locator('a.ma-worlds-see-all[href="/explore.html"]');
   assert.ok(await destination.isVisible(),'hub link must be visible');
   await destination.click({timeout:10000});
   await page.waitForURL(/\/explore\.html(?:\?|$)/,{timeout:16000});
   const topics=await page.locator('.explore-grid a.explore-card[href]').count();
   assert.ok(topics>=8,'explore destination missing');
   await page.goBack({waitUntil:'domcontentloaded',timeout:13000});
   const selectedLang=await page.evaluate(()=>localStorage.getItem('match_lang'));
   assert.equal(selectedLang,'pt-BR');
   await page.locator('#ma-worlds-trigger').click();
   await page.keyboard.press('Escape');
   assert.equal(await page.locator('#ma-explore-worlds-panel').evaluate(e=>e.hidden),true);
   out.push({width,click:true,worlds:9,hub:topics,language:selectedLang,escape:true});
   console.log('PASS',JSON.stringify(out.at(-1)));
   await context.close();
  }
  fs.writeFileSync('qa-explore-worlds-integration.json',JSON.stringify({checks:out.length,tests:out},null,2));
  console.log('EXPLORE_WORLD_INTERACTION_PASS '+out.length);
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack||e);process.exitCode=1});
