import { chromium } from 'playwright';

const base = process.env.MATCHAPP_AUDIT_URL || 'http://127.0.0.1:4173/index.html?incidentAudit=1';
const browser = await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--no-sandbox']});
const page = await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
const warnings=[];
page.on('pageerror',e=>errors.push(String(e?.stack||e)));
page.on('console',m=>{ if(m.type()==='error') errors.push('console: '+m.text()); else if(m.type()==='warning') warnings.push(m.text()); });
page.on('requestfailed',r=>{ const u=r.url(); if(u.startsWith('http://127.0.0.1:4173')) errors.push(`requestfailed ${u} ${r.failure()?.errorText||''}`); });

// Keep the incident audit deterministic: first-party JS must stay responsive even
// if ads/analytics/CDNs/API endpoints are unavailable. External calls are aborted;
// a separate live check is done only after a tested commit is deployed.
await page.route('**/*', route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1'||u.hostname==='localhost') return route.continue();
  return route.abort('blockedbyclient');
});

const result={url:base,navigation:false,heartbeat:[],scroll:[],clicks:[],errors,warnings,metrics:{}};
async function bounded(label, fn, ms=2500){
  const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout after ${ms}ms`)),ms));
  return Promise.race([fn(),timeout]);
}
try{
  await page.goto(base,{waitUntil:'domcontentloaded',timeout:15000});
  result.navigation=true;
  await page.waitForTimeout(700);
  for(let i=0;i<12;i++){
    const t0=Date.now();
    try{
      const snap=await bounded('heartbeat',()=>page.evaluate(()=>({
        ready:document.readyState,
        y:scrollY,
        h:document.documentElement.scrollHeight,
        buttons:document.querySelectorAll('button,a,[role="button"]').length,
        scripts:[...document.scripts].filter(s=>s.src).map(s=>s.src),
        skipped:window.__MATCHAPP_SKIPPED_HEAVY_STARTUP__||0
      })),1800);
      result.heartbeat.push({i,ms:Date.now()-t0,...snap});
    }catch(e){result.heartbeat.push({i,failed:String(e)});break;}
    await page.waitForTimeout(250);
  }
  const height=await bounded('height',()=>page.evaluate(()=>document.documentElement.scrollHeight));
  for(const f of [0,.2,.4,.6,.8,1]){
    try{
      const t0=Date.now();
      const s=await bounded('scroll',()=>page.evaluate(frac=>{
        const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
        scrollTo(0,Math.round(max*frac));
        return {y:scrollY,max,active:document.activeElement?.tagName||''};
      },f),1800);
      result.scroll.push({f,ms:Date.now()-t0,...s});
      await page.waitForTimeout(180);
    }catch(e){result.scroll.push({f,failed:String(e)});break;}
  }
  const selectors=['#surprise-btn','#match-btn','.match-btn','#ask-ai-btn','.concierge-button','.auth-btn','.install-btn'];
  for(const sel of selectors){
    try{
      const loc=page.locator(sel).first();
      if(await loc.count() && await loc.isVisible({timeout:300})){
        const enabled=await loc.isEnabled().catch(()=>true);
        result.clicks.push({selector:sel,visible:true,enabled});
      }
    }catch(e){result.clicks.push({selector:sel,failed:String(e)});}
  }
  result.metrics=await bounded('metrics',()=>page.evaluate(()=>({
    scrollHeight:document.documentElement.scrollHeight,
    bodyText:document.body?.innerText?.length||0,
    imgCount:document.images.length,
    imgComplete:[...document.images].filter(i=>i.complete).length,
    emptyImages:[...document.images].filter(i=>!i.getAttribute('src')).length,
    hiddenSections:[...document.querySelectorAll('section')].filter(s=>getComputedStyle(s).display==='none').length,
    visibleInteractive:[...document.querySelectorAll('button,a,[role="button"]')].filter(el=>{const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.display!=='none'}).length,
    skippedHeavy:window.__MATCHAPP_SKIPPED_HEAVY_STARTUP__||0
  })),2000);
}catch(e){errors.push('fatal: '+String(e?.stack||e));}

const heartbeatFailed=result.heartbeat.some(x=>x.failed);
const scrollFailed=result.scroll.some(x=>x.failed);
const internalErrors=errors.filter(e=>/127\.0\.0\.1|fatal:|TypeError|ReferenceError|SyntaxError/i.test(e));
result.ok=!!result.navigation&&!heartbeatFailed&&!scrollFailed&&internalErrors.length===0;
console.log('MATCHAPP_BROWSER_AUDIT='+JSON.stringify(result));
await browser.close();
// Never fail the diagnostic workflow itself; GitHub stays green while the JSON
// above tells the incident responder whether this candidate is safe.
process.exit(0);
