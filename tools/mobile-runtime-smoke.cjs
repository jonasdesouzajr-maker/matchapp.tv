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
     // Legacy native windows play the intro before Home accepts gestures.
     const intro=page.locator('#matchapp-launch-intro');
     if(await intro.isVisible())await intro.locator('button').click({timeout:2000});
     await intro.waitFor({state:'detached',timeout:7500});
     const runtime=await page.evaluate(()=>({touch:navigator.maxTouchPoints>0,mobileViewport:document.documentElement.clientWidth<=window.innerWidth+2,build:window.MATCHAPP_BUILD,quota:localStorage.getItem('match_dailyCount')||'0'}));
     pass(device.name+' proper touch-enabled bootstrap',runtime.touch&&runtime.mobileViewport,JSON.stringify(runtime));
     await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:900}).catch(()=>{});
     // Native touch gestures must work when they start on a top-title poster.
     await page.locator('#ma-install-offer .ma-offer-close').click({timeout:700}).catch(()=>{});
     const rail=page.locator('#marquee-viewport');
     await rail.waitFor({state:'visible',timeout:15000});
     const trendingFold=page.locator('.lazy-head[data-fold-key="trending"]');
     pass(device.name+' Top Titles initially unfolded',await trendingFold.count()===0&&await rail.isVisible());
     await rail.evaluate(el=>{el.__railHold?.();el.scrollIntoView({block:'center',behavior:'instant'});el.scrollTo({left:0,behavior:'instant'});});
     await page.waitForTimeout(350);
     const touch=await ctx.newCDPSession(page);
     async function swipe(dx,dy,target=rail){
       const box=await target.boundingBox();
       const x=Math.round(box.x+box.width/2),y=Math.round(box.y+box.height/2);
       await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
       for(let i=1;i<=12;i++){
         await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/12,y:y+dy*i/12}]});
         await page.waitForTimeout(20);
       }
       await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
       await page.waitForTimeout(250);
     }
     const before=await page.evaluate(()=>({y:scrollY,x:document.getElementById('marquee-viewport').scrollLeft}));
     await swipe(-Math.min(260,device.width*0.35),0);
     const horizontal=await rail.evaluate(el=>el.scrollLeft);
     pass(device.name+' poster horizontal touch scroll',horizontal>before.x+20,JSON.stringify({before:before.x,after:horizontal}));
     await swipe(0,-120);
     const after=await page.evaluate(()=>scrollY);
     pass(device.name+' page vertical touch scroll from poster',after>before.y+20,JSON.stringify({before:before.y,after}));
     await rail.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
     const pinchBox=await rail.boundingBox(),px=Math.round(pinchBox.x+pinchBox.width/2),py=Math.round(pinchBox.y+pinchBox.height/2);
     const scaleBefore=await page.evaluate(()=>visualViewport.scale);
     await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:px-20,y:py,id:1},{x:px+20,y:py,id:2}]});
     for(let i=1;i<=10;i++){
       await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:px-20-i*5,y:py,id:1},{x:px+20+i*5,y:py,id:2}]});
       await page.waitForTimeout(20);
     }
     await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
     const scaleAfter=await page.evaluate(()=>visualViewport.scale);
     pass(device.name+' Home pinch does not zoom',Math.abs(scaleAfter-scaleBefore)<0.01,JSON.stringify({before:scaleBefore,after:scaleAfter}));
     const hero=page.locator('.home-hero').first();
     await hero.evaluate(el=>el.scrollIntoView({block:'center',behavior:'instant'}));
     const heroBefore=await page.evaluate(()=>scrollY);
     await swipe(0,-120,hero);
     const heroAfter=await page.evaluate(()=>scrollY);
     pass(device.name+' vertical scroll from Home heading',heroAfter>heroBefore+20,JSON.stringify({before:heroBefore,after:heroAfter}));
     await touch.detach();
     await page.evaluate(()=>window.setMatchCriteria({cat:['movie'],mood:['funny'],plat:[]}));
     const watchFold=page.locator('.lazy-head[data-fold-key="concierge"]');
     if(await watchFold.getAttribute('aria-expanded')==='false')await watchFold.click();
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
