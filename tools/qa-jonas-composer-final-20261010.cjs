const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('fs'),http=require('http'),path=require('path');
const root=path.resolve(__dirname,'..'),types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{let file=path.resolve(root,'.'+decodeURI(new URL(req.url,'http://x').pathname));if(!file.startsWith(root)){res.writeHead(403).end();return};if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data)})});
(async()=>{await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const browser=await chromium.launch({channel:'msedge',headless:true});const origin='http://127.0.0.1:'+server.address().port;
try{for(const width of [320,360,390,430,768,1366]){
 const page=await browser.newPage({viewport:{width,height:900}});
 await page.route('**/*',route=>route.request().url().startsWith(origin)?route.continue():route.abort());
 await page.goto(origin+'/discover.html',{waitUntil:'domcontentloaded',timeout:35000});
 await page.waitForSelector('#discover-new-input');
 const out=await page.evaluate(()=>{
 const q=document.querySelector('.newsearch-row'),c=q.querySelector('.composer'),t=document.querySelector('#discover-new-input'),m=document.querySelector('#mic-btn-discover'),b=q.querySelector('.composer-send');
 const box=e=>{let x=e.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height,right:x.right,bottom:x.bottom}};
 const cl=e=>getComputedStyle(e);
 return {q:box(q),c:box(c),t:box(t),m:box(m),b:box(b),font:cl(t).fontSize,display:cl(c).display,gridCols:cl(c).gridTemplateColumns,gridRows:cl(c).gridTemplateRows,gridAreas:cl(c).gridTemplateAreas,labelDisplay:cl(c.querySelector(".composer-input-label")).display,justify:cl(c).justifyContent,align:cl(c).alignItems,textareaFlex:cl(t).flex,textareaMin:cl(t).minWidth,textareaWidth:cl(t).width,placeholder:t.placeholder,
 overflow:document.documentElement.scrollWidth-innerWidth,sendButtons:q.querySelectorAll('.composer-send').length,
 inline:b.parentElement===c,onclick:b.getAttribute('onclick'),label:b.getAttribute('aria-label'),micId:m.id};});
 assert.equal(out.sendButtons,1,'duplicate send');assert(out.inline,'send not inside composer');assert(out.onclick.includes('newDiscoverSearch'),'send handler removed');assert(out.micId==='mic-btn-discover','voice handler lost');
 assert(out.font==='15px'||parseFloat(out.font)<=16,'text oversized '+JSON.stringify(out));
 assert(out.t.right<out.m.x&&out.m.right<out.b.x,'field controls not aligned '+JSON.stringify(out));
 assert(out.t.w>=85,'textarea collapsed '+JSON.stringify(out));
 assert(out.m.h>=39&&out.m.h<=47&&out.b.h>=39&&out.b.h<=47,'icon dimensions invalid '+JSON.stringify(out));
 assert(out.c.right<=width+2&&out.overflow<=3,'horizontal overflow '+JSON.stringify(out));
 console.log('PASS',width,JSON.stringify(out));
 await page.locator('#discover-new-input').fill('Please recommend a documentary series available in Brazil and explain where to watch it.');
 await page.waitForTimeout(80);
 assert((await page.locator('#discover-new-input').inputValue()).includes('Brazil'),'text input broken');
 await page.locator('#discover-new-input').evaluate(el=>el.blur());
 await page.screenshot({path:path.join(root,'reports','jonas-composer-'+width+'.png'),fullPage:false});
 await page.close();
}}finally{await browser.close();server.close()}})().catch(err=>{console.error(err);process.exitCode=1;server.close()});
