const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const html=String.raw`<!doctype html><body>
<article id="result-box" style="display:none"><div class="res-media-row"></div></article>
<section id="ebook-matcher-root"><section data-ebook-result hidden><div class="ebook-result-grid"><h3>Book A</h3></div></section></section>
<div id="chat-log"></div><div id="ai-new-chat"></div>
</body>`;
function boot({signed=false,legacy=null}={}){
 const dom=new JSDOM(html,{url:'https://matchapp.tv/',runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const w=dom.window,call={banners:[],matched:0,newChat:0};
 w.isUserLoggedIn=signed;w.showToast=msg=>call.banners.push(msg);
 w.matchMedia=()=>({matches:true});
 w.updateQuotaBadge=()=>{};
 w.MatchAppGuestMatches={balance:()=>Math.max(0,Number(w.localStorage.getItem('match_guestBonusMatches'))||0),
 set:n=>{w.localStorage.setItem('match_guestBonusMatches',String(n));return n;}};
 w.MatchAppEbooks={match:()=>{call.matched++;}};
 w.refreshAiWorkspaceStatus=async()=>{};
 w.startNewChat=()=>{call.newChat++;};
 if(legacy!==null)w.localStorage.setItem('match_shareLog',JSON.stringify(legacy));
 w.eval(read('guest-share-rewards.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 const get=id=>w.document.getElementById(id);
 return {w,dom,call,get,trial:w.MatchAppGuestShare};
}

test('exactly two guest share rewards TOTAL across normal Matches, books and AI chats; not renewable after six hours',()=>{
 const {w,dom,trial}=boot();
 assert.equal(trial.remainingShares(),2);
 assert.deepEqual({first:trial.claim('match','watch:one').ok,second:trial.claim('ask_ai','ai:one').ok,third:trial.claim('match','book:one').ok},{first:true,second:true,third:false});
 assert.equal(trial.remainingShares(),0);
 assert.equal(trial.matchBalance(),1);
 assert.equal(trial.aiBalance(),1);
 assert.equal(JSON.parse(w.localStorage.getItem('match_guestAdultShareTrial_v1')).length,2);
 assert.equal(trial.claim('ask_ai','ai:one').ok,false,'one answer must not earn twice');
 dom.window.close();
});
test('previous guest reward history is respected: do not reset two total after rolling window',()=>{
 const {trial,dom}=boot({legacy:[100,200,300]});
 assert.equal(trial.remainingShares(),0);
 assert.equal(trial.claim('match','watch:new').ok,false);
 dom.window.close();
});
test('signed-in users have no guest banners or local guest rewards; server share ledger stays separate',()=>{
 const {trial,dom,get}=boot({signed:true});
 assert.equal(trial.claim('match','watch:no').ok,false);
 get('result-box').style.display='block';trial.refreshVisible();
 assert.equal(get('result-box').querySelector('.ma-guest-trial-bar'),null);
 const share=read('share.js');
 assert.match(share,/supabaseClient\.rpc\('claim_share_reward'\)/);
 assert.match(share,/SHARE_MAX_REWARDS = 3/);
 dom.window.close();
});
test('after a share, the next Match or AI action spends that very reward before the remaining daily allowance',()=>{
 const {w,dom,trial}=boot();
 w.eval('var lastQuotaStatus=null; function updateQuotaBadge(){}; function openOutOfMatches(){};');
 const app=read('app.js'),start=app.indexOf('const ANON_DAILY_LIMIT = 3;'),
 end=app.indexOf('// The out-of-matches panel',start);
 assert.ok(start>0&&end>start);
 w.eval(app.slice(start,end));
 assert.equal(trial.claim('match','book:a').ok,true);
 trial.prefer('match');
 assert.equal(w.anonLimitCheck('match'),true);
 assert.equal(trial.matchBalance(),0);
 assert.equal(w.localStorage.getItem('match_dailyCount'),null,'bonus consumed, base 3 remain');
 assert.equal(trial.claim('ask_ai','ai:a').ok,true);
 trial.prefer('ask_ai');
 assert.equal(w.anonLimitCheck('ask_ai'),true);
 assert.equal(trial.aiBalance(),0);
 assert.equal(w.localStorage.getItem('match_dailyCount'),null,'AI bonus consumed, base 3 remain');
 let registration=0;
 w.MatchAppRegistrationWelcome={openOffer:()=>{registration++;}};
 for(let i=0;i<3;i++)assert.equal(w.anonLimitCheck(i===1?'ask_ai':'match'),true);
 assert.equal(w.anonLimitCheck('ask_ai'),false);
 assert.equal(registration,1,'only after all three daily actions and both one-time shares were consumed');
 dom.window.close();
});
test('when guest actions run out but social slots remain, highlight visible result, not registration',()=>{
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
 assert.equal(registration,0);
 assert.equal(trial.remainingShares(),2);
 assert.match(bar.querySelector('button').textContent,/Share this result/);
 assert.match(bar.querySelector('strong').textContent,/2 of 2/);
 dom.window.close();
});
test('guest book result shows top balance and native SHARE cancellation never rewards; a resolved share auto-starts the same Bookworms matcher',async()=>{
 const {w,dom,trial,get,call}=boot();
 const host=get('ebook-matcher-root').querySelector('[data-ebook-result]');
 host.hidden=false;trial.decorateBookResult(host,'Book A','ebook');
 const banner=host.firstElementChild;assert(banner.classList.contains('ma-guest-trial-bar'));
 assert.match(banner.textContent,/3 Matches left/);
 assert.match(banner.querySelector('button').textContent,/Share this result/);
 w.navigator.share=async()=>{const e=new Error('cancel');e.name='AbortError';throw e;};
 banner.querySelector('button').click();
 const modal=get('ma-guest-social-modal'),native=modal.querySelector('.ma-guest-social-native');
 native.click();await tick();
 assert.equal(trial.remainingShares(),2);assert.equal(call.matched,0);assert.equal(host.hidden,false);
 w.navigator.share=async()=>{};
 native.click();await tick();await tick();
 assert.equal(trial.remainingShares(),1);
 assert.equal(call.matched,1);
 assert.equal(host.hidden,true);
 dom.window.close();
});
test('AI share uses a reviewed excerpt, awards AI ONLY and opens a fresh unlocked composer without repeating a question',async()=>{
 const {w,dom,trial,get,call}=boot();
 const bubble=w.document.createElement('div');bubble.className='chat-bubble chat-assistant';bubble.dataset.guestShareEligible='1';
 bubble.innerHTML='<p class="chat-answer-text">Here is a title matching your chosen mood.</p>';get('chat-log').appendChild(bubble);
 w.navigator.share=async data=>{assert.match(data.text,/Here is a title/);assert.doesNotMatch(data.url,/question|token/);};
 trial.decorateAiBubble(bubble);assert.match(bubble.firstElementChild.textContent,/AI prompts left/);
 bubble.querySelector('button').click();const modal=get('ma-guest-social-modal');
 assert.match(modal.querySelector('textarea').value,/Here is a title/);
 modal.querySelector('.ma-guest-social-native').click();await tick();await tick();
 assert.equal(trial.aiBalance(),1);assert.equal(trial.matchBalance(),0);
 assert.equal(call.newChat,1);assert.equal(trial.remainingShares(),1);
 dom.window.close();
});
test('external social intent never rewards just for copy/open; explicit return confirmation is required',async()=>{
 const {w,dom,trial,get}=boot();
 let now=1_000;w.Date.now=()=>now;w.open=()=>null;
 trial.open({kind:'match',token:'book:b',title:'Book B',url:'https://matchapp.tv/'});
 const m=get('ma-guest-social-modal');m.querySelector('[data-network="x"]').click();
 assert.equal(trial.remainingShares(),2);
 const confirm=m.querySelector('.ma-guest-social-confirm');confirm.click();await tick();
 assert.equal(trial.remainingShares(),2,'immediate click is never a completed social share');
 now+=2000;confirm.click();await tick();
 assert.equal(trial.remainingShares(),1);
 dom.window.close();
});
test('adult UI and instructions scoped: responsive CTA; Kids script, CSS, credit meters untouched',()=>{
 const home=read('index.html'),ai=read('discover.html'),book=read('ebooks/ebook-matcher.js'),
 chat=read('discover.js'),share=read('share.js'),instructions=read('AGENTS.md');
 for(const page of [home,ai]){
  assert.match(page,/guest-share-rewards\.js\?v=20260926-guesttrial1/);
  assert.match(page,/guest-share-rewards\.css\?v=20260926-guesttrial1/);
 }
 assert.match(book,/decorateBookResult/);
 assert.match(chat,/decorateAiBubble/);
 assert.match(share,/MatchAppGuestShare\.matchReward/);
 assert.match(instructions,/Premium Button Consistency \(permanent project rule\)/);
 assert.doesNotMatch(read('kids/index.html'),/guest-share-rewards/);
 assert.doesNotMatch(read('kids/account.js'),/match_guestAdultShareTrial_v1/);
});
