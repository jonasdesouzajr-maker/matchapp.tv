'use strict';
// Deterministic local browser preview. No service requests, real credits, paid
// providers, physical-device claims or production writes are involved.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.MATCHAPP_QA_OUTPUT||'/tmp/pr409-browser');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp'};
const matrix=[
  {name:'narrow-pt',width:320,height:710,lang:'pt-BR'},
  {name:'phone-en',width:390,height:844,lang:'en'},
  {name:'tablet-pt',width:820,height:1180,lang:'pt-BR'},
  {name:'desktop-en',width:1366,height:900,lang:'en'},
  {name:'android-webview-emulation',width:390,height:844,lang:'pt-BR',userAgent:'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 Chrome/141.0 Mobile Safari/537.36 MatchAppAiAndroid/1.1.64'}
];
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}
});
async function installFixture(page){await page.evaluate(()=>{
  window.__qa={gates:[],requests:[],debits:0};
  window.matchAllowanceBeforeLookup=()=>new Promise((resolve,reject)=>__qa.gates.push({resolve,reject}));
  window.checkDailyLimit=async()=>{__qa.debits++;return true;};
  // Actual request builder and response parser remain in use.
  window.supabaseClient={functions:{invoke:async(name,{body})=>{
    __qa.requests.push({name,body});
    const answer=body.lang==='pt-BR'?'Resposta de teste: Hayao Miyazaki.':'Fixture answer: Hayao Miyazaki.';
    return {data:{candidates:[{content:{parts:[{text:JSON.stringify({answer,results:[]})}]}}]},error:null};
  }}};
});}
async function idle(page){await page.waitForFunction(()=>askInFlight===null);}
async function settle(page,allowed){await page.waitForFunction(()=>__qa.gates.length>0);await page.evaluate(allowed=>__qa.gates.shift().resolve(allowed),allowed);}
async function send(page,text){await page.locator('#discover-new-input').fill(text);await page.locator('button[onclick="newDiscoverSearch()"]').click();}
async function state(page){return page.evaluate(()=>({draft:document.getElementById('discover-new-input').value,debits:__qa.debits,requests:__qa.requests,answers:document.querySelectorAll('#chat-log .chat-assistant').length,overflow:document.documentElement.scrollWidth-innerWidth}));}
(async()=>{
  fs.mkdirSync(out,{recursive:true});let browser;
  const report={kind:'Local deterministic provider/allowance fixtures',liveProviderCalls:0,physicalDevicesTested:false,results:[]};
  try{
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
    browser=await chromium.launch({headless:true,executablePath:process.env.MATCHAPP_BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    for(const device of matrix){
      const context=await browser.newContext({viewport:{width:device.width,height:device.height},locale:device.lang,userAgent:device.userAgent,hasTouch:device.width<1000,reducedMotion:'reduce',serviceWorkers:'block'});
      const row={...device,passed:false,blockedRequests:0,errors:[],checks:[]};report.results.push(row);
      await context.addInitScript(({lang})=>{localStorage.setItem('match_lang',lang);localStorage.setItem('match_soundEnabled','false');},{lang:device.lang});
      await context.route('**/*',route=>{
        const req=route.request(),url=new URL(req.url());
        if(req.method()==='GET'&&url.origin===origin&&!/^\/(api|auth|rest|functions|realtime)(\/|$)/.test(url.pathname))return route.continue();
        row.blockedRequests++;return route.abort();
      });
      await context.routeWebSocket('**/*',socket=>socket.close());
      const page=await context.newPage();page.on('pageerror',err=>row.errors.push(err.message));
      try{
        await page.goto(origin+'/discover.html',{waitUntil:'domcontentloaded'});
        await page.waitForSelector('.discover-head[data-keyboard]');await page.waitForTimeout(1500);
        const consent=page.locator('.ma-cookie .no').first();if(await consent.isVisible())await consent.click();
        await installFixture(page);
        const input=page.locator('#discover-new-input'),question='Who directed Spirited Away?';
        await send(page,question);await settle(page,false);await idle(page);
        assert.equal((await state(page)).draft,question);assert.equal((await state(page)).debits,0);assert.equal((await state(page)).requests.length,0);
        row.checks.push('denied allowance restores Send draft without provider/debit');
        await page.screenshot({path:path.join(out,device.name+'-recovered.png'),animations:'disabled'});
        await send(page,question);await input.fill('My newer unsent question');await settle(page,true);await idle(page);
        let s=await state(page);assert.equal(s.draft,'My newer unsent question');assert.equal(s.debits,1);assert.equal(s.requests.length,1);assert.equal(s.requests[0].body.lang,device.lang);
        assert.match(await page.locator('.chat-answer-text').last().innerText(),/Hayao Miyazaki/);
        row.checks.push('successful allowance preserves newer input and parses localized provider fixture');
        await send(page,'What year was Spirited Away released?');await page.waitForFunction(()=>__qa.gates.length===1);
        await send(page,'Who wrote Spirited Away?');
        await page.evaluate(()=>{window.__qa.queued=askAndRender('Who wrote Spirited Away?');});
        await settle(page,true);await settle(page,false);await page.evaluate(()=>__qa.queued);await idle(page);
        s=await state(page);assert.equal(s.draft,'Who wrote Spirited Away?');assert.equal(s.debits,2);assert.equal(s.requests.length,2);
        row.checks.push('queued duplicate checks once, recovers denied follow-up and preserves accounting');
        await send(page,'Who wrote Spirited Away?');await page.waitForFunction(()=>__qa.gates.length===1);
        await page.evaluate(()=>__qa.gates.shift().reject(new Error('Deterministic verification interruption')));await idle(page);
        assert.equal((await state(page)).draft,'Who wrote Spirited Away?');
        await send(page,'Who wrote Spirited Away?');await settle(page,true);await idle(page);
        s=await state(page);assert.equal(s.debits,3);assert.equal(s.requests.length,3);assert.equal(s.draft,'');
        row.checks.push('interrupted verification recovers and repeated Send succeeds once');
        await send(page,'Canceled question');await page.waitForFunction(()=>__qa.gates.length===1);await page.evaluate(()=>startNewChat());await settle(page,false);await idle(page);
        assert.equal((await state(page)).draft,'');row.checks.push('conversation replacement cancels old recovery');
        await send(page,'Old language question');await page.waitForFunction(()=>__qa.gates.length===1);
        await page.evaluate(()=>{window.MATCH_LANG=window.MATCH_LANG==='en'?'pt-BR':'en';window.dispatchEvent(new Event('matchapp:langchange'));});
        await settle(page,false);await idle(page);s=await state(page);assert.equal(s.draft,'');assert.equal(s.debits,3);assert.equal(s.requests.length,3);
        row.checks.push('language switch cancels old recovery');
        assert(s.overflow<=2,'horizontal overflow '+s.overflow);
        await input.fill('Fixture preview complete');await page.screenshot({path:path.join(out,device.name+'-complete.png'),animations:'disabled'});
        assert.deepEqual(row.errors,[]);row.passed=true;
      }catch(error){row.failure=error.stack;await page.screenshot({path:path.join(out,device.name+'-failure.png')}).catch(()=>{});process.exitCode=1;}
      finally{await context.close();console.log(JSON.stringify(row));}
    }
  }catch(error){report.failure=error.stack;process.exitCode=1;}
  finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));}
})();
