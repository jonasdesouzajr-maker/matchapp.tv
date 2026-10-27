'use strict';

// Full local Home UI in isolated Chromium contexts. No user browser, real
// matching, AI provider calls, credentials, physical devices or emulators.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const http=require('node:http');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const output=path.resolve(process.env.MATCHAPP_COUNTRY_QA_OUTPUT||path.join(root,'artifacts','guest-country-20261027'));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm','.woff2':'font/woff2','.ico':'image/x-icon','.txt':'text/plain','.xml':'application/xml'};
const mobileUA='Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const webviewUA='Mozilla/5.0 (Linux; Android 15; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 MatchAppTVAndroid/1.1.60 MatchAppAiAndroid/1.1.60';
const devices=[
  {name:'phone-320',width:320,height:740,touch:true,ua:mobileUA},
  {name:'phone-390',width:390,height:844,touch:true,ua:mobileUA},
  {name:'tablet-820',width:820,height:1180,touch:true},
  {name:'desktop-1440',width:1440,height:1000,touch:false},
  {name:'android-webview-ua',width:390,height:844,touch:true,ua:webviewUA}
];
const languages=['en','pt-BR','ar'];
const cases=devices.flatMap(device=>languages.map(language=>({...device,language,name:device.name+'-'+language})));
const requested=process.env.MATCHAPP_COUNTRY_QA_CASES?.split(',').filter(Boolean);
const scenarios=requested?cases.filter(row=>requested.includes(row.name)):cases;
const rows=[];

function startServer(){
  const server=http.createServer((req,res)=>{
    let file;
    try{file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));}
    catch{res.writeHead(400).end();return;}
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    if(path.relative(root,file).split(path.sep).some(segment=>segment.startsWith('.'))){res.writeHead(403).end();return;}
    try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');if(!fs.statSync(file).isFile())throw Error('not a file');}
    catch{res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
  });
  return new Promise((resolve,reject)=>{
    server.once('error',reject);
    server.listen(0,'127.0.0.1',()=>resolve({server,base:'http://127.0.0.1:'+server.address().port}));
  });
}

async function dismissIntro(page){
  const intro=page.locator('#matchapp-launch-intro');
  if(await intro.isVisible()){
    const skip=intro.locator('button').first();
    if(await skip.isVisible())await skip.click();
    await intro.waitFor({state:'hidden',timeout:15000});
  }
  const coach=page.locator('.ma-coach:not([hidden]) .ma-coach-actions .ma-coach-ghost').first();
  if(await coach.isVisible())await coach.click();
}

async function ready(page){
  await page.waitForFunction(()=>typeof window.MatchAppCountry?.regionCode==='function'&&
    typeof window.getMatchCriteria==='function'&&
    !!document.querySelector('#ma-reference-header .ma-reference-header-chrome #matchapp-viewer-country'),null,{timeout:35000});
  await dismissIntro(page);
  await page.locator('#matchapp-viewer-country').waitFor({state:'visible',timeout:10000});
  await page.evaluate(()=>window.scrollTo(0,0));
  // Wait for the existing masthead owner to settle its measured reservation.
  await page.waitForFunction(()=>{
    const select=document.getElementById('matchapp-viewer-country');
    const rect=select?.getBoundingClientRect();
    return rect&&rect.width>=44&&rect.height>=44;
  },null,{timeout:10000});
}

