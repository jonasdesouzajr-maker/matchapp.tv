/* Supplemental genuine-production audit: audio edition, music, Kids match and Kids AI.
   No app mocks, no entitlement override, no production writes beyond ordinary guest actions.
   This runs after the standard live-production-smoke.cjs and emits separate evidence. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require('playwright');
const {fetchDeploymentMarker}=require('./deployment-marker.cjs');
const BASE=process.env.MATCHAPP_TEST_BASE||'https://matchapp.tv';
const out=path.resolve('artifacts/deep-match-smoke');fs.mkdirSync(out,{recursive:true});
const results=[],notes=[],errors=[];
const record=(name,ok,detail='')=>{results.push({name,ok,detail});console.log((ok?'PASS ':'FAIL ')+name+' '+detail);if(!ok)errors.push(name+': '+detail);};
const warn=(name,message)=>{notes.push({name,message});console.log('UNVERIFIED '+name+' '+message);};
const source=fs.readFileSync('kids/kids.js','utf8');
const list=source.match(/const LIBRARY = (\[[\s\S]*?\n  \]);/);
assert(list,'Kids vetted library not found');
const approved=vm.runInNewContext(list[1]);
async function open(page,route){await page.goto(BASE+route,{waitUntil:'domcontentloaded',timeout:60000});await page.waitForTimeout(1800);}
async function consent(page){await page.getByRole('button',{name:/Essential only/i}).first().click({timeout:1700}).catch(()=>{});}
async function contextFor(browser){const context=await browser.newContext({viewport:{width:1180,height:850},locale:'en-US'});return {context,page:await context.newPage()};}
// Every new isolated test browser must complete the REAL guardian setup
// through its on-screen UI. Never disable the gate or reuse an owner's PIN.
async function setupFreshGuardian(page){
 const dialog=page.locator('dialog.kids-parent-setup[open]');
 await dialog.waitFor({state:'visible',timeout:12000});
 const choice=dialog.locator('.kids-parent-pin-choice');
 if(await choice.isVisible())await choice.click();
 await dialog.locator('#kids-parent-pin-one').fill('7319');
 await dialog.locator('#kids-parent-pin-two').fill('7319');
 await dialog.locator('.kids-parent-pin-save').click();
 await dialog.waitFor({state:'hidden',timeout:10000});
}
async function guarded(browser,label,fn){
 const {context,page}=await contextFor(browser);
 const exceptions=[];
 // Minified external widgets sometimes throw a one-letter "W" without a
 // stack. Capture the native browser error event URL before classifying it:
 // never dismiss an unlocated or first-party exception as "just an ad".
 await page.addInitScript(()=>{
   window.__matchappAuditErrors=[];
   window.addEventListener('error',event=>{
     window.__matchappAuditErrors.push({
       message:String(event.message||''),
       filename:String(event.filename||''),
       line:event.lineno||0,
       stack:String(event.error?.stack||'').slice(0,340)
     });
   });
 });
 page.on('pageerror',e=>exceptions.push(String(e.stack||e.message).slice(0,380)));
 try{
  await fn(page);
  const provenance=await page.evaluate(()=>window.__matchappAuditErrors||[]).catch(()=>[]);
  const details=exceptions.map((message,i)=>({
    message,source:provenance[i]?.filename||'',line:provenance[i]?.line||0,
    eventMessage:provenance[i]?.message||''
  }));
  details.forEach(x=>console.log('DEEP BROWSER PAGEERROR '+label+' '+JSON.stringify(x)));
  const firstPartyErrors=details.filter(e=>
    !e.source || e.source.startsWith(BASE+'/') ||
    !/^(?:https?:\/\/)(?:pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net|tpc\.googlesyndication\.com)(?:\/|$)/.test(e.source));
  const ignored=details.filter(x=>!firstPartyErrors.includes(x));
  if(ignored.length)warn(label+' external ad exception',ignored.map(x=>x.source).join(', '));
  record(label+' JavaScript health',firstPartyErrors.length===0,JSON.stringify(firstPartyErrors.slice(0,2)));
 }
 catch(e){record(label,false,String(e.message||e).slice(0,430));await page.screenshot({path:path.join(out,label.replace(/[^a-z0-9]/gi,'-')+'-failure.png'),timeout:8000}).catch(()=>{});}
 finally{await context.close();}
}
(async()=>{
 let browser;
 try{
  const sha=await fetchDeploymentMarker(BASE);
  record('production SHA available',/^[0-9a-f]{40}\s*$/i.test(sha),sha.trim().slice(0,12));
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  await guarded(browser,'Adult Spotify playlist match',async page=>{
   await open(page,'/');await consent(page);
   await page.waitForFunction(()=>typeof setMatchCriteria==='function',{timeout:12000});
   const chosen=await page.evaluate(()=>{
     setMatchCriteria({cat:['Spotify playlist'],plat:['Spotify'],mood:['cozy comfort watch']});
     return getMatchCriteria();
   });
   assert(chosen.cat.includes('Spotify playlist')&&chosen.plat.includes('Spotify')&&chosen.mood.includes('cozy comfort watch'),'music form did not preserve choices');
   await page.locator('button[onclick="triggerMatch(false)"]').click();
   await page.waitForFunction(()=>{
    const box=document.querySelector('#result-box'),title=document.querySelector('#res-title')?.textContent?.trim();
    // The title paints before metadata and the destination finish resolving.
    return box&&getComputedStyle(box).display!=='none'&&title&&title!=='Title'&&
     window.globalMatchTitle&&window.globalPlatform&&document.querySelector('#res-direct-link')?.getAttribute('href');
   },null,{timeout:110000});
   const match=await page.evaluate(()=>({title:document.querySelector('#res-title')?.textContent?.trim(),platform:String(globalPlatform||'').trim(),
    cover:document.querySelector('#res-poster-img')?.currentSrc||document.querySelector('#res-poster-img')?.src,
    href:document.querySelector('#res-direct-link')?.href||''}));
   const official={
    'Deep Focus':'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ',
    'Peaceful Meditation':'https://open.spotify.com/playlist/37i9dQZF1DWZqd5JICZI0u'
   };
   record('LIVE music respects Spotify and exact verified playlist deep link',
    match.platform==='Spotify'&&!!official[match.title]&&match.href===official[match.title],
    'title='+match.title+' platform='+match.platform+' direct='+match.href);
   await page.waitForFunction(()=>document.querySelector('#res-poster-img')?.currentSrc?.startsWith('https://i.scdn.co/image/'),null,{timeout:15000}).catch(()=>{});
   const hasArtwork=await page.locator('#res-poster-img').evaluate(img=>img.complete&&img.naturalWidth>0&&getComputedStyle(img).objectFit!=='fill'&&/^https:\/\/i\.scdn\.co\/image\//.test(img.currentSrc||img.src)).catch(()=>false);
   record('LIVE music shows verified original undistorted Spotify artwork',hasArtwork,'source='+String(await page.locator('#res-poster-img').getAttribute('src')).slice(0,150));
   await page.screenshot({path:path.join(out,'adult-spotify.png')}).catch(()=>{});
  });
  await guarded(browser,'Adult verified audiobook match',async page=>{
   await page.addInitScript(()=>localStorage.setItem('match_user_country','US'));
   await open(page,'/');await consent(page);
   // 1180px is the narrowest locked desktop breakpoint: audit *usable* ad
   // width before exercising the same audiobook path that exposed 116px.
   const rail=await page.evaluate(()=>({viewport:innerWidth,adsEmpty:document.documentElement.classList.contains('ads-empty'),
    units:[...document.querySelectorAll('.sidebar-ad-left,.sidebar-ad-right')].map(host=>{
      const ins=host.querySelector('ins.adsbygoogle');
      return {side:host.classList.contains('sidebar-ad-left')?'left':'right',
        outerWidth:Math.round(host.getBoundingClientRect().width),
        usableWidth:Math.round(ins?.getBoundingClientRect().width||0),
        displayed:!!ins?.getClientRects().length};
    })}));
   if(rail.units.every(x=>x.displayed)){
     record('LIVE narrow desktop side rails provide Google-safe usable width',
       rail.viewport===1180&&rail.units.length===2&&rail.units.every(x=>x.usableWidth>=120),JSON.stringify(rail));
   }else warn('LIVE narrow desktop rail inventory unavailable',JSON.stringify(rail));
   const root=page.locator('#ebook-matcher-root');
   const fold=root.locator('details.ebook-fold');await fold.waitFor({state:'attached',timeout:23000});
   await fold.evaluate(node=>{node.open=true});
   await root.locator('select[data-ebook-select="format"]').selectOption('audiobook');
   await root.locator('select[data-ebook-select="access"]').selectOption('paid');
   const quotaBefore=await page.evaluate(()=>localStorage.getItem('match_dailyCount'));
   await root.locator('[data-ebook-match]').first().click();
   await page.waitForFunction(()=>{
     const node=document.querySelector('#ebook-matcher-root'),result=node?.querySelector('[data-ebook-result]');
     return node?.dataset.audioBusy==='0'&&result&&!result.hidden;
   },null,{timeout:87000});
   const result=await root.locator('[data-ebook-result]').evaluate(node=>({
    title:node.querySelector('.ebook-result-grid h3')?.textContent||'',
    verified:[...node.querySelectorAll('.ebook-audio-verified[href]')].map(x=>x.href),
    preview:node.querySelector('audio.ebook-audio-preview')?.src||'',
    discovery:!!node.querySelector('.ebook-audio-discovery'),
    safetyText:node.textContent.includes('Audio edition not verified'),
    fakeVerified:node.querySelector('.ebook-audio-discovery .ebook-audio-verified')!==null
   }));
   if(result.discovery){
     const quotaAfter=await page.evaluate(()=>localStorage.getItem('match_dailyCount'));
     record('LIVE audiobook fails closed without invented edition or charging',result.safetyText&&!result.fakeVerified&&quotaAfter===quotaBefore,JSON.stringify(result));
     warn('LIVE audiobook source coverage','No exact verified commercial edition found during this pass. Honest uncharged discovery was shown.');
   }else{
     const legal=result.verified.length>0&&result.verified.every(h=>/^https:\/\/(?:books\.apple\.com|librivox\.org)/i.test(h));
     record('LIVE exact audiobook provider and original edition',legal,JSON.stringify(result));
     // The verified audiobook result may paint before its edition-specific
     // cover finishes downloading. A real wait removes timing false negatives
     // but an unavailable/incorrect cover still fails this audit.
     await page.waitForFunction(()=>{
       const img=document.querySelector('#ebook-matcher-root [data-ebook-result] img[data-ebook-cover]');
       return img&&img.complete&&img.naturalWidth>0;
     },null,{timeout:18000}).catch(()=>{});
     const cover=await root.locator('[data-ebook-result] img[data-ebook-cover]').first().evaluate(im=>im.complete&&im.naturalWidth>0).catch(()=>false);
     record('LIVE audiobook original edition cover',cover,result.title);
   }
   await page.screenshot({path:path.join(out,'adult-audiobook.png')}).catch(()=>{});
  });
  await guarded(browser,'Kids mood and age gate',async page=>{
   await open(page,'/kids/');await setupFreshGuardian(page);await consent(page);
   await page.locator('#kids-age').selectOption('6-8');
   await page.locator('#kids-match-mood').selectOption('funny');
   await page.locator('#kids-match-format').selectOption('series');
   await page.locator('#kids-match-era').selectOption('2020');
   await page.locator('#kids-match-submit').click();
   await page.waitForFunction(()=>document.querySelectorAll('#kids-match-results .kids-card').length>0,null,{timeout:22000});
   const rows=await page.locator('#kids-match-results .kids-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.title));
   const vetted=rows.length>0&&rows.every(title=>approved.some(x=>x.title===title&&x.cats.includes('funny')&&x.type==='series'&&(x.ages.includes('6-8')||x.ages.includes('all'))));
   record('LIVE Kids matches approved age, mood and format',vetted,rows.join(', '));
   await page.screenshot({path:path.join(out,'kids-matching.png')}).catch(()=>{});
  });
  await guarded(browser,'Kids AI approved answer',async page=>{
   const upstream=[];page.on('response',response=>{if(response.url().includes('/functions/v1/gemini-proxy'))upstream.push(response.status());});
   await open(page,'/kids/');await setupFreshGuardian(page);await consent(page);
   await page.locator('#kids-age').selectOption('6-8');
   await page.locator('#kids-question').fill('I love Bluey. Find a gentle funny animal cartoon for a six-year-old from your approved Kids collection.');
   await page.locator('#kids-send').click();
   await page.waitForFunction(()=>document.getElementById('kids-chat')?.classList.contains('show')&&!document.getElementById('kids-send')?.disabled,null,{timeout:85000});
   const ans=await page.locator('#kids-answer').innerText();
   const rows=await page.locator('#kids-chat-results .kids-card').evaluateAll(nodes=>nodes.map(n=>n.dataset.title));
   const safe=rows.length>0&&rows.every(title=>approved.some(x=>x.title===title&&(x.ages.includes('6-8')||x.ages.includes('all'))));
   record('LIVE Kids AI only exposes vetted age-approved titles',safe,rows.join(', ')||ans.slice(0,100));
   if(upstream.includes(200))record('LIVE Kids AI proxy responded successfully',true,'HTTP '+upstream.join(','));
   else warn('Kids AI live generation','The age-safe local fallback may have answered; production AI proxy responses: '+upstream.join(','));
   await page.screenshot({path:path.join(out,'kids-ai.png')}).catch(()=>{});
  });
 }catch(e){record('deep smoke bootstrap',false,String(e.message||e));}
 finally{
  await browser?.close().catch(()=>{});
  // Keep untrusted remote response text in the job log only. The persisted
  // JSON contains local check labels and outcomes, never downloaded payloads.
  const checks=results.map(({name,ok})=>({name,ok}));
  const warnings=notes.map(({name})=>({name}));
  const failedChecks=checks.filter(check=>!check.ok).map(check=>check.name);
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({base:BASE,checks,warnings,errors:failedChecks,
   detailsLocation:'PASS, FAIL and UNVERIFIED lines in the audit job log',finished:new Date().toISOString()},null,2));
  console.log('DEEP SMOKE: '+results.filter(x=>x.ok).length+' passed, '+errors.length+' failed, '+notes.length+' unverified');
  if(errors.length)process.exitCode=1;
 }
})();
