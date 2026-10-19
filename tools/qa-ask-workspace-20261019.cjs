'use strict';
// Layout-only browser QA. Messages and the reduced visual viewport are explicit
// UI fixtures, never evidence of live AI, speech, backend or physical-device QA.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
const out=path.resolve(process.env.MATCHAPP_QA_OUTPUT||path.join(root,'artifacts','ask-workspace-qa'));
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp',
  '.woff2':'font/woff2','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const matrix=[
  {name:'narrow-pt-BR',width:320,height:710,lang:'pt-BR'},
  {name:'phone-en',width:390,height:844,lang:'en'},
  {name:'tablet-en',width:820,height:1180,lang:'en'},
  {name:'desktop-en',width:1366,height:900,lang:'en'},
  {name:'narrow-ar',width:320,height:710,lang:'ar'},
  {name:'phone-de',width:390,height:844,lang:'de'},
  {name:'phone-ja',width:390,height:844,lang:'ja'},
  {name:'short-phone-pt-BR',width:320,height:568,lang:'pt-BR',scrollWorkspace:true},
  {name:'short-phone-en',width:390,height:600,lang:'en',scrollWorkspace:true},
  {name:'short-tablet-en',width:820,height:450,lang:'en',scrollWorkspace:true},
  {name:'landscape-phone-en',width:710,height:320,lang:'en',scrollWorkspace:true}
];

function staticServer(){return http.createServer((req,res)=>{
  let file,pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+pathname);}
  catch{res.writeHead(400).end();return;}
  if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{if(pathname.endsWith('/'))file=path.join(file,'index.html');
    const body=fs.readFileSync(file);res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(body);
  }catch{res.writeHead(404).end();}
});}

function initFixture({lang}){
  localStorage.setItem('match_lang',lang);
  localStorage.setItem('match_soundEnabled','false');
  const viewport=new EventTarget();
  Object.assign(viewport,{width:innerWidth,height:innerHeight,offsetTop:0,offsetLeft:0,pageTop:0,pageLeft:0,scale:1});
  Object.defineProperty(window,'visualViewport',{value:viewport,configurable:true});
  const shifts=[];
  if(typeof PerformanceObserver==='function'){
    try{new PerformanceObserver(list=>{for(const entry of list.getEntries())
      shifts.push({time:entry.startTime,value:entry.value,recentInput:entry.hadRecentInput});
    }).observe({type:'layout-shift',buffered:true});}catch{}
  }
  window.__askLayoutFixture={label:'UI fixture: layout only; all service requests blocked',shifts,
    viewport(height,offsetTop=0){Object.assign(viewport,{height,offsetTop,pageTop:scrollY+offsetTop});
      viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));},
    stableSince(){return performance.now();}
  };
}

async function layoutState(page){return page.evaluate(()=>{
  const rectangle=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
  const panel=document.querySelector('.discover-head'),log=document.getElementById('chat-log');
  const logRect=rectangle(log);
  const logHitTests=[logRect.top+Math.min(12,logRect.height/4),logRect.top+logRect.height/2,logRect.bottom-Math.min(12,logRect.height/4)].flatMap(y=>
    [logRect.left+12,logRect.left+logRect.width/2,logRect.right-12].map(x=>{
      const hit=document.elementFromPoint(x,y);
      return {x,y,visible:hit===log||log.contains(hit),element:hit?.id||hit?.className||hit?.tagName};
    }));
  const composer=document.querySelector('.newsearch-row .composer');
  const controls=[document.getElementById('discover-new-input'),document.getElementById('mic-btn-discover'),document.querySelector('.composer-send')].map(el=>{
    const rect=rectangle(el),style=getComputedStyle(el),hit=document.elementFromPoint(rect.x+rect.width/2,rect.y+rect.height/2);
    const hitTests=[rect.top+8,rect.top+rect.height/2,rect.bottom-8].flatMap(y=>[rect.left+8,rect.left+rect.width/2,rect.right-8].map(x=>{
      const target=document.elementFromPoint(x,y);return {x,y,visible:target===el||el.contains(target),element:target?.id||target?.className||target?.tagName};
    }));
    const label=el.getAttribute('aria-label')||[...el.labels||[]].map(item=>item.textContent).join(' ')||el.title||el.textContent;
    return {id:el.id||'composer-send',...rect,label:label.trim(),visible:rect.width>1&&rect.height>1&&style.display!=='none'&&style.visibility!=='hidden',
      hit:hit===el||el.contains(hit),hitTests,hitElement:hit?.id||hit?.className||hit?.tagName,fontSize:parseFloat(style.fontSize)};
  });
  return {panel:rectangle(panel),log:{...logRect,scrollHeight:log.scrollHeight,clientHeight:log.clientHeight,scrollTop:log.scrollTop,hitTests:logHitTests},
    composer:rectangle(composer),controls,keyboard:panel.dataset.keyboard,dir:document.documentElement.dir,
    viewport:{width:innerWidth,height:innerHeight,visualHeight:visualViewport.height,offsetTop:visualViewport.offsetTop},
    overflow:document.documentElement.scrollWidth-innerWidth,scrollY};
});}