async function geometry(page){
  return page.evaluate(()=>{
    const select=document.getElementById('matchapp-viewer-country'),row=document.getElementById('matchapp-viewer-country-control');
    const rect=select.getBoundingClientRect(),style=getComputedStyle(select),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const top=document.elementFromPoint(cx,cy),header=document.getElementById('ma-reference-header'),hint=document.getElementById('platform-country-hint');
    return {
      country:select.value,resolved:window.MatchAppCountry.regionCode(),saved:localStorage.getItem('matchapp_viewer_country'),
      profileCountry:localStorage.getItem('match_user_country'),language:window.MATCH_LANG,savedLanguage:localStorage.getItem('match_lang'),
      label:select.getAttribute('aria-label'),selectedText:select.selectedOptions[0]?.textContent,optionCount:select.options.length,
      width:rect.width,height:rect.height,x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,
      viewportWidth:document.documentElement.clientWidth,viewportHeight:innerHeight,documentWidth:document.documentElement.scrollWidth,
      rowParent:row.parentElement.className,insideClosedDetails:!!row.closest('details:not([open])'),
      unique:document.querySelectorAll('#matchapp-viewer-country').length===1,
      visible:style.display!=='none'&&style.visibility!=='hidden',unobstructed:top===select||select.contains(top),
      obstructingElement:top&&top!==select?{tag:top.tagName,id:top.id,className:String(top.className)}:null,
      headerHeight:header?.getBoundingClientRect().height,
      legacyCountryHintVisible:!!hint&&getComputedStyle(hint).display!=='none'&&getComputedStyle(hint).visibility!=='hidden'&&hint.getBoundingClientRect().height>0,
      dailyCount:localStorage.getItem('match_dailyCount')||'0',
      nativeShell:document.documentElement.classList.contains('matchapp-ai-android')
    };
  });
}

function verifyGeometry(row,state){
  assert.equal(state.country,'BR');assert.equal(state.resolved,'BR');assert.equal(state.saved,'BR');
  assert.equal(state.profileCountry,null,'A viewing choice must not create or change registration data');
  assert.equal(state.savedLanguage,row.language);
  assert.equal(state.unique,true);assert.equal(state.visible,true);assert.equal(state.insideClosedDetails,false);
  assert.match(state.rowParent,/ma-reference-header-chrome/);
  assert(state.label&&state.label.length>=2,'The selector needs an accessible name');
  assert.equal(state.optionCount,250);
  assert(state.height>=44&&state.width>=44,'The touch target must remain at least 44px');
  assert(state.x>=-1&&state.right<=state.viewportWidth+1,'Country pill must stay inside the viewport');
  assert(state.y>=-1&&state.bottom<=state.viewportHeight+1,'Country pill must remain visible at the top of the page');
  assert(state.documentWidth<=state.viewportWidth+1,'Home must not overflow horizontally');
  assert.equal(state.unobstructed,true,'Country pill must not be covered by the header or another control');
  assert.equal(state.legacyCountryHintVisible,false,'The redundant old country hint must not overlap the Match action');
  assert.equal(state.dailyCount,'0','This visual regression must not consume a match');
}

