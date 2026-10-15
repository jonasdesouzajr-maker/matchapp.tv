'use strict';
// Real rendered geometry and existing interactions, never simulated AI/auth.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts',process.env.MATCHAPP_QA_OUT||'video-spacing');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{try{let f=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(f!==root&&!f.startsWith(root+path.sep))throw Error();if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f))throw Error();res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).on('error',()=>res.end()).pipe(res)}catch{res.writeHead(404).end()}});
const langs=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
async function geometry(page){return page.evaluate(()=>{
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
 const problems=[],rows=[];
 for(const nav of document.querySelectorAll('header.app-header > nav,.hub-links')){
  if(!visible(nav))continue;
  const controls=[...nav.children].filter(visible);
  for(const e of controls){const r=e.getBoundingClientRect(),n=nav.getBoundingClientRect();
   if(r.left<n.left-1||r.right>n.right+1||r.bottom>n.bottom+1)problems.push('outside nav: '+(e.id||e.className));
   if(!e.classList.contains('ma-menu-wrap')&&r.height<43.5)problems.push('short control: '+(e.id||e.className)+' '+r.height);
   for(const child of e.querySelectorAll(':scope > span,:scope > img,:scope > svg')){if(!visible(child)||child.classList.contains('matchapp-notification-count'))continue;const c=child.getBoundingClientRect();if(c.left<r.left-1||c.right>r.right+1||c.top<r.top-1||c.bottom>r.bottom+1)problems.push('control content outside border: '+(e.id||e.className))}
   if(e.matches('.ma-luxe-shortcut')){const text=e.querySelector('span');if(text){const t=text.getBoundingClientRect();if(t.left<r.left||t.right>r.right+.5||t.bottom>r.bottom-.5||text.scrollWidth>text.clientWidth+1)problems.push('clipped label: '+text.textContent)}}
  }
  for(let i=0;i<controls.length;i++)for(let j=i+1;j<controls.length;j++){const a=controls[i].getBoundingClientRect(),b=controls[j].getBoundingClientRect();const overlapX=Math.min(a.right,b.right)-Math.max(a.left,b.left),overlapY=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);if(overlapX>1&&overlapY>1)problems.push('overlapping controls');}
  if(nav.classList.contains('ma-luxe-shortcuts')||location.pathname==='/together.html'){const count={};controls.forEach(e=>{const y=Math.round(e.getBoundingClientRect().top);count[y]=(count[y]||0)+1});rows.push(...Object.values(count));if(controls.length>2&&Object.values(count).includes(1))problems.push('orphan shortcut row')}
 }
 const portrait=document.querySelector('#ma-ambient-jonas.ja-header-default');
 if(portrait&&visible(portrait)){const a=portrait.getBoundingClientRect();for(const e of document.querySelectorAll('header .ma-brand-title-line,header .matchapp-wordmark:not(.matchapp-wordmark-source),header .matchapp-live-wordmark')){if(!visible(e))continue;const b=e.getBoundingClientRect();if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)problems.push('portrait overlaps brand')}}
 return{overflow:document.documentElement.scrollWidth-innerWidth,problems,rows,headerHeight:document.querySelector('header.app-header')?.getBoundingClientRect().height};
})}
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,...(process.env.MATCHAPP_BROWSER_CHANNEL?{channel:process.env.MATCHAPP_BROWSER_CHANNEL}:{})});const report=[];
 try{for(const width of (process.env.MATCHAPP_QA_WIDTHS?process.env.MATCHAPP_QA_WIDTHS.split(',').map(Number):process.env.QUICK?[390]:[320,390,432,820,1440])){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
  await context.addInitScript(()=>{localStorage.setItem('match_lang','en');localStorage.setItem('match_soundEnabled','false');localStorage.setItem('match_cookie_choice','essential')});
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  const page=await context.newPage();
  for(const route of (process.env.MATCHAPP_QA_ROUTES?process.env.MATCHAPP_QA_ROUTES.split(','):['/','/together.html','/discover.html','/profile/profile.html','/pricing/pricing.html','/explore.html','/ebooks/','/cooking/','/news/','/events-archive.html','/friends.html','/about.html','/contact.html','/register.html'])){
   if(process.env.QUICK&&!process.env.MATCHAPP_QA_ROUTES&&!['/','/together.html'].includes(route))continue;
   await page.goto(base+route,{waitUntil:'domcontentloaded'});await page.waitForTimeout(1300);
   console.log('ROUTE',width,route);
   let result=await geometry(page);report.push({width,route,lang:'en',...result});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
   if(route==='/'||route==='/together.html'||width===320||width===1440||result.problems.length)await page.screenshot({path:path.join(out,(route==='/'?'home':route.replace(/[^a-z0-9]/gi,'_'))+'-'+width+'.png'),animations:'disabled'});
   if(route==='/'&&!process.env.QUICK){
    const select=page.locator('#lang-switcher-host select').first();
    for(const lang of langs){await select.selectOption(lang);await page.waitForTimeout(120);result=await geometry(page);report.push({width,route,lang,...result})}
    await select.selectOption('en');
    await page.locator('.ma-menu-button').click();
    if(!await page.locator('.ma-menu').isVisible())throw Error('Settings no longer opens');
    await page.locator('.ma-menu-button').click();
    const sound=page.locator('.sound-toggle-btn').first(),state=await sound.getAttribute('aria-pressed');await sound.click();if(await sound.getAttribute('aria-pressed')===state)throw Error('Sound control no longer toggles');await sound.click();
    await page.locator('#ma-worlds-trigger').click();if(!await page.locator('.ma-worlds-panel').isVisible())throw Error('Explore no longer opens');await page.locator('[data-worlds-dismiss="close"]').click();
   }
   if(['/together.html','/pricing/pricing.html','/explore.html'].includes(route)){
    for(const lang of langs){await page.evaluate(lang=>{window.setLanguage(lang);if(document.documentElement.lang!==lang)throw Error('Language did not change to '+lang)},lang);await page.waitForTimeout(150);result=await geometry(page);report.push({width,route,lang,...result})}
    await page.evaluate(()=>window.setLanguage('en'));
   }
  }await context.close();console.log('CHECKED',width);
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
 const bad=report.filter(r=>r.overflow>1||r.problems.length);console.log(JSON.stringify({checks:report.length,failures:bad},null,2));if(bad.length)process.exitCode=1;
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
