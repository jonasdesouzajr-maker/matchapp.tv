/* Kids uses the same authenticated allowance and private history as the main app. */
(function(){
 'use strict';
 let owner,ready=Promise.resolve();
 async function session(){
  const sb=window.supabaseClient;if(!sb)throw Error('connection');
  const result=await sb.auth.getSession();if(result.error)throw result.error;
  return result.data?.session?.user || null;
 }
 async function attach(user){
  const id=user?.id||null;if(owner===id)return ready;
  owner=id;
  if(user && localStorage.getItem('match_portfolio_owner')!==id){
   ['match_seenList','match_savedList','match_dislikedList','match_userRatings','match_titleNotes','match_user_name','match_user_country','match_user_dob','match_user_sign','match_user_age','match_profile_locked','match_user_avatar','match_user_nickname'].forEach(k=>localStorage.removeItem(k));
   localStorage.setItem('match_portfolio_owner',id);
  }
  ready=Promise.resolve(window.matchPolicy?.attach(user));await ready;
 }
 async function consume(isCurrent=()=>true){
  const user=await session();await attach(user);
  if(!isCurrent())throw Error('cancelled');
  if(user){
   // Kids recommendations are Matches, never Ask AI prompts. Keep the two
   // balances separate so paid entitlements and purchased Match packs behave
   // exactly like they do on the main Match screen.
   const {data,error}=await window.supabaseClient.rpc('consume_match');
   if(error||!data)throw error||Error('quota');
   const current=await session();if(current?.id!==user.id)throw Error('account_changed');
   return {...data,userId:user.id};
  }
  const date=new Date().toLocaleDateString();
  const parsed=Number.parseInt(localStorage.getItem('match_dailyCount')||'0',10);
  const used=localStorage.getItem('match_lastDate')===date && Number.isFinite(parsed)?Math.max(0,parsed):0;
  if(used>=3)return {allowed:false,remaining:0,anon:true,userId:null};
  localStorage.setItem('match_lastDate',date);localStorage.setItem('match_dailyCount',String(used+1));
  return {allowed:true,remaining:2-used,anon:true,userId:null};
 }
 async function remember(item,action,userId){
  if(!['save','seen','loved','dislike'].includes(action))throw Error('action');
  const user=await session();if((user?.id||null)!==userId)throw Error('account_changed');
  const entry={...item,action,addedAt:Date.now()};
  if(user){const {error}=await window.supabaseClient.rpc('portfolio_action',{p_action:'remember',p_payload:{items:[entry]}});if(error)throw error;if((await session())?.id!==user.id)throw Error('account_changed');}
  window.matchPolicy?.remember(entry,action,false);
  const key=action==='save'?'match_savedList':action==='dislike'?'match_dislikedList':'match_seenList';
  let list=[];try{list=JSON.parse(localStorage.getItem(key)||'[]');if(!Array.isArray(list))list=[];}catch(_){}
  localStorage.setItem(key,JSON.stringify([entry,...list.filter(i=>(i.title||i)!==item.title)]));
 }
 function loadCatalogMedia(){
  if(document.querySelector('script[data-kids-catalog-media]'))return;
  const s=document.createElement('script');s.src='/catalog-media.js?v=20260918-detail8';s.defer=true;s.async=false;s.dataset.kidsCatalogMedia='1';document.head.appendChild(s);
 }
 window.KidsAccount=Object.freeze({consume,remember,prepare:async()=>attach(await session())});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadCatalogMedia,{once:true});else loadCatalogMedia();
})();