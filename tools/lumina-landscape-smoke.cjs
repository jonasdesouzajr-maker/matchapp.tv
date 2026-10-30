'use strict';
/* Focused, local-only regression for the real Lumina launcher and child document.
 * Run: node tools/lumina-landscape-smoke.cjs [--case=landscape|continuity|large|matrix|rtl]
 *      [--browser=chromium|firefox]
 * Optional: LUMINA_LANDSCAPE_OUTPUT, PLAYWRIGHT_BROWSERS_PATH.
 * LUMINA_LANDSCAPE_BASELINE_DIR may contain reviewed pre-change files at their
 * repository-relative paths for an explicit before/after reproduction.
 * No live service, account, registration, ad SDK, APK or emulator is used.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const {chromium,firefox} = require('playwright');
const campaign = require('../lumina-match/browser/campaign.js');

const ROOT = path.resolve(__dirname,'..');
const PREFIX = '/lumina-match/browser/';
const HARNESS = '/__lumina-landscape__/launcher.html';
const BASELINE = process.env.LUMINA_LANDSCAPE_BASELINE_DIR && path.resolve(process.env.LUMINA_LANDSCAPE_BASELINE_DIR);
const OUTPUT = process.env.LUMINA_LANDSCAPE_OUTPUT ? path.resolve(process.env.LUMINA_LANDSCAPE_OUTPUT) : fs.mkdtempSync(path.join(os.tmpdir(),'lumina-landscape-smoke-'));
const selected = process.argv.find(arg => arg.startsWith('--case='))?.slice(7) || 'all';
assert(['all','landscape','continuity','large','matrix','rtl'].includes(selected),'Unknown --case');
const engine = process.argv.find(arg => arg.startsWith('--browser='))?.slice(10) || 'chromium';
assert(['chromium','firefox'].includes(engine),'Unknown --browser');
fs.mkdirSync(OUTPUT,{recursive:true});
const report = {startedAt:new Date().toISOString(),case:selected,engine,baseline:BASELINE || null,
  scope:'Actual local launcher, game, assets and progress bridge; local synthetic account progress only for level 249. No production request or device claim.',
  checks:[],layouts:[],artwork:[],screenshots:[],errors:[]};
const MIME = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.jpg':'image/jpeg','.png':'image/png','.mp3':'audio/mpeg','.svg':'image/svg+xml'};

function fixture(level) {
  return {version:2,points:150,rounds:15,activeRound:null,campaign:{unlocked:level,
    results:Array.from({length:250},(_,i) => i < level-1 ? [3,20,60] : null),
    activeLevel:{level,cards:campaign.deck(level,() => .375),moves:0,elapsedSeconds:0,timed:false,hintsUsed:0}}};
}
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
  if (url.pathname === '/favicon.ico') { res.writeHead(204).end(); return; }
  if (url.pathname === HARNESS) {
    const lang = ['pt-BR','ar','en'].includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'pt-BR';
    const level = Number(url.searchParams.get('level') || 1);
    if (!Number.isInteger(level) || level < 1 || level > 250) { res.writeHead(400).end(); return; }
    const progress = level > 1 ? fixture(level) : null;
    res.writeHead(200,{'Content-Type':MIME['.html'],'Cache-Control':'no-store'});
    res.end(`<!doctype html><html lang="${lang}" dir="${lang === 'ar' ? 'rtl' : 'ltr'}" class="reduce-motion"><head>
      <meta name="viewport" content="width=device-width,initial-scale=1"><title>Local Lumina landscape fixture</title>
      <style>html,body{margin:0;min-height:100%;font-family:system-ui;background:#0f0c1d;color:white}main{padding:12px}.home-hero{text-align:center;font-size:14px}button{font:inherit}</style>
      <link rel="stylesheet" href="/lumina-match/lumina.css">
      <script>
      // Only this in-memory transport is synthetic. Real launcher and bridge run.
      window.__fixtureRecord={revision:0,progress:${JSON.stringify(progress)}};
      window.supabaseClient={auth:{getSession:async()=>({data:{session:${progress ? "{access_token:'local-fixture-never-transmitted',user:{id:'00000000-0000-4000-8000-000000000001',is_anonymous:false}}" : 'null'}},error:null})},
        rpc:(_name,input)=>({setHeader(){return this},abortSignal(){return this},then(resolve,reject){
          if(input.p_action==='save_progress')window.__fixtureRecord={revision:window.__fixtureRecord.revision+1,progress:structuredClone(input.p_payload.progress)};
          return Promise.resolve({data:structuredClone(window.__fixtureRecord),error:null}).then(resolve,reject);
        }})};
      </script><script defer src="/lumina-match/launcher.js"></script></head>
      <body class="page-home"><main><header class="home-hero"><h1>MatchApp Ai local fixture</h1></header></main></body></html>`);
    return;
  }
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch (_) { res.writeHead(400).end(); return; }
  const root = path.join(ROOT,'lumina-match');
  let file = path.resolve(ROOT,'.'+pathname);
  if (!file.startsWith(root+path.sep)) { res.writeHead(404).end(); return; }
  if (BASELINE) {
    const prior = path.resolve(BASELINE,'.'+pathname);
    if (prior.startsWith(BASELINE+path.sep) && fs.existsSync(prior)) file = prior;
  }
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('not a file');
    res.writeHead(200,{'Content-Type':MIME[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).on('error',() => res.destroy()).pipe(res);
  } catch (_) { res.writeHead(404).end(); }
});

function check(label,condition,detail) {
  report.checks.push({label,ok:!!condition,...(detail === undefined ? {} : {detail})});
  console.log((condition ? 'PASS ' : 'FAIL ')+label);
  assert(condition,label+(detail === undefined ? '' : ': '+JSON.stringify(detail)));
}
async function screenshot(page,label) {
  const file = path.join(OUTPUT,label.replace(/[^a-z0-9_-]/gi,'-')+'.png');
  await page.screenshot({path:file}); report.screenshots.push(file);
}
async function settleArtwork(frame) {
  const decoded=await frame.evaluate(async()=>{
    await document.fonts.ready;
    const urls=[...new Set([...document.querySelectorAll('.card .face')].map(el=>getComputedStyle(el).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1]).filter(Boolean))];
    let timeout;
    try {
      const loaded=await Promise.race([
        Promise.all(urls.map(src=>new Promise((resolve,reject)=>{
          const image=new Image();
          image.onload=()=>image.decode().then(()=>resolve({src,width:image.naturalWidth,height:image.naturalHeight}),reject);
          image.onerror=()=>reject(new Error('Card artwork failed to load: '+src));
          image.src=src;
        }))),
        new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Timed out decoding card artwork')),5000);})
      ]);
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      return loaded;
    } finally {clearTimeout(timeout);}
  });
  report.artwork.push({frame:frame.url(),decoded});
}
async function geometry(frame) {
  return frame.evaluate(() => {
    const box = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}; };
    const board=document.querySelector('.board-area'), grid=document.querySelector('.grid');
    const cards=[...document.querySelectorAll('[data-card]')].map(el=>({index:Number(el.dataset.card),...box(el)}));
    const controls=[...document.querySelectorAll('button:not([data-card])')].filter(el=>el.getClientRects().length && !el.closest('dialog:not([open])') && getComputedStyle(el).visibility!=='hidden').map(el=>({label:el.dataset.action || el.getAttribute('aria-label') || el.textContent.trim(),...box(el)}));
    return {width:innerWidth,height:innerHeight,dir:document.documentElement.dir,scrollX,scrollY,
      documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,
      bodyWidth:document.body.scrollWidth,bodyHeight:document.body.scrollHeight,cards,controls,
      board:board && {...box(board),clientWidth:board.clientWidth,scrollWidth:board.scrollWidth,clientHeight:board.clientHeight,scrollHeight:board.scrollHeight,scrollTop:board.scrollTop,overflowY:getComputedStyle(board).overflowY},
      grid:grid && box(grid)};
  });
}
function assertBoard(label,g,{count=8,fit=false,scroll=false}={}) {
  report.layouts.push({label,...g});
  check(label+' has no horizontal page overflow',g.documentWidth<=g.width+1 && g.bodyWidth<=g.width+1 && g.scrollX===0,g);
  check(label+' has every 44px card target',g.cards.length===count && g.cards.every(c=>c.width>=43.5 && c.height>=43.5),g.cards);
  check(label+' preserves 3:4 artwork shape',g.cards.every(c=>Math.abs(c.width/c.height-.75)<.005),g.cards);
  const overlaps=[];
  g.cards.forEach((a,i)=>g.cards.slice(i+1).forEach(b=>{
    if(Math.min(a.right,b.right)-Math.max(a.x,b.x)>.5 && Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y)>.5)overlaps.push([a.index,b.index]);
  }));
  check(label+' has no overlapping card targets',overlaps.length===0,overlaps);
  check(label+' keeps all columns inside the board without horizontal scrolling',g.board.x>=-1 && g.board.right<=g.width+1 && g.board.scrollWidth<=g.board.clientWidth+1 && g.cards.every(c=>c.x>=g.board.x-1 && c.right<=g.board.right+1),{board:g.board,cards:g.cards});
  check(label+' retains 44px control targets',g.controls.every(c=>c.width>=43.5 && c.height>=43.5),g.controls);
  if (fit || scroll) check(label+' keeps page/body unscrolled',g.documentHeight<=g.height+1 && g.bodyHeight<=g.height+1 && g.scrollY===0,g);
  if (fit) check(label+' shows every Level 1 card without scrolling',g.cards.every(c=>c.x>=-1 && c.y>=-1 && c.right<=g.width+1 && c.bottom<=g.height+1),g.cards);
  if (scroll) check(label+' bounds larger-board scrolling inside the board',g.board.y>=-1 && g.board.bottom<=g.height+1 && g.board.height>=58 && ['auto','scroll'].includes(g.board.overflowY) && g.board.scrollHeight>g.board.clientHeight+1,g.board);
}
async function parentBounds(page,label,expected) {
  const g=await page.evaluate(()=>{
    const box=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return {width:innerWidth,height:innerHeight,scrollX,scrollY,documentWidth:document.documentElement.scrollWidth,
      shell:box(document.querySelector('.lm-shell')),frame:box(document.querySelector('.lm-game-frame')),close:box(document.getElementById('lm-close')),
      framebar:box(document.querySelector('.lm-framebar')),locked:document.body.classList.contains('lm-game-open')};
  });
  check(label+' retains actual parent shell and 44px Close',g.locked && g.close.width>=44 && g.close.height>=44 && g.close.x>=g.shell.x && g.close.right<=g.shell.right+1 && g.close.y>=g.shell.y && g.close.bottom<=g.frame.y+1 && g.documentWidth<=g.width+1,g);
  check(label+' leaves the parent 58px framebar unchanged',Math.abs(g.framebar.height-58)<1,g.framebar);
  if(expected)check(label+' uses the expected actual iframe viewport',Math.abs(g.frame.width-expected[0])<1 && Math.abs(g.frame.height-expected[1])<1,g.frame);
}
async function reachable(frame,selector,label) {
  const target=frame.locator(selector);
  await target.scrollIntoViewIfNeeded();
  const g=await target.evaluate(el=>{
    const r=el.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2,top=document.elementFromPoint(x,y);
    return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,viewport:[innerWidth,innerHeight],hit:top===el || el.contains(top),scrollY};
  });
  check(label+' is reachable at its visible hit area',g.width>=43.5 && g.height>=43.5 && g.x>=-1 && g.y>=-1 && g.right<=g.viewport[0]+1 && g.bottom<=g.viewport[1]+1 && g.hit,g);
  return target;
}
async function start(run) {
  await run.page.locator('#lm-launch').tap();
  await run.page.frameLocator('iframe.lm-game-frame').locator('.journey-play:not([disabled])').waitFor();
  run.frame=run.page.frames().find(frame=>frame.url().includes(PREFIX));
  assert(run.frame,'Actual mounted Lumina frame');
  await run.frame.locator('.journey-play').tap();
  await run.frame.locator('#app[data-screen="game"] [data-card]').first().waitFor();
  await settleArtwork(run.frame);
}
async function inFixture(browser,base,name,viewport,lang,level,fn) {
  const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:true,locale:lang==='ar'?'ar':'pt-BR',reducedMotion:'reduce'});
  const page=await context.newPage(), fatal=[],bad=[],external=[];
  const run={context,page,frame:null};
  page.setDefaultTimeout(8000);
  page.on('pageerror',error=>fatal.push(error.message));
  page.on('response',response=>{if(response.status()>=400)bad.push({url:response.url(),status:response.status()});});
  await context.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.origin===base || url.protocol==='data:' || url.protocol==='blob:')return route.continue();
    external.push(url.origin+url.pathname);return route.abort('blockedbyclient');
  });
  try {
    await page.goto(base+HARNESS+'?lang='+lang+'&level='+level,{waitUntil:'networkidle'});
    await page.evaluate(()=>document.body.style.setProperty('overflow','auto','important'));
    await start(run);
    await fn(run);
    check(name+' has no script errors, missing assets or external requests',!fatal.length && !bad.length && !external.length,{fatal,bad,external});
  } catch(error) {
    await screenshot(page,name+'-failure').catch(()=>{});
    throw error;
  } finally { await context.close(); }
}
const round=frame=>frame.evaluate(()=>window.LuminaGameProgress.snapshot().campaign.activeLevel);

async function shortLandscape(browser,base,lang='pt-BR') {
  await inFixture(browser,base,'landscape-'+lang,{width:682,height:276},lang,1,async run=>{
    await parentBounds(run.page,lang+' compact launcher',[670,206]);
    await screenshot(run.page,'level1-670x206-'+lang);
    const g=await geometry(run.frame);
    assertBoard(lang+' 670x206 Level 1',g,{fit:true});
    if(lang==='ar')check('Arabic keeps its RTL direction',g.dir==='rtl',g.dir);
    await reachable(run.frame,'[data-action="pause"]',lang+' compact Pause');
    await reachable(run.frame,'[data-save-game]',lang+' compact Save');
    check(lang+' control reachability does not scroll the child page',await run.frame.evaluate(()=>scrollY===0));
  });
}

async function continuity(browser,base) {
  await inFixture(browser,base,'continuity',{width:358,height:626},'pt-BR',1,async run=>{
    const {page,frame}=run;
    await parentBounds(page,'portrait launcher',[342,552]);
    assertBoard('portrait 342x552',await geometry(frame));
    const first=frame.locator('[data-card="0"]');
    await first.tap();
    const before=await round(frame),label=await first.getAttribute('aria-label');
    check('Portrait touch reveals exactly one card',await first.getAttribute('aria-pressed')==='true');
    await page.setViewportSize({width:682,height:276});
    await frame.waitForTimeout(100);
    await parentBounds(page,'rotated launcher',[670,206]);
    assertBoard('rotated Level 1',await geometry(frame),{fit:true});
    const after=await round(frame);
    check('Orientation preserves selected face and active round',await first.getAttribute('aria-pressed')==='true' && await first.getAttribute('aria-label')===label && before.level===after.level && before.moves===after.moves && JSON.stringify(before.cards)===JSON.stringify(after.cards) && after.elapsedSeconds>=before.elapsedSeconds,{before,after});
    const mate=after.cards.findIndex((card,i)=>i!==0 && card.art===after.cards[0].art);
    await frame.locator('[data-card="'+mate+'"]').tap();
    await frame.waitForFunction(()=>document.querySelectorAll('[data-card].matched').length===2);
    check('Landscape touch matches once and increments moves once',(await round(frame)).moves===1);
    await (await reachable(frame,'[data-action="pause"]','Short-height Pause')).tap();
    const paused=await round(frame);
    await frame.waitForTimeout(1100);
    check('Pause keeps the round timer fixed',(await round(frame)).elapsedSeconds===paused.elapsedSeconds);
    await (await reachable(frame,'[data-action="restart-level"]','Short-height restart')).tap();
    await reachable(frame,'[data-action="confirm-restart"]','Short-height restart confirm');
    await (await reachable(frame,'[data-action="cancel-restart"]','Short-height restart cancel')).tap();
    check('Cancel restart preserves the completed pair',(await round(frame)).moves===1 && await frame.locator('[data-card].matched').count()===2 && !await frame.locator('.restart-confirm').isVisible());
    await (await reachable(frame,'[data-action="resume"]','Short-height Resume')).tap();
    await (await reachable(frame,'[data-save-game]','Short-height Save')).tap();
    await frame.locator('#lumina-register-dialog[open]').waitFor();
    for(const action of ['create','keep','leave','dismiss'])await reachable(frame,'[data-registration="'+action+'"]','Guest '+action);
    await screenshot(page,'guest-save-670x206');
    await (await reachable(frame,'[data-registration="keep"]','Guest Keep playing')).tap();
    check('Guest Keep playing preserves progress and resumes',!await frame.locator('.pause-panel').isVisible() && (await round(frame)).moves===1);
    await page.setViewportSize({width:358,height:626});
    await frame.waitForTimeout(100);
    assertBoard('restored portrait 342x552',await geometry(frame));
    check('Return to portrait retains the same matched pair',(await round(frame)).moves===1 && await frame.locator('[data-card].matched').count()===2);
    await screenshot(page,'portrait-restored-342x552');
    await page.setViewportSize({width:682,height:276});
    await (await reachable(frame,'[data-save-game]','Final compact Save')).tap();
    await (await reachable(frame,'[data-registration="leave"]','Guest Close without saving')).tap();
    await page.locator('#lm-dialog').waitFor({state:'detached'});
    check('Guest Close preserves parent ownership, focus and scrolling',await page.evaluate(()=>document.activeElement.id==='lm-launch' && !document.body.classList.contains('lm-game-open') && document.body.style.getPropertyValue('overflow')==='auto' && document.body.style.getPropertyPriority('overflow')==='important' && !document.querySelector('iframe.lm-game-frame')));
  });
}

async function largeBoard(browser,base) {
  await inFixture(browser,base,'largest-board',{width:682,height:276},'pt-BR',249,async run=>{
    const {page,frame}=run;
    await parentBounds(page,'40-card actual launcher',[670,206]);
    assertBoard('level 249 maximum board',await geometry(frame),{count:40,scroll:true});
    await screenshot(page,'level249-40cards-670x206');
    await frame.locator('[data-card]').last().scrollIntoViewIfNeeded();
    const g=await geometry(frame);
    check('Large board scroll stays inside its bounded viewport',g.board.scrollTop>0 && g.scrollY===0 && await page.evaluate(()=>scrollY===0),g.board);
    await (await reachable(frame,'[data-card="39"]','Last large-board card')).tap();
    check('Last card receives actual touch after board scrolling',await frame.locator('[data-card="39"]').getAttribute('aria-pressed')==='true');
    await (await reachable(frame,'[data-action="pause"]','Large-board Pause')).tap();
    await frame.locator('.pause-panel').waitFor();
    await reachable(frame,'[data-action="resume"]','Pause after last-card scrolling');
    const paused=await frame.locator('.board-area').evaluate(el=>{
      const panel=el.querySelector('.pause-panel').getBoundingClientRect(),board=el.getBoundingClientRect();
      return {scrollTop:el.scrollTop,panel:{y:panel.y,bottom:panel.bottom,height:panel.height},board:{y:board.y,bottom:board.bottom}};
    });
    check('Pause from the last board row reveals its panel inside the board',paused.scrollTop===0 && paused.panel.height>0 && paused.panel.y>=paused.board.y-1 && paused.panel.bottom<=paused.board.bottom+1,paused);
    await screenshot(page,'level249-paused-after-last-row');
    check('Board and controls do not force page scrolling',await frame.evaluate(()=>scrollY===0));
  });
}

async function matrix(browser,base) {
  for(const item of [
    {name:'below-width-breakpoint',width:491,height:276,frame:[479,206],fit:false},
    {name:'at-width-breakpoint',width:492,height:276,frame:[480,206],fit:true},
    {name:'at-height-breakpoint',width:682,height:582,frame:[658,500],fit:true},
    {name:'above-height-breakpoint',width:682,height:583,frame:[658,501],fit:false},
    {name:'normal-desktop',width:1440,height:900,frame:[1416,818],fit:true}
  ])await inFixture(browser,base,item.name,{width:item.width,height:item.height},'pt-BR',1,async run=>{
    await parentBounds(run.page,item.name,item.frame);
    assertBoard(item.name,await geometry(run.frame),{fit:item.fit});
    await screenshot(run.page,item.name);
  });
}

(async()=>{
  let browser;
  try {
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    const base='http://127.0.0.1:'+server.address().port;
    browser=await ({chromium,firefox}[engine]).launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
    report.browser=browser.version();
    const cases={landscape:()=>shortLandscape(browser,base),continuity:()=>continuity(browser,base),large:()=>largeBoard(browser,base),matrix:()=>matrix(browser,base),rtl:()=>shortLandscape(browser,base,'ar')};
    for(const [name,run] of Object.entries(cases))if(selected==='all' || selected===name)await run();
    report.ok=true;
  } catch(error) {
    report.ok=false;report.errors.push({message:error.message,stack:error.stack});process.exitCode=1;console.error(error.stack || error);
  } finally {
    if(browser)await browser.close().catch(()=>{});
    await new Promise(resolve=>server.close(resolve));
    report.finishedAt=new Date().toISOString();
    fs.writeFileSync(path.join(OUTPUT,'report.json'),JSON.stringify(report,null,2)+'\n');
    console.log(JSON.stringify({ok:report.ok,checks:report.checks.length,passed:report.checks.filter(c=>c.ok).length,report:path.join(OUTPUT,'report.json')}));
  }
})();
