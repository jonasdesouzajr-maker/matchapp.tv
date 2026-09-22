const targetUrl=process.argv[2]||'https://matchapp.tv/';
const cdpBase=process.env.MATCHAPP_CDP||'http://127.0.0.1:9222';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const target=await fetch(cdpBase+'/json/new?'+encodeURIComponent('about:blank'),{method:'PUT'}).then(async r=>{if(!r.ok)throw new Error('CDP target '+r.status);return r.json()});
const ws=new WebSocket(target.webSocketDebuggerUrl);
let seq=0,closed=false,crashed=false;
const pending=new Map();
ws.addEventListener('message',event=>{
  const msg=JSON.parse(event.data);
  if(msg.id){
    const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);
    if(msg.error)p.reject(new Error(msg.error.message||JSON.stringify(msg.error)));else p.resolve(msg.result);
    return;
  }
  if(msg.method==='Inspector.targetCrashed'||msg.method==='Target.targetCrashed')crashed=true;
});
ws.addEventListener('close',()=>{closed=true;for(const p of pending.values())p.reject(new Error('Chrome target closed'));pending.clear()});
await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})});

function send(method,params={}){
  if(closed)throw new Error('Chrome target already closed');
  const id=++seq;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP timeout: '+method))},10000);
    pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v)},reject:e=>{clearTimeout(timer);reject(e)}});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const out=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(out.exceptionDetails)throw new Error('page evaluation failed');
  return out.result?.value;
}
async function waitReady(){
  const end=Date.now()+30000;
  while(Date.now()<end){
    if(crashed)throw new Error('Chrome renderer crashed while loading');
    try{if(await evaluate('document.readyState')==='complete')return}catch(_){}
    await sleep(250);
  }
  throw new Error('Home did not finish loading within 30s');
}
async function state(){
  return evaluate('({y:Math.round(window.scrollY),h:document.documentElement.scrollHeight,v:window.innerHeight,ready:document.readyState,href:location.href})');
}
async function scenario(name,width,height,mobile=false){
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:mobile?2:1,mobile,screenWidth:width,screenHeight:height});
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.navigate',{url:targetUrl});
  await waitReady();
  await sleep(6000);

  let s=await state();
  if(crashed)throw new Error(name+': renderer crashed after load');
  if(s.y>20)throw new Error(name+': Home auto-scrolled on startup to y='+s.y);

  await evaluate("document.documentElement.style.scrollBehavior='auto';document.body.style.scrollBehavior='auto';0");
  const fractions=[.2,.55,1,.7,.35,0,1,.5,0,.85,.15,0];
  for(const f of fractions){
    s=await state();
    const max=Math.max(0,s.h-s.v);
    await evaluate('window.scrollTo(0,'+Math.round(max*f)+');0');
    await sleep(180);
    if(crashed)throw new Error(name+': renderer crashed during scroll loop');
    await state();
  }

  await evaluate('window.scrollTo(0,0);0');
  await sleep(3000);
  s=await state();
  if(crashed)throw new Error(name+': renderer crashed after scroll loop');
  if(s.y>30)throw new Error(name+': Home moved itself after returning to top (y='+s.y+')');

  console.log(name+': PASS, scrollHeight='+s.h+', viewport='+s.v);
}

await send('Page.enable');
await send('Runtime.enable');
try{await send('Inspector.enable')}catch(_){}
await scenario('desktop',1440,900,false);
await scenario('mobile',390,844,true);

async function kidsMatchScenario(){
  const kidsUrl=new URL('/kids/',targetUrl).href;
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.navigate',{url:kidsUrl});
  await waitReady();
  await sleep(3500);

  // Fresh guest quota for this isolated browser profile, then trigger the
  // exact flow users reported freezing: a Kids match that opens the result.
  await evaluate(`localStorage.removeItem('match_lastDate');localStorage.removeItem('match_dailyCount');localStorage.removeItem('match_guestBonusMatches');0`);
  await evaluate(`document.getElementById('kids-match-submit')?.click();0`);

  const deadline=Date.now()+20000;
  let opened=false;
  while(Date.now()<deadline){
    if(crashed)throw new Error('kids-mobile: renderer crashed while opening result');
    try{
      opened=!!(await evaluate(`!!document.getElementById('kids-watch-dialog')?.open`));
      if(opened)break;
    }catch(_){}
    await sleep(250);
  }
  if(!opened)throw new Error('kids-mobile: result dialog did not open within 20s');

  // A microtask feedback loop starves timers and CDP execution. Count both a
  // heartbeat and result-subtree mutations for several seconds: the page must
  // stay responsive and the result must settle instead of rewriting forever.
  await evaluate(`(()=>{const d=document.getElementById('kids-watch-dialog');window.__kidsBeat=0;window.__kidsMut=0;window.__kidsBeatTimer=setInterval(()=>window.__kidsBeat++,100);window.__kidsObserver=new MutationObserver(r=>window.__kidsMut+=r.length);window.__kidsObserver.observe(d,{subtree:true,childList:true,characterData:true});return 0})()`);
  await sleep(4500);
  const health=await evaluate(`({beat:window.__kidsBeat||0,mut:window.__kidsMut||0,open:!!document.getElementById('kids-watch-dialog')?.open,title:document.getElementById('kids-watch-name')?.textContent||'',previewChildren:document.getElementById('matchapp-kids-preview')?.childElementCount||0})`);
  await evaluate(`clearInterval(window.__kidsBeatTimer);window.__kidsObserver?.disconnect();0`);
  if(crashed)throw new Error('kids-mobile: renderer crashed after result opened');
  if(!health.open||!health.title)throw new Error('kids-mobile: usable result disappeared after opening');
  if(health.beat<25)throw new Error('kids-mobile: main thread heartbeat starved after result (beat='+health.beat+')');
  if(health.mut>24)throw new Error('kids-mobile: result subtree kept rewriting after open (mutations='+health.mut+')');
  console.log('kids-mobile: PASS, heartbeat='+health.beat+', mutations='+health.mut+', title='+health.title+', previewChildren='+health.previewChildren);
}