function verifyState(state,label,{keyboard=false}={}){
  assert.ok(state.overflow<=2,label+': horizontal overflow '+state.overflow);
  const visibleTop=keyboard?state.viewport.offsetTop:0;
  const visibleBottom=keyboard?state.viewport.offsetTop+state.viewport.visualHeight:state.viewport.height;
  assert.ok(state.panel.top>=visibleTop+2&&state.panel.bottom<=visibleBottom-2,label+': panel exceeds viewport '+JSON.stringify(state));
  // A 160px landscape keyboard fixture has room for one readable message line
  // plus the full-size controls. Other layouts retain an 80px minimum.
  const minimumLog=keyboard&&state.viewport.visualHeight<=200?40:80;
  assert.ok(state.log.height>=minimumLog,label+': conversation viewport is cramped '+state.log.height);
  assert.ok(state.log.hitTests.every(point=>point.visible),label+': conversation is obscured '+JSON.stringify(state.log.hitTests));
  for(const control of state.controls){
    assert.ok(control.visible&&control.hit,label+': obscured control '+JSON.stringify(control));
    assert.ok(control.hitTests.every(point=>point.visible),label+': partially obscured control '+JSON.stringify(control));
    assert.ok(control.label,label+': control has no accessible name '+control.id);
    assert.ok(control.left>=state.panel.left&&control.right<=state.panel.right&&control.top>=state.panel.top&&control.bottom<=state.panel.bottom,
      label+': control exceeds panel '+JSON.stringify(control));
    assert.ok(control.left>=3&&control.right<=state.viewport.width-3&&control.top>=visibleTop+3&&control.bottom<=visibleBottom-3,
      label+': control exceeds viewport '+JSON.stringify(control));
    assert.ok(control.height>=44,label+': touch target is too short '+control.id);
  }
  assert.ok(state.controls[0].fontSize>=16,label+': input can trigger mobile focus zoom');
  for(let a=0;a<state.controls.length;a++)for(let b=a+1;b<state.controls.length;b++){
    const x=state.controls[a],y=state.controls[b];
    assert.ok(Math.min(x.right,y.right)-Math.max(x.left,y.left)<=1||Math.min(x.bottom,y.bottom)-Math.max(x.top,y.top)<=1,
      label+': overlapping controls '+x.id+'/'+y.id);
  }
}

async function stableLayout(page,label){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const start=await page.evaluate(()=>window.__askLayoutFixture.stableSince());
  const before=await layoutState(page);await page.waitForTimeout(250);const after=await layoutState(page);
  const shifts=await page.evaluate(since=>window.__askLayoutFixture.shifts.filter(shift=>shift.time>=since),start);
  const cls=shifts.filter(shift=>!shift.recentInput).reduce((sum,shift)=>sum+shift.value,0);
  assert.ok(cls<=0.001,label+': unexpected post-layout CLS '+cls);
  for(const key of ['panel','log','composer'])for(const axis of ['x','y','width','height'])
    assert.ok(Math.abs(before[key][axis]-after[key][axis])<=1,label+': unstable '+key+'.'+axis);
  return {state:after,postLayoutCLS:cls,allLayoutShifts:shifts.length};
}

async function showShortWorkspace(page,item){
  if(!item.scrollWorkspace)return null;
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const result=await page.evaluate(()=>{
    const panel=document.querySelector('.discover-head'),header=document.querySelector('header.app-header');
    const before=panel.getBoundingClientRect(),headerRect=header.getBoundingClientRect();
    const initialScroll=scrollY;
    if(before.bottom>innerHeight-2||before.top<2)
      window.scrollTo({top:Math.max(0,scrollY+before.top-10),behavior:'instant'});
    const style=getComputedStyle(header);
    return {kind:'ordinary vertical page scroll; no keyboard fixture',initialScroll,scrollY,
      headerExists:!!header,headerVisible:style.display!=='none'&&style.visibility!=='hidden',
      headerDocumentTop:headerRect.top+initialScroll,headerHeight:headerRect.height};
  });
  assert.ok(result.headerExists&&result.headerVisible&&result.headerHeight>0,'normal short-screen navigation must remain in the document above the conversation');
  return result;
}

