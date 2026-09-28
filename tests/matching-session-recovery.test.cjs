'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8'),app=read('app.js');
const helper=app.slice(app.indexOf('let compactSessionFlight'),app.indexOf('async function checkDailyLimit'));
const quota=app.slice(app.indexOf('async function checkDailyLimit'),app.indexOf('// Live included-actions-left'));
function sessionHarness(refresh){
 const dom=new JSDOM('',{url:'https://matchapp.tv',runScripts:'outside-only'}),w=dom.window;
 let current={access_token:'x'.repeat(56000),user:{id:'test-user'}},refreshes=0,debits=0;
 w.supabaseClient={auth:{getSession:async()=>({data:{session:current}}),refreshSession:async()=>{refreshes++;const result=await refresh();if(result.data?.session)current=result.data.session;return result;}},rpc:async()=>{debits++;assert(current.access_token.length<8000);return {data:{allowed:true,remaining:2}};}};
 w.eval('var supabaseClient=window.supabaseClient,isUserLoggedIn=false,lastQuotaStatus=null;function updateQuotaBadge(){}function showQuotaMessage(){}function anonLimitCheck(){throw Error("must not bypass member quota")}');
 w.eval(helper+quota);return {w,close:()=>dom.window.close(),counts:()=>({refreshes,debits})};
}
test('old oversized session is refreshed before a single shared Match debit',async()=>{
 const h=sessionHarness(async()=>({data:{session:{access_token:'compact',user:{id:'test-user'}}}}));
 try{assert.equal(await h.w.checkDailyLimit('match'),true);assert.deepEqual(h.counts(),{refreshes:1,debits:1});assert.equal(await h.w.checkDailyLimit('ask_ai'),true);assert.deepEqual(h.counts(),{refreshes:1,debits:2});}finally{h.close();}
});
test('concurrent session recovery shares one refresh and never repeats an uncertain debit',async()=>{
 let release;const h=sessionHarness(()=>new Promise(resolve=>{release=resolve;}));
 try{const first=h.w.ensureCompactMatchSession(),second=h.w.ensureCompactMatchSession();await new Promise(r=>setTimeout(r,0));assert.equal(h.counts().refreshes,1);release({data:{session:{access_token:'compact',user:{id:'test-user'}}}});await Promise.all([first,second]);assert.equal(h.counts().debits,0);}finally{h.close();}
});
test('failed refresh fails closed without guest fallback, debit or rapid refresh loop',async()=>{
 const h=sessionHarness(async()=>({error:new Error('offline')}));
 try{assert.equal(await h.w.checkDailyLimit('match'),false);assert.equal(await h.w.checkDailyLimit('match'),false);assert.deepEqual(h.counts(),{refreshes:1,debits:0});}finally{h.close();}
});
test('guarantee layer cannot paint a placeholder after quota denial or an empty search',async()=>{
 for(const kind of ['denied','empty']){
 const dom=new JSDOM('<article id="result-box" hidden style="display:none"><h2 id="res-title">Title</h2><img id="res-poster-img"></article>',{url:'https://matchapp.tv',runScripts:'outside-only'}),w=dom.window;let events=0,calls=0;
 w.triggerMatch=async()=>{calls++;return kind==='denied'?false:undefined;};const original=w.triggerMatch;
 w.askAIConversational=async()=>({answer:'ready',results:[]});w.MATCH_LANG='en';w.matchPolicy={matches:()=>true,genreFits:()=>true,key:x=>x};
 w.eval('const CONTENT_CATALOG=[{title:"Eligible title",moods:["funny"]}]');
 w.document.addEventListener('matchapp:newmatch',()=>events++);w.eval(read('match-guarantee.js'));w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 try{await w.triggerMatch(false);assert.equal(w.triggerMatch,original);assert.equal(calls,1);assert.equal(events,0);assert.equal(w.document.querySelector('#result-box').hidden,true);assert.equal(w.document.querySelector('#res-poster-img').getAttribute('src'),null);}finally{dom.window.close();}
 }
});
test('normal matching keeps the result hidden until the complete renderer owns it',()=>{
 const dom=new JSDOM(read('index.html'));assert(dom.window.document.querySelector('#result-box').hidden);dom.window.close();
 const start=app.indexOf('async function renderResult('),render=app.slice(start);
 assert(render.indexOf('resultBox.hidden = false')>render.indexOf('firstPoster.src = firstCover'));
 const sync=app.slice(app.indexOf('async function syncListsToDatabase()'),app.indexOf('// PREMIUM TOAST'));
 assert.doesNotMatch(sync,/await supabaseClient\.auth\.updateUser/);assert.match(sync,/rpc\('save_portfolio'/);
});
