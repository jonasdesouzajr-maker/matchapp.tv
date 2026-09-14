/* A return URL is never proof of payment. Only verified server delivery is success. */
(function(){'use strict';let busy=false;
 const tr=k=>window.t?window.t('billing.'+k):k;
 async function check(){
  if(busy)return;busy=true;const status=document.getElementById('purchase-status'),retry=document.getElementById('purchase-retry');
  if(!status){busy=false;return;}if(retry)retry.disabled=true;status.textContent=tr('checking');
  try{
   const sb=window.supabaseClient,sessionId=new URLSearchParams(location.search).get('session_id');
   const {data:{session}}=await sb.auth.getSession();
   if(!session){status.textContent=tr('signin');document.getElementById('purchase-signin').hidden=false;return;}
   if(!sessionId||!/^cs_(test_|live_)?[A-Za-z0-9]+$/.test(sessionId)){status.textContent=tr('failed');return;}
   for(let attempt=0;attempt<6;attempt++){
    const {data,error}=await sb.functions.invoke('stripe-checkout',{body:{action:'status',session_id:sessionId}});
    if(!error&&data?.delivered===true){
     status.textContent=tr('delivered');await window.refreshQuotaStatus?.();
     const balance=await sb.rpc('match_credits');if(typeof balance.data?.credits==='number')localStorage.setItem('match_credits',String(balance.data.credits));
     const target=localStorage.getItem('match_kids_mode')==='true'?'/kids/':'/index.html';
     const next=document.getElementById('purchase-continue');next.href=target;next.hidden=false;
     // Delivery is concrete before redirect; allow time to read the confirmation.
     setTimeout(()=>location.replace(target+'?lang='+encodeURIComponent(window.MATCH_LANG||'en')),3000);return;
    }
    if(!error&&data?.state==='failed'){status.textContent=tr('failed');return;}
    if(attempt<5)await new Promise(resolve=>setTimeout(resolve,1700));
   }
   status.textContent=tr('pending');
  }catch(_){status.textContent=tr('pending');}finally{busy=false;if(retry)retry.disabled=false;}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{document.getElementById('purchase-retry')?.addEventListener('click',check);check();});else check();
 document.addEventListener('matchapp:authchange',check);document.addEventListener('matchapp:langchange',check);
})();
