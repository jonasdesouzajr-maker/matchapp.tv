'use strict';
// Local fixture only: real Chromium clicks and current page styles, mocked
// account/SSV/native contracts, no live ad requests, spending or credits.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require('playwright'),api=require('../match-tokens.js');
const root=path.resolve(__dirname,'..'),out=process.env.MATCHAPP_REWARDS_QA_OUT||'/tmp/matchapp-rewards-frontend-20261101';
const mime={'.html':'text/html','.css':'text/css','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');let file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
    if(file!==root&&!file.startsWith(root+path.sep))return res.writeHead(403).end();
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    let body=fs.readFileSync(file);
    if(file.endsWith('.html'))body=body.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,'').replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi,'').replace('</body>','<script src="/patches/reference-dialogs.js"></script><script src="/patches/reference-pills.js"></script><script src="/match-tokens.js"></script></body>');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch(_){res.writeHead(404).end();}
});
(async()=>{
  fs.mkdirSync(out,{recursive:true});await new Promise(done=>server.listen(0,'127.0.0.1',done));
  let browser;const cases=[];
  try{
    browser=await chromium.launch({headless:true,executablePath:process.env.MATCHAPP_BROWSER_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']});
    const base='http://127.0.0.1:'+server.address().port;
    const selected=process.env.MATCHAPP_REWARDS_QA_LANGS?.split(',')||api.languages;
    for(const lang of selected)for(const size of [{width:320,height:740},{width:390,height:844},{width:820,height:1180},{width:1280,height:800}]){
      const page=await browser.newPage({viewport:size,reducedMotion:'reduce'});const errors=[];page.on('pageerror',error=>errors.push(error.message));
      await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!==base||['image','media'].includes(route.request().resourceType()))return route.abort();return route.continue();});
      await page.addInitScript(({lang})=>{
        window.MATCH_LANG=lang;localStorage.setItem('match_lang',lang);window.__rewardMessages=[];window.__rewardCalls=[];window.__ssvCredited=false;
        const balance=()=>({ok:true,enabled:true,policy_version:'legacy-rewards-v1',credit_target:'extra_matches',authenticated:true,daily_limit:5,daily_remaining:0,bonus_tokens:0,purchased_matches:window.__ssvCredited?3:0,remaining:0,available_total:window.__ssvCredited?3:0,first_match_pending:false,ad_free:false,pro_active:false,unlimited:false,next_reset_at:'2026-11-02T00:00:00.000Z',rewarded_available:!window.__ssvCredited});
        window.supabaseClient={auth:{getSession:async()=>({data:{session:{user:{id:'local-fixture-only'},access_token:'fixture-token-only'}}})},rpc:async name=>({data:name==='match_token_status'?{ok:true,enabled:false,authenticated:false,policy_version:'match-tokens-v1'}:balance()}),functions:{invoke:async(name,{body})=>{window.__rewardCalls.push(body);return {data:body.action==='create'?{ok:true,creditTarget:'extra_matches',claimStatus:'created',claimNonce:'a'.repeat(64),rewardAmount:3,expiresAt:Date.now()+600000,wallet:balance()}:{ok:true,creditTarget:'extra_matches',claimNonce:'a'.repeat(64),status:window.__ssvCredited?'credited':'prepared',claimStatus:window.__ssvCredited?'credited':'prepared',credited:window.__ssvCredited,wallet:balance()}};}}};
        window.MatchAppNativeRewards={postMessage:value=>window.__rewardMessages.push(JSON.parse(value))};
      },{lang});
      await page.goto(base+'/',{waitUntil:'load'});
      await page.evaluate(()=>{document.documentElement.style.setProperty('--font-scale','1.3');document.getElementById('out-of-matches-modal').style.display='flex';});
      const entry=page.locator('[data-legacy-reward-entry] button');await entry.waitFor({state:'visible'});await entry.click();
      const dialog=page.locator('.ma-token-dialog');await dialog.waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>document.getElementById('out-of-matches-modal').inert),true);
      assert.equal(await page.evaluate(()=>document.activeElement===document.querySelector('.ma-token-button--close')),true);
      await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.tokenAction),'keep');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.dataset.tokenAction),'close');
      for(let i=0;i<7;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.querySelector('.ma-token-dialog').contains(document.activeElement)),true);}
      await page.keyboard.press('Escape');assert.equal(await page.locator('.ma-token-scrim').evaluate(el=>el.hidden),true);assert.equal(await page.evaluate(()=>document.getElementById('out-of-matches-modal').inert),false);assert.equal(await page.evaluate(()=>document.activeElement.matches('[data-legacy-reward-entry] button')),true);
      await entry.click();await page.locator('.ma-token-button--close').click();assert.equal(await page.evaluate(()=>document.activeElement.matches('[data-legacy-reward-entry] button')),true);await entry.click();
      await page.waitForFunction(()=>document.querySelector('.ma-token-dialog h2').hasAttribute('data-ma-text-pill'));
      const geometry=await dialog.evaluate(element=>{
        const rect=element.getBoundingClientRect();return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:rect.width,scrollWidth:element.scrollWidth,clientWidth:element.clientWidth,
          lang:element.lang,dir:element.dir,content:[...element.querySelectorAll('h2,p,strong')].map(el=>{const box=el.getBoundingClientRect();return {tag:el.tagName,left:box.left,right:box.right,width:box.width,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth};}),buttons:[...element.querySelectorAll('button')].map(el=>{const box=el.getBoundingClientRect(),style=getComputedStyle(el);return {height:box.height,width:box.width,fontSize:parseFloat(style.fontSize),overflow:el.scrollWidth>el.clientWidth+1};})};
      });
      assert.equal(geometry.lang,lang);assert.equal(geometry.dir,lang==='ar'?'rtl':'ltr');assert.ok(geometry.left>=0&&geometry.right<=size.width+1,lang+' viewport fit');assert.ok(geometry.scrollWidth<=geometry.clientWidth+1,lang+' no horizontal clipping');
      assert.ok(geometry.buttons.every(button=>button.height>=47&&button.fontSize>=20&&!button.overflow),lang+' scaled controls wrap with touch targets '+JSON.stringify(geometry));
      assert.ok(geometry.content.every(box=>box.left>=geometry.left&&box.right<=geometry.right+1&&box.scrollWidth<=box.clientWidth+1),lang+' content fits the dialog '+JSON.stringify(geometry));
      const reward=page.getByRole('button',{name:api.legacyText(lang,'reward'),exact:true});await reward.click();
      assert.equal(await page.evaluate(()=>document.querySelector('.ma-token-dialog').contains(document.activeElement)),true,'redraw retains dialog focus');
      let messages=await page.evaluate(()=>window.__rewardMessages);assert.equal(messages.filter(value=>value.type==='prepare').length,1);assert.equal(messages.filter(value=>value.type==='show').length,0);
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('matchapp:rewarded',{detail:{requestId:window.__rewardMessages[0].requestId,status:'ready'}})));
      await page.getByRole('button',{name:api.legacyText(lang,'watch'),exact:true}).click();
      messages=await page.evaluate(()=>window.__rewardMessages);assert.equal(messages.filter(value=>value.type==='show').length,1);
      await page.evaluate(()=>window.dispatchEvent(new CustomEvent('matchapp:rewarded',{detail:{requestId:window.__rewardMessages[0].requestId,status:'earned',rewardEarned:true,serverVerified:true}})));
      await page.waitForFunction(()=>window.__rewardCalls.some(value=>value.action==='status'));
      assert.equal(await page.locator('.ma-token-notice').textContent(),api.legacyText(lang,'verifying'));
      await page.evaluate(()=>{window.__ssvCredited=true;window.dispatchEvent(new CustomEvent('matchapp:rewarded',{detail:{requestId:window.__rewardMessages[0].requestId,status:'dismissed'}}));});
      await page.waitForFunction(expected=>document.querySelector('.ma-token-notice').textContent===expected,api.legacyText(lang,'credited'));
      assert.equal(await page.evaluate(()=>MatchAppTokens.enabled),false);
      if(['en','pt-BR','ar'].includes(lang)&&size.width===320){await dialog.evaluate(el=>{el.scrollTop=0;});await page.screenshot({path:path.join(out,lang+'-320.png'),fullPage:false});}
      cases.push({lang,...size,geometry,pass:true});await page.close();
      assert.deepEqual(errors,[]);
    }
    const report={scope:'Local mocked browser contracts only; current Home HTML/CSS, shared notice-dialog owner and text-pill runtime, real trusted Chromium clicks, Tab/Shift+Tab containment, Escape/close/focus return, redraw focus, 130% font scale, reduced motion. No live SSV, ads, tablet or account proof.',pass:true,cases};
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('PASS '+cases.length+' language/viewport cases; evidence '+out);
  }finally{if(browser)await browser.close();server.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
