'use strict';
// Local rendering checks only: no AI requests, purchases or quota changes.
const fs = require('node:fs'), path = require('node:path'), http = require('node:http');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'artifacts/browser-layout-20261111', process.env.QA_EDITION || 'candidate');
const mime = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png'};
const server = http.createServer((req,res) => {
  let file = path.resolve(root, '.' + new URL(req.url,'http://localhost').pathname);
  if (!file.startsWith(root + path.sep) && file !== root) return res.writeHead(403).end();
  try {if(fs.statSync(file).isDirectory()) file=path.join(file,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);} catch {res.writeHead(404).end();}
});
(async () => {
  fs.mkdirSync(out,{recursive:true}); await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const results=[];
  try {
    for(const width of (process.env.QA_WIDTHS||'320,390,820,1920').split(',').map(Number)) {
      const context=await browser.newContext({viewport:{width,height:width>=1000?1080:844},reducedMotion:'reduce'});
      await context.addInitScript(()=>localStorage.setItem('match_lang','pt-BR'));
      await context.route(/googlesyndication|googletagmanager|google-analytics/,r=>r.abort());
      const page=await context.newPage();
      for(const route of (process.env.QA_ROUTES||'/,/explore.html,/discover.html,/ebooks/,/music.html,/cooking/,/news/,/together.html,/profile/profile.html,/how-it-works.html,/privacy.html,/contact.html').split(',')) {
        const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
        await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
        await page.waitForTimeout(1600);
        const state=await page.evaluate(()=>{
          const rect=e=>e?.getBoundingClientRect().toJSON();
          const visible=e=>e.checkVisibility({checkOpacity:true,checkVisibilityCSS:true});
          const header=document.querySelector('#ma-reference-header'),brand=header?.querySelector('.ma-brand-home-link,.ma-reference-header-brand,.hub-brand,.ebook-hub-brand,.journey-brand');
          const launcher=header?.querySelector('#ma-ambient-jonas,#ma-jonas-home');
          const range=document.createRange();if(brand)range.selectNodeContents(brand);
          const titleRects=[...document.querySelectorAll('.ref-topic-caption h2')].map(e=>({text:e.textContent,r:rect(e),font:getComputedStyle(e).fontSize,wrap:getComputedStyle(e).overflowWrap}));
          return {width:innerWidth,lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth-innerWidth,header:rect(header),brand:rect(brand),brandContent:brand?rect(range):null,launcher:rect(launcher),hero:rect(document.querySelector('.ref-explore-hero')),topics:rect(document.querySelector('#explore-topics')),titleRects,shortControls:[...document.querySelectorAll('button,summary,select')].filter(visible).map(e=>({id:e.id||e.className,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width})).filter(e=>e.h<40||e.w<40)};
        });
        const key=width+'-'+(route==='/'?'home':route.replace(/[^a-z0-9]+/gi,'-'));
        await page.screenshot({path:path.join(out,key+'.png')});
        if(route==='/explore.html') {await page.locator('#explore-topics').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,key+'-cards.png')});}
        results.push({route,...state,errors});page.removeListener('pageerror',onError);
        console.log(width+' '+route+' overflow='+state.overflow+' errors='+errors.length);
      }
      await context.close();
    }
  } finally {await browser.close();server.close();fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(results,null,2));}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
