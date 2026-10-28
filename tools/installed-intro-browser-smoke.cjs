'use strict';
// Real Chromium playback in simulated installed windows; not physical-device QA.
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {installIntroPlaybackEvidence}=require('./intro-playback-evidence.cjs');
const base=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const dir=path.resolve('artifacts/installed-intro-smoke');
const screens=[['phone',390,844],['tablet',820,1180],['landscape',1180,820],['wide-screen',1920,1080]];
async function waitForIntroFrame(page){
 // Navigation commit precedes the startup script. First wait for its owner,
 // retained playback, or an early terminal result; none is playback proof.
 await page.waitForFunction(()=>{
  let started=false;try{started=sessionStorage.getItem('matchapp-launch-intro')==='played';}catch{}
  return !!window.introPlaybackEvidence?.frame||!!window.introPlaybackEvidence?.errors?.length||
   !!document.querySelector('#matchapp-launch-intro[data-matchapp-intro-managed="1"]')||started;
 },null,{timeout:10000});
 // The owner allows 8s to prepare media. One extra second lets the first
 // positive-time media event reach the retained evidence before polling ends.
 await page.waitForFunction(()=>{
  return !!window.introPlaybackEvidence?.frame||!!window.introPlaybackEvidence?.errors?.length||
   !document.querySelector('#matchapp-launch-intro[data-matchapp-intro-managed="1"]');
 },null,{timeout:8000+1000});
 const evidence=await page.evaluate(()=>({frame:window.introPlaybackEvidence?.frame,
  errors:window.introPlaybackEvidence?.errors||[]}));
 assert.deepEqual(evidence.errors,[],'intro media errors must fail the first-frame audit');
 assert.ok(evidence.frame,'intro ended or failed without a decoded positive-time frame');
 return evidence.frame;
}
function introDiagnosticState(){
 const video=document.querySelector('#matchapp-launch-intro video');
 let played=null;try{played=sessionStorage.getItem('matchapp-launch-intro');}catch{}
 return {installed:navigator.standalone,documentReadyState:document.readyState,
  mp4:document.createElement('video').canPlayType('video/mp4'),
  h264:document.createElement('video').canPlayType('video/mp4; codecs="avc1.640029"'),
  errors:window.introMediaErrors,evidence:window.introPlaybackEvidence,hidden:document.hidden,
  overlay:!!document.querySelector('#matchapp-launch-intro'),
  managed:!!document.querySelector('#matchapp-launch-intro[data-matchapp-intro-managed="1"]'),played,
  video:video?{src:video.getAttribute('src'),currentSrc:video.currentSrc,networkState:video.networkState,
   readyState:video.readyState,currentTime:video.currentTime,duration:Number.isFinite(video.duration)?video.duration:null,
   paused:video.paused,ended:video.ended,error:video.error?{code:video.error.code,message:video.error.message}:null}:null};
}
async function main(){
 fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 try{
  for(const [name,width,height] of screens){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36'});
   try{
    await context.addInitScript(()=>Object.defineProperty(navigator,'standalone',{value:true}));
    const page=await context.newPage(),media=[],requests=[],requestFailures=[],pageErrors=[];
    const startedAt=Date.now(),elapsed=()=>Date.now()-startedAt;
    const isIntroResource=url=>url.includes('matchapp-launch-intro')||new URL(url).pathname==='/installed-app-intro.js';
    page.on('request',request=>{if(isIntroResource(request.url()))requests.push({url:request.url(),resourceType:request.resourceType(),atMs:elapsed()});});
    page.on('requestfailed',request=>{if(isIntroResource(request.url()))requestFailures.push({url:request.url(),error:request.failure()?.errorText,atMs:elapsed()});});
    page.on('pageerror',error=>pageErrors.push(error.message));
    page.on('response',response=>{if(isIntroResource(response.url())){
     const headers=response.headers();media.push({status:response.status(),url:response.url(),atMs:elapsed(),
      contentType:headers['content-type'],contentLength:headers['content-length'],contentRange:headers['content-range'],cacheStatus:headers['cf-cache-status']});
    }});
    await context.addInitScript(installIntroPlaybackEvidence);
    let state;
    try{
     await page.goto(base+'/?intro_browser_check=1',{waitUntil:'commit'});
     state=await waitForIntroFrame(page);
    }catch(error){
     const diagnostic={error:error.message,requests,media,requestFailures,pageErrors,
      state:await page.evaluate(introDiagnosticState).catch(probeError=>({diagnosticError:probeError.message}))};
     fs.writeFileSync(path.join(dir,name+'-failure.json'),JSON.stringify(diagnostic,null,2)+'\n');
     console.error('Intro diagnostic',name,JSON.stringify(diagnostic));throw error;
    }
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
    fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify({requests,media,requestFailures,...evidence},null,2)+'\n');
    console.log('PASS real intro decode, viewport fill and '+(evidence.skip?.trusted?'Skip':'completion')+' '+name+' '+JSON.stringify(state));
    await page.reload({waitUntil:'domcontentloaded'});
    assert.equal(await page.locator('#matchapp-launch-intro').count(),0,'same-session navigation must not replay');
   }finally{await context.close();}
  }
 }finally{await browser.close();}
}
module.exports={waitForIntroFrame};
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