async function addMessages(page){return page.evaluate(()=>{
  const log=document.getElementById('chat-log');log.replaceChildren();
  for(let index=0;index<8;index++){
    const user=document.createElement('div');user.className='chat-user';user.dataset.qaFixture='true';
    user.textContent='UI FIXTURE ONLY — layout question '+(index+1);log.append(user);
    const answer=document.createElement('div');answer.className='chat-assistant';answer.dataset.qaFixture='true';
    const row=document.createElement('div');row.className='chat-answer-row';
    const text=document.createElement('div');text.className='chat-answer-text';
    text.textContent='UI FIXTURE ONLY — synthetic DOM text for scrolling. No AI request or recommendation was made.\n\n'+
      Array.from({length:5},(_,i)=>'Layout paragraph '+(i+1)+': This deliberately long text checks wrapping, natural message height, and a scrollable conversation while the existing input, microphone and Send controls stay visible.').join('\n\n');
    row.append(text);answer.append(row);log.append(answer);
  }
  const dimensions=[...log.children].map(el=>{
    const actual=el.getBoundingClientRect(),clone=el.cloneNode(true);clone.dataset.qaFixture='measurement';
    for(const [key,value]of Object.entries({position:'absolute',visibility:'hidden','pointer-events':'none',width:actual.width+'px',
      'box-sizing':'border-box',height:'auto','max-height':'none','min-height':'0','flex-shrink':'0'}))clone.style.setProperty(key,value,'important');
    log.append(clone);const natural=clone.getBoundingClientRect().height;clone.remove();
    return {height:actual.height,naturalHeight:natural,clientHeight:el.clientHeight,scrollHeight:el.scrollHeight,flexShrink:getComputedStyle(el).flexShrink};
  });
  log.scrollTop=0;return dimensions;
});}

