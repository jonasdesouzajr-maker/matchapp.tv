const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{
 let pathname=decodeURI(new URL(req.url,'http://localhost').pathname);
 let file=path.resolve(root,'.'+pathname);
 if(!file.startsWith(root)){res.writeHead(403).end();return}
 if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(data)});
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const port=server.address().port;
 const browser=await chromium.launch({headless:true,channel:'msedge',args:['--no-sandbox']});
 try {
  for(const width of [390,1280]){
   const page=await browser.newPage({viewport:{width,height:820}});
   await page.addInitScript(()=>{
    window.MatchAppJonasSpeech={stop(){},speak:(text,lang,callbacks)=>new Promise(resolve=>{
     callbacks.onStart?.();callbacks.onLevel?.(.85);
     setTimeout(()=>{callbacks.onEnd?.(true);resolve(true)},220);
    })};
   });
   await page.goto('http://127.0.0.1:'+port+'/discover.html',{waitUntil:'domcontentloaded',timeout:30000});
   await page.waitForSelector('#jonas-voice-stage .jds-rest',{timeout:20000});
   const first=await page.evaluate(()=>{
     const el=document.getElementById('jonas-voice-stage'),rect=el.getBoundingClientRect();
     return {width:rect.width,overflow:document.documentElement.scrollWidth>innerWidth,visible:rect.width>100&&rect.height>75,face:el.querySelector('.jds-rest').naturalWidth,service:typeof window.MatchAppJonasStage?.speak};
   });
   assert(first.visible&&first.face>0&&first.service==='function',JSON.stringify(first));
   assert(!first.overflow,'overflow '+width);
   const state=await page.evaluate(async()=>{
     const p=window.MatchAppJonasStage.speak('Hello from Jonas',{autoListen:false});
     const speaking=document.getElementById('jonas-voice-stage').dataset.state;
     await p;
     window.MATCH_LANG='pt-BR';window.dispatchEvent(new Event('matchapp:languagechange'));
     return {speaking,ready:document.getElementById('jds-state').textContent};
   });
   assert.equal(state.speaking,'speaking');
   assert(state.ready.includes('Pronto'),JSON.stringify(state));
   console.log('PASS',width,JSON.stringify(first),JSON.stringify(state));
   await page.close();
  }
 } finally {await browser.close();server.close()}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
