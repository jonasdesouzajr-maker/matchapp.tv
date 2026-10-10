const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.json':'application/json','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
 let p=decodeURI(new URL(req.url,'http://localhost').pathname);
 let f=path.resolve(root,'.'+p);
 if(!f.startsWith(root)){res.writeHead(403).end();return}
 if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');
 fs.readFile(f,(e,data)=>{if(e){res.writeHead(404).end();return}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(data)});
});
(async()=>{
 await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
 const url='http://127.0.0.1:'+server.address().port;
 try{
  for(const width of [320,390,768,1366]){
   const page=await browser.newPage({viewport:{width,height:920},deviceScaleFactor:1});
   await page.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
   await page.goto(url+'/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForSelector('.ma-luxe-shortcuts .ma-browser-kids',{timeout:15000});
   const v=await page.evaluate(()=>{
    const h=document.querySelector('#mh-topbox'),orb=h.querySelector('.ma-brand-orb-stage'),copy=h.querySelector('.ma-brand-copy'),name=h.querySelector('.ma-wordmark'),ai=h.querySelector('.ma-word-ai');
    const nav=h.querySelector('.ma-luxe-shortcuts'),links=[...nav.querySelectorAll('a')];
    const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
    const kids=h.querySelector('.ma-browser-kids');
    return {
     viewport:innerWidth,htmlScroll:document.documentElement.scrollWidth,
     brandGap:Math.round(rect(copy).left-rect(orb).right),
     head:rect(h),orb:rect(orb),copy:rect(copy),name:rect(name),ai:rect(ai),
     shortcuts:rect(nav),num:links.length,
     kidsVisible:rect(kids).width>0&&getComputedStyle(kids).display!=='none',
     utility:!!h.querySelector('#lang-switcher-host')&&!!h.querySelector('#nav-reg-btn')&&!!h.querySelector('.matchapp-notification-button'),
     navigationStyles:getComputedStyle(links[0]).borderRadius,
     overflowDescendants:[...h.querySelectorAll('*')].filter(e=>{let x=e.getBoundingClientRect();return x.width>0&&(x.left<-3||x.right>innerWidth+3)}).slice(0,6).map(x=>({cls:x.className?.baseVal||x.className,id:x.id}))
    };
   });
   assert.equal(v.num,6,'shortcuts not populated '+JSON.stringify(v));
   assert(v.utility,'existing utility controls missing');
   assert(v.kidsVisible,'web kids entry missing');
   assert(v.brandGap>=11,'brand spacing too tight '+JSON.stringify(v));
   assert(v.head.right<=width+2,'header outside viewport '+JSON.stringify(v));
   assert(v.htmlScroll<=width+4,'document horizontal overflow '+JSON.stringify(v));
   assert(!v.overflowDescendants.length,'header content overflow '+JSON.stringify(v));
   assert(v.name.width>0&&v.ai.width>0,'wordmark invisible');
   await page.screenshot({path:path.join(root,'reports','premium-home-'+width+'.png'),fullPage:false});
   await page.evaluate(()=>{document.documentElement.classList.add('matchapp-ai-android')});
   const hidden=await page.$eval('.ma-browser-kids',e=>getComputedStyle(e).display==='none');
   assert(hidden,'Android must hide browser Kids link');
   console.log('PASS home',width,JSON.stringify({brandGap:v.brandGap,nav:v.num,overflow:v.htmlScroll-width,kidsVisible:v.kidsVisible}));
   await page.close();
  }
  for(const [where,name] of [['/discover.html','discover'],['/pricing/pricing.html','pricing'],['/profile/profile.html','profile'],['/kids/','kids'],['/about.html','about']]){
   const page=await browser.newPage({viewport:{width:390,height:900}});
   await page.route(/https?:\/\/(?!127\.0\.0\.1)/,route=>route.abort());
   await page.goto(url+where,{waitUntil:'domcontentloaded',timeout:45000});
   const x=await page.evaluate(()=>{
    const kids=document.body.classList.contains('page-kids');
    const el=document.querySelector(kids?'link[href*="luxe-kids-browser"]':'link[href*="premium-unified"]');
    const css=el?Array.from(document.styleSheets).find(s=>s.href?.includes(kids?'luxe-kids-browser':'premium-unified')):null;
    return {sheet:!!css,body:document.body.className,h:document.documentElement.scrollWidth,w:innerWidth,kids,language:document.documentElement.lang};
   });
   assert(x.sheet,'stylesheet missing '+name+JSON.stringify(x));
   assert(x.h<=x.w+5,'horizontal overflow '+name+JSON.stringify(x));
   console.log('PASS page',name,JSON.stringify(x));
   await page.close();
  }
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
