'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../tools/qa-webview-overlay-20261021.cjs'),'utf8');
const overlay=require('../tools/qa-webview-overlay-20261021.cjs');

function withCheckout(run){
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-overlay-'));
 const checkout=path.join(parent,'checkout');fs.mkdirSync(checkout);
 try{return run(fs.realpathSync(checkout),parent);}
 finally{fs.rmSync(parent,{recursive:true,force:true});}
}
function definitions(filesystem){
 const module={exports:{}};
 vm.runInNewContext(source,{module,__dirname:path.join(__dirname,'../tools'),process:{env:{}},URL,Buffer,
  require(name){return name==='node:fs'?filesystem:require(name);}});
 return module.exports;
}

test('QA overlay accepts only the exact credential-free MatchApp HTTPS origin',()=>{
 for(const url of ['https://matchapp.tv/','https://matchapp.tv:443/how-it-works.html#chapter-9','https://matchapp.tv/profile.html?tab=history'])assert.equal(overlay.isTrustedPage(url),true,url);
 for(const url of ['https://matchapp.tv.evil.example/','https://matchapp.tv@evil.example/','https://evil.example/?https://matchapp.tv','https://user:password@matchapp.tv/','https://matchapp.tv:444/','http://matchapp.tv/','https://www.matchapp.tv/','file:///index.html','/index.html','not a URL',null])assert.equal(overlay.isTrustedPage(url),false,String(url));
});

test('QA debugger can connect only to the fixed loopback ADB port and page path',()=>{
 for(const suffix of ['123','ABCD-0123_456'])assert.equal(overlay.localDebuggerUrl('ws://127.0.0.1:9223/devtools/page/'+suffix),'ws://127.0.0.1:9223/devtools/page/'+suffix);
 for(const url of ['ws://evil.example:9223/devtools/page/123','ws://127.0.0.1.evil.example:9223/devtools/page/123','ws://localhost:9223/devtools/page/123','ws://127.0.0.1:9222/devtools/page/123','wss://127.0.0.1:9223/devtools/page/123','ws://user:password@127.0.0.1:9223/devtools/page/123','ws://127.0.0.1:9223/devtools/page/123?redirect=evil','ws://127.0.0.1:9223/devtools/page/123#fragment','ws://127.0.0.1:9223/devtools/browser/123','ws://127.0.0.1:9223/devtools/page/%2fsecret','ws://127.0.0.1:9223/devtools/page/','not a URL'])assert.throws(()=>overlay.localDebuggerUrl(url),undefined,url);
});

test('QA overlay serves exact static bytes, directory indexes and supported media',()=>withCheckout(checkout=>{
 fs.writeFileSync(path.join(checkout,'index.html'),'<h1>Home</h1>');
 fs.mkdirSync(path.join(checkout,'guide'));fs.writeFileSync(path.join(checkout,'guide/index.html'),'<h1>Guide</h1>');
 fs.mkdirSync(path.join(checkout,'assets'));const bytes=Buffer.from([0,255,128,71]);fs.writeFileSync(path.join(checkout,'assets/original.avif'),bytes);
 for(const route of ['/','/index.html'])assert.equal(overlay.readLocalAsset(checkout,route).body.toString(),'<h1>Home</h1>');
 for(const route of ['/guide','/guide/'])assert.equal(overlay.readLocalAsset(checkout,route).body.toString(),'<h1>Guide</h1>');
 const art=overlay.readLocalAsset(checkout,'/assets/original.avif');assert.equal(art.type,'image/avif');assert.deepEqual(art.body,bytes);
 assert.equal(overlay.readLocalAsset(checkout,'/unsupported.secret'),null);
}));

test('QA overlay rejects encoded traversal, Windows paths, private files and auth/payment callbacks before reading',()=>withCheckout(checkout=>{
 const readCalls=[];
 const safe=definitions({...fs,readFileSync(file){readCalls.push(file);throw Error('Private data must not be read');}});
 for(const route of ['/../private.json','/%2e%2e%2fprivate.json','/assets/..%2fprivate.json','/assets/%5c..%5cprivate.json','/assets/C%3a/private.json','/asset.json%00','/.env.json','/.git/config.json','/.github/workflows/config.json','/private-voice/config.json','/reports/device.json','/tools/private.js','/tests/fixture.json','/android-studio/config.json','/node_modules/package.json','/api/config.json','/oauth/callback.html','/callback.html','/confirm.html','/auth-confirmation.html','/purchase.html'])assert.equal(safe.readLocalAsset(checkout,route),null,route);
 assert.throws(()=>safe.readLocalAsset(checkout,'/%invalid'));
 assert.equal(readCalls.length,0);
}));

test('QA asset aliases cannot escape the checkout or expose an excluded directory',()=>withCheckout((checkout,parent)=>{
 const outside=path.join(parent,'outside');fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'secret.json'),'PRIVATE');
 fs.symlinkSync(outside,path.join(checkout,'alias'),'junction');
 assert.throws(()=>overlay.readLocalAsset(checkout,'/alias/secret.json'),/Outside checkout/);
 fs.mkdirSync(path.join(checkout,'reports'));fs.writeFileSync(path.join(checkout,'reports/private.json'),'PRIVATE');
 fs.symlinkSync(path.join(checkout,'reports'),path.join(checkout,'assets'),'junction');
 assert.equal(overlay.readLocalAsset(checkout,'/assets/private.json'),null);
}));