async function run(){
  fs.mkdirSync(out,{recursive:true});let server,browser;
  const report={kind:'layout-only UI fixtures',physicalKeyboardTested:false,liveAITested:false,
    serviceRequests:'blocked; GET static site assets only',started:new Date().toISOString(),results:[]};
  try{
    let base=process.env.MATCHAPP_TEST_BASE;
    if(!base){server=staticServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;}
    const origin=new URL(base).origin;report.base=base;
    const executable=process.env.MATCHAPP_BROWSER_EXECUTABLE||(!fs.existsSync(chromium.executablePath())&&fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
    browser=await chromium.launch({headless:true,executablePath:executable,args:['--no-sandbox','--disable-dev-shm-usage']});
    const selected=process.env.MATCHAPP_QA_CASES?matrix.filter(item=>process.env.MATCHAPP_QA_CASES.split(',').includes(item.name)):matrix;
    assert.ok(selected.length,'MATCHAPP_QA_CASES did not select a known viewport');
    for(const item of selected){
      const context=await browser.newContext({viewport:{width:item.width,height:item.height},locale:item.lang,reducedMotion:'reduce',serviceWorkers:'block'});
      const result={...item,passed:false,blockedRequests:0,states:{},screenshots:[]};report.results.push(result);
      await context.addInitScript(initFixture,{lang:item.lang});
      await context.route('**/*',route=>{
        const request=route.request(),url=new URL(request.url());
        const staticGET=['GET','HEAD'].includes(request.method())&&url.origin===origin&&
          !/^\/(?:api|auth|rest|functions|realtime)(?:\/|$)/.test(url.pathname)&&
          (!['fetch','xhr'].includes(request.resourceType())||/\.(?:json|html|js|css)$/.test(url.pathname));
        if(staticGET)return route.continue();result.blockedRequests++;return route.abort();
      });
      if(context.routeWebSocket)await context.routeWebSocket('**/*',socket=>socket.close());
      const page=await context.newPage();
      const screenshot=async phase=>{const name=item.name+'-'+phase+'.png';await page.screenshot({path:path.join(out,name),animations:'disabled'});result.screenshots.push(name);};
      try{
        const response=await page.goto(new URL('/discover.html',base).href,{waitUntil:'domcontentloaded',timeout:45000});
        assert.ok(response&&response.ok(),'Ask AI document could not be loaded');
        await page.waitForSelector('.discover-head[data-keyboard]');
        await page.waitForTimeout(1500);
        const consent=page.locator('.ma-cookie .no').first();result.consentDismissed=await consent.isVisible();
        if(result.consentDismissed)await consent.click();
        await page.evaluate(async()=>{await document.fonts.ready;const log=document.getElementById('chat-log');
          const note=document.createElement('div');note.className='chat-assistant';note.dataset.qaFixture='true';
          note.textContent=window.__askLayoutFixture.label;log.replaceChildren(note);});
        result.ordinaryPageScroll=await showShortWorkspace(page,item);
        result.states.initial=await stableLayout(page,item.name+' initial');verifyState(result.states.initial.state,item.name+' initial');
        result.touchTargetsUnder44=result.states.initial.state.controls.filter(control=>control.height<44).map(control=>({id:control.id,height:control.height}));
        if(item.lang==='ar')assert.equal(result.states.initial.state.dir,'rtl','Arabic document must use RTL');
        await screenshot('before');
        result.messageDimensions=await addMessages(page);
        for(const dimension of result.messageDimensions){
          assert.equal(dimension.flexShrink,'0','message must not shrink in the flex log');
          assert.ok(Math.abs(dimension.height-dimension.naturalHeight)<=2,'message lost natural height '+JSON.stringify(dimension));
          assert.ok(dimension.scrollHeight<=dimension.clientHeight+2,'message has clipped inner content '+JSON.stringify(dimension));
        }
        const top=await layoutState(page);assert.ok(top.log.scrollHeight>top.log.clientHeight*2,'long fixture must overflow the log');
        await page.locator('#chat-log').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        result.states.messages=await stableLayout(page,item.name+' messages');const bottom=result.states.messages.state;
        verifyState(bottom,item.name+' messages');assert.ok(bottom.log.scrollTop>0,'conversation did not scroll');
        assert.ok(Math.abs(top.composer.y-bottom.composer.y)<=1&&Math.abs(top.scrollY-bottom.scrollY)<=1,'scrolling messages moved the composer or page');
        await screenshot('after-messages');
        await page.locator('#discover-new-input').fill('UI FIXTURE ONLY\nA multiline layout question\nNo request will be sent.');
        result.states.multiline=await stableLayout(page,item.name+' multiline');verifyState(result.states.multiline.state,item.name+' multiline');
        assert.equal(await page.locator('#discover-new-input').inputValue(),'UI FIXTURE ONLY\nA multiline layout question\nNo request will be sent.');
        await screenshot('multiline');
        const reduced=Math.min(420,item.height-160),offsetTop=30;
        await page.evaluate(({height,offset})=>window.__askLayoutFixture.viewport(height,offset),{height:reduced,offset:offsetTop});
        result.states.simulatedKeyboard=await stableLayout(page,item.name+' simulated keyboard');
        assert.equal(result.states.simulatedKeyboard.state.keyboard,'true');verifyState(result.states.simulatedKeyboard.state,item.name+' simulated keyboard',{keyboard:true});
        await screenshot('simulated-keyboard');
        await page.evaluate(height=>window.__askLayoutFixture.viewport(height,0),item.height);
        await page.locator('#discover-new-input').fill('');
        await showShortWorkspace(page,item);
        result.states.restored=await stableLayout(page,item.name+' restored');verifyState(result.states.restored.state,item.name+' restored');
        // Android adjustResize changes the layout viewport too. This browser
        // resize fixture exercises that branch without claiming a real IME.
        await page.locator('#discover-new-input').focus();
        await page.setViewportSize({width:item.width,height:reduced});
        await page.evaluate(height=>window.__askLayoutFixture.viewport(height,0),reduced);
        result.states.simulatedAdjustResize=await stableLayout(page,item.name+' simulated adjustResize');
        assert.equal(result.states.simulatedAdjustResize.state.keyboard,'true');
        verifyState(result.states.simulatedAdjustResize.state,item.name+' simulated adjustResize',{keyboard:true});
        await screenshot('simulated-adjust-resize');
        await page.setViewportSize({width:item.width,height:item.height});
        await page.evaluate(height=>window.__askLayoutFixture.viewport(height,0),item.height);
        await showShortWorkspace(page,item);
        result.states.final=await stableLayout(page,item.name+' final');verifyState(result.states.final.state,item.name+' final');
        result.passed=true;console.log('PASS_ASK_WORKSPACE',item.name,item.width+'x'+item.height,'screenshots='+result.screenshots.length);
      }catch(error){result.error=error.stack||String(error);await screenshot('failure').catch(()=>{});console.error('FAIL_ASK_WORKSPACE',item.name,error.message);}
      finally{await context.close();}
    }
  }finally{
    if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));
    report.finished=new Date().toISOString();report.passed=report.results.filter(result=>result.passed).length;
    report.failed=report.results.filter(result=>!result.passed).length;
    fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  }
  assert.equal(report.failed,0,'Ask workspace layout checks failed; see '+path.join(out,'report.json'));
  console.log('ASK_WORKSPACE_ALL_PASS',report.passed+'/'+report.results.length,'report='+path.join(out,'report.json'));
}
run().catch(error=>{console.error(error.stack||error);process.exitCode=1;});
