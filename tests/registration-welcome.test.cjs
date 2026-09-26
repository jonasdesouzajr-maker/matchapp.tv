const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const next=()=>new Promise(resolve=>setImmediate(resolve));

const html=`<!doctype html><html lang="en"><body>
  <div id="main-auth-modal"><div class="premium-card">
    <section id="ma-welcome-offer" hidden>
      <p id="ma-bonus-eyebrow"></p><h4 id="ma-bonus-headline"></h4>
      <span id="ma-bonus-matches"></span><span id="ma-bonus-ai"></span>
      <p id="ma-bonus-description"></p><p id="ma-bonus-note"></p>
      <button id="ma-bonus-register">Claim</button>
    </section>
    <input id="reg-full-name"><input id="reg-email">
  </div></div>
</body></html>`;
function boot(url='https://matchapp.tv/',signedIn=false){
 const dom=new JSDOM(html,{url,runScripts:'outside-only',virtualConsole:new VirtualConsole()});
 const w=dom.window,calls={modal:0,tabs:[]};
 w.isUserLoggedIn=signedIn;
 w.openAuthModal=()=>{calls.modal++;};
 w.switchAuthTab=tab=>{calls.tabs.push(tab);};
 w.eval(read('registration-welcome.js'));
 w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
 return {w,dom,calls,node:id=>w.document.getElementById(id)};
}

test('real shared guest limit prompts at the fourth Match or Ask AI action only',()=>{
 const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'});
 const w=d.window,asked=[];
 w.MatchAppRegistrationWelcome={openOffer:()=>{asked.push(true);}};
 w.eval("var lastQuotaStatus=null,isUserLoggedIn=false;function updateQuotaBadge(){};function showToast(){};");
 const src=read('app.js');
 const quota=src.slice(src.indexOf('const ANON_DAILY_LIMIT = 3;'),src.indexOf('// The out-of-matches panel.',src.indexOf('const ANON_DAILY_LIMIT = 3;')));
 assert.ok(quota.includes("return anonLimitCheck")===false);
 w.eval(quota);
 assert.equal(w.anonLimitCheck('match'),true);
 assert.equal(w.anonLimitCheck('ask_ai'),true);
 assert.equal(w.anonLimitCheck('match'),true);
 assert.equal(asked.length,0,'Do not interrupt third successful result');
 assert.equal(w.anonLimitCheck('ask_ai'),false,'fourth action exceeds shared 3-action budget');
 assert.equal(asked.length,1);
 assert.equal(w.localStorage.getItem('match_dailyCount'),'3');
 w.close();
});

test('guest offer is persuasive, separate, localized and opens existing signup area',()=>{
 const ctx=boot();ctx.w.MatchAppRegistrationWelcome.openOffer();
 assert.equal(ctx.calls.modal,1);
 assert.deepEqual(ctx.calls.tabs,['signup']);
 assert.equal(ctx.node('ma-welcome-offer').hidden,false);
 assert.match(ctx.node('ma-bonus-ai').textContent,/AI Limit/);
 assert.match(ctx.node('ma-bonus-description').textContent,/once verified|verified/);
 ctx.node('ma-bonus-register').click();
 assert.equal(ctx.calls.tabs.at(-1),'signup');
 assert.equal(ctx.w.document.activeElement.id,'reg-full-name');
 ctx.w.localStorage.setItem('match_lang','pt-BR');
 ctx.w.document.dispatchEvent(new ctx.w.Event('matchapp:langchange'));
 assert.match(ctx.node('ma-bonus-register').textContent,/bônus grátis/);
 ctx.w.document.dispatchEvent(new ctx.w.CustomEvent('matchapp:authchange',{detail:{signedIn:true}}));
 assert.equal(ctx.node('ma-welcome-offer').hidden,true);
 ctx.dom.window.close();
});

test('deep link from other adult surfaces opens the offer once and scrubs query marker',()=>{
 const ctx=boot('https://matchapp.tv/?registrationOffer=1&source=books');
 assert.equal(ctx.calls.modal,1);
 assert.equal(ctx.node('ma-welcome-offer').hidden,false);
 assert.equal(ctx.w.location.search,'?source=books');
 ctx.dom.window.close();
 const signed=boot('https://matchapp.tv/?registrationOffer=1',true);
 assert.equal(signed.calls.modal,0);
 assert.equal(signed.node('ma-welcome-offer').hidden,true);
 signed.dom.window.close();
});

test('new-member bonuses are granted only by verified, same-account, idempotent server RPC',async()=>{
 const m=read('supabase/security/registration-welcome-bonus.sql');
 assert.match(m,/v_uid uuid := auth\.uid\(\)/);
 assert.match(m,/email_confirmed_at IS NOT NULL OR u\.phone_confirmed_at IS NOT NULL/);
 assert.match(m,/NOT v_verified/);
 assert.match(m,/NOT FOUND OR v_anonymous OR v_created </);
 assert.match(m,/FOR UPDATE/);
 assert.match(m,/CREATE UNIQUE INDEX IF NOT EXISTS credit_ledger_registration_bonus_2026_once/);
 assert.match(m,/purchased_matches = COALESCE\(purchased_matches,0\) \+ 10/);
 assert.match(m,/credits = COALESCE\(credits,0\) \+ 10/);
 assert.match(m,/INSERT INTO public\.credit_ledger/);
 assert.match(m,/INSERT INTO public\.match_pack_ledger/);
 assert.match(m,/REVOKE ALL ON FUNCTION public\.claim_registration_welcome_bonus\(\) FROM PUBLIC, anon/);
 assert.doesNotMatch(m,/p_user_id|p_bonus|p_amount/);
 const d=new JSDOM('',{url:'https://matchapp.tv/',runScripts:'outside-only'}),w=d.window;
 const calls=[],rewards=[];
 w.supabaseClient={rpc:async name=>{calls.push(name);return {data:{ok:true,granted:true,extra_matches:10,ask_ai_credits:10,credits:10}};}};
 w.refreshQuotaStatus=async()=>{};
 w.renderCreditBadge=x=>rewards.push(x);
 w.showToast=x=>rewards.push(x);
 w.eval("var supabaseClient=window.supabaseClient;");
 const app=read('app.js'),start=app.indexOf('// Separate non-expiring welcome balances');
 w.eval(app.slice(start,app.indexOf('let profileAuthEvent = 0;',start)));
 await w.claimRegistrationWelcomeBonus({id:'test-verified-user'});
 await w.claimRegistrationWelcomeBonus({id:'test-verified-user'});
 assert.deepEqual(calls,['claim_registration_welcome_bonus']);
 assert.equal(rewards[0],10);
 assert.match(rewards[1],/\+10 Extra Matches/);
 d.window.close();
});

test('adult site and its registration screen include the new offer; Kids untouched',()=>{
 const h=read('index.html');
 assert.match(h,/id="ma-welcome-offer"/);
 assert.match(h,/registration-welcome\.js\?v=20260926-welcome1/);
 assert.match(h,/registration-welcome\.css\?v=20260926-welcome1/);
 assert.match(h,/id="ma-bonus-register"/);
 assert.match(h,/\+10<\/strong>/);
 assert.doesNotMatch(read('kids/index.html'),/registration-welcome/);
});