test('QA serving checks and reads the opened regular-file handle across pathname replacement',()=>withCheckout(checkout=>{
 const file=path.join(checkout,'index.html'),original=path.join(checkout,'opened.html');
 fs.writeFileSync(file,'APPROVED');let opened,closed=0;
 const safe=definitions({...fs,
  openSync(...args){opened=fs.openSync(...args);return opened;},
  fstatSync(fd){const result=fs.fstatSync(fd);fs.renameSync(file,original);fs.writeFileSync(file,'REPLACEMENT');return result;},
  readFileSync(fd){assert.equal(fd,opened);assert.equal(typeof fd,'number');return fs.readFileSync(fd);},
  closeSync(fd){assert.equal(fd,opened);closed++;return fs.closeSync(fd);}
 });
 assert.equal(safe.readLocalAsset(checkout,'/index.html').body.toString(),'APPROVED');
 assert.equal(fs.readFileSync(file,'utf8'),'REPLACEMENT');assert.equal(closed,1);assert.throws(()=>fs.fstatSync(opened),{code:'EBADF'});
}));

test('QA serving closes the descriptor when reading fails or the opened entry is not a regular file',()=>withCheckout(checkout=>{
 fs.writeFileSync(path.join(checkout,'index.html'),'APPROVED');
 for(const nonFile of [false,true]){
  let opened,closed=0;
  const safe=definitions({...fs,
   openSync(...args){opened=fs.openSync(...args);return opened;},
   fstatSync(fd){return nonFile?{isFile:()=>false}:fs.fstatSync(fd);},
   readFileSync(){throw Error('controlled read error');},
   closeSync(fd){closed++;return fs.closeSync(fd);}
  });
  if(nonFile)assert.equal(safe.readLocalAsset(checkout,'/index.html'),null);
  else assert.throws(()=>safe.readLocalAsset(checkout,'/index.html'),/controlled read error/);
  assert.equal(closed,1);assert.throws(()=>fs.fstatSync(opened),{code:'EBADF'});
 }
}));

test('QA overlay startup and interception keep file bytes on the loopback debugger and pass excluded requests through',async()=>{
 const parent=fs.mkdtempSync(path.join(os.tmpdir(),'matchapp-overlay-flow-'));
 try{
  const checkout=path.join(parent,'checkout');fs.mkdirSync(checkout);fs.writeFileSync(path.join(checkout,'index.html'),'APPROVED HOME');
  const sent=[],connections=[],fetches=[],module={exports:{}};let socket,ready;
  const started=new Promise(resolve=>{ready=resolve;});
  class LocalSocket{
   constructor(url){connections.push(url);socket=this;this.listeners={};}
   addEventListener(name,callback){this.listeners[name]=callback;if(name==='open')queueMicrotask(callback);}
   send(data){const message=JSON.parse(data);sent.push(message);queueMicrotask(()=>this.listeners.message({data:JSON.stringify({id:message.id,result:{}})}));}
   close(){}
  }
  function localRequire(name){return require(name);}localRequire.main=module;
  vm.runInNewContext(source,{module,require:localRequire,__dirname:path.join(__dirname,'../tools'),URL,Buffer,AbortSignal,
   process:{env:{MATCHAPP_QA_ROOT:checkout,MATCHAPP_QA_OUTPUT:path.join(parent,'evidence')},once(){}},
   console:{log:ready,error(error){assert.fail(error.message);}},setTimeout(){return 0;},WebSocket:LocalSocket,
   async fetch(url,options){fetches.push({url,options});return {ok:true,json:async()=>[
    {url:'https://matchapp.tv.evil.example/',webSocketDebuggerUrl:'ws://evil.example/devtools/page/1'},
    {url:'https://matchapp.tv/',webSocketDebuggerUrl:'ws://127.0.0.1:9223/devtools/page/123'}
   ]};}
  });
  await started;
  assert.deepEqual(connections,['ws://127.0.0.1:9223/devtools/page/123']);
  assert.equal(fetches[0].url,'http://127.0.0.1:9223/json/list');assert.equal(fetches[0].options.redirect,'error');assert.ok(fetches[0].options.signal);
  for(const [id,url,method] of [['public','https://matchapp.tv/','GET'],['foreign','https://matchapp.tv.evil.example/','GET'],['private','https://matchapp.tv/reports/private.json','GET'],['post','https://matchapp.tv/','POST'],['malformed','https://matchapp.tv/%invalid','GET']])socket.listeners.message({data:JSON.stringify({method:'Fetch.requestPaused',params:{requestId:id,request:{url,method}}})});
  await new Promise(resolve=>setImmediate(resolve));
  const fulfilled=sent.filter(message=>message.method==='Fetch.fulfillRequest');
  assert.equal(fulfilled.length,1);assert.equal(fulfilled[0].params.requestId,'public');assert.equal(Buffer.from(fulfilled[0].params.body,'base64').toString(),'APPROVED HOME');
  assert.deepEqual(sent.filter(message=>message.method==='Fetch.continueRequest').map(message=>message.params.requestId).sort(),['foreign','malformed','post','private']);
  const evidence=JSON.parse(fs.readFileSync(path.join(parent,'evidence/webview-overlay-served.json'),'utf8'));
  assert.equal(evidence.resources.length,1);assert.equal(evidence.resources[0].path,'/');assert.equal(evidence.resources[0].bytes,13);
 }finally{fs.rmSync(parent,{recursive:true,force:true});}
});
