'use strict';
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../trends-evidence');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const fpath=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(!fpath.startsWith(root+path.sep)&&fpath!==root){res.writeHead(403).end();return}let f=fpath;try{if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'content-type':mime[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)}catch{res.writeHead(404).end()}});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const base=process.env.TRENDS_QA_BASE||'http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
 try{
  for(const width of [320,390,820,1366])for(const lang of ['en','pt-BR','ar']){
   const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});
   await context.addInitScript(l=>localStorage.setItem('match_lang',l),lang);
   // Local layout checks exclude external network owners; production checks do not.
   if(!process.env.TRENDS_QA_BASE)await context.route('**/*',r=>r.request().url().startsWith(base)?r.continue():r.abort());
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   const response=await page.goto(base+'/guides/streaming-music-books-october-2026/#october-15-trends',{waitUntil:'domcontentloaded'});
   await page.locator('#october-15-trends[lang="'+lang+'"]').waitFor();
   await page.locator('#october-trends-heading').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,(process.env.TRENDS_QA_BASE?'live':'local')+'-'+width+'-'+lang+'.png')});
   const state=await page.evaluate(()=>{const s=document.querySelector('#october-15-trends'),frame=getComputedStyle(document.documentElement,'::after');return {lang:s.lang,overflow:document.documentElement.scrollWidth-innerWidth,frame:frame.borderTopWidth,position:frame.position,heading:s.querySelector('h2').textContent,links:[...s.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),label:a.textContent})),bounds:{left:s.getBoundingClientRect().left,right:s.getBoundingClientRect().right}}});
   if(response.status()!==200||state.overflow>1||state.lang!==lang||state.bounds.left<3||state.bounds.right>width-3)throw Error(JSON.stringify({width,lang,...state}));
   if(parseFloat(state.frame)!==(width>=700?4:3)||state.position!=='fixed')throw Error('Gold frame missing');
   results.push({width,lang,status:response.status(),errors,...state});
   await page.goto(base+'/trending/this-week/',{waitUntil:'domcontentloaded'});
   await page.locator('[data-october-guide-link] a').click();
   await page.waitForURL('**/guides/streaming-music-books-october-2026/#october-15-trends');
   await page.locator('#october-15-trends[lang="'+lang+'"]').waitFor();
   console.log('PASS',width,lang,'layout, frame, localized content, weekly link and navigation');
   await context.close();
  }
  fs.writeFileSync(path.join(out,(process.env.TRENDS_QA_BASE?'live':'local')+'-browser.json'),JSON.stringify({browser:'User-installed Google Chrome; isolated automated profile',version:browser.version(),base,results},null,2));
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
