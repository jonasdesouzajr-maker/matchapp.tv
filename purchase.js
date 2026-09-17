/* Return URL is never proof of payment; only verified server delivery is success. */
(function(){'use strict';
 let busy=false;
 const tr=k=>window.t?window.t('billing.'+k):k;
 const labels={
  ad_free:{title:'Lifetime Ad-Free',success:'Lifetime Ad-Free is now active on your account.'},
  vip_monthly:{title:'VIP Monthly',success:'VIP Monthly is now active — unlimited Matches and an ad-free experience are unlocked.'},
  vip_annual:{title:'VIP Annual',success:'VIP Annual is now active for your account.'},
  business:{title:'Business',success:'Your MatchApp Business plan is now active.'},
  credits_25:{title:'25 Ask AI credits'},credits_75:{title:'75 Ask AI credits'},credits_200:{title:'200 Ask AI credits'},credits_500:{title:'500 Ask AI credits'},
  matches_5:{title:'5 Extra Matches'},matches_25:{title:'25 Extra Matches'},matches_50:{title:'50 Extra Matches'}
 };
 function stage(icon,text){const s=document.getElementById('purchase-status');if(s)s.innerHTML=`<span class="purchase-orb" aria-hidden="true">${icon}</span><span>${text}</span>`;}
 function celebrate(){const card=document.querySelector('main .premium-card');if(!card||card.querySelector('.purchase-burst'))return;card.classList.add('purchase-success-view');const burst=document.createElement('div');burst.className='purchase-burst';burst.setAttribute('aria-hidden','true');for(let i=0;i<22;i++){const p=document.createElement('i');p.style.setProperty('--r',(i*47%360)+'deg');p.style.setProperty('--x',((i%2?1:-1)*(28+(i*17%170)))+'px');p.style.setProperty('--y',(-65-(i*13%150))+'px');p.style.left=(42+(i*11%20))+'%';p.style.top=(40+(i*7%14))+'%';burst.appendChild(p);}card.appendChild(burst);setTimeout(()=>burst.remove(),1700);}
 async function finalMessage(sb,session,plan,data){
  const item=labels[plan]||{title:'MatchApp purchase'};let text=item.success||`${item.title} added successfully.`;
  if(plan.startsWith('matches_')){const b=await sb.rpc('match_pack_balance');const balance=typeof b.data?.matches==='number'?` Your Extra Match balance is ${b.data.matches}.`:'';text=`${item.title} added successfully.${balance}`;}
  else if(plan.startsWith('credits_')){const b=await sb.rpc('match_credits');if(typeof b.data?.credits==='number')localStorage.setItem('match_credits',String(b.data.credits));const balance=typeof b.data?.credits==='number'?` Your Ask AI balance is ${b.data.credits}.`:'';text=`${item.title} added successfully.${balance}`;}
  try{await window.hydrateProfileFromAuth?.(session.user);}catch(_){}
  try{await window.refreshQuotaStatus?.();await window.refreshCreditBalance?.();}catch(_){}
  try{await sb.rpc('record_user_activity',{p_type:'purchase',p_label:item.title,p_data:{plan}});}catch(_){}
  celebrate();stage('✓',text);
  const h=document.querySelector('main .premium-card h1');if(h)h.textContent='Purchase complete';document.title='Purchase complete | MatchApp TV Ai';
 }
 async function check(){
  if(busy)return;busy=true;const retry=document.getElementById('purchase-retry');if(retry)retry.disabled=true;stage('⏳',tr('checking'));
  try{
   const sb=window.supabaseClient,sessionId=new URLSearchParams(location.search).get('session_id');if(!sb)throw new Error('Billing unavailable');
   const {data:{session}}=await sb.auth.getSession();
   if(!session){stage('🔐',tr('signin'));const sign=document.getElementById('purchase-signin');if(sign)sign.hidden=false;return;}
   if(!sessionId||!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)){stage('!',tr('failed'));return;}
   for(let attempt=0;attempt<6;attempt++){
    const {data,error}=await sb.functions.invoke('stripe-checkout',{body:{action:'status',session_id:sessionId}});
    if(!error&&data?.delivered===true){const plan=String(data.plan||'');stage('✓','Payment confirmed — updating your account…');await finalMessage(sb,session,plan,data);const target=localStorage.getItem('match_kids_mode')==='true'?'/kids/':'/';const next=document.getElementById('purchase-continue');if(next){next.href=target+'?purchase=success&lang='+encodeURIComponent(window.MATCH_LANG||'en');next.hidden=false;}if(retry)retry.hidden=true;setTimeout(()=>location.replace(target+'?purchase=success&lang='+encodeURIComponent(window.MATCH_LANG||'en')),5000);return;}
    if(!error&&data?.state==='failed'){stage('!',tr('failed'));return;}
    if(attempt<5)await new Promise(r=>setTimeout(r,1700));
   }
   stage('⏳',tr('pending'));
  }catch(_){stage('⏳',tr('pending'));}
  finally{busy=false;if(retry&&!retry.hidden)retry.disabled=false;}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.getElementById('purchase-retry')?.addEventListener('click',check);check();});else check();
 document.addEventListener('matchapp:authchange',check);
})();
