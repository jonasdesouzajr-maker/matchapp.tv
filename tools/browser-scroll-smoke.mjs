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
ws.close();
console.log('MatchApp browser startup/scroll smoke: PASS');
