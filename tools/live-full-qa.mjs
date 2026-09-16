import { chromium } from 'playwright';
import fs from 'node:fs';

const BASE='https://matchapp.tv';
const report={
  startedAt:new Date().toISOString(),
  base:BASE,
  sourceSha:process.env.QA_SOURCE_SHA||null,
  summary:{pass:0,warn:0,fail:0},
  findings:[],
  sitemap:{},
  devices:{},
  mechanisms:{},
  purchases:[],
  matches:[],
  translations:[],
  notes:[]
};
function finding(severity,area,message,detail={}){
  report.findings.push({severity,area,message,...detail});
  report.summary[severity]=(report.summary[severity]||0)+1;
}
function pct(values,p){
  if(!values.length)return 0;
  const a=[...values].sort((x,y)=>x-y);
  return a[Math.min(a.length-1,Math.floor((a.length-1)*p))];
}
function safeText(s,n=600){return String(s||'').replace(/\s+/g,' ').trim().slice(0,n)}
async function wait(ms){return new Promise(r=>setTimeout(r,ms))}

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});

async function sitemapAudit(){
  const ctx=await browser.newContext();
  try{
    const res=await ctx.request.get(BASE+'/sitemap.xml',{timeout:20000});
    const xml=await res.text();
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]).filter(u=>u.startsWith(BASE));
    const unique=[...new Set(urls)];
    const results=[];
    let idx=0;
    const workers=Array.from({length:8},async()=>{
      while(idx<unique.length){
        const i=idx++,url=unique[i];
        try{
          const r=await ctx.request.get(url,{timeout:15000,maxRedirects:5});
          results[i]={url,status:r.status(),ok:r.status()>=200&&r.status()<400,contentType:r.headers()['content-type']||''};
        }catch(e){results[i]={url,status:0,ok:false,error:safeText(e.message,180)};}
      }
    });
    await Promise.all(workers);
    const bad=results.filter(x=>!x?.ok);
    report.sitemap={status:res.status(),count:unique.length,bad};
    if(!res.ok()) finding('fail','sitemap',`sitemap.xml returned ${res.status()}`);
    else if(bad.length) finding('fail','sitemap',`${bad.length} sitemap URL(s) failed`,{examples:bad.slice(0,12)});
    else finding('pass','sitemap',`All ${unique.length} sitemap URLs returned 2xx/3xx`);
  }catch(e){finding('fail','sitemap','Could not crawl sitemap',{error:safeText(e.message)});}
  await ctx.close();
}

async function measureScroll(page,axis='y'){
  return await page.evaluate(async(axis)=>{
    const target=axis==='x'
      ? [...document.querySelectorAll('body *')].filter(el=>{
          const r=el.getBoundingClientRect();
          const st=getComputedStyle(el);
          return r.top>=0&&r.top<2200&&r.width>180&&r.height>70&&el.scrollWidth>el.clientWidth+120&&['auto','scroll'].includes(st.overflowX);
        }).sort((a,b)=>(b.scrollWidth-b.clientWidth)-(a.scrollWidth-a.clientWidth))[0]
      : document.scrollingElement;
    if(!target)return {found:false};
    const frames=[],long=[];
    let po=null;
    try{po=new PerformanceObserver(list=>long.push(...list.getEntries().map(e=>e.duration)));po.observe({entryTypes:['longtask']});}catch(_){}
    const duration=2600,start=performance.now();
    let last=start;
    const max=axis==='x'?Math.max(0,target.scrollWidth-target.clientWidth):Math.max(0,document.documentElement.scrollHeight-innerHeight);
    await new Promise(resolve=>{
      function step(t){
        frames.push(t-last);last=t;
        const k=Math.min(1,(t-start)/duration);
        const smooth=.5-.5*Math.cos(Math.PI*k);
        if(axis==='x')target.scrollLeft=max*smooth;else scrollTo(0,max*smooth);
        if(k<1)requestAnimationFrame(step);else resolve();
      }
      requestAnimationFrame(step);
    });
    if(axis==='x')target.scrollLeft=0;else scrollTo(0,0);
    try{po?.disconnect()}catch(_){}
    const sorted=[...frames].sort((a,b)=>a-b);
    const p95=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))]||0;
    const p99=sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.99))]||0;
    return {found:true,frames:frames.length,p95:+p95.toFixed(1),p99:+p99.toFixed(1),maxGap:+Math.max(...frames,0).toFixed(1),over50:frames.filter(x=>x>50).length,longTaskCount:long.length,longTaskMs:+long.reduce((a,b)=>a+b,0).toFixed(1),scrollExtent:max,tag:target.tagName,id:target.id||'',className:String(target.className||'').slice(0,140)};
  },axis);
}

