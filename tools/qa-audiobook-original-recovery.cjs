/* Controlled real-Chromium artwork fixture. It never contacts live providers,
   signs in, performs a match, or changes account/device state. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ORIGIN='https://matchapp-cover-fixture.invalid';
const ORIGINAL='https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/fixture/fictional-audio.jpg/100x100bb.jpg?source=exact-edition';
const URLS=Object.freeze({original:ORIGINAL,preview:ORIGINAL.replace('/100x100bb.jpg','/300x300bb.jpg'),sharp:ORIGINAL.replace('/100x100bb.jpg','/600x600bb.jpg')});
const ARTWORK_IDENTITY='the fictional harbor\nexample writer\naudio:'+ORIGINAL;
const PLANS=Object.freeze({
 'rescue-upgrade':{original:120,preview:6500,sharp:7600},
 'fast-preview':{original:null,preview:100,sharp:3200},
 'all-pending':{original:null,preview:null,sharp:null},
 'disconnected':{original:null,preview:null,sharp:null}
});
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function buildFixture(sourceRoot){
 const root=path.resolve(sourceRoot),sources={};
 const read=file=>{const bytes=fs.readFileSync(path.join(root,file));sources[file]={sha256:hash(bytes),bytes:bytes.length};return bytes.toString('utf8')};
 const matcher=read('ebooks/ebook-matcher.js'),identity=read('ebooks/cover-identity.js'),audio=read('ebooks/audiobooks.js'),css=read('ebooks/ebook-matcher.css');
 const start=matcher.indexOf('const BOOK_COVER_IDENTITY='),end=matcher.indexOf('function boundedReading(',start);
 const copyStart=matcher.indexOf('function ui('),copyEnd=matcher.indexOf('function choice(',copyStart);
 if(start<0||end<=start||copyStart<0||copyEnd<=copyStart)throw Error('The actual cover implementation or presentation helper was not found');
 const code=matcher.slice(copyStart,copyEnd)+'\n'+matcher.slice(start,end);
 const script=value=>value.replace(/<\/script/gi,'<\\/script');
 const bootstrap=`
window.__audioCoverFixtureStart=()=>{
if(window.__audioCoverFixture)throw Error('This isolated fixture may start only once');
const params=new URL(location.href).searchParams,scenario=params.get('case');
if(!${JSON.stringify(Object.keys(PLANS))}.includes(scenario))throw Error('Unknown fixture case');
const book={title:'The Fictional Harbor',author:'Example Writer'};
const row={collectionName:book.title,artistName:book.author,collectionViewUrl:'https://books.apple.com/us/audiobook/the-fictional-harbor/id1234567890',artworkUrl100:${JSON.stringify(ORIGINAL)}};
const edition=window.MatchAppAudiobooks.verifyApple(book,[row],'US');
if(!edition||edition.coverUrl!==${JSON.stringify(ORIGINAL)}||window.MatchAppAudiobooks.verifyApple({...book,title:'A different fictional book'},[row],'US'))throw Error('Exact edition identity guard failed');
if(window.MatchAppAudiobooks.verifyApple(book,[{...row,artworkUrl100:'https://untrusted.invalid/cover.jpg'}],'US').coverUrl!==null)throw Error('Artwork origin guard failed');
const img=document.querySelector('[data-ebook-cover]'),fallback=document.querySelector('[data-ebook-cover-fallback]');
const began=performance.now(),history=[];let frame=0,signature='',stopTimer=null;
window.__audioCoverFixture={scenario,done:false,result:null,history,identityVerified:true,urls:${JSON.stringify(URLS)}};
function snapshot(){
 const rect=img.getBoundingClientRect(),style=getComputedStyle(img),owner=img.__matchappBookCover;
 const value={at:Math.round(performance.now()-began),src:img.getAttribute('src'),currentSrc:img.currentSrc,connected:img.isConnected,hidden:img.hidden,complete:img.complete,naturalWidth:img.naturalWidth,naturalHeight:img.naturalHeight,opacity:style.opacity,display:style.display,objectFit:style.objectFit,width:Math.round(rect.width),height:Math.round(rect.height),fallbackHidden:fallback.hidden,verified:img.dataset.bookCoverVerified||null,pending:img.dataset.bookCoverPending||null,ownerPending:owner?.pending||null,ownerVerified:owner?.verified||null,ownerIdentity:owner?.identity||null,runActive:owner?.sourceRun?.active===true};
 value.visible=value.connected&&!value.hidden&&value.complete&&value.naturalWidth>30&&value.opacity!=='0'&&value.display!=='none'&&value.width>0&&value.height>0;
 const next=JSON.stringify({...value,at:0});if(next!==signature){signature=next;history.push(value)}
 return value;
}
function observeFrame(){snapshot();if(!window.__audioCoverFixture.done)frame=requestAnimationFrame(observeFrame)}
prepareBookArtwork(img,book,edition.coverUrl);observeFrame();
if(scenario==='disconnected')stopTimer=setTimeout(()=>img.remove(),1000);
const pending=showVerifiedAudioCover(img,fallback,edition.coverUrl);
pending.then(result=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve(result)))))
 .then(result=>{clearTimeout(stopTimer);window.__audioCoverFixture.result=result;window.__audioCoverFixture.final=snapshot();window.__audioCoverFixture.elapsedMs=Math.round(performance.now()-began);window.__audioCoverFixture.done=true;cancelAnimationFrame(frame)})
 .catch(error=>{window.__audioCoverFixture.error=String(error.message||error);window.__audioCoverFixture.done=true;cancelAnimationFrame(frame);clearTimeout(stopTimer)});
};
window.__audioCoverFixtureReady=true;
`;
 const html='<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>Controlled exact audiobook artwork fixture</title><style>'+css+'</style><style>body{margin:0;background:#100a17;color:#f7f0ff;font-family:system-ui}#ebook-matcher-root{max-width:1180px;margin:0 auto}.fixture-note{padding:12px;font-size:14px}</style><section id="ebook-matcher-root"><p class="fixture-note">Controlled fictional edition — no provider or account connection</p><article data-ebook-result><div class="ebook-result-grid"><div class="ebook-cover"><img data-ebook-cover hidden alt="Fictional verified audiobook artwork"><div data-ebook-cover-fallback><div class="ebook-cover-fallback"><span>TFH</span><strong>The Fictional Harbor</strong><small>Example Writer</small></div></div></div><div class="ebook-result-copy"><h3>The Fictional Harbor</h3><p>Exact source artwork recovery fixture</p></div></div></article></section><script>'+script(identity)+'\n'+script(audio)+'\n'+script(code)+'\n'+script(bootstrap)+'</script>';
 return {origin:ORIGIN,urls:URLS,plans:PLANS,html,sources,codeSHA256:hash(code)};
}
function syntheticImage(rendition){
 const size={original:100,preview:300,sharp:600}[rendition],color={original:'#176b61',preview:'#6541a5',sharp:'#b87516'}[rendition];
 if(!size)throw Error('Unknown exact rendition');
 return Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="'+size+'" height="'+size+'" viewBox="0 0 600 600"><rect width="600" height="600" fill="'+color+'"/><path d="M0 450L180 120L330 380L460 180L600 450Z" fill="#f5e4b5"/><circle cx="460" cy="100" r="45" fill="#faf5df"/><text x="300" y="520" fill="white" text-anchor="middle" font-size="32">FICTIONAL AUDIO EDITION</text><text x="300" y="560" fill="white" text-anchor="middle" font-size="24">'+rendition+' '+size+'px</text></svg>');
}
function verifiedVisiblePixels(sample,settled=false){
 const ranked=[URLS.sharp,URLS.preview,URLS.original],sizes=[600,300,100];
 const requestedRank=ranked.indexOf(sample.src),selectedRank=ranked.indexOf(sample.currentSrc),previousRank=ranked.indexOf(sample.ownerVerified);
 if(!sample.visible||requestedRank<0||selectedRank<0||sample.ownerIdentity!==ARTWORK_IDENTITY||sample.objectFit!=='contain'||sample.naturalWidth!==sizes[selectedRank]||sample.naturalHeight!==sizes[selectedRank])return false;
 const committed=sample.src===sample.currentSrc&&sample.verified===sample.currentSrc&&sample.ownerVerified===sample.currentSrc&&sample.pending===null&&sample.ownerPending===null;
 if(committed)return true;
 if(settled)return false;
 // The browser can expose new decoded currentSrc pixels before its queued load
 // event commits the dataset marker. Accept only the actual active upgrade from
 // an already verified lower rendition, with both pending owners agreeing.
 return sample.verified===null&&sample.runActive===true&&sample.pending===sample.src&&sample.ownerPending===sample.src&&previousRank>=0&&requestedRank<previousRank&&(sample.currentSrc===sample.src||sample.currentSrc===sample.ownerVerified);
}
function verifyCase(result){
 const checks=[],check=(name,ok)=>checks.push({name,ok:!!ok});
 const data=result.observation,network=result.network,visible=data?.history?.filter(item=>item.visible)||[];
 const requests=kind=>network.filter(item=>item.event==='request'&&item.rendition===kind);
 check('the real exact-edition verifier accepted only the fictional trusted source',data?.identityVerified);
 check('no unexpected request or JavaScript error occurred',result.blocked.length===0&&result.errors.length===0);
 check('the artwork operation settled inside its finite budget with scheduling tolerance',data?.done&&!data.error&&data.elapsedMs<=11000);
 check('each rendition has at most its probe and uncached destination handoff',['original','preview','sharp'].every(kind=>requests(kind).length<=2));
 check('every visible image has exact verified source pixels or an active exact upgrade handoff',visible.every(item=>verifiedVisiblePixels(item)));
 check('the settled artwork owner has no pending handoff',data?.done&&data.final?.pending===null&&data.final?.ownerPending===null&&data.final?.runActive===false);
 if(result.scenario==='rescue-upgrade'){
  check('original rescue was requested after its grace period',requests('original').length>=1&&requests('original')[0].at>=4000&&requests('original')[0].at<6500);
  const firstOriginal=visible.find(item=>item.currentSrc===URLS.original),firstPreview=visible.find(item=>item.currentSrc===URLS.preview),firstSharp=visible.find(item=>item.currentSrc===URLS.sharp);
  check('real decoded original pixels rendered before the preview and sharp upgrade',firstOriginal&&firstPreview&&firstSharp&&firstOriginal.at<firstPreview.at&&firstPreview.at<firstSharp.at);
  check('the final image is the decoded 600px exact artwork with its committed marker',data?.final&&verifiedVisiblePixels(data.final,true)&&data.final.src===URLS.sharp);
 }else if(result.scenario==='fast-preview'){
  check('the early preview rendered and the sharp rendition won with its committed marker',visible.some(item=>item.currentSrc===URLS.preview)&&data?.final&&verifiedVisiblePixels(data.final,true)&&data.final.src===URLS.sharp);
  check('usable early artwork suppressed original recovery',requests('original').length===0);
 }else if(result.scenario==='all-pending'){
  check('even stalled derived requests allowed one original attempt',requests('original').length===1);
  check('the deadline retained the honest fallback without claiming pixels',data?.result===false&&!data.final.visible&&!data.final.fallbackHidden&&data.final.naturalWidth===0&&data.elapsedMs>=9000);
 }else if(result.scenario==='disconnected'){
  check('disconnection prevented original recovery and stale paint',requests('original').length===0&&visible.length===0&&data?.result===false&&data.final.connected===false);
 }
 check('the actual viewport has no horizontal overflow',result.geometry.scrollWidth<=result.geometry.width);
 check('a real screenshot was saved',!!result.screenshot&&!result.screenshotError);
 return checks;
}
async function run(){
 const args=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i+=2){if(!['--source-root','--output','--label'].includes(args[i])||!args[i+1])throw Error('Use --source-root DIR --output NEW_DIR [--label baseline|candidate]');options[args[i]]=args[i+1]}
 if(!options['--source-root']||!options['--output'])throw Error('Source root and a new output directory are required');
 const fixture=buildFixture(options['--source-root']),out=path.resolve(options['--output']);
 fs.mkdirSync(path.dirname(out),{recursive:true});fs.mkdirSync(out);
 const report={label:options['--label']||'unspecified',started:new Date().toISOString(),sourceRoot:path.resolve(options['--source-root']),sources:fixture.sources,codeSHA256:fixture.codeSHA256,scope:'Controlled isolated browser images; no live provider, account, matching, Android or WebView proof.',cases:[],errors:[]};
 const {chromium}=require('playwright');let browser;
 try{
  browser=await chromium.launch({headless:true});
  const cases=[['rescue-upgrade',390],['rescue-upgrade',800],['rescue-upgrade',1366],['fast-preview',800],['all-pending',800],['disconnected',800]];
  for(const [scenario,width]of cases){
   const result={scenario,width,network:[],blocked:[],errors:[]},pending=new Set(),delivered=new Set();let context,started=Date.now();
   try{
    context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:1,locale:'en-US',serviceWorkers:'block'});
    const page=await context.newPage();page.setDefaultTimeout(12000);
    const label=url=>Object.keys(fixture.urls).find(key=>fixture.urls[key]===url);
    page.on('pageerror',error=>result.errors.push(String(error.message||error).slice(0,400)));
    page.on('requestfailed',request=>{const rendition=label(request.url());if(rendition)result.network.push({event:'failed',rendition,at:Date.now()-started,error:request.failure()?.errorText})});
    await context.route('**/*',async route=>{
     const request=route.request(),url=request.url(),rendition=label(url);
     if(request.method()!=='GET'){result.blocked.push({method:request.method(),url});await route.abort();return}
     if(url===fixture.origin+'/?case='+scenario){await route.fulfill({status:200,contentType:'text/html',body:fixture.html});return}
     if(rendition&&request.resourceType()==='image'){
      result.network.push({event:'request',rendition,at:Date.now()-started});
      const delay=delivered.has(rendition)?0:fixture.plans[scenario][rendition];let resolve,timer;
      const token={cancel:()=>{clearTimeout(timer);resolve(false)}};
      const ready=await new Promise(done=>{resolve=done;pending.add(token);if(delay!==null)timer=setTimeout(()=>done(true),delay)});
      pending.delete(token);clearTimeout(timer);
      try{if(ready){delivered.add(rendition);await route.fulfill({status:200,contentType:'image/svg+xml',headers:{'cache-control':'public, max-age=3600'},body:syntheticImage(rendition)});result.network.push({event:'fulfilled',rendition,at:Date.now()-started})}else await route.abort('aborted')}catch(error){result.network.push({event:'route-ended',rendition,at:Date.now()-started,message:String(error.message||error).slice(0,160)})}
      return;
     }
     result.blocked.push({method:request.method(),url});await route.abort();
    });
    await page.goto(fixture.origin+'/?case='+scenario,{waitUntil:'domcontentloaded',timeout:12000});
    started=Date.now();await page.evaluate(()=>window.__audioCoverFixtureStart());
    await page.waitForFunction(()=>window.__audioCoverFixture?.done,null,{timeout:12000});
    result.observation=await page.evaluate(()=>window.__audioCoverFixture);
    result.geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
    result.screenshot=scenario+'-'+width+'.png';
    try{await page.screenshot({path:path.join(out,result.screenshot),timeout:5000})}catch(error){result.screenshotError=String(error.message||error).slice(0,400)}
    result.checks=verifyCase(result);result.pass=result.checks.every(check=>check.ok);
   }catch(error){result.errors.push(String(error.stack||error).slice(0,1200));result.pass=false}
   finally{for(const token of pending)token.cancel();if(context)await context.close().catch(error=>result.errors.push(String(error.message||error).slice(0,300)))}
   if(result.errors.length)result.pass=false;
   report.cases.push(result);console.log((result.pass?'PASS ':'FAIL ')+scenario+' '+width+'px');
  }
 }catch(error){report.errors.push(String(error.stack||error).slice(0,1600))}
 finally{if(browser)await browser.close().catch(error=>report.errors.push(String(error.message||error).slice(0,300)))}
 report.finished=new Date().toISOString();report.passed=report.cases.filter(item=>item.pass).length;report.failed=report.cases.filter(item=>!item.pass).length;report.status=report.failed===0&&report.errors.length===0&&report.cases.length===6?'PASS':'FAIL';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:report.status,passed:report.passed,failed:report.failed,report:path.join(out,'report.json')}));
 if(report.status!=='PASS')process.exitCode=1;
}
module.exports={buildFixture,syntheticImage,verifiedVisiblePixels,verifyCase,ORIGIN,URLS,PLANS,ARTWORK_IDENTITY};
if(require.main===module)run().catch(error=>{console.error(String(error.stack||error));process.exitCode=1});
