'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts','instant-voice-folds');fs.mkdirSync(out,{recursive:true});
// Public fixed recording only; the streaming fixture exercises playback, not AI accuracy.
const pcm=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',path.join(root,'jonas/greetings/en.mp3'),'-f','s16le','-ac','1','-ar','24000','pipe:1']);
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.mp3':'audio/mpeg','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const route=new URL(req.url,'http://localhost').pathname;
 if(route==='/__pcm'){
  res.writeHead(200,{'Content-Type':'audio/pcm;rate=24000','X-Jonas-Voice':'male-cedar'});
  res.write(pcm.subarray(0,48000));setTimeout(()=>res.end(pcm.subarray(48000)),700);return;
 }
 try{let f=path.resolve(root,'.'+route);if(!f.startsWith(root+path.sep)&&f!==root)throw Error();if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f))}catch{res.writeHead(404).end()}
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']}),report={folds:[],speech:[]};
 try{
  for(const width of [320,390,820,1180,1440]){
   const ctx=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
   await ctx.addInitScript(()=>{localStorage.setItem('match_lang','en');localStorage.setItem('match_cookie_choice','essential')});
   await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
   const page=await ctx.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});await page.locator('#premiere-disclosure').scrollIntoViewIfNeeded();await page.waitForSelector('#weekly-pick-disclosure',{state:'attached'});
   for(const lang of ['en','pt-BR','ar','de','ja']){
    await page.evaluate(lang=>window.setLanguage(lang),lang);
    const results=await page.evaluate(()=>{
     const header=document.querySelector('.lazy-head[data-fold-key="concierge"]');if(header.getAttribute('aria-expanded')!=='true')header.click();
     const target=document.getElementById('ma-concierge');const reference=target.getBoundingClientRect().top-header.getBoundingClientRect().bottom;
     return ['premiere-disclosure','weekly-pick-disclosure'].map(id=>{const d=document.getElementById(id);d.open=true;const h=d.querySelector('summary'),card=d.querySelector('.spotlight-card');return{id,reference,gap:card.getBoundingClientRect().top-h.getBoundingClientRect().bottom,overflow:document.documentElement.scrollWidth-innerWidth}});
    });
    for(const result of results){assert.ok(Math.abs(result.gap-result.reference)<1,JSON.stringify({width,lang,...result}));assert.ok(result.gap>=12);assert.ok(result.overflow<=1);report.folds.push({width,lang,...result});fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2))}
   }
   await page.evaluate(()=>window.setLanguage('en'));await page.locator('#premiere-disclosure').scrollIntoViewIfNeeded();
   await page.screenshot({path:path.join(out,'folds-'+width+'.png')});await ctx.close();
  }
  const ctx=await browser.newContext(),p=await ctx.newPage();
  await p.route(/^https?:\/\/(?!127\.0\.0\.1)/,r=>r.abort());
  await p.goto(base+'/jonas/greetings/manifest.json');
  await p.evaluate(()=>{document.body.innerHTML='<button id=unlock>Unlock audio</button>';window.MATCH_LANG='en'});
  await p.addScriptTag({url:base+'/jonas/secure-speech-20261010.js'});
  await p.evaluate(()=>document.getElementById('unlock').onclick=()=>window.MatchAppJonasSpeech.unlock());await p.click('#unlock');
  for(const language of ['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh']){
   await p.evaluate(async language=>{window.MATCH_LANG=language;await window.MatchAppJonasSpeech.prepare(language)},language);
   await p.waitForTimeout(80);
   const timing=await p.evaluate(async language=>{
    const manifest=await (await fetch('/jonas/greetings/manifest.json')).json(),original=window.fetch;
    window.fetch=()=>Promise.reject(Error('offline fixture'));
    const begin=performance.now();let delay;window.MatchAppJonasSpeech.unlock();
    const played=await Promise.race([window.MatchAppJonasSpeech.speak(manifest.clips[language].text,language,{onStart(){delay=performance.now()-begin}}),new Promise((_,reject)=>setTimeout(()=>reject(Error('greeting timeout '+language)),12000))]);
    window.fetch=original;return{language,played,delay};
   },language);
   assert.equal(timing.played,true);assert.ok(timing.delay<150,JSON.stringify(timing));report.speech.push(timing);console.log('GREETING',JSON.stringify(timing));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  }
  const streaming=await p.evaluate(async()=>{
   const original=window.fetch;let received=false;
   window.fetch=async(url,opts)=>{const response=await original('/__pcm',opts);return new Response(response.body.pipeThrough(new TransformStream({flush(){received=true}})),{headers:response.headers})};
   let beganBeforeEnd=false,levels=0;const result=await window.MatchAppJonasSpeech.speak('Streaming playback fixture','en',{onStart(){beganBeforeEnd=!received},onLevel(v){if(v>0)levels++}});
   window.fetch=original;return{result,beganBeforeEnd,levels};
  });assert.ok(streaming.result&&streaming.beganBeforeEnd&&streaming.levels>0,JSON.stringify(streaming));report.streaming=streaming;
  const cancelled=await p.evaluate(async()=>{
   const original=window.fetch;window.fetch=(_,opts)=>original('/__pcm',opts);let ends=0;
   const pending=window.MatchAppJonasSpeech.speak('Cancelled fixture','en',{onStart(){window.MatchAppJonasSpeech.stop()},onEnd(){ends++}});
   const result=await pending;window.fetch=original;return{result,ends};
  });assert.equal(cancelled.result,false);assert.equal(cancelled.ends,0);report.cancelled=cancelled;
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await ctx.close();
 }finally{await browser.close();server.close()}
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
