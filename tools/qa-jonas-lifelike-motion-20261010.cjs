const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost'),p=decodeURI(url.pathname);
 let file=path.resolve(root,'.'+p);
 if(!file.startsWith(root)){res.writeHead(403).end();return}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{
  if(err){res.writeHead(404).end();return}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');
  res.end(data);
 });
});
const run=async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--no-sandbox']});
 try{
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:850}});
   await page.addInitScript(()=>{
    window.MatchAppJonasSpeech={
     stop(){},
     speak(text,lang,options){
      return new Promise(resolve=>{
       options.onStart?.();
       const beginning=performance.now();
       const interval=setInterval(()=>{
        if(performance.now()-beginning<1030)options.onLevel?.(.48);
        else{clearInterval(interval);options.onLevel?.(0)}
       },30);
       setTimeout(()=>{clearInterval(interval);options.onEnd?.(true);resolve(true)},2250);
      });
     }
    };
   });
   await page.goto('http://127.0.0.1:'+server.address().port+'/discover.html',{waitUntil:'domcontentloaded'});
   await page.waitForSelector('#jonas-voice-stage');
   await page.waitForFunction(()=>document.querySelector('.jds-rest')?.naturalWidth>0,null,{timeout:25000});
   const data=await page.evaluate(async()=>{
    const stage=document.querySelector('#jonas-voice-stage'),rest=stage.querySelector('.jds-rest'),mouth=stage.querySelector('.jds-mouth');
    const originalFace=rest.src,eyes=stage.querySelector('.jds-eyes');
    const breath=getComputedStyle(stage.querySelector('.jds-portrait')).animationName;
    let count=0,openCount=0,last='',silenceClosed=false;
    const started=performance.now(),speak=window.MatchAppJonasStage.speak('Speech dynamics test',{autoListen:false});
    while(performance.now()-started<2000){
     const now=performance.now()-started;
     const cur=mouth.style.opacity==='1'?mouth.src:'rest';
     if(cur!==last&&last)count++;
     if(mouth.style.opacity==='1'&&now<1000)openCount++;
     if(now>1580&&mouth.style.opacity==='0')silenceClosed=true;
     last=cur;
     await new Promise(r=>setTimeout(r,27));
    }
    await speak;
    document.dispatchEvent(new CustomEvent('matchapp:voice-state',{detail:{state:'listening'}}));
    return {count,openCount,silenceClosed,breath,blinkLoaded:eyes.naturalWidth>0,eyesClip:getComputedStyle(eyes).clipPath,
     mouthAtListen:mouth.style.opacity,stillOriginal:rest.src===originalFace,atListen:stage.dataset.state,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   assert(data.openCount>0,'mouth never moved with audio '+JSON.stringify(data));
   assert(data.silenceClosed,'mouth stayed open through a silent phrase '+JSON.stringify(data));
   assert(data.count<=15,'mouth changed too often '+JSON.stringify(data));
   assert(data.blinkLoaded&&data.eyesClip!=='none','blink artwork unavailable '+JSON.stringify(data));
   assert(data.breath.includes('jds-breathe'),'no calm breathing '+JSON.stringify(data));
   assert(data.mouthAtListen==='0','mouth continued during listening '+JSON.stringify(data));
   assert(data.atListen==='listening'&&data.stillOriginal&&!data.overflow,'state or portrait regression '+JSON.stringify(data));
   console.log('PASS lifelike motion',width,JSON.stringify(data));
   await page.close();
  }
 }finally{await browser.close();server.close()}
};
run().catch(err=>{console.error(err);process.exitCode=1;server.close()});
