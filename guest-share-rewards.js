/* Adult-only guest share trial: two rewarded shares in total across
   Watch Matches, Bookworms and Ask AI. Signed-in share mechanics unchanged.
   A social site's publish state is not readable: native-share completion or
   explicit post-return confirmation is required; opening/copying earns nothing.
   Guest balances are necessarily browser-local, not proof of social posting. */
(function () {
'use strict';
const KEY='match_guestAdultShareTrial_v1';
const AI_KEY='match_guestBonusAiPrompts_v1';
const PREFER='match_guestSharePreferred_v1';
const MAX=2;
const $=s=>document.querySelector(s);
const lang=()=>String(window.MATCH_LANG||localStorage.getItem('match_lang')||document.documentElement.lang||'en').toLowerCase();
const pt=()=>lang().startsWith('pt');
const guest=()=>window.isUserLoggedIn!==true;
const num=v=>Math.max(0,Number.parseInt(v,10)||0);
function history(){
 try{
  const stored=localStorage.getItem(KEY);
  if(stored!==null){const values=JSON.parse(stored);return Array.isArray(values)?values.slice(0,MAX):[];}
  // Preserve previous anonymous shares at launch; never restore or reset the
  // 2-share trial when the site's previous six-hour window expires.
  const legacy=JSON.parse(localStorage.getItem('match_shareLog')||'[]');
  const records=Array.isArray(legacy)?legacy.slice(0,MAX).map((ts,i)=>({id:'legacy-'+i,kind:'match',at:num(ts)})):[];
  localStorage.setItem(KEY,JSON.stringify(records));
  return records;
 }catch(_){return [];}
}
function sharesLeft(){return Math.max(0,MAX-history().length);}
function aiBalance(){return num(localStorage.getItem(AI_KEY));}
function matchBalance(){return window.MatchAppGuestMatches?.balance?.()??num(localStorage.getItem('match_guestBonusMatches'));}
function dailyLeft(){
 const same=localStorage.getItem('match_lastDate')===new Date().toLocaleDateString();
 return Math.max(0,3-(same?num(localStorage.getItem('match_dailyCount')):0));
}
function left(kind){return dailyLeft()+(kind==='ask_ai'?aiBalance():matchBalance());}
function takePrefer(kind){
 try{
  const stored=sessionStorage.getItem(PREFER);
  if(stored!==kind)return false;
  sessionStorage.removeItem(PREFER);
  return true;
 }catch(_){return false;}
}
function prefer(kind){try{sessionStorage.setItem(PREFER,kind);}catch(_){}}
function broadcast(){
 const used=3-dailyLeft();
 window.updateQuotaBadge?.({anon:true,used,limit:3,remaining:3-used,purchased_matches:matchBalance()});
 document.dispatchEvent(new CustomEvent('matchapp:guestsharechange',{detail:{sharesLeft:sharesLeft(),matches:matchBalance(),ai:aiBalance()}}));
 window.refreshAiWorkspaceStatus?.();
 refreshVisible();
}
let claiming=false;
function claim(kind,token){
 if(!guest()||!['match','ask_ai'].includes(kind)||claiming)return {ok:false,left:sharesLeft()};
 claiming=true;
 try{
  const rows=history();
  if(rows.length>=MAX||rows.some(x=>x.id===token))return {ok:false,left:sharesLeft()};
  rows.push({id:token||'share-'+Date.now(),kind,at:Date.now()});
  // A local-only guest reward, never a purchased/member/server credit.
  localStorage.setItem(KEY,JSON.stringify(rows));
  if(kind==='match'){
   const next=matchBalance()+1;
   if(window.MatchAppGuestMatches?.set)window.MatchAppGuestMatches.set(next);
   else localStorage.setItem('match_guestBonusMatches',String(next));
  }else localStorage.setItem(AI_KEY,String(aiBalance()+1));
  broadcast();
  return {ok:true,left:sharesLeft(),matches:matchBalance(),ai:aiBalance()};
 }catch(e){console.warn('Guest reward could not be stored:',e);return {ok:false,left:sharesLeft()};}
 finally{claiming=false;}
}
function openRegistration(){
 if(window.MatchAppRegistrationWelcome?.openOffer?.())return;
 window.location.assign('/?registrationOffer=1');
}
function text(kind){
 const leftNow=left(kind),slots=sharesLeft(),label=kind==='ask_ai'?(pt()?'perguntas de IA':'AI prompts'):(pt()?'matches':'Matches');
 return pt()
  ?leftNow+' '+label+' disponíveis · '+slots+' de 2 bônus por compartilhamento restantes'
  :leftNow+' '+label+' left · '+slots+' of 2 share bonuses available';
}
function label(kind){
 return kind==='ask_ai'
  ?(pt()?'Compartilhe esta resposta e ganhe +1 pergunta de IA':'Share this reply · earn +1 AI prompt')
  :(pt()?'Compartilhe seu resultado e ganhe +1 match':'Share this result · earn +1 Match');
}
function createBanner(kind){
 const bar=document.createElement('aside');
 bar.className='ma-guest-trial-bar';
 bar.setAttribute('aria-label',kind==='ask_ai'?'AI prompts and free share reward':'Matches remaining and free share reward');
 const count=document.createElement('strong');count.className='ma-guest-trial-count';bar.appendChild(count);
 const button=document.createElement('button');button.type='button';button.className='gold-btn ma-guest-trial-button';bar.appendChild(button);
 return {bar,count,button};
}
function status(bar,kind,button){
 const count=bar.querySelector('.ma-guest-trial-count');
 if(count)count.textContent=text(kind);
 if(!button)return;
 const slots=sharesLeft();
 if(slots>0){
  button.textContent=label(kind);button.hidden=false;
  button.dataset.offer='share';
 }else if(left(kind)===0){
  button.textContent=pt()?'Crie sua conta grátis: +10 Matches e +10 perguntas de IA':'Register free · get +10 Matches & +10 AI prompts';
  button.dataset.offer='register';button.hidden=false;
 }else{button.hidden=true;button.dataset.offer='';}
}
function decorateMatchResult(){
 const result=$('#result-box');if(!result||!guest())return;
 let bar=result.querySelector(':scope > .ma-guest-trial-bar');
 let button;
 if(!bar){
  ({bar,button}=createBanner('match'));
  // Place ABOVE poster, just below the close and existing quota corner.
  const media=result.querySelector('.res-media-row');
  if(media)media.before(bar);else result.prepend(bar);
  button.addEventListener('click',()=>{
   if(button.dataset.offer==='register')return openRegistration();
   if(window.currentMatchShareRestricted){
    window.showToast?.(pt()?'Este título não pode ser compartilhado. Escolha outro match.':'This title is not shareable. Choose another Match.');
    return;
   }
   window.openShareSheet?.();
  });
 }else button=bar.querySelector('button');
 if(window.currentMatchShareRestricted&&sharesLeft()>0){bar.hidden=true;return;}
 bar.hidden=false;status(bar,'match',button);
}
function decorateBookResult(host,title,format){
 if(!guest()||!host||host.hidden)return;
 let bar=host.querySelector(':scope > .ma-guest-trial-bar');
 let button;
 if(!bar){
  ({bar,button}=createBanner('match'));host.prepend(bar);
  button.addEventListener('click',()=>{
   if(button.dataset.offer==='register')return openRegistration();
   open({kind:'match',title:host.querySelector('h3')?.textContent||title,token:'book:'+String(host.dataset.guestShareBookId||title),
    message:'Find your perfect entertainment match with MatchApp Ai. #MatchAppAi #WhatToWatch',onNext:()=>{
    host.hidden=true;
    // Same preferences and original catalog; the normal matcher consumes the
    // credited +1 and is responsible for all title/edition verification.
    window.MatchAppEbooks?.match?.();
   },url:'https://matchapp.tv/?reading='+encodeURIComponent(format||'ebook')+'#ebook-matcher-root'});
  });
 }
 host.dataset.guestShareBookId=String(title||host.querySelector('h3')?.textContent||'book');
 button=bar.querySelector('button');status(bar,'match',button);
}
function decorateAiBubble(wrap){
 if(!guest()||!wrap||wrap.dataset.guestShareEligible==='0')return;
 let bar=wrap.querySelector(':scope > .ma-guest-trial-bar');
 let button;
 if(!bar){
  ({bar,button}=createBanner('ask_ai'));
  wrap.prepend(bar);
  button.addEventListener('click',()=>{
   if(button.dataset.offer==='register')return openRegistration();
   const answer=wrap.querySelector('.chat-answer-text')?.textContent?.trim()||'';
   const question=wrap.previousElementSibling?.textContent?.trim()||'';
   if(!answer){window.showToast?.('The AI reply is not ready to share yet.');return;}
   const excerpt=answer.slice(0,380);
   open({kind:'ask_ai',title:'MatchApp Ai conversation',
    token:'ai:'+question.slice(0,180)+':'+excerpt.slice(0,180),
    // Keep AI chat contents PRIVATE; the public post promotes the owner's selected poster.
    message:'Ask MatchApp Ai for your next great movie, book or series. #MatchAppAi #WhatToWatch',
    url:'https://matchapp.tv/discover.html',
    onNext:async()=>{
     // An AI prompt needs a question: open a clean, unlocked composer rather
     // than spending the gift on a duplicate answer the person didn't request.
     await window.refreshAiWorkspaceStatus?.();
     window.startNewChat?.();
     window.showToast?.(pt()?'Sua pergunta extra está pronta!':'Your extra AI prompt is ready! Ask anything.');
    }
   });
  });
 }
 button=bar.querySelector('button');status(bar,'ask_ai',button);
}
function refreshVisible(){
 if(!guest()){
  document.querySelectorAll('.ma-guest-trial-bar').forEach(e=>e.hidden=true);
  return;
 }
 const result=$('#result-box');
 if(result&&result.style.display!=='none')decorateMatchResult();
 const book=$('#ebook-matcher-root [data-ebook-result]');
 if(book&&!book.hidden&&book.querySelector('.ebook-result-grid'))decorateBookResult(book,book.dataset.guestShareBookId||book.querySelector('h3')?.textContent||'','ebook');
 document.querySelectorAll('#chat-log > .chat-assistant:not([data-guest-share-eligible="0"])').forEach(decorateAiBubble);
}
async function matchReward(){
 prefer('match');
 window.closeShareSheet?.();
 window.dismissMatchResult?.();
 // Honor the result's existing exit animation before starting a new match.
 window.setTimeout(()=>{
  if(typeof window.triggerMatch==='function')window.triggerMatch(window.lastMatchWasSpecificSearch===true);
 },window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?0:270);
}
function offerPending(kind){
 if(sharesLeft()<=0)return false;
 const target=kind==='ask_ai'
  ?$('#chat-log > .chat-assistant:last-of-type .ma-guest-trial-bar')
  :$('#result-box .ma-guest-trial-bar')||$('#ebook-matcher-root [data-ebook-result]:not([hidden]) .ma-guest-trial-bar');
 if(!target||target.hidden)return false;
 target.scrollIntoView?.({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});
 target.classList.add('ma-guest-trial-highlight');
 window.setTimeout(()=>target.classList.remove('ma-guest-trial-highlight'),1600);
 window.showToast?.(kind==='ask_ai'?'Share your latest AI response above to unlock one more prompt.':'Share your result above to unlock one more Match.');
 return true;
}
// Only accept an official server-verification response. No unverified
// native share handoff, opened social tab, copied text or self-confirmation
// can redeem a MatchApp guest reward.
function finalizeVerified({kind,token,proof,onNext}){
 if(!guest()||!proof?.verified||proof.kind!==kind||
    typeof proof.proof_id!=='string'||proof.proof_id.length<30||
    !['tiktok','bluesky'].includes(proof.platform)||
    !['match','ask_ai'].includes(kind))return false;
 const awarded=claim(kind,token);
 if(!awarded.ok)return false;
 prefer(kind);
 window.showToast?.(kind==='ask_ai'
  ?(pt()?'🎁 +1 pergunta de IA desbloqueada!':'🎁 +1 AI prompt unlocked!')
  :(pt()?'🎁 +1 Match desbloqueado!':'🎁 +1 Match unlocked!'));
 void Promise.resolve().then(()=>onNext?.()).catch(e=>{
  console.warn('Verified share follow-up was interrupted:',e?.message||e);
 });
 return true;
}
function open({kind,title,token,message,url,onNext}){
 if(!guest())return;
 if(sharesLeft()===0)return openRegistration();
 if(window.MatchAppVerifiedGuestPublicShare?.open){
  return window.MatchAppVerifiedGuestPublicShare.open({kind,title,token,message,url,onNext});
 }
 // Fail closed when the independently verifying frontend/backend is
 // unavailable. Do not expose the old "I shared" reward path.
 window.showToast?.(pt()
  ?'A verificação de publicações está indisponível. Nenhum bônus foi usado.'
  :'Post verification is temporarily unavailable. No bonus was used.',true);
}
function init(){
 document.addEventListener('matchapp:authchange',refreshVisible);
 document.addEventListener('matchapp:newmatch',()=>window.setTimeout(refreshVisible,0));
 document.addEventListener('matchapp:langchange',refreshVisible);
 refreshVisible();
}
window.MatchAppGuestShare=Object.freeze({
 remainingShares:sharesLeft,matchBalance,aiBalance,dailyLeft,left,
 takePrefer,prefer,open,finalizeVerified,decorateMatchResult,decorateBookResult,decorateAiBubble,
 refreshVisible,matchReward,offerPending
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();