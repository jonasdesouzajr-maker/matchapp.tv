'use strict';
// Usage: node tools/check-shared-auth-sdk-20261101.cjs /path/to/supabase-2.105.0.js
// Use the pinned UMD URL documented in reports/play-release-20261101/auth-verification.md.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
if (!process.argv[2]) throw Error('Pass the local Supabase 2.105.0 UMD file path');
const sdk=fs.readFileSync(process.argv[2],'utf8'),app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const boot=app.slice(app.indexOf('function sharedMatchAuthClient()'),app.indexOf('let globalMatchTitle'));
(async()=>{
 const dom=new JSDOM('<iframe src="/discover.html?ambient=1"></iframe>',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=dom.window;
 Object.assign(w,{fetch:async()=>{throw Error('unexpected live provider call')},Headers,Request,Response,TextEncoder,TextDecoder});
 w.eval(sdk);
 const factory=w.supabase.createClient.bind(w.supabase);let created=0,sdkReads=0;
 w.supabase.createClient=(...args)=>{
  created++;const client=factory(...args),read=client.auth.getSession.bind(client.auth);
  client.auth.getSession=()=>{sdkReads++;return read();};return client;
 };
 w.eval("const SUPABASE_URL='https://auth-fixture.supabase.co',SUPABASE_ANON_KEY='public-test-key';"+boot);
 const client=w.supabaseClient;
 await client.auth.initialize();
 sdkReads=0;
 const results=await Promise.all(Array.from({length:20},()=>client.auth.getSession()));
 assert(results.every(x=>!x.error&&x.data.session===null));
 assert.equal(sdkReads,1,'twenty consumers invoke the real SDK getSession only once');
 const concurrentSdkReads=sdkReads;
 const frame=w.document.querySelector('iframe').contentWindow;
 frame.eval("const SUPABASE_URL='https://auth-fixture.supabase.co',SUPABASE_ANON_KEY='public-test-key';"+boot);
 assert.equal(frame.supabaseClient,client);assert.equal(created,1);
 let restored=false;
 const sub=client.auth.onAuthStateChange(()=>{
  client.auth.__matchappInvalidateSessionRead();
  w.setTimeout(()=>{client.auth.getSession().then(result=>{assert.equal(result.error,null);restored=true;});},0);
 });
 await new Promise(resolve=>w.setTimeout(resolve,30));assert(restored,'deferred session read completes after real SDK auth callback');
 sub.data.subscription.unsubscribe();client.auth.stopAutoRefresh();
 dom.window.close();
 console.log(JSON.stringify({sdk:'@supabase/supabase-js@2.105.0 UMD',createdClients:created,concurrentReads:20,sdkSessionReadsFor20Requests:concurrentSdkReads,sharedSameOriginFrame:true,deferredAuthSessionRead:true,providerCalls:0,status:'passed'}));
})().catch(error=>{console.error(error);process.exitCode=1});
