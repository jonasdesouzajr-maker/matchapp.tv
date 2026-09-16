import { chromium } from 'playwright';

const base = process.env.MATCHAPP_AUDIT_URL || 'http://127.0.0.1:4173/index.html?incidentAudit=1';
const browser = await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--no-sandbox']});
const scenarios = [
  ['baseline', []],
  ['no-experience-v2', ['experience-v2.js']],
  ['no-final-audit', ['final-audit.js']],
  ['no-roadmap-runtime', ['roadmap-runtime.js']],
  ['no-chrome-launcher', ['chrome-launcher.js']],
  ['no-final-wiring', ['final-wiring.js']],
  ['no-app', ['app.js']],
  ['no-build-meta', ['build-meta.js']],
  ['no-late-enhancements', ['experience-v2.js','final-audit.js','roadmap-runtime.js','chrome-launcher.js']],
  ['no-hardening-bundle', ['production-hardening.js','shown-history.js','match-speed.js']],
  ['core-only', ['experience-v2.js','final-audit.js','roadmap-runtime.js','chrome-launcher.js','production-hardening.js','shown-history.js','match-speed.js','ads-init.js','global-events.js','title-captions.js','poster-wall.js','ambient.js','marquee-autoplay.js']]
];

async function bounded(label, fn, ms=1400){
  const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error(`${label} timeout after ${ms}ms`)),ms));
  return Promise.race([fn(),timeout]);
}

async function run(name, blocked){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',e=>errors.push(String(e?.message||e)));
  await page.route('**/*', route=>{
    const req=route.request();
    const u=new URL(req.url());
    if(u.hostname!=='127.0.0.1'&&u.hostname!=='localhost') return route.abort('blockedbyclient');
    if(req.resourceType()==='script' && blocked.some(x=>u.pathname.endsWith('/'+x)||u.pathname.endsWith(x))) return route.abort('blockedbyclient');
    return route.continue();
  });
  const out={name,blocked,navigation:false,responsive:false,errors:[]};
  try{
    await page.goto(base+'&scenario='+encodeURIComponent(name),{waitUntil:'domcontentloaded',timeout:9000});
    out.navigation=true;
    await page.waitForTimeout(500);
    const t0=Date.now();
    const snap=await bounded(name,()=>page.evaluate(()=>({
      ready:document.readyState,
      y:scrollY,
      h:document.documentElement.scrollHeight,
      buttons:document.querySelectorAll('button,a,[role="button"]').length,
      skipped:window.__MATCHAPP_SKIPPED_HEAVY_STARTUP__||0
    })),1400);
    out.heartbeatMs=Date.now()-t0;
    out.snapshot=snap;
    const scroll=await bounded(name+' scroll',()=>page.evaluate(()=>{
      const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
      scrollTo(0,Math.round(max*.55));
      return {y:scrollY,max};
    }),1400);
    out.scroll=scroll;
    out.responsive=true;
  }catch(e){out.failure=String(e?.message||e);}
  out.errors=errors.slice(0,8);
  try{await context.close();}catch(_){}
  console.log('MATCHAPP_BISECT_SCENARIO='+JSON.stringify(out));
  return out;
}

const results=[];
for(const [name,blocked] of scenarios) results.push(await run(name,blocked));
console.log('MATCHAPP_BISECT='+JSON.stringify(results));
await browser.close();
process.exit(0);
