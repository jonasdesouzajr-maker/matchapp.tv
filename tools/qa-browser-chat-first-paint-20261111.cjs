'use strict';
// Render the real browser chat with portrait downloads held open. No AI calls.
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((q,r)=>{
  const url=new URL(q.url,'http://localhost');let file=path.resolve(root,'.'+url.pathname);
  if(file!==root&&!file.startsWith(root+path.sep))return r.writeHead(403).end();
  try{if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');r.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(r);}catch{r.writeHead(404).end();}
});
(async()=>{
  const out=path.join(root,'artifacts/browser-layout-20261111');fs.mkdirSync(out,{recursive:true});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    for(const width of [320,390]){
      const page=await browser.newPage({viewport:{width,height:844}});
      const heldPortraits=[];
      let releaseParser;const parserReady=new Promise(resolve=>{releaseParser=resolve;});
      await page.route(/googlesyndication|googletagmanager|google-analytics/,r=>r.abort());
      await page.route(/\/jonas\/faces\//,r=>heldPortraits.push(r));
      await page.route(/\/voice-input\.js/,r=>releaseParser(r));
      await page.goto('http://127.0.0.1:'+server.address().port+'/explore.html',{waitUntil:'domcontentloaded'});
      await page.locator('#ma-ambient-jonas .ja-bubble').click();
      const frame=page.frameLocator('#ma-ambient-chat-frame');
      const stalledScript=await parserReady;
      const loading=await frame.locator('html').evaluate(()=>({ready:document.readyState,header:getComputedStyle(document.querySelector('header.app-header')).display}));
      assert.equal(loading.ready,'loading','hold a late parser script before DOMContentLoaded');
      assert.equal(loading.header,'none','standalone header must never flash during parsing');
      console.log('PASS parser-loading',width,JSON.stringify(loading));
      await stalledScript.continue();
      await frame.locator('#discover-new-input').waitFor({state:'visible',timeout:15000});
      await frame.locator('header.app-header').waitFor({state:'hidden',timeout:15000});
      const state=await frame.locator('html').evaluate(el=>{
        const r=document.querySelector('#discover-new-input').getBoundingClientRect();
        return {ready:document.readyState,compact:el.classList.contains('matchapp-ambient-frame'),input:{top:r.top,bottom:r.bottom,width:r.width},height:innerHeight,header:getComputedStyle(document.querySelector('header.app-header')).display};
      });
      assert.equal(state.ready,'interactive','the conversation must render before all images load');
      assert.ok(state.compact);assert.equal(state.header,'none');
      assert.ok(state.input.top>=0&&state.input.bottom<=state.height+2,JSON.stringify(state));
      console.log('PASS',width,JSON.stringify(state));
      fs.writeFileSync(path.join(out,'chat-first-paint-'+width+'.json'),JSON.stringify(state,null,2));
      await Promise.all(heldPortraits.map(r=>r.abort().catch(()=>{})));
      await page.close();
    }
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