async function pageHealth(ctx,path,label){
  const page=await ctx.newPage();
  const errors=[],consoleErrors=[],failed=[];
  page.on('pageerror',e=>errors.push(safeText(e.message,250)));
  page.on('console',m=>{if(m.type()==='error')consoleErrors.push(safeText(m.text(),250));});
  page.on('requestfailed',r=>{const u=r.url();if(u.startsWith(BASE))failed.push({url:u,error:r.failure()?.errorText||''});});
  const started=Date.now();
  try{
    const res=await page.goto(BASE+path,{waitUntil:'domcontentloaded',timeout:25000});
    await page.waitForTimeout(1800);
    const data=await page.evaluate(()=>({
      title:document.title,
      bodyText:(document.body?.innerText||'').trim().length,
      width:document.documentElement.scrollWidth,
      viewport:innerWidth,
      height:document.documentElement.scrollHeight,
      interactive:[...document.querySelectorAll('a,button,input,select,textarea,[role="button"]')].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0}).length
    }));
    const result={label,path,status:res?.status()||0,loadMs:Date.now()-started,...data,pageErrors:errors,consoleErrors:consoleErrors.slice(0,12),firstPartyRequestFailures:failed.slice(0,12)};
    await page.close();
    return result;
  }catch(e){
    const result={label,path,status:0,loadMs:Date.now()-started,error:safeText(e.message),pageErrors:errors,consoleErrors:consoleErrors.slice(0,12),firstPartyRequestFailures:failed.slice(0,12)};
    await page.close().catch(()=>{});
    return result;
  }
}

async function deviceAudit(name,opts){
  const ctx=await browser.newContext(opts);
  const routes=[
    ['/','Home'],['/discover.html','Ask AI'],['/pricing/pricing.html','Pricing'],['/purchase.html','Purchase hub'],
    ['/profile/profile.html','Profile'],['/together/','Match Together'],['/kids/','Kids'],['/events/','Events'],
    ['/updates.html','Updates'],['/privacy.html','Privacy'],['/terms.html','Terms']
  ];
  const pages=[];
  for(const [path,label] of routes)pages.push(await pageHealth(ctx,path,label));
  const overflow=pages.filter(p=>p.width>p.viewport+4);
  const fatal=pages.filter(p=>p.status<200||p.status>=400||p.error||p.pageErrors?.some(x=>/TypeError|ReferenceError|SyntaxError|Maximum call stack/i.test(x)));
  const home=await ctx.newPage();
  const homeErrors=[];home.on('pageerror',e=>homeErrors.push(safeText(e.message,250)));
  let vertical={found:false},horizontal={found:false},railButtons={};
  try{
    await home.goto(BASE+'/?qa_scroll=1',{waitUntil:'domcontentloaded',timeout:25000});
    await home.waitForTimeout(3000);
    vertical=await measureScroll(home,'y');
    await home.waitForTimeout(300);
    horizontal=await measureScroll(home,'x');
    railButtons=await home.evaluate(async()=>{
      const btns=[...document.querySelectorAll('button')].filter(b=>['‹','›','<','>'].includes((b.textContent||'').trim())&&b.getBoundingClientRect().top<2200);
      const scrollable=[...document.querySelectorAll('body *')].find(el=>{const r=el.getBoundingClientRect();const s=getComputedStyle(el);return r.top>=0&&r.top<2200&&el.scrollWidth>el.clientWidth+120&&['auto','scroll'].includes(s.overflowX);});
      if(!scrollable||!btns.length)return {buttons:btns.length,scrollable:false};
      const before=scrollable.scrollLeft;
      const next=btns.find(b=>(b.textContent||'').trim()==='›'||(b.textContent||'').trim()==='>')||btns.at(-1);
      next.click();await new Promise(r=>setTimeout(r,500));
      return {buttons:btns.length,scrollable:true,before,after:scrollable.scrollLeft,moved:Math.abs(scrollable.scrollLeft-before)>5};
    });
  }catch(e){homeErrors.push(safeText(e.message));}
  await home.close().catch(()=>{});
  report.devices[name]={pages,overflow:overflow.map(x=>({path:x.path,width:x.width,viewport:x.viewport})),fatal: fatal.map(x=>({path:x.path,status:x.status,error:x.error,pageErrors:x.pageErrors})),performance:{vertical,horizontal,railButtons},homeErrors};
  if(fatal.length)finding('fail',`${name} pages`,`${fatal.length} key page(s) had fatal load/runtime errors`,{examples:fatal.slice(0,5).map(x=>({path:x.path,status:x.status,error:x.error,pageErrors:x.pageErrors}))});
  else finding('pass',`${name} pages`,`All ${pages.length} key pages loaded without fatal JS errors`);
  if(overflow.length)finding('warn',`${name} layout`,`${overflow.length} key page(s) overflow the viewport horizontally`,{pages:overflow.map(x=>x.path)});
  else finding('pass',`${name} layout`,'No key-page document-level horizontal overflow detected');
  const p=report.devices[name].performance;
  if(p.vertical.found){
    if(p.vertical.p95>34||p.vertical.maxGap>120||p.vertical.longTaskCount>3)finding('warn',`${name} vertical scroll`,'Vertical scrolling shows measurable jank',{metrics:p.vertical});
    else finding('pass',`${name} vertical scroll`,'Vertical scrolling remained within the QA frame-gap threshold',{metrics:p.vertical});
  }
  if(p.horizontal.found){
    if(p.horizontal.p95>34||p.horizontal.maxGap>120||p.horizontal.longTaskCount>3)finding('warn',`${name} trending rail`,'Horizontal/trending scrolling shows measurable jank',{metrics:p.horizontal});
    else finding('pass',`${name} trending rail`,'Horizontal/trending scrolling remained within the QA frame-gap threshold',{metrics:p.horizontal});
  } else finding('warn',`${name} trending rail`,'No native horizontally scrollable top rail was detected by the automated probe');
  await ctx.close();
}