await kidsMatchScenario();

async function askAiSmartphoneScenario(){
  const url=new URL('/discover.html',targetUrl).href;
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.navigate',{url});
  await waitReady();
  await sleep(3500);
  const before=await evaluate(`(()=>{const row=document.querySelector('.newsearch-row'),c=document.querySelector('.composer'),t=document.getElementById('discover-new-input'),m=document.getElementById('mic-btn-discover');const rect=e=>{const r=e?.getBoundingClientRect();return r?{x:r.x,y:r.y,w:r.width,h:r.height}:null};const cs=e=>e?getComputedStyle(e):null;return {row:rect(row),composer:rect(c),textarea:rect(t),mic:rect(m),td:cs(t)?.display,tv:cs(t)?.visibility,to:cs(t)?.opacity,md:cs(m)?.display,mv:cs(m)?.visibility,viewport:innerWidth}})()`);
  if(!before.row||!before.composer||!before.textarea||!before.mic)throw new Error('ask-ai-mobile: composer controls missing');
  if(before.viewport>640)throw new Error('ask-ai-mobile: smartphone media query not active');
  if(before.composer.w<280||before.textarea.w<160||before.textarea.h<44)throw new Error('ask-ai-mobile: typing field has unusable geometry '+JSON.stringify(before));
  if(before.td==='none'||before.tv==='hidden'||Number(before.to)===0)throw new Error('ask-ai-mobile: textarea is hidden');
  if(before.md==='none'||before.mv==='hidden'||before.mic.w<44||before.mic.h<44)throw new Error('ask-ai-mobile: mic is hidden');
  const typed=await evaluate(`(()=>{const t=document.getElementById('discover-new-input');t.value='I can see what I am typing';t.dispatchEvent(new Event('input',{bubbles:true}));const r=t.getBoundingClientRect();return {value:t.value,w:r.width,h:r.height,display:getComputedStyle(t).display,visibility:getComputedStyle(t).visibility}})()`);
  if(typed.value!=='I can see what I am typing'||typed.w<160||typed.h<44||typed.display==='none'||typed.visibility==='hidden')throw new Error('ask-ai-mobile: typed text field did not remain usable');
  console.log('ask-ai-mobile: PASS, composer='+Math.round(before.composer.w)+'x'+Math.round(before.composer.h)+', textarea='+Math.round(typed.w)+'x'+Math.round(typed.h)+', mic='+Math.round(before.mic.w)+'x'+Math.round(before.mic.h));
}

async function profileVisualScenario(){
  const url=new URL('/profile/profile.html',targetUrl).href;
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true,screenWidth:390,screenHeight:844});
  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await send('Page.navigate',{url});
  await waitReady();
  await sleep(3000);
  const state=await evaluate(`(()=>{const p=document.getElementById('profile-pic-preview'),wall=document.querySelector('.poster-wall');const ps=p?getComputedStyle(p):null,pr=p?.getBoundingClientRect();return {pageProfile:document.body.classList.contains('page-profile'),wall:!!wall,posterTiles:document.querySelectorAll('.poster-wall-tile').length,pic:pr?{w:pr.width,h:pr.height}:null,borderWidth:ps?.borderTopWidth,borderColor:ps?.borderTopColor,radius:ps?.borderRadius,clip:ps?.clipPath,bg:ps?.backgroundColor}})()`);
  if(!state.pageProfile)throw new Error('profile-mobile: page-profile body class missing');
  if(!state.wall||state.posterTiles<1)throw new Error('profile-mobile: Home poster-wall background did not load');
  if(!state.pic||Math.abs(state.pic.w-state.pic.h)>2||state.pic.w<100)throw new Error('profile-mobile: photo crop is not square/circular geometry');
  if(state.borderWidth!=='3px'||!state.radius.includes('50%')||state.clip==='none')throw new Error('profile-mobile: photo gold/circular outline is not active '+JSON.stringify(state));
  console.log('profile-mobile: PASS, wallTiles='+state.posterTiles+', avatar='+Math.round(state.pic.w)+'x'+Math.round(state.pic.h)+', border='+state.borderWidth+', radius='+state.radius);
}

await askAiSmartphoneScenario();
await profileVisualScenario();
ws.close();
console.log('MatchApp browser startup/scroll + Kids + Ask AI mobile + Profile smoke: PASS');
