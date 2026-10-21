'use strict';
// Development-only CDP overlay for the isolated physical-device QA package.
// It serves this checkout at the existing origin without deploying production.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const root=path.resolve(process.env.MATCHAPP_QA_ROOT||path.join(__dirname,'..'));
const out=process.env.MATCHAPP_QA_OUTPUT||path.join(root,'reports/android-ui-20261021/device');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.avif':'image/avif','.woff2':'font/woff2'};
const publicDirectories=new Set(['.well-known','android','assets','au','awareness','br','ca','collections','cooking','covers','data','desktop','ebooks','en','event-posters','events','featured','founder','guides','jonas','jp','kids','moods','news','platforms','pricing','profile','pt','sponsor','streaming','trending','uk','us','where-to-watch']);
const publicRootJson=new Set(['manifest.json','manifest-pt-br.json','release.json']);
function isTrustedPage(value){
 try{const url=new URL(value);return url.origin==='https://matchapp.tv'&&!url.username&&!url.password;}
 catch{return false;}
}
function localDebuggerUrl(value){
 const url=new URL(value);
 if(url.protocol!=='ws:'||url.hostname!=='127.0.0.1'||url.port!=='9223'||url.username||url.password||url.search||url.hash||!/^\/devtools\/page\/[A-Za-z0-9_-]+$/.test(url.pathname))throw Error('QA debugger must use the forwarded loopback page endpoint');
 // Construct the destination from our fixed ADB forward, never a supplied host.
 return 'ws://127.0.0.1:9223'+url.pathname;
}
function allowedAssetPath(relative){
 if(!relative.startsWith('/')||/[\\:\u0000-\u001f\u007f]/.test(relative))return false;
 const parts=relative.split('/');
 if(parts.some(part=>part==='.'||part==='..'||(part.startsWith('.')&&part!=='.well-known')))return false;
 if(/^\/(?:callback|confirm|auth-confirmation|purchase)\.html$/i.test(relative))return false;
 const segments=parts.filter(Boolean);
 if(segments.length>1)return publicDirectories.has(segments[0]);
 return relative!=='/chrome-launcher.js'&&(path.extname(relative)!=='.json'||publicRootJson.has(segments[0]));
}
function loadPublicAssets(checkout){
 const options={encoding:'utf8',maxBuffer:8*1024*1024};
 const gitRoot=execFileSync('git',['-C',checkout,'rev-parse','--show-toplevel'],options).trim();
 if(fs.realpathSync(gitRoot)!==checkout)throw Error('QA root must be the Git checkout root');
 // Only committed regular-file paths in the public web tree may be overlaid.
 // Untracked/staged-only files, Git symlinks and native/tooling files are absent.
 const tree=execFileSync('git',['-C',checkout,'ls-tree','--full-tree','-r','-z','HEAD'],options);
 const assets=new Set();
 for(const entry of tree.split('\0')){
  const match=/^100(?:644|755) blob [0-9a-f]{40,64}\t([^\0]+)$/.exec(entry);
  if(!match)continue;
  const relative='/'+match[1];
  if(allowedAssetPath(relative)&&mime[path.extname(relative)])assets.add(relative);
 }
 if(!assets.has('/index.html'))throw Error('QA checkout has no committed public index.html');
 return assets;
}
function confinedRelative(checkout,file){
 const relative=path.relative(checkout,file);
 if(path.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+path.sep))throw Error('Outside checkout');
 return '/'+relative.split(path.sep).join('/');
}
function readLocalAsset(checkout,pathname,publicAssets){
 const relative=decodeURIComponent(pathname);
 if(!allowedAssetPath(relative))return null;
 let file=path.resolve(checkout,'.'+relative);
 confinedRelative(checkout,file);
 if(relative.endsWith('/')||!path.extname(file))file=path.join(file,'index.html');
 const type=mime[path.extname(file)];if(!type)return null;
 const publicPath=confinedRelative(checkout,file);
 if(!publicAssets.has(publicPath))return null;
 // Reject aliases even if their requested path was once a committed web file.
 // Canonical identity, extension and inventory must all match before opening.
 const canonical=fs.realpathSync(file),canonicalPath=confinedRelative(checkout,canonical);
 if(canonicalPath!==publicPath||!allowedAssetPath(canonicalPath)||!publicAssets.has(canonicalPath)||mime[path.extname(canonical)]!==type)return null;
 file=canonical;
 const fd=fs.openSync(file,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW||0));
 try{
  if(!fs.fstatSync(fd).isFile())return null;
  return {relative,type,body:fs.readFileSync(fd)};
 }finally{fs.closeSync(fd);}
}
async function main(){
 const checkout=fs.realpathSync(root);
 const publicAssets=loadPublicAssets(checkout);
 fs.mkdirSync(out,{recursive:true});
 const response=await fetch('http://127.0.0.1:9223/json/list',{redirect:'error',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw Error('Cannot inspect the forwarded QA WebView');
 const targets=await response.json();
 const target=targets.find(t=>isTrustedPage(t.url));
 if(!target)throw Error('QA WebView must be open on MatchApp first');
 const ws=new WebSocket(localDebuggerUrl(target.webSocketDebuggerUrl));
 await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true});});
 let next=0;const pending=new Map(),served=new Map();
 function rpc(method,params={}){return new Promise((resolve,reject)=>{const id=++next;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});}
 async function intercept(event){
  const id=event.requestId;
  try{
   if(event.request.method!=='GET'||!isTrustedPage(event.request.url))return await rpc('Fetch.continueRequest',{requestId:id});
   const asset=readLocalAsset(checkout,new URL(event.request.url).pathname,publicAssets);
   if(!asset)return await rpc('Fetch.continueRequest',{requestId:id});
   const {relative,type,body}=asset;
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
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={isTrustedPage,localDebuggerUrl,loadPublicAssets,readLocalAsset};