async function mechanismsAndMatches(){
  const ctx=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US',permissions:['clipboard-read','clipboard-write']});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(safeText(e.message,300)));
  await page.goto(BASE+'/?qa_mechanisms=1',{waitUntil:'domcontentloaded',timeout:25000});
  await page.waitForTimeout(3000);
  const mech={};
  async function attempt(name,fn){try{const v=await fn();mech[name]={ok:true,...(v||{})};return true}catch(e){mech[name]={ok:false,error:safeText(e.message)};return false}}

  await attempt('signInModal',async()=>{
    const b=page.getByRole('button',{name:/Sign In|Join/i}).first();
    await b.click({timeout:5000});await page.waitForTimeout(250);
    const visible=await page.locator('#main-auth-modal').evaluate(el=>getComputedStyle(el).display!=='none'&&!el.hasAttribute('hidden'));
    if(!visible)throw new Error('Sign-in click did not open #main-auth-modal');
    await page.keyboard.press('Escape').catch(()=>{});
    return {visible};
  });
  await attempt('moreFilters',async()=>{
    const b=page.getByRole('button',{name:/More filters/i}).first();
    if(!(await b.count()))throw new Error('More filters button missing');
    const before=await page.locator('#q-platform').isVisible().catch(()=>false);
    await b.click();await page.waitForTimeout(150);
    const after=await page.locator('#q-platform').isVisible().catch(()=>false);
    return {before,after};
  });
  await attempt('ahs13Fold',async()=>{
    const section=page.locator('#spotlight-ahs13').first();
    if(!(await section.count()))throw new Error('AHS13 section missing');
    const buttons=section.locator('button');
    if(!(await buttons.count()))throw new Error('AHS13 has no fold/control button');
    const before=await section.boundingBox();await buttons.first().click();await page.waitForTimeout(250);const after=await section.boundingBox();
    return {beforeHeight:before?.height||0,afterHeight:after?.height||0,changed:Math.abs((before?.height||0)-(after?.height||0))>20};
  });
  await attempt('globalEventsFold',async()=>{
    const h=page.getByText(/Upcoming global events/i).first();
    if(!(await h.count()))throw new Error('Global events heading missing');
    const container=h.locator('xpath=ancestor-or-self::*[self::section or self::div][1]');
    const b=container.locator('button').first();
    if(!(await b.count()))return {button:false};
    const before=await container.boundingBox();await b.click();await page.waitForTimeout(220);const after=await container.boundingBox();
    return {button:true,beforeHeight:before?.height||0,afterHeight:after?.height||0};
  });

  async function optionByText(selector,terms,exclude=[]){
    return await page.locator(selector).evaluate((el,{terms,exclude})=>{
      const opts=[...el.options];
      const norm=s=>String(s||'').toLowerCase();
      let o=opts.find(x=>terms.some(t=>norm(x.textContent).includes(norm(t)))&&!exclude.some(t=>norm(x.textContent).includes(norm(t)))&&x.value&&x.value!=='any');
      if(!o)o=opts.find(x=>x.value&&x.value!=='any'&&!x.disabled);
      return o?.value||'';
    },{terms,exclude});
  }
  async function setCriteria(kind=0){
    const cats=kind===0?['movie','movies','film']:kind===1?['series','tv']:['documentary','doc'];
    const cat=await optionByText('#q-category',cats);
    if(cat){await page.selectOption('#q-category',cat);await page.dispatchEvent('#q-category','change');}
    const moodTerms=kind===0?['funny','feel good','light']:kind===1?['intense','thrill']:['inspiring','mind'];
    const mood=await optionByText('#q-mood',moodTerms);
    if(mood){await page.selectOption('#q-mood',mood);await page.dispatchEvent('#q-mood','change');}
    return {cat,mood};
  }
  async function awaitMatch(previous=''){
    await page.waitForFunction(prev=>{
      const box=document.getElementById('result-box'),t=(window.globalMatchTitle||document.getElementById('res-title')?.textContent||'').trim();
      return box&&getComputedStyle(box).display!=='none'&&t&&t!=='Title'&&(!prev||t!==prev);
    },previous,{timeout:35000});
    await page.waitForTimeout(1700);
  }
  async function gatherMatch(index,criteria,label){
    const m=await page.evaluate(({index,criteria,label})=>{
      const img=document.getElementById('res-poster-img');
      const title=(window.globalMatchTitle||document.getElementById('res-title')?.textContent||'').trim();
      const syn=(document.getElementById('res-synopsis')?.textContent||'').trim();
      const plat=(document.getElementById('res-platform-badge')?.textContent||document.querySelector('.res-platform-badge-el')?.textContent||window.globalPlatform||'').trim();
      const stream=document.getElementById('res-direct-link')?.href||'';
      const trailer=document.getElementById('res-trailer-link')?.href||document.querySelector('#result-box a[href*="youtube"]')?.href||'';
      return {index,criteria,label,title,synopsis:syn,platform:plat,stream,trailer,poster:{src:img?.currentSrc||img?.src||'',naturalWidth:img?.naturalWidth||0,naturalHeight:img?.naturalHeight||0,complete:!!img?.complete},dailyCount:localStorage.getItem('match_dailyCount'),shownHistory:localStorage.getItem('match_shown_titles')||localStorage.getItem('match_shown_history')||''};
    },{index,criteria,label});
    m.poster.officialTmdb=/^https:\/\/image\.tmdb\.org\//i.test(m.poster.src);
    m.poster.localFallback=m.poster.src.startsWith(BASE)||m.poster.src.startsWith('data:');
    report.matches.push(m);
    return m;
  }
  async function translateCurrent(lang,index){
    const select=page.locator('#lang-switcher-host select').first();
    if(!(await select.count()))return {index,lang,ok:false,error:'language select missing'};
    const before=await page.locator('#res-synopsis').textContent().catch(()=>null);
    const values=await select.locator('option').evaluateAll(os=>os.map(o=>o.value));
    if(!values.includes(lang))return {index,lang,ok:false,error:'language option missing',values};
    await select.selectOption(lang);await page.dispatchEvent('#lang-switcher-host select','change');
    await page.waitForFunction(({before,lang})=>document.documentElement.lang===lang&&((document.getElementById('res-synopsis')?.textContent||'').trim()!==String(before||'').trim()),{before,lang},{timeout:12000}).catch(()=>{});
    await page.waitForTimeout(500);
    const after=await page.locator('#res-synopsis').textContent().catch(()=>null);
    const title=await page.locator('#res-title').textContent().catch(()=>null);
    const out={index,lang,ok:!!after&&safeText(after)!==safeText(before),before:safeText(before,450),after:safeText(after,450),title:safeText(title,160),docLang:await page.locator('html').getAttribute('lang')};
    report.translations.push(out);return out;
  }
  async function restoreEnglish(){
    const s=page.locator('#lang-switcher-host select').first();if(await s.count()){const vals=await s.locator('option').evaluateAll(os=>os.map(o=>o.value));if(vals.includes('en')){await s.selectOption('en');await page.dispatchEvent('#lang-switcher-host select','change');await page.waitForTimeout(600);}}
  }

  let criteria=await setCriteria(0);
  let first='';
  await attempt('match1',async()=>{
    const b=page.getByRole('button',{name:/Consult AI Concierge/i}).first();await b.click({timeout:5000});await awaitMatch();const m=await gatherMatch(1,criteria,'initial same-criteria set');first=m.title;await translateCurrent('pt-BR',1);await restoreEnglish();return {title:m.title};
  });
  await attempt('match2SameCriteria',async()=>{
    const b=page.getByRole('button',{name:/Same Criteria/i}).first();if(!(await b.count()))throw new Error('Same Criteria button missing');await b.click();await awaitMatch(first);const m=await gatherMatch(2,criteria,'same criteria rematch');await translateCurrent('es',2);await restoreEnglish();return {title:m.title};
  });
  const prev2=report.matches.at(-1)?.title||'';
  await attempt('match3SameCriteria',async()=>{
    const b=page.getByRole('button',{name:/Same Criteria/i}).first();if(!(await b.count()))throw new Error('Same Criteria button missing');await b.click();await awaitMatch(prev2);const m=await gatherMatch(3,criteria,'same criteria rematch');await translateCurrent('fr',3);await restoreEnglish();return {title:m.title};
  });
  await attempt('quotaAfterThree',async()=>{
    const before=report.matches.at(-1)?.title||'';
    const b=page.getByRole('button',{name:/Same Criteria/i}).first();if(!(await b.count()))throw new Error('Same Criteria button missing at quota test');await b.click();await page.waitForTimeout(2200);
    const state=await page.evaluate(before=>({title:(window.globalMatchTitle||document.getElementById('res-title')?.textContent||'').trim(),count:localStorage.getItem('match_dailyCount'),quota:(document.getElementById('quota-badge')?.textContent||'').trim(),body:(document.body.innerText||'').match(/.{0,80}(?:limit|left today|matches|credits|upgrade).{0,120}/i)?.[0]||''}),before);
    return {...state,blocked:state.title===before||state.count==='3'};
  });

  // QA-only quota reset: preserve the same browser history/exclusions while allowing
  // two more anonymous match generations without a real account or paid balance.
  await page.evaluate(()=>{localStorage.setItem('match_dailyCount','0');localStorage.setItem('match_lastDate',new Date().toLocaleDateString());});
  await attempt('match4DifferentCriteria',async()=>{
    const nb=page.getByRole('button',{name:/New Criteria/i}).first();if(await nb.count()){await nb.click();await page.waitForTimeout(300);}else{await page.evaluate(()=>{document.getElementById('questionnaire-box').style.display='block';document.getElementById('result-box').style.display='none';});}
    criteria=await setCriteria(1);const prev=report.matches.at(-1)?.title||'';const b=page.getByRole('button',{name:/Consult AI Concierge/i}).first();await b.click();await awaitMatch(prev);const m=await gatherMatch(4,criteria,'different criteria');await translateCurrent('de',4);await restoreEnglish();return {title:m.title};
  });
  await attempt('match5DifferentCriteria',async()=>{
    const nb=page.getByRole('button',{name:/New Criteria/i}).first();if(await nb.count()){await nb.click();await page.waitForTimeout(300);}else{await page.evaluate(()=>{document.getElementById('questionnaire-box').style.display='block';document.getElementById('result-box').style.display='none';});}
    criteria=await setCriteria(2);const prev=report.matches.at(-1)?.title||'';const b=page.getByRole('button',{name:/Consult AI Concierge/i}).first();await b.click();await awaitMatch(prev);const m=await gatherMatch(5,criteria,'different criteria');await translateCurrent('ko',5);await restoreEnglish();return {title:m.title};
  });

  const titles=report.matches.map(x=>x.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()).filter(Boolean);
  const dup=[...new Set(titles.filter((t,i)=>titles.indexOf(t)!==i))];
  if(report.matches.length<5)finding('fail','matching',`Only ${report.matches.length}/5 requested live matches completed`,{mechanisms:mech});
  else if(dup.length)finding('fail','matching','A title repeated within the five-match QA session',{duplicates:dup,matches:report.matches.map(x=>x.title)});
  else finding('pass','matching','Five requested matches completed without repeating a title',{titles:report.matches.map(x=>x.title)});
  const badPosters=report.matches.filter(x=>!x.poster.complete||x.poster.naturalWidth<120||x.poster.naturalHeight<120);
  if(badPosters.length)finding('fail','match posters',`${badPosters.length} matched result(s) had a missing/broken poster`,{titles:badPosters.map(x=>({title:x.title,poster:x.poster}))});
  else if(report.matches.some(x=>!x.poster.officialTmdb))finding('warn','match posters','All five posters loaded, but at least one movie/TV result was not served from TMDB original artwork',{posters:report.matches.map(x=>({title:x.title,src:x.poster.src,officialTmdb:x.poster.officialTmdb}))});
  else finding('pass','match posters','All completed movie/TV match posters loaded from TMDB artwork');
  const infoBad=report.matches.filter(x=>!x.synopsis||x.synopsis.length<35||!x.stream);
  if(infoBad.length)finding('warn','match metadata',`${infoBad.length} match result(s) lacked a substantial synopsis and/or stream link`,{items:infoBad.map(x=>({title:x.title,synopsisLength:x.synopsis.length,stream:x.stream,platform:x.platform}))});
  else finding('pass','match metadata','Completed matches had synopsis and stream-link metadata');
  const trBad=report.translations.filter(x=>!x.ok);
  if(report.translations.length<Math.min(5,report.matches.length)||trBad.length)finding('warn','translations',`${trBad.length} localization check(s) did not visibly replace the English synopsis`,{checks:report.translations});
  else finding('pass','translations','Synopsis localization visibly changed for each tested match/language',{languages:report.translations.map(x=>x.lang)});

  await attempt('searchExactTitle',async()=>{
    await page.locator('#specific-search').fill('Breaking Bad');
    await page.locator('#specific-search-btn').click();
    await page.waitForTimeout(2500);
    const body=safeText(await page.locator('body').innerText(),1000);
    if(!/Breaking Bad/i.test(body))throw new Error('Exact-title search did not surface Breaking Bad within 2.5s');
    return {found:true};
  });
  await attempt('matchTogetherNavigation',async()=>{
    await page.goto(BASE+'/together/',{waitUntil:'domcontentloaded',timeout:20000});await page.waitForTimeout(1000);return {title:await page.title(),controls:await page.locator('button,input,select').count()};
  });
  await attempt('kidsNavigation',async()=>{
    await page.goto(BASE+'/kids/',{waitUntil:'domcontentloaded',timeout:20000});await page.waitForTimeout(1200);return {title:await page.title(),cards:await page.locator('.kids-card,[data-title]').count()};
  });
  report.mechanisms=mech;
  for(const [k,v] of Object.entries(mech)){
    if(v.ok)finding('pass','mechanism',`${k} worked`,{detail:v}); else finding('warn','mechanism',`${k} did not complete`,{detail:v});
  }
  if(errors.length)finding('warn','mechanisms','Runtime page errors occurred during mechanism/match testing',{errors});
  await ctx.close();
}

