'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('together.js');
function fn(name){const start=source.indexOf('function '+name+'('),end=source.indexOf('\n}\n',start)+2;assert(start>=0&&end>start,name);return source.slice(source.slice(start-6,start)==='async '?start-6:start,end);}
const film=(title,id)=>({title,year:2020,kind:'movie',tmdbId:id,cats:['movie'],platform:'any',synopsis:'An original catalog film.'});
async function boot(items=[]){
 const dom=new JSDOM('<section id="tg-step-result"></section><p id="tg-waiting-note"></p>',{url:'https://matchapp.tv/together.html?mode=classic',runScripts:'outside-only'}),w=dom.window,painted=[],published=[],errors=[];
 w.eval(read('matching-policy.js'));await w.matchPolicy.ready();
 w.eval('var tgState={code:"SESSIONA",role:"host",resolved:false};var RATING_RANK={any:5};var SESSION_SHOWN=new Set();');
 w.CONTENT_CATALOG=items;w.tgEl=id=>w.document.getElementById(id);w.tgRenderResult=item=>painted.push(item);w.tgRenderParticipants=()=>{};w.tgStopPolling=()=>{};w.tgError=text=>errors.push(text);w.isBlockedEntry=()=>false;w.tmdbKindForCats=()=> 'movie';
 w.MatchAppCatalogMedia={regionCode:()=> 'BR',resolvePoster:async(title,options)=>({url:'https://image.tmdb.org/t/p/w500/original.jpg',meta:{title,tmdb_id:options.tmdbId||100,media_kind:'movie',year:2020}})};
 const sb={auth:{getUser:async()=>({data:{user:null}})},rpc:async(_name,args)=>{published.push(args.p_result);const result={...args.p_result,matchScope:'together:'+args.p_code};delete result.claimToken;return {data:{ok:true,result}};}};
 w.tgSupabase=()=>sb;
 w.eval(['tgResolvePrefs','tgTryResolve','tgSameIdentity','tgDismissed','tgSourceIdentity','tgReceiveResult'].map(fn).join('\n'));
 return {dom,w,sb,painted,published,errors};
}
const participants=[{name:'Host',prefs:{}},{name:'Guest',prefs:{}}];
test('two new classic sessions cannot publish the same source identity and the winner carries its owned claim token',async()=>{
 const {dom,w,painted,published}=await boot([film('Shared original',100)]);
 try{
  await w.tgTryResolve(participants);assert.equal(published.length,1);assert.match(published[0].claimToken,/^[A-Za-z0-9_-]{16,100}$/);assert.equal(published[0].tmdbId,100);assert.equal(painted.length,1);
  assert.equal(w.matchPolicy.history()[0].action,'matched');assert.equal(w.matchPolicy.history()[0].reason,'together:SESSIONA');
  w.tgState={code:'SESSIONB',role:'host',resolved:false};await w.tgTryResolve(participants);
  assert.equal(published.length,1);assert.equal(painted.length,1);
 }finally{dom.window.close();}
});
test('classic source resolution rejects a disliked translated alias before reservation and publication',async()=>{
 const {dom,w,published,painted}=await boot([{title:'Localized source title',cats:['movie'],platform:'any'}]);
 try{
  w.matchPolicy.savePreference(film('Original source title',100),'dislike');
  await w.tgTryResolve(participants);
  assert.equal(published.length,0);assert.equal(painted.length,0);
 }finally{dom.window.close();}
});
test('classic atomic claim collision does not publish or reveal a speculative result',async()=>{
 const {dom,w,published,painted}=await boot([film('Contested original',100)]);
 try{w.matchPolicy={...w.matchPolicy,claim:async()=>false};await w.tgTryResolve(participants);assert.equal(published.length,0);assert.equal(painted.length,0);}finally{dom.window.close();}
});
test('classic guest remembers a fresh result, may revisit that same session, and cannot receive it as a new match',async()=>{
 const {dom,w,painted,errors}=await boot();
 try{
  w.tgState={code:'FIRST',role:'guest',resolved:true};const item=film('Guest original',100);
  assert.equal(await w.tgReceiveResult(item,participants),true);
  assert.equal(await w.tgReceiveResult(item,participants),true,'intentional revisit uses this session receipt');
  w.tgState={code:'SECOND',role:'guest',resolved:true};
  assert.equal(await w.tgReceiveResult({...item,title:'Translated guest original'},participants),false);
  assert.equal(painted.length,2);assert.equal(errors.length,1);
 }finally{dom.window.close();}
});
test('classic signed-in result accepts only its own server scope and a hard dismissal still blocks it',async()=>{
 const {dom,w,sb,painted}=await boot();
 try{
  const item={...film('Scoped shared film',100),matchScope:'together:SESSIONA'};
  sb.auth.getUser=async()=>({data:{user:{id:'current-account'}}});
  w.matchPolicy.remember({...item,reason:item.matchScope},'shown');
  w.matchPolicy={...w.matchPolicy,claim:async()=>{assert.fail('the server already reserved this exact shared result');}};
  assert.equal(await w.tgReceiveResult(item,participants),true);assert.equal(painted.length,1);
  w.matchPolicy.savePreference({...item,title:'Dismissed alias'},'dislike');
  assert.equal(await w.tgReceiveResult(item,participants),false);assert.equal(painted.length,1);
 }finally{dom.window.close();}
});
test('old classic source work cannot paint into a replaced session',async()=>{
 const {dom,w,painted}=await boot();let resolve;
 try{
  w.MatchAppCatalogMedia.resolvePoster=()=>new Promise(done=>{resolve=done;});
  const pending=w.tgReceiveResult(film('Late original',100),participants);
  for(let i=0;i<30&&!resolve;i++)await Promise.resolve();assert(resolve);
  w.tgState={code:'NEWSESSION',role:'guest'};
  resolve({url:'https://image.tmdb.org/t/p/w500/original.jpg',meta:{title:'Late original',tmdb_id:100,media_kind:'movie'}});
  assert.equal(await pending,false);assert.equal(painted.length,0);assert.equal(w.matchPolicy.history().length,0);
 }finally{dom.window.close();}
});
