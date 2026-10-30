'use strict';
// Local rendered verification only; never talks to ads, accounts or AI services.
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '..');
const output = process.env.LUMINA_STUDIO_QA_OUTPUT || '/tmp/lumina-studio-qa';
const mime = {'.html':'text/html', '.js':'application/javascript', '.mjs':'application/javascript', '.css':'text/css', '.jpg':'image/jpeg', '.png':'image/png', '.json':'application/json', '.mp3':'audio/mpeg'};
const report = {scope:'Isolated local Chromium rendering and interaction; no physical-device or native-build claim',cases:[],failures:[]};
const server = http.createServer((request,response)=>{
  const file = path.resolve(root,'.'+new URL(request.url,'http://localhost').pathname);
  if (!file.startsWith(root+path.sep)) return response.writeHead(403).end();
  try {
    const target=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;
    response.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});
    fs.createReadStream(target).pipe(response);
  } catch (_) { response.writeHead(404).end(); }
});
const languages=['en','pt-BR','es','fr','de','it','tr','ru','ar','hi','id','ja','ko','zh'];
const cases=languages.map(language=>({language,width:320,height:568}));
for (const language of ['en','pt-BR']) for(const [width,height] of [[390,844],[568,320],[768,1024],[1024,768],[1440,900]]) cases.push({language,width,height});
cases.push({language:'pt-BR',width:320,height:568,reduced:true},{language:'en',width:320,height:568,forced:true},{language:'pt-BR',width:320,height:568,largeText:true},{language:'de',width:568,height:320,largeText:true});
let browser;
async function check(c,base) {
  const id=[c.language,c.width,c.height,c.reduced?'reduced':c.forced?'forced':c.largeText?'text200':'normal'].join('-');
  const context=await browser.newContext({viewport:{width:c.width,height:c.height},reducedMotion:c.reduced?'reduce':'no-preference',forcedColors:c.forced?'active':'none',hasTouch:c.width<1024});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const page=await context.newPage(), errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(base+'/lumina-match/browser/index.html?lang='+c.language,{waitUntil:'load'});
    if(c.largeText)await page.addStyleTag({content:'html{font-size:32px!important}'});
    await page.locator('#lumina-studio-opening[open]').waitFor();
    const state=await page.evaluate(()=>{
      const dialog=document.querySelector('#lumina-studio-opening');
      const rect=node=>{const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
      const visible=[...dialog.querySelectorAll('.lm-studio-name,.lm-studio-byline,[data-studio-skip]')];
      return {name:dialog.querySelector('h1').textContent,language:dialog.lang,dir:dialog.dir,
        inert:document.querySelector('#app').inert,video:dialog.querySelectorAll('video').length,
        dialog:rect(dialog),nodes:visible.map(node=>({text:node.textContent,...rect(node),scrollWidth:node.scrollWidth,clientWidth:node.clientWidth})),
        scrollX:document.documentElement.scrollWidth-innerWidth,scrollY:document.documentElement.scrollHeight-innerHeight,
        animation:getComputedStyle(dialog.querySelector('.lm-studio-lockup')).animationName};
    });
    assert.equal(state.name,'Adv_Dev_Ops by Jonas Junior');
    assert.equal(state.language,c.language);assert.equal(state.dir,c.language==='ar'?'rtl':'ltr');
    assert.equal(state.inert,true);assert.equal(state.video,0,'No fabricated/missing media requests');
    assert.ok(state.scrollX<=1 && state.scrollY<=1,id+' document scroll');
    for(const n of state.nodes){
      assert.ok(n.x>=-1&&n.y>=-1&&n.right<=c.width+1&&n.bottom<=c.height+1,id+' bounds '+JSON.stringify(n));
      assert.ok(n.scrollWidth<=n.clientWidth+1,id+' text clipped '+JSON.stringify(n));
    }
    if(c.reduced)assert.equal(state.animation,'none');
    if((c.language==='pt-BR'&&c.width===390)||(c.language==='en'&&c.width===1440)){
      await page.waitForTimeout(1100);
      await page.screenshot({path:path.join(output,id+'.png')});
    }
    await page.locator('[data-studio-skip]').click();
    await page.locator('#lumina-studio-opening').waitFor({state:'detached'});
    assert.equal(await page.locator('#app').evaluate(node=>node.inert),false);
    await page.locator('[data-action="campaign"]').click();
    assert.equal(await page.locator('#app').getAttribute('data-screen'),'game');
    assert.equal(await page.locator('[data-card]').count(),8);
    await page.locator('[data-action="home"]').click();
    assert.equal(await page.locator('#lumina-studio-opening').count(),0,'Must not replay when returning to menu');
    assert.deepEqual(errors,[]);
    report.cases.push({id,...state,passed:true});
  } catch(error){report.failures.push({id,message:error.message,errors});await page.screenshot({path:path.join(output,id+'-failure.png')});}
  finally {await context.close();}
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({headless:true});
  for(let i=0;i<cases.length;i+=4)await Promise.all(cases.slice(i,i+4).map(c=>check(c,base)));
  const page=await browser.newPage();
  await page.goto(base+'/lumina-match/browser/index.html?lang=en');
  const start=Date.now();await page.locator('#lumina-studio-opening').waitFor({state:'detached',timeout:6000});
  assert.ok(Date.now()-start<5500,'Automatic handoff must not require CSS animation events');
  assert.equal(await page.locator('#app').getAttribute('data-screen'),'home');
  report.automaticHandoff=true;
  await page.close();
})().catch(error=>{report.failures.push({id:'harness',message:error.stack});}).finally(async()=>{
  if(browser)await browser.close();server.close();
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.cases.length,failed:report.failures,automaticHandoff:report.automaticHandoff,output}));
  if(report.failures.length)process.exitCode=1;
});