async function purchaseAudit(){
  const ctx=await browser.newContext({viewport:{width:1365,height:900},locale:'en-US'});
  const p=await ctx.newPage();
  await p.goto(BASE+'/pricing/pricing.html?qa_purchase=1',{waitUntil:'domcontentloaded',timeout:25000});await p.waitForTimeout(1800);
  const candidates=await p.evaluate(()=>[...document.querySelectorAll('a,button')].map((el,i)=>({i,tag:el.tagName,label:(el.innerText||el.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ').slice(0,120),href:el.href||'',onclick:el.getAttribute('onclick')||'',visible:!!(el.offsetWidth||el.offsetHeight||el.getClientRects().length)})).filter(x=>x.visible&&(/buy\.stripe\.com|checkout|purchase|buy|upgrade|vip|credits|matches/i.test(x.href+' '+x.onclick+' '+x.label))));
  const dedup=[];const seen=new Set();for(const c of candidates){const key=c.href||c.label+'|'+c.onclick;if(key&&!seen.has(key)){seen.add(key);dedup.push(c)}}
  const stripeDirect=dedup.filter(x=>/buy\.stripe\.com/i.test(x.href));
  const toTest=stripeDirect.slice(0,20);
  for(let i=0;i<toTest.length;i++){
    const c=toTest[i];
    const page=await ctx.newPage();
    let popup=null,error='';
    try{
      await page.goto(BASE+'/pricing/pricing.html?qa_purchase_click='+i,{waitUntil:'domcontentloaded',timeout:20000});await page.waitForTimeout(650);
      const link=page.locator(`a[href="${c.href.replaceAll('"','\\"')}"]`).first();
      if(!(await link.count()))throw new Error('purchase link disappeared on fresh pricing load');
      const popPromise=ctx.waitForEvent('page',{timeout:4500}).catch(()=>null);
      await link.click({timeout:5000});
      popup=await popPromise;
      const dest=popup||page;
      await dest.waitForTimeout(1400);
      const url=dest.url();
      const title=await dest.title().catch(()=> '');
      const txt=safeText(await dest.locator('body').innerText().catch(()=>''),450);
      report.purchases.push({label:c.label,sourceHref:c.href,destination:url,title:safeText(title,120),stripe:/stripe\.com/i.test(url),paymentFormVisible:/card|payment|email|pay|subscribe|total|recurring/i.test(txt),bodySnippet:txt,error:''});
    }catch(e){error=safeText(e.message,250);report.purchases.push({label:c.label,sourceHref:c.href,destination:popup?.url?.()||page.url(),stripe:false,paymentFormVisible:false,error});}
    await popup?.close().catch(()=>{});await page.close().catch(()=>{});
  }
  report.mechanisms.purchaseCandidates={count:candidates.length,directStripe:stripeDirect.length,labels:stripeDirect.map(x=>x.label)};
  if(!toTest.length)finding('fail','purchases','No direct Stripe purchase CTA was found on pricing');
  else{
    const bad=report.purchases.filter(x=>!x.stripe||x.error);
    if(bad.length)finding('fail','purchases',`${bad.length}/${report.purchases.length} clicked purchase CTA(s) did not reach Stripe checkout`,{bad});
    else finding('pass','purchases',`All ${report.purchases.length} clicked purchase CTA(s) reached Stripe checkout; no payment was submitted`);
  }
  await ctx.close();
}

try{await sitemapAudit();}catch(e){finding('fail','audit','Sitemap phase crashed',{error:safeText(e.stack||e)});}
try{await deviceAudit('desktop',{viewport:{width:1440,height:1000},locale:'en-US'});}catch(e){finding('fail','desktop','Desktop phase crashed',{error:safeText(e.stack||e)});}
try{await deviceAudit('mobile',{viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:'en-US'});}catch(e){finding('fail','mobile','Mobile phase crashed',{error:safeText(e.stack||e)});}
try{await mechanismsAndMatches();}catch(e){finding('fail','mechanisms','Mechanism/matching phase crashed',{error:safeText(e.stack||e)});}
try{await purchaseAudit();}catch(e){finding('fail','purchases','Purchase phase crashed',{error:safeText(e.stack||e)});}

report.finishedAt=new Date().toISOString();
report.notes.push('Purchase simulation stops after reaching Stripe checkout; no card data was entered and no real charge was attempted.');
report.notes.push('Matches 1–3 use normal anonymous quota. After quota enforcement is probed, only match_dailyCount is reset in the QA browser so matches 4–5 can exercise duplicate/history behavior without a paid account; shown-title history is preserved.');
fs.writeFileSync('qa-report.json',JSON.stringify(report,null,2));
console.log('QA_SUMMARY='+JSON.stringify({summary:report.summary,sitemap:report.sitemap,desktop:report.devices.desktop?.performance,mobile:report.devices.mobile?.performance,purchases:report.purchases.map(x=>({label:x.label,stripe:x.stripe,error:x.error,destination:x.destination})),matches:report.matches.map(x=>({i:x.index,title:x.title,poster:x.poster,platform:x.platform,stream:x.stream,synopsis:safeText(x.synopsis,180)})),translations:report.translations,mechanisms:report.mechanisms,findings:report.findings}));
await browser.close();
process.exit(0);
