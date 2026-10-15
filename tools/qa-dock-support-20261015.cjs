'use strict';
// Render the real adult pages, keeping navigation and native disclosure handlers.
// No backend, speech, billing or authentication success is simulated here.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/signature-ui');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const server=http.createServer((req,res)=>{try{let f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(f!==root&&!f.startsWith(root+path.sep)){res.writeHead(403).end();return}if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){res.writeHead(404).end();return}res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).on('error',()=>res.end()).pipe(res)}catch{res.writeHead(404).end()}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,channel:process.env.MATCHAPP_BROWSER_CHANNEL||'chrome'});
try{for(const width of [320,390,820,1100,1440,1920]){
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await context.route('**/*',r=>{const u=new URL(r.request().url());return u.origin===base||/(^|\.)(paypal\.com|paypalobjects\.com)$/.test(u.hostname)?r.continue():r.abort()});const page=await context.newPage();await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.waitForTimeout(1600);
 const cookie=page.locator('.ma-cookie .no');if(await cookie.isVisible())await cookie.click();
 const labels=await page.locator('#mh-topbox .ma-how-button').evaluateAll(es=>es.map(e=>{const b=e.getBoundingClientRect(),r=document.createRange();r.selectNodeContents(e);return {height:b.height,text:r.getBoundingClientRect().height,display:getComputedStyle(e).display}}));assert(labels.every(x=>x.height>=44&&x.display==='flex'&&x.text<=x.height));
 if(width>=1100){
  for(const lang of ['en','pt-BR','de','ar']){
   await page.locator('#lang-switcher-host select').first().selectOption(lang);await page.waitForTimeout(200);
   const state=await page.evaluate(()=>{const r=document.querySelector('#ma-jonas-home .jh-bubble').getBoundingClientRect(),slot=document.getElementById('ma-jonas-header-slot').getBoundingClientRect(),head=document.querySelector('#mh-topbox .mh-head').getBoundingClientRect();return {bubble:{x:r.x,y:r.y,w:r.width,h:r.height},slot:{x:slot.x,y:slot.y,w:slot.width,h:slot.height},inside:r.left>=head.left&&r.right<=head.right&&r.top>=head.top&&r.bottom<=head.bottom,overflow:document.documentElement.scrollWidth-innerWidth}});
   assert(state.inside,JSON.stringify({width,lang,...state}));assert(state.overflow<=2);console.log('PASS_HEADER_DOCK',width,lang,JSON.stringify(state));
  }
  await page.locator('#lang-switcher-host select').first().selectOption('en');await page.screenshot({path:path.join(out,'desktop-dock-'+width+'.png')});
 }
 await page.locator('#ma-donate-pill').click();await page.locator('#ma-donate-support').scrollIntoViewIfNeeded();
 assert.equal(await page.locator('#ma-donate-checkout').isEnabled(),true);
 await page.locator('#ma-donate-amount').fill('12.75');
 const url=await page.evaluate(()=>window.MatchAppSupportDonations.paymentUrl());const parsed=new URL(url);assert.equal(parsed.searchParams.get('business'),'jonasdesouzajr@outlook.com');assert.equal(parsed.searchParams.get('amount'),'12.75');
 await page.locator('#ma-donate-support').screenshot({path:path.join(out,'support-'+width+'.png')});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth<=2));
 if(width===1440){const [popup]=await Promise.all([page.waitForEvent('popup'),page.locator('#ma-donate-checkout').click()]);await popup.waitForLoadState('domcontentloaded');await popup.waitForTimeout(900);assert.equal(new URL(popup.url()).hostname,'www.paypal.com');await popup.getByText('jonasdesouzajr@outlook.com',{exact:true}).first().waitFor({timeout:20000});const text=await popup.locator('body').innerText();console.log('PAYPAL_CHECKOUT_PAGE',text.slice(0,300));assert(text.includes('jonasdesouzajr@outlook.com'));console.log('PASS_LIVE_PAYPAL_RECIPIENT');await popup.close();}
 await context.close();console.log('PASS_DOCK_SUPPORT',width);
}console.log('DOCK_SUPPORT_ALL_PASS');}finally{await browser.close();server.close()}})().catch(e=>{console.error(e);server.close();process.exitCode=1});
