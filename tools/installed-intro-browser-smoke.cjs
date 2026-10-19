'use strict';
// Real Chromium playback in simulated installed windows; not physical-device QA.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {installIntroPlaybackEvidence}=require('./intro-playback-evidence.cjs');
const base=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const dir=path.resolve('artifacts/installed-intro-smoke');fs.mkdirSync(dir,{recursive:true});
const screens=[['phone',390,844],['tablet',820,1180],['landscape',1180,820],['wide-screen',1920,1080]];
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [name,width,height] of screens){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36'});
   try{
    await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
    const page=await context.newPage(),media=[];
    page.on('response',response=>{if(response.url().includes('matchapp-launch-intro'))media.push({status:response.status(),url:response.url()});});
    await context.addInitScript(installIntroPlaybackEvidence);
    await page.goto(base+'/?intro_browser_check=1',{waitUntil:'commit'});
    await page.waitForFunction(()=>{
     return !!window.introPlaybackEvidence?.frame;
    },null,{timeout:6000}).catch(async error=>{
     console.error('Intro diagnostic',name,JSON.stringify({media,state:await page.evaluate(()=>({installed:navigator.standalone,mp4:document.createElement('video').canPlayType('video/mp4'),errors:window.introMediaErrors,evidence:window.introPlaybackEvidence,hidden:document.hidden,overlay:!!document.querySelector('#matchapp-launch-intro'),played:sessionStorage.getItem('matchapp-launch-intro')}))}));throw error;
    });
    const state=await page.evaluate(()=>window.introPlaybackEvidence.frame);
    assert.equal(state.width,state.screenWidth);assert.equal(state.height,state.screenHeight);
    assert.equal(state.encodedWidth,1080);assert.equal(state.encodedHeight,1920);
    assert.equal(state.fit,'cover');assert.equal(state.muted,true);
    assert.ok(Number.isFinite(state.duration)&&state.duration>0,'intro metadata must include a finite duration');
    await page.screenshot({path:path.join(dir,name+'.png'),timeout:1000}).catch(error=>console.warn('Intro screenshot unavailable: '+error.message));
    if(name==='phone'){
     // Retain the WebM budget and allow the 10s MP4 to finish naturally.
     const completionTimeout=Math.min(20000,Math.max(7500,Math.ceil(state.duration*1000)+3000));
     await page.waitForFunction(()=>window.introMediaEnds.length>0,null,{timeout:completionTimeout});
     const end=await page.evaluate(()=>window.introMediaEnds[0]);
     assert.equal(end.trusted,true,'completion must come from the media engine');
     assert.equal(end.ended,true,'intro must finish naturally before it disappears');
     assert.ok(Number.isFinite(end.duration)&&end.duration>0&&end.currentTime>=end.duration-.05,'intro must reach its full duration');
     await page.locator('#matchapp-launch-intro').waitFor({state:'detached',timeout:7500});
    }else{
     const overlay=page.locator('#matchapp-launch-intro'),skip=overlay.locator('button');
     if(await overlay.count()){
      try{await skip.click({timeout:3000});}
      catch(error){if(await overlay.count())throw error;}
     }
     await overlay.waitFor({state:'detached',timeout:3000}).catch(async error=>{if(await overlay.count())throw error;});
     assert.equal(await overlay.count(),0,'intro must be dismissed or complete naturally');
    }
    const evidence=await page.evaluate(()=>window.introPlaybackEvidence);
    assert.deepEqual(evidence.errors,[],'intro media errors must fail the audit');
    const natural=evidence.ends.some(end=>end.trusted&&end.ended&&Number.isFinite(end.duration)&&end.duration>0&&end.currentTime>=end.duration-.05);
    assert.ok(evidence.skip?.trusted||natural,'dismissal must have a real Skip click or full natural playback');
    fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({media,...evidence},null,2)+'\n');
    console.log('PASS real intro decode, viewport fill and '+(evidence.skip?.trusted?'Skip':'completion')+' '+name+' '+JSON.stringify(state));
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#matchapp-launch-intro').count(),0,'same-session navigation must not replay');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
