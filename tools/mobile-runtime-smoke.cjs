/* Real touch-enabled browser flow in Playwright Chromium.
 * Does not claim to be physical Safari or Android WebView. The AI proxy is
 * intercepted deliberately to verify mobile UI/recovery without consuming
 * users' paid AI quotas. Backend health is audited separately. */
'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const BASE=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const DEST=path.resolve('artifacts/mobile-runtime-smoke');fs.mkdirSync(DEST,{recursive:true});
const cases=[
 {name:'phone-touch',width:390,height:844,ua:'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Mobile Safari/537.36'},
 {name:'tablet-touch',width:820,height:1180,ua:'Mozilla/5.0 (Linux; Android 15; Pixel Tablet) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36'},
 {name:'ios-ua-touch-chromium',width:390,height:844,ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'},
 {name:'android-webview-ua-chromium',width:390,height:844,ua:'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36 MatchAppTVAndroid/1.1.33 MatchAppAiAndroid/1.1.33'}
];
const failures=[],results=[];
function pass(label,ok,detail=''){console.log((ok?'PASS ':'FAIL ')+label+' '+detail);results.push({label,ok,detail});if(!ok)failures.push(label+' '+detail);}
function fixture(body) {return {candidates:[{content:{parts:[{text:JSON.stringify(body)}]},finishReason:'STOP'}],_servedByTier:'mobile-ui-test-only'};}
async function setup(page){
 await page.route('**/functions/v1/gemini-proxy',async route=>{
   const req=route.request();
   if(req.method()==='OPTIONS')return route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'authorization, apikey,x-client-info,content-type','Content-Type':'application/json'},body:'{}'});
   let body={};try{body=req.postDataJSON()||{}}catch(_){}
   const rank=body.mode==='rank_candidates';
   const fake=rank?{ids:['c0']}:{answer:'Spirited Away (2001) was directed by Hayao Miyazaki.',results:[]};
   await route.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify(fixture(fake))});
 });
}
(async()=>{
 let browser;
 try{
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const device of cases){
   const ctx=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:device.ua,locale:'en-US'});
   const page=await ctx.newPage(),fatal=[];
   page.on('pageerror',e=>fatal.push(String(e.message||e)));
   try{
     await setup(page);
     await page.goto(BASE+'/?mobile_runtime_check=20260927-1',{waitUntil:'domcontentloaded',timeout:60000});
     await page.waitForFunction(()=>typeof window.triggerMatch==='function'&&typeof window.setMatchCriteria==='function',null,{timeout:23000});
     const runtime=await page.evaluate(()=>({touch:navigator.maxTouchPoints>0,mobileViewport:document.documentElement.clientWidth<=window.innerWidth+2,build:window.MATCHAPP_BUILD,quota:localStorage.getItem('match_dailyCount')||'0'}));
     pass(device.name+' proper touch-enabled bootstrap',runtime.touch&&runtime.mobileViewport,JSON.stringify(runtime));
     await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:900}).catch(()=>{});
     // Native touch gestures must work when they start on a top-title poster.
     await page.locator('#ma-install-offer .ma-offer-close').click({timeout:700}).catch(()=>{});
     const rail=page.locator('#marquee-viewport');
     await rail.scrollIntoViewIfNeeded();
     await rail.evaluate(el=>{el.__railHold?.();el.scrollLeft=0;});
     const touch=await ctx.newCDPSession(page);
     const box=await rail.boundingBox();
     const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
     const before=await page.evaluate(()=>({y:scrollY,x:document.getElementById('marquee-viewport').scrollLeft}));
     await touch.send('Input.synthesizeScrollGesture',{x,y,xDistance:-140,yDistance:0,gestureSourceType:'touch',speed:500});
     const horizontal=await rail.evaluate(el=>el.scrollLeft);
     pass(device.name+' poster horizontal touch scroll',horizontal>before.x+20,JSON.stringify({before:before.x,after:horizontal}));
     await touch.send('Input.synthesizeScrollGesture',{x,y,xDistance:0,yDistance:-140,gestureSourceType:'touch',speed:500});
     const after=await page.evaluate(()=>scrollY);
     pass(device.name+' page vertical touch scroll from poster',after>before.y+20,JSON.stringify({before:before.y,after}));
     await touch.detach();
     await page.evaluate(()=>window.setMatchCriteria({cat:['movie'],mood:['funny'],plat:[]}));
     const btn=page.locator('button[onclick="triggerMatch(false)"]');
     await btn.scrollIntoViewIfNeeded({timeout:12000});
     await btn.click({timeout:12000});
     await page.waitForFunction(()=>{
       const title=document.getElementById('res-title')?.textContent?.trim();
       const box=document.getElementById('result-box');
       return !!title&&title!=='Title'&&box&&getComputedStyle(box).display!=='none';
     },null,{timeout:70000});
     const match=await page.evaluate(()=>({
       title:document.getElementById('res-title')?.textContent?.trim(),
       visible:getComputedStyle(document.getElementById('result-box')).display!=='none',
       searching:document.body.classList.contains('match-searching'),
       chosen:window.getMatchCriteria()
     }));
     pass(device.name+' touch UI match displays a title with preserved filters',
       match.visible&&match.chosen?.cat?.includes('movie')&&match.chosen?.mood?.includes('funny'),
       match.title||'no title');
     await page.screenshot({path:path.join(DEST,device.name+'-match.png'),timeout:12000}).catch(()=>{});
     // Isolated Ask AI guest session, same real mobile engine/UA. Synthetic
     // backend response tests request parsing, composer, response rendering.
     const chat=await ctx.newPage();chat.on('pageerror',e=>fatal.push(String(e.message||e)));
     await setup(chat);
     await chat.goto(BASE+'/discover.html?mobile_runtime_check=20260927-1',{waitUntil:'domcontentloaded',timeout:60000});
     await chat.locator('#discover-new-input').waitFor({state:'visible',timeout:22000});
     await chat.locator('#discover-new-input').fill('Who directed Spirited Away?');
     await chat.locator('button[onclick="newDiscoverSearch()"]').click({timeout:16000});
     await chat.waitForFunction(()=>!!document.querySelector('#chat-log .chat-assistant .chat-answer-text') && typeof askInFlight!=='undefined'&&askInFlight===null,null,{timeout:70000});
     const answer=await chat.locator('#chat-log .chat-assistant .chat-answer-text').last().innerText();
     pass(device.name+' mobile Ask AI composer and response render',/Hayao Miyazaki/i.test(answer),answer.slice(0,140));
     await chat.screenshot({path:path.join(DEST,device.name+'-ask.png'),timeout:12000}).catch(()=>{});
     pass(device.name+' no fatal application JS errors',!fatal.length,JSON.stringify(fatal.slice(0,2)));
   }catch(e){pass(device.name+' full mobile journey',false,String(e.stack||e).slice(0,480));await page.screenshot({path:path.join(DEST,device.name+'-failure.png')}).catch(()=>{})}
   finally{await ctx.close();}
 }
 }catch(e){pass('mobile smoke harness',false,String(e.stack||e).slice(0,480))}
 finally{await browser?.close().catch(()=>{});fs.writeFileSync(path.join(DEST,'report.json'),JSON.stringify({cases:results,failures,note:'Mobile Chromium emulation with realistic UA and touch; simulated provider response, not real Android app or iOS Safari.'},null,2));console.log('MOBILE TOUCH SMOKE '+(results.length-failures.length)+' passed '+failures.length+' failed');if(failures.length)process.exitCode=1;}
})();
