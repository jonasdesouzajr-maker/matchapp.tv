'use strict';
// Development-only CDP overlay for the isolated physical-device QA package.
// It serves this checkout at the existing origin without deploying production.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(process.env.MATCHAPP_QA_ROOT||path.join(__dirname,'..'));
const out=process.env.MATCHAPP_QA_OUTPUT||path.join(root,'reports/android-ui-20261021/device');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const targets=await(await fetch('http://127.0.0.1:9223/json/list')).json();
 const target=targets.find(t=>t.url.startsWith('https://matchapp.tv'));
 if(!target)throw Error('QA WebView must be open on MatchApp first');
 const ws=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let next=0;const pending=new Map(),served=new Map();
 function rpc(method,params={}){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
 async function intercept(event){
  const id=event.requestId,url=new URL(event.request.url);
  try{
   if(event.request.method!=='GET'||url.origin!=='https://matchapp.tv')return await rpc('Fetch.continueRequest',{requestId:id});
   const relative=decodeURIComponent(url.pathname);
   if(/^\/(?:\.git|\.github|android-studio|private-voice|oauth|tests|tools|reports|node_modules|api)(?:\/|$)/.test(relative)||/^\/(?:callback|confirm|purchase)\.html$/.test(relative))return await rpc('Fetch.continueRequest',{requestId:id});
   let file=path.resolve(root,'.'+relative);
   if(file!==root&&!file.startsWith(root+path.sep))throw Error('Outside checkout');
   if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
   const type=mime[path.extname(file)];if(!type)return await rpc('Fetch.continueRequest',{requestId:id});
   const body=fs.readFileSync(file);
   await rpc('Fetch.fulfillRequest',{requestId:id,responseCode:200,responseHeaders:[{name:'Content-Type',value:type},{name:'Cache-Control',value:'no-store'}],body:body.toString('base64')});
   served.set(relative,{path:relative,bytes:body.length,sha256:crypto.createHash('sha256').update(body).digest('hex')});
   fs.writeFileSync(path.join(out,'webview-overlay-served.json'),JSON.stringify({scope:'Isolated QA WebView; local checkout overlay, not production deployment',resources:[...served.values()]},null,2));
  }catch(error){await rpc('Fetch.continueRequest',{requestId:id}).catch(()=>{});}
 }
 ws.addEventListener('message',event=>{const message=JSON.parse(event.data),request=pending.get(message.id);
  if(request){pending.delete(message.id);message.error?request.reject(Error(JSON.stringify(message.error))):request.resolve(message.result);}
  if(message.method==='Fetch.requestPaused')void intercept(message.params);
 });
 await rpc('Network.enable');await rpc('Network.setCacheDisabled',{cacheDisabled:true});
 await rpc('Fetch.enable',{patterns:[{urlPattern:'https://matchapp.tv/*',requestStage:'Request'}]});
 await rpc('Page.enable');await rpc('Page.navigate',{url:'https://matchapp.tv/'});
 console.log('Physical QA overlay active');
 async function stop(){await rpc('Fetch.disable').catch(()=>{});ws.close();process.exit(0);}
 process.once('SIGINT',stop);process.once('SIGTERM',stop);setTimeout(stop,30*60*1000);
})().catch(error=>{console.error(error);process.exitCode=1;});
