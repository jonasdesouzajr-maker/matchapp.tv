const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const html=String.raw`<!doctype html><body>
<article id="result-box" style="display:none"><div class="res-media-row"></div></article>
<section id="ebook-matcher-root"><section data-ebook-result hidden><div class="ebook-result-grid"><h3>Book A</h3></div></section></section>
<div id="chat-log"></div><button id="ai-new-chat">New chat</button>
</body>`;
function boot({signed=false,legacy=null}={}){
 const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const w=dom.window,call={toasts:[],matched:0,newChat:0,requests:[],publish:false};
 w.isUserLoggedIn=signed;w.showToast=msg=>call.toasts.push(msg);w.matchMedia=()=>({matches:true});
 w.updateQuotaBadge=()=>{};
 w.MatchAppGuestMatches={balance:()=>Math.max(0,Number(w.localStorage.getItem('match_guestBonusMatches'))||0),
 set:n=>{w.localStorage.setItem('match_guestBonusMatches',String(n));return n;}};
 w.MatchAppEbooks={match:()=>{call.matched++;}};
 w.refreshAiWorkspaceStatus=async()=>{};
 w.startNewChat=()=>{call.newChat++;};
 w.open=()=>null;
 const proofId='123e4567-e89b-42d3-a456-426614174000';
 w.supabaseClient={functions:{invoke:async(name,{body})=>{
  assert.equal(name,'guest-social-proof');call.requests.push(body);
  if(body.action==='start')return {data:{ok:true,proof_id:proofId,challenge:'MAI-ABCDEF123456ABCDEF123456',remaining:2}};
  if(body.action==='verify'&&call.publish)return {data:{ok:true,verified:true,proof_id:proofId,kind:call.activeKind||'match',
    platform:body.platform,remaining:1}};
  return {data:{ok:false,reason:'proof_not_found'}};
 }}};
 if(legacy!==null)w.localStorage.setItem('match_shareLog',JSON.stringify(legacy));
 w.eval(read('guest-share-rewards.js'));
 w.eval(read('verified-public-guest-share.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const get=id=>w.document.getElementById(id);
 return {w,dom,call,get,trial:w.MatchAppGuestShare};
}
async function publicProof({w,call,get},kind='match',token='book:first',onNext=()=>{}){
 call.activeKind=kind;
 w.MatchAppGuestShare.open({kind,token,title:'The Book',message:'MatchApp Ai matched me with The Book',onNext});
 await tick();await tick();
 const modal=get('ma-official-social-proof');
 assert(modal&&!modal.hidden);
 assert.match(modal.querySelector('#ma-proof-caption').value,/MAI-ABCDEF123456ABCDEF123456/);
 assert.match(modal.querySelector('#ma-proof-caption').value,/matchapp\.tv/);
 return modal;
}
async function verify(modal,url,call){
 modal.querySelector('#ma-proof-url').value=url;
 call.publish=true;
 modal.querySelector('[data-proof-verify]').click();
 await tick();await tick();
}

test('two verified public-post bonuses TOTAL across Watch, Bookworms and AI, never 2 per category',async()=>{
 const box=boot(),{w,trial,call,get,dom}=box;
 const modal=await publicProof(box,'match','watch:first');
 await verify(modal,'https://www.tiktok.com/@example/video/7123456789012345678',call);
 assert.equal(trial.matchBalance(),1);assert.equal(trial.remainingShares(),1);
 await publicProof(box,'ask_ai','ai:first');
 modal.querySelector('#ma-proof-platform').value='bluesky';
 await verify(modal,'https://bsky.app/profile/example.bsky.social/post/3leabc123abc',call);
 assert.equal(trial.aiBalance(),1);assert.equal(trial.remainingShares(),0);
 assert.equal(typeof trial.claim,'undefined','no publicly exported direct mint');
 assert.equal(JSON.parse(w.localStorage.getItem('match_guestAdultShareTrial_v1')).length,2);
 dom.window.close();
});
test('previous guest history is grandfathered, never renewed after old window expiry',()=>{
 const {trial,dom}=boot({legacy:[1,2,3]});
 assert.equal(trial.remainingShares(),0);
 dom.window.close();
});
test('signed-in server share reward remains untouched and guest cannot receive local proofs',()=>{
 const {trial,dom,get}=boot({signed:true});
 assert.equal(trial.finalizeVerified({kind:'match',token:'watch:x',proof:{
   verified:true,kind:'match',platform:'tiktok',proof_id:'123e4567-e89b-42d3-a456-426614174000'
 }}),false);
 get('result-box').style.display='block';trial.refreshVisible();
 assert.equal(get('result-box').querySelector('.ma-guest-trial-bar'),null);
 const share=read('share.js');
 assert.match(share,/supabaseClient\.rpc\('claim_share_reward'\)/);
 assert.match(share,/SHARE_MAX_REWARDS = 3/);
 dom.window.close();
});
test('invalid proof, wrong kind, opened platform alone and verification errors NEVER grant a reward',async()=>{
 const box=boot(),{w,trial,get,call,dom}=box;
 assert.equal(trial.finalizeVerified({kind:'match',token:'watch:x',proof:null}),false);
 assert.equal(trial.finalizeVerified({kind:'match',token:'watch:x',proof:{
  verified:true,kind:'ask_ai',platform:'tiktok',proof_id:'123e4567-e89b-42d3-a456-426614174000'
 }}),false);
 const modal=await publicProof(box);
 modal.querySelector('[data-proof-platform="tiktok"]').click();
 assert.equal(trial.remainingShares(),2);
 modal.querySelector('#ma-proof-url').value='https://www.tiktok.com/@example/video/7123456789012345678';
 modal.querySelector('[data-proof-verify]').click();await tick();await tick();
 assert.equal(trial.remainingShares(),2);assert.equal(trial.matchBalance(),0);
 assert.match(modal.querySelector('[data-proof-feedback]').textContent,/exact unique code/i);
 // Explicit social self-confirm button is completely absent.
 assert.equal(modal.querySelector('.ma-guest-social-confirm'),null);
 dom.window.close();
});
test('book top banner starts the real existing Bookworms matcher only after platform proof succeeds',async()=>{
 const box=boot(),{w,trial,get,call,dom}=box;
 const host=get('ebook-matcher-root').querySelector('[data-ebook-result]');
 host.hidden=false;trial.decorateBookResult(host,'Book A','ebook');
 assert.match(host.firstElementChild.textContent,/3 Matches left/);
 host.firstElementChild.querySelector('button').click();
 await tick();await tick();
 const modal=get('ma-official-social-proof');
 await verify(modal,'https://www.tiktok.com/@example/video/7123456789012345678',call);
 await tick();await tick();
 assert.equal(trial.matchBalance(),1);
 assert.equal(call.matched,1);
 assert.equal(host.hidden,true);
 dom.window.close();
});
test('AI quote at top is copied only to a reviewable caption and earned prompt opens new composer',async()=>{
 const box=boot(),{w,trial,get,call,dom}=box;
 const bubble=w.document.createElement('div');bubble.className='chat-bubble chat-assistant';bubble.dataset.guestShareEligible='1';
 bubble.innerHTML='<p class="chat-answer-text">An AI response about a title you like.</p>';get('chat-log').appendChild(bubble);
 trial.decorateAiBubble(bubble);
 bubble.querySelector('button').click();await tick();await tick();
 const modal=get('ma-official-social-proof');
 assert.match(modal.querySelector('#ma-proof-caption').value,/An AI response/);
 call.activeKind='ask_ai';
 await verify(modal,'https://www.tiktok.com/@example/video/7123456789012345678',call);
 await tick();await tick();
 assert.equal(trial.aiBalance(),1);assert.equal(trial.matchBalance(),0);
 assert.equal(call.newChat,1);
 dom.window.close();
});
test('guest reward pays for next action before base daily actions; registration appears after base and both rewards exhausted',()=>{
 const {w,dom,trial}=boot();
 w.eval('var lastQuotaStatus=null; function updateQuotaBadge(){}; function openOutOfMatches(){};');
 const app=read('app.js'),start=app.indexOf('const ANON_DAILY_LIMIT = 3;'),
 end=app.indexOf('// The out-of-matches panel',start);
 assert.ok(start>0&&end>start);w.eval(app.slice(start,end));
 const proof=k=>({verified:true,kind:k,platform:'tiktok',proof_id:'123e4567-e89b-42d3-a456-426614174000'});
 assert.equal(trial.finalizeVerified({kind:'match',token:'watch:first',proof:proof('match')}),true);
 assert.equal(w.anonLimitCheck('match'),true);
 assert.equal(trial.matchBalance(),0);
 assert.equal(w.localStorage.getItem('match_dailyCount'),null);
 assert.equal(trial.finalizeVerified({kind:'ask_ai',token:'ai:first',proof:proof('ask_ai')}),true);
 assert.equal(w.anonLimitCheck('ask_ai'),true);
 assert.equal(trial.aiBalance(),0);
 let requested=0;w.MatchAppRegistrationWelcome={openOffer:()=>{requested++;return true;}};
 for(let i=0;i<3;i++)assert.equal(w.anonLimitCheck('match'),true);
 assert.equal(w.anonLimitCheck('ask_ai'),false);
 assert.equal(requested,1);
 dom.window.close();
});
test('guest with remaining share opportunities is shown previous result instead of registration',()=>{
 const {w,dom,trial,get}=boot();
 w.eval('var lastQuotaStatus=null; function updateQuotaBadge(){}; function openOutOfMatches(){};');
 const app=read('app.js'),start=app.indexOf('const ANON_DAILY_LIMIT = 3;'),
 end=app.indexOf('// The out-of-matches panel',start);w.eval(app.slice(start,end));
 get('result-box').style.display='block';trial.decorateMatchResult();
 const bar=get('result-box').querySelector('.ma-guest-trial-bar');
 bar.scrollIntoView=()=>{};
 let registration=0;w.MatchAppRegistrationWelcome={openOffer:()=>{registration++;}};
 for(let i=0;i<3;i++)assert.equal(w.anonLimitCheck('match'),true);
 assert.equal(w.anonLimitCheck('match'),false);
 assert.equal(registration,0);assert.match(bar.textContent,/2 of 2/);
 dom.window.close();
});
test('new adult assets and premium design do not touch Kids',()=>{
 const home=read('index.html'),chat=read('discover.html');
 for(const page of [home,chat]){
  assert.match(page,/verified-public-guest-share\.js\?v=20260926-publicproof1/);
  assert.match(page,/guest-share-rewards\.css\?v=20260926-publicproof1/);
 }
 assert.match(read('guest-share-rewards.js'),/finalizeVerified/);
 assert.match(read('share.js'),/No.+native handoff is not publication proof|native handoff is not publication proof/i);
 assert.match(read('AGENTS.md'),/Premium Button Consistency \(permanent project rule\)/);
 assert.doesNotMatch(read('kids/index.html'),/verified-public-guest-share/);
 assert.doesNotMatch(read('kids/account.js'),/guest_social_proof/);
});
