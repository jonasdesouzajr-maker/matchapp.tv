'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'reports/play-release-20261101'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};
const server=http.createServer((req,res)=>{let p=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!p.startsWith(root+path.sep)&&p!==root){res.writeHead(403).end();return;}try{if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.writeHead(200,{'Content-Type':(mime[path.extname(p)]||'application/octet-stream')+'; charset=utf-8'});fs.createReadStream(p).pipe(res);}catch(_){res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port,args=['--no-sandbox'];if(process.env.HTTP_PROXY)args.push('--proxy-server='+process.env.HTTP_PROXY,'--proxy-bypass-list=127.0.0.1;localhost');const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args}),results=[];
try{
 fs.mkdirSync(out,{recursive:true});
 for(const [width,height] of [[320,480],[390,480],[800,480],[1280,800]]){
  const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce'}),page=await context.newPage();
  try{
   await page.goto(base+'/news/',{waitUntil:'domcontentloaded',timeout:45000});await page.locator('.ja-bubble').click();
   await page.frameLocator('#ma-ambient-chat-frame').locator('#discover-new-input').waitFor({state:'visible',timeout:12000});
   await page.waitForFunction(()=>document.querySelector('#ma-ambient-chat-frame')?.contentDocument?.querySelector('html.matchapp-ambient-frame link[data-ma-ambient-embed]')?.sheet,{},{timeout:20000});
   await page.waitForTimeout(250);
   const state=await page.evaluate(()=>{
    const panel=document.querySelector('#ma-ambient-panel'),hello=panel.querySelector('.ja-hello'),frame=panel.querySelector('iframe'),input=frame.contentDocument.querySelector('#discover-new-input');
    const rect=e=>{const r=e.getBoundingClientRect();return{top:r.top,bottom:r.bottom,left:r.left,right:r.right,height:r.height,width:r.width};};
    const fr=rect(frame),ir=rect(input);return{panel:rect(panel),greeting:{...rect(hello),display:getComputedStyle(hello).display,overflow:getComputedStyle(hello).overflowY,text:hello.textContent},composer:{...ir,top:fr.top+ir.top,bottom:fr.top+ir.bottom,left:fr.left+ir.left,right:fr.left+ir.right},horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1};
   });
   const result={width,height,...state};results.push(result);console.log(JSON.stringify(result));
   await page.screenshot({path:path.join(out,'ambient-short-panel-'+width+'x'+height+'.png')});
   assert.notEqual(state.greeting.display,'none','opening greeting stays present despite legacy media queries');
   assert(state.greeting.height>0&&state.greeting.top>=state.panel.top&&state.greeting.bottom<=state.panel.bottom+1,'greeting fits its panel');
   assert(state.composer.height>=40&&state.composer.top>=state.panel.top&&state.composer.bottom<=state.panel.bottom+1,'composer stays visible inside panel');
   assert(state.composer.left>=state.panel.left&&state.composer.right<=state.panel.right+1,'composer stays horizontally inside the panel');
   assert.equal(state.horizontalOverflow,false);
  }finally{await context.close();}
 }
}finally{await browser.close();server.close();fs.writeFileSync(path.join(out,'jonas-short-panel-rendered.json'),JSON.stringify({note:'Actual production HTML/JS/CSS from local static server in fresh guest Chromium; external services unavailable, no tablet or AI-response claim.',results},null,2));}
})().catch(e=>{console.error(e.stack);server.close();process.exitCode=1;});
