'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'jonas/compact-pill-20261031.css'),'utf8');
const script=fs.readFileSync(path.join(root,'jonas/compact-pill-20261031.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({headless:true});
 const cases=[{w:320,h:640},{w:390,h:844},{w:768,h:1024},{w:1366,h:768},{w:320,h:450}];
 try{
  for(const {w,h} of cases){
   const page=await browser.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});
   await page.setContent('<!doctype html><html><head></head><body style="background:#100b1d;color:#fff"><div id="ma-ambient-jonas"><button class="ja-bubble" type="button">Jonas</button></div><section id="ma-ambient-panel" hidden><header class="ja-panel-head">Jonas</header><p class="ja-hello">Hello</p></section></body></html>');
   await page.addStyleTag({content:css});
   await page.evaluate(()=>{
    const panel=document.getElementById('ma-ambient-panel');
    window.MatchAppAmbientJonas={isOpen:()=>!panel.hidden};
    document.querySelector('.ja-bubble').addEventListener('click',()=>{panel.hidden=!panel.hidden});
   });
   await page.addScriptTag({content:script});
   await page.evaluate(()=>{
    const p=document.getElementById('ma-ambient-panel');
    p.__maSize={A:{left:8,right:innerWidth-8,top:innerHeight>500?90:62,bottom:innerHeight-80,
       w:innerWidth-16,h:innerHeight-(innerHeight>500?170:142)}};
    p.hidden=false;
    // Simulate the protected chat-resize controller trying to restore the old panel.
    p.style.setProperty('top','130px','important');
    p.style.setProperty('height','500px','important');
    p.style.setProperty('overflow','hidden','important');
    p.style.setProperty('border-radius','22px','important');
   });
   await page.waitForTimeout(200);
   const geometry=await page.evaluate(()=>{
    const p=document.getElementById('ma-ambient-panel'),f=p.querySelector('.ja-compact-form');
    const mic=p.querySelector('.ja-compact-mic'),send=p.querySelector('.ja-compact-send');
    const b=p.getBoundingClientRect(),m=mic.getBoundingClientRect(),s=send.getBoundingClientRect();
    return {p:{x:b.x,y:b.y,w:b.width,h:b.height,right:b.right,bottom:b.bottom},
     m:{w:m.width,h:m.height,right:m.right},s:{w:s.width,h:s.height,right:s.right},
     overflow:getComputedStyle(p).overflow,borderRadius:getComputedStyle(p).borderRadius,
     visible:!!(f&&mic&&send)};
   });
   assert.ok(geometry.visible,'the pill and controls exist');
   assert.ok(geometry.p.w<=w-4&&geometry.p.right<=w+1&&geometry.p.x>=-1,JSON.stringify({w,h,geometry}));
   assert.ok(geometry.p.h<=65&&geometry.p.h>=48,'old resizer cannot expand compact pill '+JSON.stringify(geometry));
   assert.ok(geometry.m.w>=40&&geometry.s.w>=40,'accessible touch targets');
   assert.ok(geometry.m.right<=geometry.p.right+2&&geometry.s.right<=geometry.p.right+2,'controls fit pill');
   assert.equal(geometry.overflow,'visible','result popover must not be clipped');
   assert.ok(parseFloat(geometry.borderRadius)>=40,'pill has rounded corners');
   console.log('PASS compact pill',w+'x'+h,JSON.stringify(geometry.p));
   await page.close();
  }
  console.log('PASS cross-viewport: '+cases.length+' layouts, old resize styles resisted');
 }finally{await browser.close()}
})().catch(err=>{console.error(err);process.exitCode=1});
