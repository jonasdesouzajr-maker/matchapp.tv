'use strict';

// Offline real-Chromium regression fixture. Delayed local image responses
// exercise the production cover code; this is not production-release proof.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const sourceFile=process.env.MATCHAPP_COVER_SOURCE_FILE||path.join(root,'ebooks/ebook-matcher.js');
const source=fs.readFileSync(sourceFile,'utf8');
const start=source.indexOf('const BOOK_COVER_IDENTITY='),end=source.indexOf('function boundedReading(',start);
assert(start>=0&&end>start,'production cover code block not found');
const coverCode=source.slice(start,end);
const identity=fs.readFileSync(path.join(root,'ebooks/cover-identity.js'),'utf8');
const out=process.env.MATCHAPP_COVER_PROOF_DIR||path.join(root,'artifacts/audio-cover-handoff-fixture');
fs.mkdirSync(out,{recursive:true});
const original='https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/exact-audio/9781250446671.jpg/100x100bb.jpg';
const sharp=original.replace('/100x100bb.jpg','/600x600bb.jpg');
const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#39215d"/><text x="80" y="85" text-anchor="middle" fill="#e5c158" font-size="25">AUDIO</text></svg>');
const requests=[];
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://fixture.invalid');
 if(url.pathname==='/identity.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(identity);return;}
 if(url.pathname==='/cover.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(coverCode);return;}
 if(url.pathname.startsWith('/asset/')){
  const [, ,scenario,rendition]=url.pathname.split('/');
  const entry={scenario,rendition,startedAt:Date.now(),aborted:false};requests.push(entry);
  const timer=setTimeout(()=>{
   entry.respondedAt=Date.now();entry.status=scenario==='both-fail'?404:200;
   res.writeHead(entry.status,{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=3600'});
   res.end(entry.status===200?svg:'Not available');
  },scenario==='both-fail'?40:rendition==='sharp'?3200:12000);
  res.on('close',()=>{clearTimeout(timer);entry.aborted=!res.writableFinished;entry.closedAt=Date.now();});
  return;
 }
 res.writeHead(200,{'Content-Type':'text/html'});
 res.end('<!doctype html><meta charset="utf-8"><title>Exact audio cover race fixture</title><style>img{width:160px;height:160px;object-fit:contain}#fallback{padding:20px;background:#201433;color:#e5c158}</style><img id="cover" hidden><div id="fallback">Fury in Death — J. D. Robb — AUDIO fallback</div><script>window.market=()=>"US";window.APPLE_BOOK_MARKETS=new Set(["US"])</script><script src="/identity.js"></script><script src="/cover.js"></script>');
});

(async()=>{
 let browser;
 const report={kind:'offline-browser-fixture',sourceFile,scenarios:[]};
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const executablePath=process.env.PLAYWRIGHT_EXECUTABLE_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
  browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox']});
  for(const scenario of ['slow-sharp','both-fail']){
   const context=await browser.newContext(),page=await context.newPage(),sourceRequests=[],failures=[];
   await page.route('https://is1-ssl.mzstatic.com/**',route=>route.fulfill({status:302,headers:{location:base+'/asset/'+scenario+'/'+(route.request().url()===sharp?'sharp':'original'),'cache-control':'public, max-age=3600'}}));
   for(const pattern of ['https://openlibrary.org/**','https://www.googleapis.com/**','https://itunes.apple.com/**'])await page.route(pattern,route=>{
    sourceRequests.push(route.request().url());return route.fulfill({status:200,contentType:'application/json',body:'{"docs":[],"items":[],"results":[]}'});
   });
   page.on('requestfailed',request=>failures.push({url:request.url(),error:request.failure()?.errorText}));
   await page.goto(base,{waitUntil:'load'});
   const startedAt=Date.now();
   await page.evaluate(({original})=>{
    window.hydrationDone=false;
    window.hydration=hydrateCover({title:'Fury in Death',author:'J. D. Robb',year:2026},document.querySelector('#cover'),document.querySelector('#fallback'),{apple:{coverUrl:original}})
     .finally(()=>{window.hydrationDone=true});
   },{original});
   await page.waitForFunction(()=>window.hydrationDone,null,{timeout:12000});
   const image=await page.locator('#cover').evaluate(async img=>{
    let decoded=false;try{if(img.complete&&img.naturalWidth>0){await img.decode();decoded=true;}}catch{}
    return {src:img.src,complete:img.complete,naturalWidth:img.naturalWidth,decoded,hidden:img.hidden,opacity:getComputedStyle(img).opacity,fallbackHidden:document.querySelector('#fallback').hidden};
   });
   const result={scenario,elapsedMs:Date.now()-startedAt,image,sourceRequests,failures};
   report.scenarios.push(result);
   await page.screenshot({path:path.join(out,scenario+'.png')});
   await context.close();
   result.network=requests.filter(request=>request.scenario===scenario);
   if(scenario==='slow-sharp'){
    result.pass=image.src===sharp&&image.complete&&image.naturalWidth>0&&image.decoded&&!image.hidden&&image.opacity==='1'&&image.fallbackHidden&&sourceRequests.length===0&&result.elapsedMs<9500;
    result.pass=result.pass&&result.network.some(request=>request.rendition==='sharp'&&request.status===200&&!request.aborted);
   }else result.pass=image.hidden&&!image.fallbackHidden&&image.naturalWidth===0&&sourceRequests.length===0&&result.elapsedMs<9500;
   console.log((result.pass?'PASS ':'FAIL ')+scenario+' '+JSON.stringify(result));
  }
  report.pass=report.scenarios.every(result=>result.pass);
  if(!report.pass)process.exitCode=1;
 }catch(error){report.error=error.stack;process.exitCode=1;console.error(error);}
 finally{
  if(browser)await browser.close();
  server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 }
})();