async function run(browser,base,scenario){
  const row={...scenario,passed:false,pageErrors:[],consoleErrors:[],applicationConsoleErrors:[],firstPartyFailures:[],externalFailures:[],environmentFailures:[],lifecycleCancellations:[],preventedProviderCalls:[],screenshots:[]};
  let switchingDocument=false,closingContext=false;
  const context=await browser.newContext({viewport:{width:scenario.width,height:scenario.height},
    hasTouch:scenario.touch,isMobile:scenario.touch,deviceScaleFactor:1,userAgent:scenario.ua,
    locale:scenario.language==='pt-BR'?'pt-BR':scenario.language==='ar'?'ar-SA':'en-US',reducedMotion:'reduce'});
  try{
    await context.addInitScript(language=>{localStorage.setItem('match_lang',language);},scenario.language);
    // No positive provider fixtures or successful-match mocks. These requests
    // are explicitly blocked and reported; the test checks the real local UI.
    await context.route('**/functions/v1/**',route=>{
      row.preventedProviderCalls.push(new URL(route.request().url()).pathname);
      return route.abort('blockedbyclient');
    });
    const page=await context.newPage();
    page.on('pageerror',error=>row.pageErrors.push(String(error.stack||error.message)));
    page.on('console',message=>{if(message.type()==='error')row.consoleErrors.push({text:message.text(),location:message.location()});});
    page.on('response',response=>{
      if(response.status()<400)return;
      const value={url:response.url(),status:response.status()};
      if(response.url()===base+'/cdn-cgi/trace')row.environmentFailures.push({...value,reason:'Cloudflare edge endpoint does not exist on the local static server'});
      else (response.url().startsWith(base+'/')?row.firstPartyFailures:row.externalFailures).push(value);
    });
    page.on('requestfailed',request=>{
      const value={url:request.url(),error:request.failure()?.errorText||'request failed'};
      if(request.url()===base+'/cdn-cgi/trace')row.environmentFailures.push({...value,reason:'Cloudflare edge endpoint does not exist on the local static server'});
      else if((switchingDocument||closingContext)&&value.error==='net::ERR_ABORTED'&&request.resourceType()!=='document')row.lifecycleCancellations.push(value);
      else (request.url().startsWith(base+'/')?row.firstPartyFailures:row.externalFailures).push(value);
    });
    try{
      await page.goto(base+'/',{waitUntil:'domcontentloaded',timeout:60000});
      await ready(page);
      assert.equal(await page.locator('#matchapp-viewer-country').inputValue(),'','First-time guest begins with an explicit choice');
      await page.locator('#matchapp-viewer-country').selectOption('BR');
      await page.waitForFunction(()=>window.MatchAppCountry.regionCode()==='BR');
      row.selected=await geometry(page);verifyGeometry(row,row.selected);
      const selectedPath=path.join(output,row.name+'-selected.png');
      await page.screenshot({path:selectedPath,fullPage:false,animations:'disabled'});row.screenshots.push(selectedPath);
      switchingDocument=true;
      await page.reload({waitUntil:'domcontentloaded',timeout:60000});
      await ready(page);
      switchingDocument=false;
      row.reloaded=await geometry(page);verifyGeometry(row,row.reloaded);
      assert.equal(row.reloaded.selectedText,row.selected.selectedText);
      const reloadPath=path.join(output,row.name+'-reloaded.png');
      await page.screenshot({path:reloadPath,fullPage:false,animations:'disabled'});row.screenshots.push(reloadPath);
      row.applicationConsoleErrors=row.consoleErrors.filter(entry=>entry.location.url.startsWith(base+'/')&&entry.location.url!==base+'/cdn-cgi/trace');
      assert.deepEqual(row.pageErrors,[],'Uncaught first-party application errors are release failures');
      assert.deepEqual(row.applicationConsoleErrors,[],'First-party application console errors are release failures');
      assert.deepEqual(row.firstPartyFailures,[],'Missing or failed local application assets are release failures');
      row.passed=true;
    }catch(error){
      row.failure=String(error.stack||error);
      row.lastState=await geometry(page).catch(()=>null);
      const failurePath=path.join(output,row.name+'-failure.png');
      await page.screenshot({path:failurePath,fullPage:false,animations:'disabled',timeout:10000}).then(()=>row.screenshots.push(failurePath)).catch(()=>{});
    }
  }finally{
    closingContext=true;
    await context.close();rows.push(row);
    console.log(JSON.stringify({name:row.name,passed:row.passed,failure:row.failure?.split('\n')[0],pageErrors:row.pageErrors.length,firstPartyFailures:row.firstPartyFailures.length,externalFailures:row.externalFailures.length,geometry:row.reloaded||row.selected||row.lastState}));
  }
}

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  let browser,server,base;
  try{
    if(!scenarios.length)throw Error('No requested country QA cases matched');
    ({server,base}=await startServer());
    browser=await chromium.launch({headless:true,args:['--no-sandbox']});
    for(const scenario of scenarios)await run(browser,base,scenario);
  }catch(error){rows.push({name:'harness',passed:false,failure:String(error.stack||error)});console.error(error);}
  finally{
    await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));
    const report={note:'Local full-index Chromium UI regression with isolated contexts. Android UA is not physical WebView testing; no Safari or emulator claims. Provider function requests are blocked and recorded. All application errors fail the check. Cloudflare edge endpoints unavailable on the local server, reload/teardown cancellations and external network failures remain explicit in the report; they are not application asset failures.',base,results:rows};
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
    console.log('Guest country UI: '+rows.filter(row=>row.passed).length+' passed; '+rows.filter(row=>!row.passed).length+' failed. Report: '+path.join(output,'report.json'));
    if(rows.some(row=>!row.passed))process.exitCode=1;
  }
})();
