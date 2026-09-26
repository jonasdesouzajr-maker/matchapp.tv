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
   open({kind:'match',title:host.querySelector('h3')?.textContent||title,token:'book:'+String(host.dataset.guestShareBookId||title),onNext:()=>{
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
    message:'I asked MatchApp Ai: '+question.slice(0,190)+'\n\n'+excerpt+(answer.length>380?'…':'')+'\n\n#MatchAppAi',
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
function makeDialog(){
 let modal=$('#ma-guest-social-modal');if(modal)return modal;
 modal=document.createElement('div');
 modal.id='ma-guest-social-modal';modal.className='ma-guest-social-backdrop';modal.hidden=true;
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Share and earn a free guest action');
 const card=document.createElement('div');card.className='premium-card ma-guest-social-card';
 const close=document.createElement('button');close.className='ma-guest-social-close';close.type='button';close.setAttribute('aria-label','Close sharing');close.textContent='✕';close.onclick=()=>{modal.hidden=true;};
 const h=document.createElement('h3');h.textContent=pt()?'Compartilhe e ganhe +1':'Share & unlock +1';
 const explain=document.createElement('p');explain.textContent=pt()?'Confira a mensagem antes de compartilhar. Copiar não libera o bônus.':'Review the content before sharing. Copying alone never grants a reward.';
 const preview=document.createElement('textarea');preview.className='ma-guest-social-preview';preview.id='ma-guest-social-preview';preview.setAttribute('aria-label','Text to share');preview.rows=5;
 const native=document.createElement('button');native.type='button';native.className='gold-btn ma-guest-social-native';native.textContent=pt()?'Compartilhar pelo dispositivo':'Share with my device';
 const options=document.createElement('div');options.className='ma-guest-social-options';
 for(const [name,title] of [['whatsapp','WhatsApp'],['facebook','Facebook'],['x','X'],['telegram','Telegram'],['instagram','Instagram'],['tiktok','TikTok']]){
  const b=document.createElement('button');b.type='button';b.className='ma-guest-social-option';b.textContent=title;b.dataset.network=name;options.appendChild(b);
 }
 const hint=document.createElement('p');hint.className='ma-guest-social-note';hint.textContent='For browser-based social sharing, return here and confirm you actually posted or sent it.';
 const confirm=document.createElement('button');confirm.type='button';confirm.className='gold-btn ma-guest-social-confirm';confirm.textContent='✓ I shared it — unlock my bonus';confirm.hidden=true;
 const feedback=document.createElement('p');feedback.className='ma-guest-social-feedback';feedback.setAttribute('role','status');
 card.append(close,h,explain,preview,native,options,hint,confirm,feedback);modal.appendChild(card);
 document.body.appendChild(modal);
 modal.addEventListener('click',ev=>{if(ev.target===modal)modal.hidden=true;});
 document.addEventListener('keydown',ev=>{if(ev.key==='Escape'&&!modal.hidden)modal.hidden=true;});
 return modal;
}
let pending=null;
function open({kind,title,token,message,url,onNext}){
 if(!guest())return;
 if(sharesLeft()===0)return openRegistration();
 const modal=makeDialog();
 const preview=$('#ma-guest-social-preview');
 preview.value=message||'MatchApp Ai matched me with '+title+'! Find your perfect match on MatchApp Ai. #MatchAppAi';
 const n=modal.querySelector('.ma-guest-social-native'),confirm=modal.querySelector('.ma-guest-social-confirm'),feedback=modal.querySelector('.ma-guest-social-feedback');
 n.hidden=typeof navigator.share!=='function';confirm.hidden=true;feedback.textContent='';modal.hidden=false;
 const invite={kind,title,token,url:url||'https://matchapp.tv/',onNext};
 pending={...invite,confirmed:false,startedAt:0};
 async function redeem(){
  if(!pending||pending.token!==invite.token||pending.confirmed)return;
  pending.confirmed=true;
  const grant=claim(kind,token);
  if(!grant.ok){feedback.textContent='No new bonus was issued.';return;}
  modal.hidden=true;
  prefer(kind);
  window.showToast?.(kind==='ask_ai'?'🎁 +1 AI prompt unlocked!':'🎁 +1 Match unlocked!');
  await onNext?.();
 }
 n.onclick=async()=>{
  if(n.disabled||!pending||pending.token!==token)return;
  n.disabled=true;
  try{
   // Call navigator.share synchronously inside this genuine button click.
   await navigator.share({title,text:preview.value,url:invite.url});
   await redeem();
  }catch(err){
   feedback.textContent=err?.name==='AbortError'?'Share cancelled. No bonus was used.':'Sharing was not completed. Try another sharing option.';
  }finally{n.disabled=false;}
 };
 modal.querySelectorAll('[data-network]').forEach(btn=>{
  btn.onclick=async()=>{
   const name=btn.dataset.network,value=preview.value,u=encodeURIComponent(invite.url),t=encodeURIComponent(value);
   const links={whatsapp:'https://api.whatsapp.com/send?text='+t+'%20'+u,
    facebook:'https://www.facebook.com/sharer/sharer.php?u='+u,
    x:'https://twitter.com/intent/tweet?text='+t+'&url='+u,
    telegram:'https://t.me/share/url?url='+u+'&text='+t};
   // Open synchronously inside the click so a clipboard promise cannot
   // expire the browser's popup/user-activation permission first.
   window.open(links[name]||(name==='instagram'?'https://www.instagram.com/':'https://www.tiktok.com/'),'_blank','noopener');
   if(name==='instagram'||name==='tiktok'){
    try{await navigator.clipboard?.writeText(value+'\n'+invite.url);}catch(_){}
   }
   pending.startedAt=Date.now();confirm.hidden=false;
   feedback.textContent='Complete the post or message, then return to confirm. Opening a site does not grant a bonus.';
  };
 });
 confirm.onclick=async()=>{
  if(!pending||pending.token!==token||pending.confirmed)return;
  if(Date.now()-pending.startedAt<1200){feedback.textContent='Finish sharing first, then return here.';return;}
  await redeem();
 };
}
function init(){
 document.addEventListener('matchapp:authchange',refreshVisible);
 document.addEventListener('matchapp:newmatch',()=>window.setTimeout(refreshVisible,0));
 document.addEventListener('matchapp:langchange',refreshVisible);
 refreshVisible();
}
window.MatchAppGuestShare=Object.freeze({
 remainingShares:sharesLeft,matchBalance,aiBalance,dailyLeft,left,claim,
 takePrefer,prefer,open,decorateMatchResult,decorateBookResult,decorateAiBubble,
 refreshVisible,matchReward,offerPending
});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();