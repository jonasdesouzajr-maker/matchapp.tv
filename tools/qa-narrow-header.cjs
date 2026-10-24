'use strict';
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=process.env.QA_BASE_URL || 'http://127.0.0.1:8765';
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  for(const width of [320,360,374,390,800,1280]){
   const page=await browser.newPage({viewport:{width,height:900},locale:'en-US',reducedMotion:'reduce'});
   await page.goto(base+'/index.html',{waitUntil:'domcontentloaded',timeout:60000});
   await page.locator('.ma-reference-jonas-caption').waitFor();
   await page.waitForTimeout(1500);
   const result=await page.evaluate(()=>{
    const caption=document.querySelector('.ma-reference-jonas-caption').getBoundingClientRect();
    const controls=document.querySelector('#mh-topbox .ma-cinema-header-actions').getBoundingClientRect();
    const overlaps=caption.left<controls.right&&caption.right>controls.left&&caption.top<controls.bottom&&caption.bottom>controls.top;
    return {overlaps,overflow:document.documentElement.scrollWidth>innerWidth,caption:caption.toJSON(),controls:controls.toJSON()};
   });
   assert.equal(result.overlaps,false,`${width}px controls overlap Jonas caption`);
   assert.equal(result.overflow,false,`${width}px horizontal overflow`);
   console.log(JSON.stringify({width,...result}));
   if(process.env.QA_SCREENSHOT_DIR)await page.screenshot({path:require('path').join(process.env.QA_SCREENSHOT_DIR,`header-fixed-${width}.png`)});
   await page.close();
  }
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
